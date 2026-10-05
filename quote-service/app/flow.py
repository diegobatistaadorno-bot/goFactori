"""Conversation logic: customer intake, owner approval, follow-ups.

Every handler returns outbound messages as {"to", "body", "media_url"?}; the channel layer
(n8n + Twilio today, Meta Cloud API later) only delivers them.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from . import messages as msg
from .config import get_settings
from .extract import ExtractionError, extract
from .media import classify, download
from .models import PartSpec, Pricing
from .pricing import apply_owner_total, price_part
from .quote_pdf import render_quote_pdf
from .store import OPEN_INTAKE, Store, iso, now, parse_iso

FOLLOWUP_AFTER = timedelta(hours=20)
WINDOW = timedelta(hours=24)
WINDOW_MARGIN = timedelta(hours=1)
MIN_FOLLOWUP_GAP = timedelta(hours=2)

ACCEPT_WORDS = {"acepto", "aceptado", "aceptamos", "aprobado", "apruebo", "aprobamos", "confirmo",
                "dale", "accept", "accepted", "approved"}


def _norm(text: str) -> str:
    text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode()
    return text.lower().strip()


def parse_quantity(text: str) -> Optional[int]:
    m = re.search(r"\b(\d{1,3}(?:,\d{3})+|\d+)\b", text or "")
    if not m:
        return None
    qty = int(m.group(1).replace(",", ""))
    return qty if 0 < qty <= 1_000_000 else None


def is_acceptance(text: str) -> bool:
    words = set(re.findall(r"[a-z]+", _norm(text)))
    return bool(words & ACCEPT_WORDS) or "de acuerdo" in _norm(text)


QUOTE_REF = r"(q-?\d+)"


def parse_owner_command(text: str) -> Optional[tuple[str, Optional[float], Optional[str]]]:
    """'1' approve, '0' discard, any other amount = new total. Optional quote number either side."""
    t = _norm(text).replace("$", "")
    ref = None
    m = re.search(QUOTE_REF, t)
    if m:
        ref = m.group(1).upper()
        ref = ref if "-" in ref else f"Q-{ref[1:]}"
        t = (t[: m.start()] + t[m.end():]).strip()
    if t in {"si", "ok", "aprobar", "aprobado", "approve"}:
        return ("approve", None, ref)
    if not re.fullmatch(r"\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?", t):
        return None
    value = float(t.replace(",", ""))
    if value == 1:
        return ("approve", None, ref)
    if value == 0:
        return ("discard", None, ref)
    return ("price", value, ref)


class QuoteFlow:
    def __init__(self, store: Store, shop: dict):
        self.store = store
        self.shop = shop
        self.settings = get_settings()

    # ---------- helpers ----------
    def _reply(self, to: str, body: str, media_url: Optional[str] = None) -> dict:
        r = {"to": to, "body": body}
        if media_url:
            r["media_url"] = media_url
        return r

    def _owner(self, body: str, media_url: Optional[str] = None) -> dict:
        return self._reply(self.settings.owner_whatsapp, body, media_url)

    def _quote_dir(self, quote: dict):
        return self.settings.data_dir / "quotes" / quote["number"]

    def _pdf_url(self, quote: dict, kind: str) -> str:
        return f"{self.settings.public_base_url}/files/{quote['pdf_token']}/{kind}.pdf"

    # ---------- inbound ----------
    def handle_inbound(self, inbound: dict) -> dict:
        if inbound["from"] == self.settings.owner_whatsapp:
            return self._handle_owner(inbound)
        return self._handle_customer(inbound)

    def _handle_customer(self, inbound: dict) -> dict:
        phone, name = inbound["from"], inbound.get("profile_name")
        text = (inbound.get("body") or "").strip()
        media = [{**m, "kind": classify(m["content_type"], m.get("filename", ""))} for m in inbound.get("media", [])]
        q = self.store.latest_for_customer(phone)
        prefix = self.shop["shop"]["quote_prefix"]

        if any(m["kind"] == "drawing" for m in media):
            if q is None or q["status"] not in OPEN_INTAKE:
                q = self.store.create(phone, name, prefix)
            q = self.store.add_customer_message(q["id"], text, media)
            self.store.update(q["id"], status="processing", spec=None, pricing=None)
            return {"replies": [self._reply(phone, msg.ack_drawing(self.shop, name, now()))],
                    "process_quote_id": q["id"]}

        if any(m["kind"] == "cad" for m in media):
            if q is None or q["status"] not in OPEN_INTAKE:
                q = self.store.create(phone, name, prefix)
            q = self.store.add_customer_message(q["id"], text, media)
            q = self.store.update(q["id"], status="manual_review")
            return {"replies": [
                self._reply(phone, msg.step_file_received(name)),
                self._owner(msg.owner_manual_review(q, "envió un archivo CAD/STEP sin plano PDF.")),
            ]}

        if q is None:
            q = self.store.create(phone, name, prefix)
            self.store.add_customer_message(q["id"], text, [])
            return {"replies": [self._reply(phone, msg.ask_for_drawing(self.shop, name))]}

        q = self.store.add_customer_message(q["id"], text, [])
        status = q["status"]
        if status == "needs_drawing":
            return {"replies": [self._reply(phone, "Recibido. Quedamos pendientes del plano (PDF o foto) "
                                                   "para preparar su cotización. 📎")]}
        if status == "needs_quantity":
            qty = parse_quantity(text)
            if not qty:
                return {"replies": [self._reply(phone, msg.ask_quantity(q["spec"]))]}
            spec = {**q["spec"], "quantity": qty}
            self.store.update(q["id"], spec=spec, status="processing")
            return {"replies": [self._reply(phone, msg.quantity_received(self.shop, qty, now()))],
                    "process_quote_id": q["id"]}
        if status == "sent" and is_acceptance(text):
            q = self.store.update(q["id"], status="accepted", accepted_at=now())
            return {"replies": [self._reply(phone, msg.customer_accepted(q)),
                                self._owner(msg.owner_customer_accepted(q))]}
        # processing / pending_approval / manual_review / sent: keep the owner in the loop
        if status == "sent":
            return {"replies": [self._reply(phone, msg.customer_forwarded()),
                                self._owner(msg.owner_customer_message(q, text))]}
        return {"replies": [self._reply(phone, msg.got_extra_info()),
                            self._owner(msg.owner_customer_message(q, text))]}

    def _handle_owner(self, inbound: dict) -> dict:
        # The owner can also act as a customer (handy for single-phone demos): attachments,
        # quantity answers and ACEPTO go through the customer flow.
        if inbound.get("media"):
            return self._handle_customer(inbound)
        text = inbound.get("body") or ""
        pending = self.store.with_status("pending_approval")
        as_customer = self.store.latest_for_customer(inbound["from"])
        if as_customer and (
            (as_customer["status"] == "needs_quantity" and not pending)
            or (as_customer["status"] == "sent" and is_acceptance(text))
        ):
            return self._handle_customer(inbound)

        cmd = parse_owner_command(text)
        if cmd is None:
            return {"replies": [self._owner(msg.owner_help(pending))]}
        action, value, ref = cmd
        if ref:
            q = self.store.by_number(ref)
            if q is None or q["status"] != "pending_approval":
                return {"replies": [self._owner(f"{ref} no está pendiente de aprobación.\n\n" + msg.owner_help(pending))]}
        elif pending:
            q = pending[0]
        else:
            return {"replies": [self._owner(msg.owner_help(pending))]}

        if action == "discard":
            q = self.store.update(q["id"], status="discarded")
            return {"replies": [self._owner(msg.owner_discarded(q))]}
        adjusted = action == "price"
        if adjusted:
            pricing = apply_owner_total(Pricing(**q["pricing"]), value)
            q = self.store.update(q["id"], pricing=pricing.model_dump())
        return self._send_quote(q, adjusted)

    def _send_quote(self, q: dict, adjusted: bool) -> dict:
        total = Pricing(**q["pricing"]).tier_for(q["pricing"]["requested_quantity"]).extended_price
        q = self.store.update(q["id"], status="sent", sent_at=now(), final_total=total)
        render_quote_pdf(q, self.shop, self._quote_dir(q) / "quote.pdf")
        return {"replies": [
            self._reply(q["customer_phone"], msg.customer_quote_ready(q, self.shop), self._pdf_url(q, "quote")),
            self._owner(msg.owner_sent(q, adjusted)),
        ]}

    # ---------- processing (slow path: download, Claude, pricing, draft PDF) ----------
    def process_quote(self, qid: int) -> dict:
        q = self.store.get(qid)
        if q is None or q["status"] != "processing":
            return {"replies": []}
        spec_dict = q["spec"]
        if not (spec_dict and spec_dict.get("quantity")):
            try:
                spec_dict = self._extract(q).model_dump()
            except (ExtractionError, OSError, ValueError) as e:
                q = self.store.update(qid, status="manual_review")
                return {"replies": [self._owner(msg.owner_manual_review(q, f"no pude leer el plano ({e})."))]}
        if not spec_dict.get("quantity"):
            q = self.store.update(qid, spec=spec_dict, status="needs_quantity")
            return {"replies": [self._reply(q["customer_phone"], msg.ask_quantity(spec_dict))]}

        pricing = price_part(PartSpec(**spec_dict), self.shop)
        total = pricing.tier_for(pricing.requested_quantity).extended_price
        q = self.store.update(qid, spec=spec_dict, pricing=pricing.model_dump(),
                              original_total=total, status="pending_approval")
        render_quote_pdf(q, self.shop, self._quote_dir(q) / "draft.pdf", draft=True)
        pending = len(self.store.with_status("pending_approval"))
        return {"replies": [self._owner(msg.owner_draft(q, self.shop, pending), self._pdf_url(q, "draft"))]}

    def _extract(self, q: dict) -> PartSpec:
        files, media = [], []
        for i, m in enumerate(q["media"]):
            if m["kind"] == "drawing" and not m.get("path"):
                m = {**m, "path": str(download(m["url"], m["content_type"], self._quote_dir(q) / "inbox", i))}
            media.append(m)
            if m["kind"] == "drawing":
                files.append((Path(m["path"]), m["content_type"]))
        self.store.update(q["id"], media=media)
        text = "\n".join(x["text"] for x in q["messages"])
        return extract(files, text, self.shop)

    # ---------- follow-ups ----------
    def run_followups(self, at: Optional[datetime] = None) -> dict:
        """Nudge customers ~20h after the quote, while WhatsApp's 24h service window is still open.

        If the window would close before a useful follow-up time, skip it: sending later needs an
        approved Meta template (not configured in the sandbox)."""
        at = at or now()
        replies, skipped = [], []
        for q in self.store.with_status("sent"):
            if q["followup_sent_at"]:
                continue
            sent, last_in = parse_iso(q["sent_at"]), parse_iso(q["last_customer_msg_at"])
            if last_in is None or last_in > sent:  # customer already replied after the quote
                continue
            window_closes = last_in + WINDOW
            due = min(sent + FOLLOWUP_AFTER, window_closes - WINDOW_MARGIN)
            if due < sent + MIN_FOLLOWUP_GAP:
                skipped.append(q["number"])
                self.store.update(q["id"], followup_sent_at="skipped:window")
                continue
            if due <= at < window_closes:
                replies.append(self._reply(q["customer_phone"], msg.customer_followup(q)))
                self.store.update(q["id"], followup_sent_at=iso(at))
        return {"replies": replies, "skipped_window_closed": skipped}
