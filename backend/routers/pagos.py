from fastapi import APIRouter, HTTPException, Request, Depends
import stripe
from pydantic import BaseModel
from config import settings
from services.auth_utils import verificar_identidad
from services.stripe_service import crear_checkout_session, crear_portal_session, crear_checkout_invitado
from typing import Optional
from services.db import (
    obtener_suscripcion, guardar_suscripcion,
    reservar_evento, liberar_evento,
    validar_token_promo, reservar_token_promo,
    obtener_suscripcion_pendiente_por_token, guardar_suscripcion_pendiente, eliminar_suscripcion_pendiente_por_token,
)

router = APIRouter()


# ── Portal de facturación ────────────────────────────────────────────────────

# ✅ ELIMINADO: user_id de la URL
@router.post("/portal")
async def abrir_portal(user_id: str = Depends(verificar_identidad)):
    try:
        url = crear_portal_session(user_id)
        return {"url": url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.error.StripeError as e:
        print(f"❌ Error de Stripe creando portal: {e}")
        raise HTTPException(status_code=502, detail="Error comunicando con Stripe")


# ── Estado de suscripción ────────────────────────────────────────────────────

# ✅ ELIMINADO: user_id de la URL
@router.get("/estado")
async def estado_suscripcion(user_id: str = Depends(verificar_identidad)):
    suscripcion = obtener_suscripcion(user_id)
    if not suscripcion:
        return {"status": "none", "tier": "estudiante", "activo": False, "bloqueado": True}

    if suscripcion.get("tier") == "lifetime":
        return {
            "status": "active",
            "tier": "lifetime",
            "trial_ends_at": None,
            "current_period_end": None,
            "activo": True,
            "bloqueado": False,
        }

    status = suscripcion.get("status", "none")
    activo = status in ("active", "trialing")
    bloqueado = not activo

    return {
        "status": status,
        "tier": suscripcion.get("tier", "estudiante"),
        "trial_ends_at": suscripcion.get("trial_ends_at"),
        "current_period_end": suscripcion.get("current_period_end"),
        "activo": activo,
        "bloqueado": bloqueado,
    }


# ── Webhook de Stripe ────────────────────────────────────────────────────────

@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Falta la firma de Stripe")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Payload inválido")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Firma inválida")

    event_id = event["id"]
    event_type = event["type"]

    if not reservar_evento(event_id, event_type):
        print(f"⏭️  Evento {event_id} ya procesado o en proceso, ignorando")
        return {"recibido": True, "duplicado": True}

    data = event["data"]["object"]

    try:
        if event_type == "checkout.session.completed":
            _manejar_checkout_completado(data)
        elif event_type in ("customer.subscription.updated", "customer.subscription.created"):
            _manejar_subscription_actualizada(data)
        elif event_type == "customer.subscription.deleted":
            _manejar_subscription_cancelada(data)
        elif event_type == "invoice.payment_failed":
            _manejar_pago_fallido(data)
        else:
            print(f"ℹ️  Evento no manejado: {event_type}")

    except Exception as e:
        liberar_evento(event_id)
        print(f"❌ Error procesando webhook {event_type} ({event_id}): {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error procesando webhook")

    return {"recibido": True}


# ── Handlers internos ────────────────────────────────────────────────────────

def _extraer_user_id(objeto_stripe) -> str | None:
    metadata = getattr(objeto_stripe, "metadata", None)
    if not metadata:
        return None
    return getattr(metadata, "user_id", None)


def _extraer_claim_token(objeto_stripe) -> str | None:
    metadata = getattr(objeto_stripe, "metadata", None)
    if not metadata:
        return None
    return getattr(metadata, "claim_token", None)


def _manejar_checkout_completado(session):
    user_id = _extraer_user_id(session)
    if not user_id:
        subscription_id = getattr(session, "subscription", None)
        if subscription_id:
            sub = stripe.Subscription.retrieve(subscription_id)
            user_id = _extraer_user_id(sub)

    if user_id:
        guardar_suscripcion(user_id, {
            "stripe_customer_id": getattr(session, "customer", None),
            "stripe_subscription_id": getattr(session, "subscription", None),
        })
        print(f"✅ Checkout completado para {user_id}")
        return

    claim_token = _extraer_claim_token(session)
    if not claim_token:
        subscription_id = getattr(session, "subscription", None)
        if subscription_id:
            sub = stripe.Subscription.retrieve(subscription_id)
            claim_token = _extraer_claim_token(sub)

    if not claim_token:
        print(f"⚠️  checkout.session.completed sin user_id ni claim_token: {getattr(session, 'id', '?')}")
        return

    customer_details = getattr(session, "customer_details", None)
    email = getattr(customer_details, "email", None) if customer_details else None

    guardar_suscripcion_pendiente(claim_token, {
        "email": email,
        "stripe_customer_id": getattr(session, "customer", None),
        "stripe_subscription_id": getattr(session, "subscription", None),
        "status": "trialing",
        "tier": "premium",
    })
    print(f"📥 Pago de invitado guardado como pendiente (token): {claim_token}")


class CrearCheckoutInvitadoBody(BaseModel):
    claim_token: str


@router.post("/crear-checkout-invitado")
async def iniciar_checkout_invitado(body: CrearCheckoutInvitadoBody):
    from services.db import reservar_claim_token

    if not reservar_claim_token(body.claim_token):
        raise HTTPException(status_code=409, detail="Esta solicitud ya está en proceso")

    try:
        url = crear_checkout_invitado(body.claim_token)
        return {"url": url}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=502, detail="Error comunicando con Stripe")


def _manejar_subscription_actualizada(subscription):
    user_id = _extraer_user_id(subscription)

    status = getattr(subscription, "status", None)
    tier = "premium" if status in ("active", "trialing") else "estudiante"
    metadata = getattr(subscription, "metadata", None)
    origen = getattr(metadata, "origen", None) if metadata else None
    trial_end = getattr(subscription, "trial_end", None)
    period_end = getattr(subscription, "current_period_end", None)

    from datetime import datetime, timezone
    trial_ends_at = datetime.fromtimestamp(trial_end, tz=timezone.utc).isoformat() if trial_end else None
    current_period_end = datetime.fromtimestamp(period_end, tz=timezone.utc).isoformat() if period_end else None

    if user_id:
        datos_guardar = {
            "stripe_customer_id": getattr(subscription, "customer", None),
            "stripe_subscription_id": getattr(subscription, "id", None),
            "status": status,
            "tier": tier,
            "trial_ends_at": trial_ends_at,
            "current_period_end": current_period_end,
        }
        if origen:
            datos_guardar["origen"] = origen
        guardar_suscripcion(user_id, datos_guardar)
        print(f"✅ Suscripción actualizada para {user_id}: {status}")
        return

    claim_token = _extraer_claim_token(subscription)
    if not claim_token:
        return

    guardar_suscripcion_pendiente(claim_token, {
        "stripe_customer_id": getattr(subscription, "customer", None),
        "stripe_subscription_id": getattr(subscription, "id", None),
        "status": status,
        "tier": tier,
        "trial_ends_at": trial_ends_at,
        "current_period_end": current_period_end,
    })
    print(f"📥 Subscription pendiente actualizada (token): {claim_token}")


def _manejar_subscription_cancelada(subscription):
    user_id = _extraer_user_id(subscription)
    if not user_id:
        print(f"⚠️  subscription cancelada sin user_id en metadata: {getattr(subscription, 'id', '?')}")
        return

    guardar_suscripcion(user_id, {
        "status": "canceled",
        "tier": "estudiante",
    })
    print(f"🔻 Suscripción cancelada para {user_id}")


def _manejar_pago_fallido(invoice):
    subscription_id = getattr(invoice, "subscription", None)
    if not subscription_id:
        return
    sub = stripe.Subscription.retrieve(subscription_id)
    user_id = _extraer_user_id(sub)
    if not user_id:
        return

    guardar_suscripcion(user_id, {"status": "past_due"})
    print(f"⚠️  Pago fallido para {user_id}, marcado como past_due")


class CrearCheckoutBody(BaseModel):
    promo_token: Optional[str] = None


# ✅ ELIMINADO: user_id de la URL
@router.post("/crear-checkout")
async def iniciar_checkout(
    body: CrearCheckoutBody = CrearCheckoutBody(),
    user_id: str = Depends(verificar_identidad)
):
    print(f"🎟️  promo_token recibido: {body.promo_token!r}")
    trial_days = 3

    if body.promo_token:
        invitacion = validar_token_promo(body.promo_token)
        if not invitacion:
            raise HTTPException(status_code=400, detail="El código promocional no es válido o ya expiró")
        if not reservar_token_promo(body.promo_token, user_id):
            raise HTTPException(status_code=409, detail="Este código ya fue utilizado")
        trial_days = invitacion.get("dias_trial", 30)
    es_promo = bool(body.promo_token)
    try:
        url = crear_checkout_session(
            user_id,
            trial_days=trial_days,
            requerir_tarjeta=not es_promo,
            origen="promo" if es_promo else "checkout",
        )
        return {"url": url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.error.StripeError as e:
        print(f"❌ Error de Stripe creando checkout: {e}")
        raise HTTPException(status_code=502, detail="Error comunicando con Stripe")
    except Exception as e:
        print(f"❌ Error inesperado creando checkout: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── Validación pública del token ────────────────────────────────────────────

@router.get("/promo/{token}/validar")
async def validar_promo(token: str):
    invitacion = validar_token_promo(token)
    if not invitacion:
        return {"valido": False}
    return {
        "valido": True,
        "dias_trial": invitacion.get("dias_trial", 30),
        "descripcion": invitacion.get("descripcion", ""),
    }


class ReclamarBody(BaseModel):
    claim_token: str


# ✅ ELIMINADO: user_id de la URL
@router.post("/reclamar")
async def reclamar_suscripcion(
    body: ReclamarBody,
    user_id: str = Depends(verificar_identidad)
):
    from services.stripe_service import reclamar_suscripcion_pendiente
    exito = reclamar_suscripcion_pendiente(body.claim_token, user_id)
    return {"reclamado": exito}