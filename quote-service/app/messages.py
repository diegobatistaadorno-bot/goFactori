"""WhatsApp copy. Customer- and owner-facing messages are Spanish; the quote PDF is English."""
from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo


def _money(x: float) -> str:
    return f"${x:,.2f}"


def ready_by(shop: dict, at: datetime) -> str:
    cfg = shop["shop"]
    local = at.astimezone(ZoneInfo(cfg["timezone"]))
    if local.weekday() < 5 and local.hour < cfg["same_day_cutoff_hour"]:
        return f"hoy antes de las {cfg['same_day_ready_by']}"
    days_ahead = {4: 3, 5: 2}.get(local.weekday(), 1)  # Fri/Sat -> Monday
    day = "el lunes" if days_ahead > 1 else "mañana"
    return f"{day} antes de las {cfg['next_day_ready_by']}"


def greeting(name: str | None) -> str:
    return f"¡Hola {name.split()[0]}!" if name else "¡Hola!"


def ack_drawing(shop: dict, name: str | None, at: datetime) -> str:
    return (
        f"{greeting(name)} Gracias por contactar a *{shop['shop']['name']}*. 🛠️\n\n"
        f"Recibimos su plano y ya lo estamos revisando. "
        f"Tendrá su cotización formal *{ready_by(shop, at)}*.\n\n"
        "Si tiene fecha de entrega requerida o algún detalle adicional, puede enviarlo por aquí."
    )


def ask_for_drawing(shop: dict, name: str | None) -> str:
    return (
        f"{greeting(name)} Gracias por contactar a *{shop['shop']['name']}*. 🛠️\n\n"
        "Para prepararle la cotización, envíenos por aquí:\n"
        "1. El *plano en PDF* (o una foto clara del plano)\n"
        "2. La *cantidad* de piezas\n"
        "3. Fecha de entrega requerida (si aplica)"
    )


def step_file_received(name: str | None) -> str:
    return (
        f"{greeting(name)} Recibimos su archivo 3D. Nuestro equipo lo revisará personalmente. "
        "Si tiene el plano en PDF con tolerancias y material, envíelo para agilizar la cotización."
    )


def ask_quantity(spec: dict) -> str:
    return (
        f"Ya revisamos el plano de *{spec['part_name']}*. "
        "¿Cuántas piezas necesita? (por ejemplo: 50)"
    )


def quantity_received(shop: dict, qty: int, at: datetime) -> str:
    return f"Perfecto, *{qty} piezas*. Tendrá su cotización {ready_by(shop, at)}. ✅"


def got_extra_info() -> str:
    return "Recibido, lo incluimos en su cotización. 👍"


def customer_quote_ready(quote: dict, shop: dict) -> str:
    tier = _requested_tier(quote)
    return (
        f"{greeting(quote['customer_name'])} Su cotización *{quote['number']}* está lista. 📄\n\n"
        f"*{quote['spec']['part_name']}* — {tier['quantity']} pzas\n"
        f"{_money(tier['unit_price'])} c/u · Total {_money(tier['extended_price'])}\n"
        f"Entrega: {tier['lead_time_days']} días laborables\n\n"
        f"El PDF incluye precios para otras cantidades. Válida por {shop['shop']['quote_valid_days']} días.\n\n"
        "Para aprobar, responda *ACEPTO*. ¿Preguntas? Escríbanos por aquí."
    )


def customer_accepted(quote: dict) -> str:
    return (
        f"¡Gracias! Recibimos su aprobación de la cotización *{quote['number']}*. "
        "Le contactaremos en breve para coordinar el depósito y la orden de compra. 🙌"
    )


def customer_followup(quote: dict) -> str:
    return (
        f"{greeting(quote['customer_name'])} ¿Pudo revisar la cotización *{quote['number']}*? "
        "Si desea ajustar cantidades o fechas, con gusto la actualizamos. "
        "Para aprobar, responda *ACEPTO*."
    )


def customer_forwarded() -> str:
    return "Recibido. Le respondemos en breve. 👍"


def _requested_tier(quote: dict) -> dict:
    p = quote["pricing"]
    return next(t for t in p["tiers"] if t["quantity"] == p["requested_quantity"])


def owner_draft(quote: dict, shop: dict, pending_count: int) -> str:
    spec, p = quote["spec"], quote["pricing"]
    b = p["breakdown"]
    tier = _requested_tier(quote)
    tiers = "\n".join(
        f"  {t['quantity']:>5} pzas → {_money(t['unit_price'])} c/u = {_money(t['extended_price'])}"
        for t in p["tiers"]
    )
    dims = f"{spec['length_in']} × {spec['width_in']} × {spec['height_in']} in"
    mat = shop["pricing"]["materials"].get(spec["material_key"], {}).get("label", spec["material_text"])
    notes = [*p.get("flags", []), *spec.get("assumptions", [])]
    notes_txt = ("\n⚠️ Revisar:\n" + "\n".join(f"• {n}" for n in notes)) if notes else ""
    ref = f" {quote['number']}" if pending_count > 1 else ""
    return (
        f"📋 *Borrador {quote['number']}* — {quote['customer_name'] or 'Cliente'} ({_phone(quote)})\n\n"
        f"*{spec['part_name']}* {spec.get('part_number') or ''}\n"
        f"{mat} · {dims} · {shop['pricing']['processes'][spec['process']]['label']}\n"
        f"Tolerancia: {b['tolerance_band']} · Ciclo: {b['cycle_minutes_per_part']} min/pza\n"
        f"Setup+prog: {_money(b['setup_cost'] + b['programming_cost'])} · "
        f"Material: {_money(b['material_cost_per_part'])}/pza\n\n"
        f"*Pedido: {tier['quantity']} pzas = {_money(tier['extended_price'])}*\n{tiers}"
        f"{notes_txt}\n\n"
        f"Responda *1{ref}* para aprobar y enviar, un *total nuevo* (ej. {round(tier['extended_price'], -1):.0f}{ref}) "
        f"para cambiar el precio, o *0{ref}* para descartar."
        + (f"\n\n({pending_count} cotizaciones pendientes; incluya el número.)" if pending_count > 1 else "")
    )


def owner_sent(quote: dict, adjusted: bool) -> str:
    tier = _requested_tier(quote)
    how = "con su precio ajustado" if adjusted else "aprobada"
    return f"✅ {quote['number']} enviada al cliente {how}: {_money(tier['extended_price'])}."


def owner_discarded(quote: dict) -> str:
    return f"🗑️ {quote['number']} descartada. El cliente no recibió nada."


def owner_manual_review(quote: dict, reason: str) -> str:
    return (
        f"⚠️ {quote['number']} de {quote['customer_name'] or 'cliente'} ({_phone(quote)}) "
        f"necesita revisión manual: {reason}"
    )


def owner_customer_accepted(quote: dict) -> str:
    tier = _requested_tier(quote)
    return (
        f"🎉 {quote['customer_name'] or 'El cliente'} ({_phone(quote)}) ACEPTÓ {quote['number']}: "
        f"{tier['quantity']} pzas, {_money(tier['extended_price'])}. Coordine depósito y PO."
    )


def owner_customer_message(quote: dict, text: str) -> str:
    return f"💬 {quote['customer_name'] or 'Cliente'} ({_phone(quote)}) sobre {quote['number']}:\n\"{text}\""


def owner_help(pending: list[dict]) -> str:
    if not pending:
        return "No hay cotizaciones pendientes de aprobación."
    lines = "\n".join(f"• {q['number']} — {q['customer_name'] or q['customer_phone']}" for q in pending)
    return (
        f"Pendientes:\n{lines}\n\n"
        "Responda *1 Q-XXXX* para aprobar, *total Q-XXXX* para cambiar precio, o *0 Q-XXXX* para descartar."
    )


def _phone(quote: dict) -> str:
    return quote["customer_phone"].removeprefix("whatsapp:")
