import stripe
from config import settings
from services.db import obtener_usuario, guardar_usuario, obtener_suscripcion, guardar_suscripcion

stripe.api_key = settings.STRIPE_SECRET_KEY


def obtener_o_crear_customer(user_id: str) -> str:
    """Regresa el stripe_customer_id del usuario, creándolo si no existe o ya no es válido."""
    suscripcion = obtener_suscripcion(user_id)
    customer_id = suscripcion.get("stripe_customer_id") if suscripcion else None

    if customer_id:
        try:
            customer = stripe.Customer.retrieve(customer_id)
            if not getattr(customer, "deleted", False):
                return customer_id
        except stripe.error.InvalidRequestError:
            print(f"⚠️  Customer {customer_id} ya no existe en Stripe, creando uno nuevo")

    usuario = obtener_usuario(user_id)
    if not usuario:
        raise ValueError("Usuario no encontrado")

    customer = stripe.Customer.create(
        email=usuario.get("email"),
        name=usuario.get("name"),
        metadata={"user_id": user_id},
    )

    guardar_suscripcion(user_id, {
        "stripe_customer_id": customer.id,
        "status": suscripcion.get("status") if suscripcion else "none",
        "tier": suscripcion.get("tier") if suscripcion else "estudiante",
    })

    return customer.id


def crear_checkout_session(user_id: str, trial_days: int = 3, requerir_tarjeta: bool = True, origen: str = "checkout") -> str:
    customer_id = obtener_o_crear_customer(user_id)

    session_params = {
        "customer": customer_id,
        "payment_method_types": ["card"],
        "line_items": [{"price": settings.STRIPE_PRICE_ID, "quantity": 1}],
        "mode": "subscription",
        "metadata": {"user_id": user_id, "origen": origen},
        "subscription_data": {
            "trial_period_days": trial_days,
            "metadata": {"user_id": user_id, "origen": origen},
        },
        "success_url": f"{settings.FRONTEND_URL}/dashboard?pago=exito",
        "cancel_url": f"{settings.FRONTEND_URL}/dashboard?pago=cancelado",
    }

    if not requerir_tarjeta:
        session_params["payment_method_collection"] = "if_required"

    session = stripe.checkout.Session.create(**session_params)
    return session.url

def crear_checkout_invitado(claim_token: str) -> str:
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{"price": settings.STRIPE_PRICE_ID, "quantity": 1}],
        mode="subscription",
        metadata={"claim_token": claim_token},
        subscription_data={
            "trial_period_days": 3,
            "metadata": {"claim_token": claim_token},
        },
        success_url=f"{settings.FRONTEND_URL}/post-pago?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.FRONTEND_URL}/login",
    )
    return session.url

def reclamar_suscripcion_pendiente(claim_token: str, user_id: str) -> bool:
    """
    Si existe un pago de invitado pendiente con este claim_token, lo migra
    a la tabla real de suscripciones y actualiza los metadata en Stripe
    para que futuros webhooks ya resuelvan el user_id normalmente.
    """
    from services.db import obtener_suscripcion_pendiente_por_token, eliminar_suscripcion_pendiente_por_token

    pendiente = obtener_suscripcion_pendiente_por_token(claim_token)
    if not pendiente:
        return False

    guardar_suscripcion(user_id, {
        "stripe_customer_id": pendiente["stripe_customer_id"],
        "stripe_subscription_id": pendiente["stripe_subscription_id"],
        "status": pendiente.get("status", "active"),
        "tier": pendiente.get("tier", "premium"),
        "trial_ends_at": pendiente.get("trial_ends_at"),
        "current_period_end": pendiente.get("current_period_end"),
        "origen": "checkout",
    })

    try:
        stripe.Customer.modify(pendiente["stripe_customer_id"], metadata={"user_id": user_id})
        stripe.Subscription.modify(pendiente["stripe_subscription_id"], metadata={"user_id": user_id})
    except stripe.error.StripeError as e:
        print(f"⚠️ No se pudo actualizar metadata en Stripe para {user_id}: {e}")

    eliminar_suscripcion_pendiente_por_token(claim_token)
    print(f"🎁 Suscripción pendiente reclamada: token → {user_id}")
    return True

def crear_portal_session(user_id: str) -> str:
    """Regresa la URL al portal de facturación de Stripe (para que el usuario cancele/actualice tarjeta)."""
    suscripcion = obtener_suscripcion(user_id)
    if not suscripcion or not suscripcion.get("stripe_customer_id"):
        raise ValueError("El usuario no tiene un customer de Stripe todavía")

    portal = stripe.billing_portal.Session.create(
        customer=suscripcion["stripe_customer_id"],
        return_url=f"{settings.FRONTEND_URL}/dashboard",
    )
    return portal.url