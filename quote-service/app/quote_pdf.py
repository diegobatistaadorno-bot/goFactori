"""Customer-facing quote PDF (English)."""
from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.platypus import Table, TableStyle
from reportlab.pdfgen import canvas

INK = colors.HexColor("#1F2933")
MUTED = colors.HexColor("#616E7C")
ACCENT = colors.HexColor("#0B5394")
HIGHLIGHT = colors.HexColor("#E3EEF9")
RULE = colors.HexColor("#CBD2D9")


def _money(x: float) -> str:
    return f"${x:,.2f}"


def render_quote_pdf(quote: dict, shop: dict, out_path: Path, draft: bool = False) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    s, cfg, spec, pricing = shop["shop"], shop["pricing"], quote["spec"], quote["pricing"]
    tz = ZoneInfo(s["timezone"])
    issued = datetime.fromisoformat(quote["updated_at"]).astimezone(tz)
    valid_until = issued + timedelta(days=s["quote_valid_days"])
    W, H = LETTER
    m = 0.75 * inch
    c = canvas.Canvas(str(out_path), pagesize=LETTER)
    c.setTitle(f"Quotation {quote['number']}")
    c.setAuthor(s["name"])

    if draft:
        c.saveState()
        c.setFillColor(colors.HexColor("#F5C6C6"))
        c.setFont("Helvetica-Bold", 64)
        c.translate(W / 2, H / 2)
        c.rotate(35)
        c.drawCentredString(0, 0, "DRAFT - NOT SENT")
        c.restoreState()

    # Header
    c.setFillColor(ACCENT)
    c.rect(0, H - 0.18 * inch, W, 0.18 * inch, stroke=0, fill=1)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(m, H - m - 6, s["name"])
    c.setFont("Helvetica", 9)
    c.setFillColor(MUTED)
    for i, line in enumerate([s["address"], f"{s['phone']}  ·  {s['email']}"]):
        c.drawString(m, H - m - 22 - i * 12, line)

    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 22)
    c.drawRightString(W - m, H - m - 6, "QUOTATION")
    c.setFillColor(INK)
    c.setFont("Helvetica", 9.5)
    meta = [("Quote #", quote["number"]), ("Date", issued.strftime("%b %d, %Y")),
            ("Valid until", valid_until.strftime("%b %d, %Y"))]
    for i, (k, v) in enumerate(meta):
        y = H - m - 24 - i * 13
        c.setFillColor(MUTED)
        c.drawRightString(W - m - 90, y, k)
        c.setFillColor(INK)
        c.drawRightString(W - m, y, v)

    c.setStrokeColor(RULE)
    c.line(m, H - m - 68, W - m, H - m - 68)

    # Customer + part
    y = H - m - 90
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(MUTED)
    c.drawString(m, y, "PREPARED FOR")
    c.drawString(W / 2, y, "PART")
    c.setFillColor(INK)
    c.setFont("Helvetica", 10)
    c.drawString(m, y - 15, quote["customer_name"] or "Customer")
    c.drawString(m, y - 28, "WhatsApp " + quote["customer_phone"].removeprefix("whatsapp:"))
    if spec.get("due_date_text"):
        c.drawString(m, y - 41, f"Requested delivery: {spec['due_date_text']}")

    mat = cfg["materials"].get(spec["material_key"], {}).get("label", spec["material_text"])
    fin = cfg["finishes"].get(spec["finish_key"], {}).get("label", spec.get("finish_text") or "As machined")
    proc = cfg["processes"][spec["process"]]["label"]
    pn = spec.get("part_number") or "-"
    rev = spec.get("revision") or "-"
    part_rows = [
        ("Description", spec["part_name"]),
        ("Part number / Rev", f"{pn} / {rev}"),
        ("Material", mat),
        ("Finish", fin),
        ("Process", proc),
        ("Envelope", f"{spec['length_in']:g} x {spec['width_in']:g} x {spec['height_in']:g} in"),
    ]
    c.setFont("Helvetica", 9.5)
    for i, (k, v) in enumerate(part_rows):
        yy = y - 15 - i * 13
        c.setFillColor(MUTED)
        c.drawString(W / 2, yy, k)
        c.setFillColor(INK)
        c.drawString(W / 2 + 100, yy, str(v)[:48])

    # Price table
    data = [["Quantity", "Unit price", "Extended", "Lead time"]]
    highlight_row = None
    for i, t in enumerate(pricing["tiers"], start=1):
        data.append([f"{t['quantity']:,}", _money(t["unit_price"]), _money(t["extended_price"]),
                     f"{t['lead_time_days']} business days"])
        if t["quantity"] == pricing["requested_quantity"]:
            highlight_row = i
    table = Table(data, colWidths=[1.3 * inch, 1.6 * inch, 1.8 * inch, 2.3 * inch])
    style = [
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 9.5),
        ("FONT", (0, 1), (-1, -1), "Helvetica", 10),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
        ("ALIGN", (0, 0), (2, -1), "RIGHT"),
        ("ALIGN", (3, 0), (3, -1), "LEFT"),
        ("LINEBELOW", (0, 1), (-1, -1), 0.5, RULE),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (3, 0), (3, -1), 14),
    ]
    if highlight_row:
        style += [("BACKGROUND", (0, highlight_row), (-1, highlight_row), HIGHLIGHT),
                  ("FONT", (0, highlight_row), (-1, highlight_row), "Helvetica-Bold", 10)]
    table.setStyle(TableStyle(style))
    tw, th = table.wrap(0, 0)
    table_top = y - 120
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(MUTED)
    c.drawString(m, table_top + 8, "PRICING  (requested quantity highlighted)")
    table.drawOn(c, m, table_top - th)

    # Terms
    ivu = cfg["ivu_rate"] * 100
    terms = [
        "Prices in USD, per the drawing received via WhatsApp. Changes to drawing, material or quantity may change the price.",
        f"IVU ({ivu:g}%) not included; applied at invoicing unless a valid exemption certificate is on file.",
        "Lead time starts on receipt of purchase order and deposit. FOB our facility; local delivery available on request.",
        s["payment_terms"],
        "Inspection: first article dimensional check included. Material certifications available on request.",
    ]
    ty = table_top - th - 34
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(MUTED)
    c.drawString(m, ty, "TERMS")
    c.setFont("Helvetica", 8.5)
    c.setFillColor(INK)
    for i, line in enumerate(terms):
        c.drawString(m, ty - 14 - i * 12, f"{i + 1}. {line}")

    # Acceptance
    ay = 1.6 * inch
    c.setStrokeColor(RULE)
    c.roundRect(m, ay - 0.35 * inch, W - 2 * m, 0.95 * inch, 6, stroke=1, fill=0)
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(ACCENT)
    c.drawString(m + 12, ay + 0.38 * inch, "To accept: reply ACEPTO on WhatsApp, or sign and return this page.")
    c.setFillColor(INK)
    c.setFont("Helvetica", 9)
    c.line(m + 12, ay - 0.05 * inch, m + 3.2 * inch, ay - 0.05 * inch)
    c.line(m + 3.6 * inch, ay - 0.05 * inch, W - m - 12, ay - 0.05 * inch)
    c.setFillColor(MUTED)
    c.drawString(m + 12, ay - 0.2 * inch, "Authorized signature / PO number")
    c.drawString(m + 3.6 * inch, ay - 0.2 * inch, "Date")

    c.setFont("Helvetica", 8)
    c.drawCentredString(W / 2, 0.5 * inch, f"{s['legal_name']}  ·  {quote['number']}  ·  Thank you for your business.")
    c.showPage()
    c.save()
    return out_path
