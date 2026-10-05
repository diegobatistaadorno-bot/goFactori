"""HTTP API called by n8n. n8n owns the WhatsApp channel; this service owns the quoting logic."""
from __future__ import annotations

from urllib.parse import urlencode

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

from .config import get_settings, load_shop
from .flow import QuoteFlow
from .models import PartSpec
from .pricing import price_part
from .store import Store

app = FastAPI(title="goFactori quote service")
settings = get_settings()
store = Store(settings.data_dir / "quotes.db")
flow = QuoteFlow(store, load_shop())

TWILIO_MAX_BODY = 1600


def normalize_twilio(form: dict) -> dict:
    media = []
    for i in range(int(form.get("NumMedia") or 0)):
        media.append({"url": form[f"MediaUrl{i}"], "content_type": form.get(f"MediaContentType{i}", "")})
    return {
        "from": form["From"],
        "profile_name": form.get("ProfileName") or None,
        "body": form.get("Body", ""),
        "media": media,
    }


def to_twilio(result: dict) -> dict:
    """Attach the pre-encoded Twilio Messages API form to each reply so n8n just POSTs it."""
    for r in result.get("replies", []):
        fields = {"From": settings.business_whatsapp, "To": r["to"], "Body": r["body"][:TWILIO_MAX_BODY]}
        if r.get("media_url"):
            fields["MediaUrl"] = r["media_url"]
        r["account_sid"] = settings.twilio_account_sid
        r["twilio_form"] = urlencode(fields)
    result.setdefault("process_quote_id", None)
    return result


@app.get("/health")
def health():
    return {"ok": True, "extractor": settings.extractor}


@app.post("/inbound/twilio")
def inbound_twilio(form: dict):
    """Fast path: store the message and answer instantly. Heavy work is /quotes/{id}/process."""
    return to_twilio(flow.handle_inbound(normalize_twilio(form)))


@app.post("/inbound")
def inbound_generic(message: dict):
    """Channel-neutral entry point: {from, profile_name, body, media: [{url, content_type}]}."""
    return to_twilio(flow.handle_inbound(message))


@app.post("/quotes/{qid}/process")
def process(qid: int):
    return to_twilio(flow.process_quote(qid))


@app.post("/followups/run")
def followups():
    return to_twilio(flow.run_followups())


@app.get("/quotes")
def list_quotes():
    rows = store.conn.execute(
        "SELECT id, number, status, customer_phone, customer_name, original_total, final_total, "
        "created_at, sent_at, accepted_at FROM quotes ORDER BY id DESC LIMIT 100"
    ).fetchall()
    return [dict(r) for r in rows]


@app.get("/quotes/{number}")
def get_quote(number: str):
    q = store.by_number(number)
    if q is None:
        raise HTTPException(404)
    return q


@app.post("/price")
def price(spec: PartSpec, quantity: int | None = None):
    """Price a spec directly: handy for tuning shop.yaml against the owner's past quotes."""
    return price_part(spec, flow.shop, quantity)


@app.get("/files/{token}/{kind}.pdf")
def quote_file(token: str, kind: str):
    q = store.by_token(token)
    if q is None or kind not in ("draft", "quote"):
        raise HTTPException(404)
    path = settings.data_dir / "quotes" / q["number"] / f"{kind}.pdf"
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(path, media_type="application/pdf", filename=f"{q['number']}{'-draft' if kind == 'draft' else ''}.pdf")
