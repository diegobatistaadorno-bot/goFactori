"""SQLite persistence for quotes. One row per quote request, from first message to accepted."""
from __future__ import annotations

import json
import secrets
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

# needs_drawing -> processing -> needs_quantity | pending_approval | manual_review
# pending_approval -> sent | discarded ; sent -> accepted
OPEN_INTAKE = ("needs_drawing", "needs_quantity")
ACTIVE = ("needs_drawing", "needs_quantity", "processing", "pending_approval", "manual_review", "sent")

SCHEMA = """
CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT UNIQUE,
    status TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_name TEXT,
    messages_json TEXT NOT NULL DEFAULT '[]',
    media_json TEXT NOT NULL DEFAULT '[]',
    spec_json TEXT,
    pricing_json TEXT,
    original_total REAL,
    final_total REAL,
    pdf_token TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_customer_msg_at TEXT,
    sent_at TEXT,
    followup_sent_at TEXT,
    accepted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_quotes_phone ON quotes(customer_phone, status);
"""


def now() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def parse_iso(value: Optional[str]) -> Optional[datetime]:
    return datetime.fromisoformat(value) if value else None


class Store:
    def __init__(self, db_path: Path):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)

    def _row(self, row: sqlite3.Row | None) -> Optional[dict]:
        if row is None:
            return None
        q = dict(row)
        q["messages"] = json.loads(q.pop("messages_json"))
        q["media"] = json.loads(q.pop("media_json"))
        q["spec"] = json.loads(q.pop("spec_json")) if q["spec_json"] else None
        q["pricing"] = json.loads(q.pop("pricing_json")) if q["pricing_json"] else None
        return q

    def create(self, phone: str, name: Optional[str], prefix: str) -> dict:
        ts = iso(now())
        cur = self.conn.execute(
            "INSERT INTO quotes (status, customer_phone, customer_name, created_at, updated_at, pdf_token)"
            " VALUES ('needs_drawing', ?, ?, ?, ?, ?)",
            (phone, name, ts, ts, secrets.token_urlsafe(16)),
        )
        qid = cur.lastrowid
        self.conn.execute("UPDATE quotes SET number = ? WHERE id = ?", (f"{prefix}-{1000 + qid}", qid))
        self.conn.commit()
        return self.get(qid)

    def get(self, qid: int) -> Optional[dict]:
        return self._row(self.conn.execute("SELECT * FROM quotes WHERE id = ?", (qid,)).fetchone())

    def by_number(self, number: str) -> Optional[dict]:
        row = self.conn.execute("SELECT * FROM quotes WHERE upper(number) = upper(?)", (number,)).fetchone()
        return self._row(row)

    def by_token(self, token: str) -> Optional[dict]:
        return self._row(self.conn.execute("SELECT * FROM quotes WHERE pdf_token = ?", (token,)).fetchone())

    def latest_for_customer(self, phone: str, statuses: tuple[str, ...] = ACTIVE) -> Optional[dict]:
        marks = ",".join("?" * len(statuses))
        row = self.conn.execute(
            f"SELECT * FROM quotes WHERE customer_phone = ? AND status IN ({marks}) ORDER BY id DESC LIMIT 1",
            (phone, *statuses),
        ).fetchone()
        return self._row(row)

    def with_status(self, *statuses: str) -> list[dict]:
        marks = ",".join("?" * len(statuses))
        rows = self.conn.execute(
            f"SELECT * FROM quotes WHERE status IN ({marks}) ORDER BY id", statuses
        ).fetchall()
        return [self._row(r) for r in rows]

    def update(self, qid: int, **fields: Any) -> dict:
        encoded = {}
        for key, value in fields.items():
            if key in ("messages", "media", "spec", "pricing"):
                encoded[f"{key}_json"] = json.dumps(value) if value is not None else None
            elif isinstance(value, datetime):
                encoded[key] = iso(value)
            else:
                encoded[key] = value
        encoded["updated_at"] = iso(now())
        sets = ", ".join(f"{k} = ?" for k in encoded)
        self.conn.execute(f"UPDATE quotes SET {sets} WHERE id = ?", (*encoded.values(), qid))
        self.conn.commit()
        return self.get(qid)

    def add_customer_message(self, qid: int, text: str, media: list[dict]) -> dict:
        q = self.get(qid)
        messages = q["messages"] + ([{"at": iso(now()), "text": text}] if text else [])
        return self.update(qid, messages=messages, media=q["media"] + media, last_customer_msg_at=now())
