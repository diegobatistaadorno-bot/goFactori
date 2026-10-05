# goFactori: WhatsApp quote agent for machine shops

A customer sends a drawing on WhatsApp. They get an instant reply in Spanish. The shop owner gets a priced draft on their own WhatsApp and approves it by replying `1`. The customer then receives an English PDF quote within seconds.

```
Customer (WhatsApp)                   n8n                       quote-service (Python)               Owner (WhatsApp)
  "Necesito 200" + PDF  ──▶ Twilio ──▶ webhook ──▶ /inbound/twilio ──▶ store message
  ◀── "Recibimos su plano, cotización hoy antes de las 5 PM"  (instant)
                                           ──▶ /quotes/{id}/process ─▶ Claude reads drawing → PartSpec
                                                                        deterministic pricing → tiers
                                                                        draft PDF ───────────────────▶ 📋 Borrador Q-1001 + PDF
                                                                                                        "1" / "2450" / "0"
  ◀── "Su cotización Q-1001 está lista" + quote.pdf  ◀──────────────── /inbound/twilio (owner reply) ◀──┘
  "ACEPTO" ──────────────────────────────────────────────────────────▶ status accepted ──────────────▶ 🎉 Cliente aceptó
  (no reply after ~20h, still inside WhatsApp's 24h window) ◀── follow-up (n8n schedule → /followups/run)
```

**How the work is split:** Claude only *reads* the drawing and fills a structured spec (material, envelope, features, tolerances, finish, quantity). The **price is plain code** driven by `quote-service/config/shop.yaml`, which the owner can edit. n8n handles the WhatsApp channel: receiving, sending, scheduling. The quote service decides what to say. So moving from Twilio to the Meta Cloud API later only means swapping the send/receive nodes in n8n.

## Repo layout

| Path | What |
|---|---|
| `quote-service/app/` | FastAPI service: `flow.py` (conversation), `extract.py` (Claude), `pricing.py`, `quote_pdf.py`, `messages.py` (Spanish copy), `store.py` (SQLite) |
| `quote-service/config/shop.yaml` | Demo shop profile: rates, materials, finishes, margin, lead times. **One per client shop; this is what the audit fills in** |
| `n8n/workflows/` | `whatsapp-inbound.json` (webhook → instant reply → process → draft to owner), `whatsapp-followups.json` (every 30 min) |
| `samples/drawings/` | 4 demo drawings (PDF) and their ground-truth spec (`.json`); `generate_drawings.py` rebuilds them |
| `scripts/simulate.py` | Runs the whole conversation in the terminal, with no Twilio needed |
| `docker-compose.yml` | n8n + quote-service |

## 1. Try it now (no accounts needed)

```bash
pip install -r quote-service/requirements.txt
python scripts/simulate.py --drawing PMP-1001 --text "Buenas! Necesito 200 de estas"
python scripts/simulate.py --drawing PMP-1004 --owner-reply 1450      # drawing has no qty → bot asks; owner overrides price
cd quote-service && python -m pytest -q                                # 22 tests
```

This uses the `sidecar` extractor, which reads the sample `.json` files instead of calling Claude. PDFs are written to `quote-service/data-sim/quotes/<number>/`.

To use real Claude extraction (works on any PDF or photo of a drawing):

```bash
export ANTHROPIC_API_KEY=sk-ant-...
python scripts/simulate.py --claude --drawing samples/drawings/PMP-1002_drive-shaft.pdf
```

Comparing Claude's output with `samples/drawings/*.json` is your first accuracy check.

## 2. Run the stack in Docker

```bash
cp .env.example .env        # fill ANTHROPIC_API_KEY, OWNER_WHATSAPP; Twilio values in step 3
docker compose up -d --build
```

- n8n runs at http://localhost:5678 (create the owner account on first visit).
- The quote service runs at http://localhost:8000 (`/health`, `/quotes`, `/docs`).
- Import both workflows: in n8n, **Workflows → Import from file → `n8n/workflows/*.json`**. Or use the CLI: `docker compose exec n8n n8n import:workflow --separate --input=/workflows`.
- Create a credential of type **Basic Auth** named `Twilio API (Basic Auth)`, with user = Account SID and password = Auth Token. Select it on the three `Send WhatsApp` nodes.
- Publish (activate) both workflows.

## 3. Connect Twilio's WhatsApp sandbox

1. Create a Twilio account (the free trial credit is enough). In the Console, go to **Messaging → Try it out → Send a WhatsApp message**.
2. From **both** phones (owner and a test "customer"), send the `join <code>` message shown there to **+1 415 523 8886**. Sandbox sessions expire after 72h; re-send to rejoin.
3. Expose both services publicly. Twilio has to reach the n8n webhook and download the PDF from the quote service:
   ```bash
   cloudflared tunnel --url http://localhost:5678   # → N8N_PUBLIC_URL
   cloudflared tunnel --url http://localhost:8000   # → PUBLIC_BASE_URL
   ```
   Put both URLs in `.env`, then run `docker compose up -d`.
4. In the sandbox settings, set **When a message comes in** to `https://<n8n-url>/webhook/twilio-whatsapp` (POST).
5. Put the Account SID and Auth Token in `.env` (the service uses them to download media) and in the n8n credential.

Then send a drawing PDF from the "customer" phone. If you only have one phone, the owner number can also act as a customer: sending a drawing goes through the customer flow, and `1`/`0`/amounts are treated as owner commands.

## Owner commands (WhatsApp)

| Reply | Effect |
|---|---|
| `1` | Approve the oldest pending draft and send the PDF to the customer |
| `2450` or `$2,450` | Send it with this **total** for the requested quantity; the other tiers scale by the same factor |
| `0` | Discard (the customer receives nothing) |
| `1 Q-1003` | Act on a specific quote when several are pending |
| anything else | Lists pending quotes |

Every override is stored: `original_total` vs `final_total` in the DB. These corrections are what you use to tune each shop's `shop.yaml`.

## Pricing model

```
stock      = part envelope + allowance (box, or round bar for turned parts)
material   = stock weight × $/lb × (1 + scrap)
cycle min  = (stock vol × removal fraction ÷ removal rate + features × min/feature) × tolerance multiplier + handling
unit price = ((setup × setups + programming + finish lot charge) / qty + material + cycle × rate + finish/part) × (1 + margin)
```

Each quote includes the requested quantity plus the closest standard breaks (10/50/200), a minimum order, and a lead time. IVU (11.5%) is shown as a note and applied at invoicing. `POST /price` prices a spec directly, which helps match the formula to a shop's past quotes during the audit.

## Behavior notes

- **Instant reply wording:** requests before 3 PM on a weekday get "hoy antes de las 5:00 PM". Later ones get "mañana / el lunes antes de las 12:00 PM". Both are set in `shop.yaml`.
- **Missing quantity:** the bot asks the customer. Their answer (e.g. "75") resumes the same quote.
- **Text with no drawing:** the bot asks for the PDF or a photo. The text is kept with the request.
- **STEP/CAD files without a PDF:** these go to the owner for manual review. Parsing 3D files is a later phase that needs a geometry service (CadQuery/OpenCascade).
- **Unreadable drawing or Claude error:** the owner gets a manual-review notice. The customer already has their acknowledgment.
- **Follow-up:** sent once, about 20h after the quote, but always before WhatsApp's 24h window closes (counted from the customer's last message). If the window would close too soon, it's skipped, because sending after that needs a Meta-approved template.
- **Customer messages after the quote:** `ACEPTO`/`dale`/`aprobado` marks the quote accepted and notifies the owner. Anything else is forwarded to the owner.

## Before using this with a real shop

- [ ] **Validate Twilio webhook signatures** (`X-Twilio-Signature`). Today the webhook path is the only protection.
- [ ] **Message templates:** in production, owner drafts and late follow-ups that fall outside the 24h window need approved utility templates.
- [ ] **WhatsApp coexistence:** confirm the shop's existing WhatsApp Business app number can stay in use alongside the API through your provider (or the Meta Cloud API directly).
- [ ] **Calibrate `shop.yaml`** against 20–50 of the shop's past quotes.
- [ ] **Back up** the `quote-data` volume (SQLite + PDFs). Move to Postgres once there are several shops.
- [ ] **n8n licensing:** n8n's Sustainable Use License is fine for running a deployment for each client. Check with n8n before offering it as a shared hosted SaaS.
