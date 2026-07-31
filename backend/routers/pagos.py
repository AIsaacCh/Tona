from fastapi import APIRouter, HTTPException, Request, Depends
import stripe
from pydantic import BaseModel
from config import settings
from services.auth_utils import verificar_identidad
from services.stripe_service import crear_checkout_session, crear_portal_session
from typing import Optional
from services.db import (
    obtener_suscripcion, guardar_suscripcion,
    reservar_evento, liberar_evento,
    validar_token_promo, reservar_token_promo,
)

router = APIRouter()


# ── Crear sesión de checkout ──────────────────────────────────────────────────

@router.post("/crear-checkout/{user_id}")
async def iniciar_checkout(user_id: str, _: str = Depends(verificar_identidad)):
    try:
        url = crear_checkout_session(user_id)
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


# ── Portal de facturación (cancelar, cambiar tarjeta) ────────────────────────

@router.post("/portal/{user_id}")
async def abrir_portal(user_id: str, _: str = Depends(verificar_identidad)):
    try:
        url = crear_portal_session(user_id)
        return {"url": url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.error.StripeError as e:
        print(f"❌ Error de Stripe creando portal: {e}")
        raise HTTPException(status_code=502, detail="Error comunicando con Stripe")


# ── Estado de suscripción (para que el frontend sepa si hay acceso premium) ──

@router.get("/estado/{user_id}")
async def estado_suscripcion(user_id: str, _: str = Depends(verificar_identidad)):
    suscripcion = obtener_suscripcion(user_id)
    if not suscripcion:
        return {"status": "none", "tier": "estudiante", "activo": False}

    activo = suscripcion.get("status") in ("active", "trialing")
    return {
        "status": suscripcion.get("status", "none"),
        "tier": suscripcion.get("tier", "estudiante"),
        "trial_ends_at": suscripcion.get("trial_ends_at"),
        "current_period_end": suscripcion.get("current_period_end"),
        "activo": activo,
    }


# ── Webhook de Stripe ─────────────────────────────────────────────────────────

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

    # Reserva atómica: si ya existe, es un reintento/duplicado de Stripe
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
    """Busca el user_id en los metadata, ya sea del objeto directo o de la subscription asociada."""
    metadata = getattr(objeto_stripe, "metadata", None)
    if not metadata:
        return None
    return getattr(metadata, "user_id", None)


def _manejar_checkout_completado(session):
    user_id = _extraer_user_id(session)
    if not user_id:
        subscription_id = getattr(session, "subscription", None)
        if subscription_id:
            sub = stripe.Subscription.retrieve(subscription_id)
            user_id = _extraer_user_id(sub)

    if not user_id:
        print(f"⚠️  checkout.session.completed sin user_id en metadata: {getattr(session, 'id', '?')}")
        return

    guardar_suscripcion(user_id, {
        "stripe_customer_id": getattr(session, "customer", None),
        "stripe_subscription_id": getattr(session, "subscription", None),
    })
    print(f"✅ Checkout completado para {user_id}")


def _manejar_subscription_actualizada(subscription):
    user_id = _extraer_user_id(subscription)
    if not user_id:
        print(f"⚠️  subscription sin user_id en metadata: {getattr(subscription, 'id', '?')}")
        return

    status = getattr(subscription, "status", None)
    tier = "premium" if status in ("active", "trialing") else "estudiante"

    trial_end = getattr(subscription, "trial_end", None)
    period_end = getattr(subscription, "current_period_end", None)

    from datetime import datetime, timezone

    guardar_suscripcion(user_id, {
        "stripe_customer_id": getattr(subscription, "customer", None),
        "stripe_subscription_id": getattr(subscription, "id", None),
        "status": status,
        "tier": tier,
        "trial_ends_at": datetime.fromtimestamp(trial_end, tz=timezone.utc).isoformat() if trial_end else None,
        "current_period_end": datetime.fromtimestamp(period_end, tz=timezone.utc).isoformat() if period_end else None,
    })
    print(f"✅ Suscripción actualizada para {user_id}: {status}")


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

@router.post("/crear-checkout/{user_id}")
async def iniciar_checkout(user_id: str, body: CrearCheckoutBody = CrearCheckoutBody(), _: str = Depends(verificar_identidad)):
    trial_days = 3

    if body.promo_token:
        invitacion = validar_token_promo(body.promo_token)
        if not invitacion:
            raise HTTPException(status_code=400, detail="El código promocional no es válido o ya expiró")
        if not reservar_token_promo(body.promo_token, user_id):
            raise HTTPException(status_code=409, detail="Este código ya fue utilizado")
        trial_days = invitacion.get("dias_trial", 30)

    try:
        url = crear_checkout_session(user_id, trial_days=trial_days)
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


# ── Validación pública del token (sin autenticación, la persona aún no ha iniciado sesión) ──

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