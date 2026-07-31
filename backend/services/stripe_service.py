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


def crear_checkout_session(user_id: str, trial_days: int = 3) -> str:
    """Crea una Checkout Session y regresa la URL a la que redirigir."""
    customer_id = obtener_o_crear_customer(user_id)

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": settings.STRIPE_PRICE_ID, "quantity": 1}],
        mode="subscription",
        metadata={"user_id": user_id},
        subscription_data={
            "trial_period_days": trial_days,
            "metadata": {"user_id": user_id},
        },
        success_url=f"{settings.FRONTEND_URL}/dashboard?pago=exito",
        cancel_url=f"{settings.FRONTEND_URL}/dashboard?pago=cancelado",
    )

    return session.url


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