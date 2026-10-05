from datetime import timedelta

from app.flow import is_acceptance, parse_owner_command, parse_quantity
from app.store import now, parse_iso
from conftest import drawing

CUSTOMER = "whatsapp:+17875551234"
OWNER = "whatsapp:+17875550100"


def customer(text="", media=None):
    return {"from": CUSTOMER, "profile_name": "Juan Pérez", "body": text, "media": media or []}


def owner(text):
    return {"from": OWNER, "body": text, "media": []}


def test_full_happy_path(flow):
    r = flow.handle_inbound(customer("Hola, necesito cotizar esta pieza, 200 unidades", [drawing("PMP-1001")]))
    assert r["replies"][0]["to"] == CUSTOMER
    assert "Recibimos su plano" in r["replies"][0]["body"]
    qid = r["process_quote_id"]

    r = flow.process_quote(qid)
    draft = r["replies"][0]
    assert draft["to"] == OWNER
    assert "Borrador Q-1001" in draft["body"] and draft["media_url"].endswith("/draft.pdf")
    assert flow.store.get(qid)["status"] == "pending_approval"

    r = flow.handle_inbound(owner("1"))
    to_customer, to_owner = r["replies"]
    assert to_customer["to"] == CUSTOMER and to_customer["media_url"].endswith("/quote.pdf")
    assert "Q-1001" in to_customer["body"] and "ACEPTO" in to_customer["body"]
    assert to_owner["to"] == OWNER
    q = flow.store.get(qid)
    assert q["status"] == "sent"
    assert (flow.settings.data_dir / "quotes" / "Q-1001" / "quote.pdf").exists()

    r = flow.handle_inbound(customer("Acepto, dale"))
    assert flow.store.get(qid)["status"] == "accepted"
    assert {x["to"] for x in r["replies"]} == {CUSTOMER, OWNER}


def test_owner_sets_new_price(flow):
    qid = flow.handle_inbound(customer("", [drawing("PMP-1002")]))["process_quote_id"]
    flow.process_quote(qid)
    r = flow.handle_inbound(owner("$2,450"))
    q = flow.store.get(qid)
    assert q["status"] == "sent" and q["final_total"] == 2450
    assert q["original_total"] != 2450
    assert "$2,450.00" in r["replies"][0]["body"]


def test_owner_discards(flow):
    qid = flow.handle_inbound(customer("", [drawing("PMP-1003")]))["process_quote_id"]
    flow.process_quote(qid)
    flow.handle_inbound(owner("0"))
    assert flow.store.get(qid)["status"] == "discarded"


def test_missing_quantity_is_asked(flow):
    qid = flow.handle_inbound(customer("cotización por favor", [drawing("PMP-1004")]))["process_quote_id"]
    r = flow.process_quote(qid)
    assert r["replies"][0]["to"] == CUSTOMER and "Cuántas piezas" in r["replies"][0]["body"]
    r = flow.handle_inbound(customer("Necesito 75"))
    assert r["process_quote_id"] == qid
    r = flow.process_quote(qid)
    assert r["replies"][0]["to"] == OWNER
    assert flow.store.get(qid)["pricing"]["requested_quantity"] == 75


def test_text_only_asks_for_drawing(flow):
    r = flow.handle_inbound(customer("Buenas, hacen piezas en acero inoxidable?"))
    assert "plano en PDF" in r["replies"][0]["body"]
    assert r.get("process_quote_id") is None
    # the drawing arriving later continues the same request
    r = flow.handle_inbound(customer("", [drawing("PMP-1001")]))
    assert r["process_quote_id"] == 1


def test_step_file_goes_to_manual_review(flow):
    r = flow.handle_inbound(customer("", [{"url": "file:///dev/null", "content_type": "application/octet-stream"}]))
    assert {x["to"] for x in r["replies"]} == {CUSTOMER, OWNER}


def test_unreadable_drawing_goes_to_manual_review(flow, tmp_path):
    bogus = tmp_path / "x.pdf"
    bogus.write_bytes(b"%PDF-1.4 not a sample")
    qid = flow.handle_inbound(customer("", [{"url": f"file://{bogus}", "content_type": "application/pdf"}]))["process_quote_id"]
    r = flow.process_quote(qid)
    assert r["replies"][0]["to"] == OWNER and "revisión manual" in r["replies"][0]["body"]


def test_two_pending_quotes_need_reference(flow):
    for name in ("PMP-1001", "PMP-1003"):
        qid = flow.handle_inbound({**customer("", [drawing(name)]), "from": f"whatsapp:+1787555{name[-4:]}"})["process_quote_id"]
        r = flow.process_quote(qid)
    assert "Q-1002" in r["replies"][0]["body"] and "pendientes" in r["replies"][0]["body"]
    flow.handle_inbound(owner("1 Q-1002"))
    assert flow.store.by_number("Q-1002")["status"] == "sent"
    assert flow.store.by_number("Q-1001")["status"] == "pending_approval"


def test_followup_inside_window(flow):
    qid = flow.handle_inbound(customer("", [drawing("PMP-1001")]))["process_quote_id"]
    flow.process_quote(qid)
    flow.handle_inbound(owner("1"))
    sent = parse_iso(flow.store.get(qid)["sent_at"])
    assert flow.run_followups(sent + timedelta(hours=5))["replies"] == []
    r = flow.run_followups(sent + timedelta(hours=21))
    assert r["replies"][0]["to"] == CUSTOMER and "Q-1001" in r["replies"][0]["body"]
    assert flow.run_followups(sent + timedelta(hours=22))["replies"] == []  # only once


def test_followup_skipped_when_customer_replied(flow):
    qid = flow.handle_inbound(customer("", [drawing("PMP-1001")]))["process_quote_id"]
    flow.process_quote(qid)
    flow.handle_inbound(owner("1"))
    flow.handle_inbound(customer("¿Pueden entregar el viernes?"))
    assert flow.run_followups(now() + timedelta(hours=21))["replies"] == []


def test_followup_uses_window_before_it_closes(flow):
    qid = flow.handle_inbound(customer("", [drawing("PMP-1001")]))["process_quote_id"]
    flow.process_quote(qid)
    flow.handle_inbound(owner("1"))
    q = flow.store.get(qid)
    # customer wrote 8h before the quote went out -> nudge 23h after their message (15h after quote)
    flow.store.update(qid, last_customer_msg_at=parse_iso(q["sent_at"]) - timedelta(hours=8))
    sent = parse_iso(q["sent_at"])
    assert flow.run_followups(sent + timedelta(hours=13))["replies"] == []
    assert len(flow.run_followups(sent + timedelta(hours=15, minutes=30))["replies"]) == 1


def test_parsers():
    assert parse_quantity("necesito 1,000 piezas") == 1000
    assert parse_quantity("hola") is None
    assert parse_owner_command("1") == ("approve", None, None)
    assert parse_owner_command("1 Q-1003") == ("approve", None, "Q-1003")
    assert parse_owner_command("q1003 0") == ("discard", None, "Q-1003")
    assert parse_owner_command("$2,450.50") == ("price", 2450.5, None)
    assert parse_owner_command("como va todo") is None
    assert is_acceptance("Sí, ACEPTO la cotización")
    assert is_acceptance("de acuerdo")
    assert not is_acceptance("tengo una pregunta")
