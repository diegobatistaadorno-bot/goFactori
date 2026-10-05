"""Run the WhatsApp quote flow end to end without Twilio, printing the chat.

    # offline (uses the sample drawings' ground-truth specs instead of Claude)
    python scripts/simulate.py --drawing PMP-1001 --text "Hola, necesito 200 de estas"

    # real extraction with Claude (needs ANTHROPIC_API_KEY)
    python scripts/simulate.py --drawing samples/drawings/PMP-1002_drive-shaft.pdf --claude

Then the owner step:  --owner-reply 1   (or a new total like 2450, or 0 to discard)
PDFs land in quote-service/data-sim/quotes/<number>/.
"""
from __future__ import annotations

import argparse
import os
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CUSTOMER = "whatsapp:+17875551234"
OWNER = "+17875550100"


def show(result: dict, owner: str) -> None:
    for r in result.get("replies", []):
        who = "🏭 → DUEÑO" if r["to"] == owner else "🏭 → CLIENTE"
        print(f"\n{who}\n" + textwrap.indent(r["body"], "   │ "))
        if r.get("media_url"):
            print(f"   📎 {r['media_url']}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--drawing", default="PMP-1001", help="sample id (PMP-1001..1004) or a PDF/image path")
    ap.add_argument("--text", default="Hola, necesito cotizar esta pieza.")
    ap.add_argument("--quantity-reply", default="75", help="sent if the bot asks for a quantity")
    ap.add_argument("--owner-reply", default="1")
    ap.add_argument("--customer-reply", default="Acepto")
    ap.add_argument("--claude", action="store_true", help="use Claude instead of the sidecar extractor")
    args = ap.parse_args()

    data_dir = ROOT / "quote-service" / "data-sim"
    os.environ.setdefault("DATA_DIR", str(data_dir))
    os.environ["EXTRACTOR"] = "claude" if args.claude else "sidecar"
    os.environ["ALLOW_LOCAL_MEDIA"] = "true"
    os.environ["OWNER_WHATSAPP"] = OWNER
    os.environ.setdefault("PUBLIC_BASE_URL", "http://localhost:8000")
    sys.path.insert(0, str(ROOT / "quote-service"))

    from app.config import get_settings, load_shop
    from app.flow import QuoteFlow
    from app.store import Store

    settings = get_settings()
    flow = QuoteFlow(Store(settings.data_dir / "quotes.db"), load_shop())
    path = Path(args.drawing)
    if not path.exists():
        path = next((ROOT / "samples" / "drawings").glob(f"{args.drawing}_*.pdf"))
    ctype = "application/pdf" if path.suffix.lower() == ".pdf" else f"image/{path.suffix.lstrip('.').lower()}"

    def customer(text, media=None):
        print(f"\n👤 CLIENTE: {text or ''}" + (f"  📎 {path.name}" if media else ""))
        return flow.handle_inbound({"from": CUSTOMER, "profile_name": "Juan Pérez", "body": text, "media": media or []})

    r = customer(args.text, [{"url": f"file://{path.resolve()}", "content_type": ctype}])
    show(r, settings.owner_whatsapp)
    qid = r["process_quote_id"]
    print("\n   … procesando (extracción + precio + PDF) …")
    r = flow.process_quote(qid)
    show(r, settings.owner_whatsapp)
    if flow.store.get(qid)["status"] == "needs_quantity":
        r = customer(args.quantity_reply)
        show(r, settings.owner_whatsapp)
        r = flow.process_quote(qid)
        show(r, settings.owner_whatsapp)
    if flow.store.get(qid)["status"] != "pending_approval":
        return
    print(f"\n👷 DUEÑO: {args.owner_reply}")
    r = flow.handle_inbound({"from": settings.owner_whatsapp, "body": args.owner_reply, "media": []})
    show(r, settings.owner_whatsapp)
    if flow.store.get(qid)["status"] == "sent" and args.customer_reply:
        show(customer(args.customer_reply), settings.owner_whatsapp)
    q = flow.store.get(qid)
    print(f"\nEstado final: {q['number']} = {q['status']}. PDFs en {settings.data_dir / 'quotes' / q['number']}")


if __name__ == "__main__":
    main()
