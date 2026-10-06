# WhatsApp quote agent on n8n Cloud (no hosting)

This is the same product as `quote-service/`, built entirely inside n8n Cloud: there's no Docker, no server and no tunnel. It's live in `diegobatista-ai.app.n8n.cloud`:

| What | Where |
|---|---|
| **WhatsApp Quote Agent** (main workflow, inactive) | https://diegobatista-ai.app.n8n.cloud/workflow/cHkOeU8hIUenOZGK |
| **WhatsApp Quote Agent - Logic** (sub-workflow) | https://diegobatista-ai.app.n8n.cloud/workflow/Uqlmvc3j5XMOnXcM |
| `wa_quotes` data table | n8n → Data tables (personal project) |
| Twilio webhook (POST) | `https://diegobatista-ai.app.n8n.cloud/webhook/wa-quote-in` |
| Quote PDF link (GET) | `https://diegobatista-ai.app.n8n.cloud/webhook/wa-quote-pdf?t=<token>&kind=quote` |

## How it works

```
Twilio ─▶ Twilio WhatsApp in ─▶ Ack Twilio (empty TwiML) ─▶ Load quotes ─▶ Decide what to do* ─▶ Save quote ─▶ Send WhatsApp (instant Spanish reply)
                                                                               │
                                     new drawing ─▶ Download drawing ─▶ Set file type ─▶ Claude reads PDF/photo ─▶ Price and draft* ─▶ Save ─▶ Send draft to owner
Twilio fetches PDF ─▶ Quote PDF link ─▶ Find quote by link ─▶ Render quote PDF* ─▶ Return PDF
Every 30 min ─▶ Load sent quotes ─▶ Due follow-ups* ─▶ Mark follow-up ─▶ Send follow-up
```

`*` marks steps that call the **Logic** sub-workflow. That sub-workflow is one Code node holding the shop settings (`CONFIG`), the pricing formula, the Spanish messages, the owner commands (`1` / new total / `0`), the follow-up rules and the English PDF renderer. It's the same rules as the Python service. The bracket at 200 pcs prices at $5,836 in both versions.

Claude (`claude-opus-5-5`, through your existing "Anthropic account" credential) only reads the drawing and returns the spec as JSON. The price itself is always calculated by the formula in the Logic workflow, never by Claude.

## Status (tested in your n8n through the MCP connector)

- ✅ **Text-only message:** the bot answers in Spanish asking for the drawing, and the quote is saved to `wa_quotes`.
- ✅ **Drawing + "necesito 200":** Claude read the bracket drawing and got every field right (material, size, 5 features, ±.002, anodize). The owner draft matches the Python version to the cent.
- ✅ **Drive shaft drawing with no quantity in the message:** Claude took the quantity from the title block and flagged the ±.0005 journal for the owner.
- ✅ **Owner replies `1 Q-1004`:** the quote is marked sent, the customer message carries the PDF link, and the owner gets a confirmation.
- ✅ **PDF link:** returns the quote as a PDF.
- ⏳ **Twilio send/receive:** not tested yet. It needs your Twilio account; the send nodes currently stop with "Credentials not found", by design.
- Test rows Q-1001…Q-1004 are in `wa_quotes`. Delete them in n8n (Data tables → wa_quotes) before a real demo.

## Go live (about 15 minutes)

1. **Twilio:** create an account, then go to Messaging → Try it out → Send a WhatsApp message. Send `join <code>` to +1 415 523 8886 from **two** phones: the owner's and a test "customer".
2. In the sandbox settings, set **When a message comes in** to `https://diegobatista-ai.app.n8n.cloud/webhook/wa-quote-in` (method POST).
3. **n8n credential:** Credentials → Create → **Basic Auth**, named `Twilio (Basic Auth)`. User = Account SID, Password = Auth Token. Select it on the four HTTP nodes: *Send WhatsApp*, *Download drawing*, *Send draft to owner*, *Send follow-up*.
4. **Shop settings:** in the Logic workflow's *Quote logic* node, set `ownerWhatsapp` (e.g. `whatsapp:+17875551234`) and `twilioAccountSid` at the top of `CONFIG`. Or send me both values and I'll update the repo and n8n.
5. **Publish** the main workflow. The Logic sub-workflow doesn't need to be published.
6. From the customer phone, send a drawing PDF and "necesito 50".

## Changing the logic

Edit `n8n-cloud/src/` (shop settings live in `src/config.js`), then:

```bash
node n8n-cloud/test/run.js   # runs every Code node locally against a fake n8n + data table, writes PDFs to test/out/
node n8n-cloud/build.js      # regenerates dist/: main.sdk.ts, logic.sdk.ts, logic.js
```

Then paste `dist/logic.js` into the *Quote logic* node, or ask Claude to push it through the n8n connector. `dist/*.sdk.ts` is the n8n Workflow SDK description of both workflows, used to recreate them in another shop's n8n.

## Notes

- **Follow-ups and owner drafts sent more than 24h after the person's last message** need Meta-approved templates in production. In the sandbox this only matters for the follow-up, which is designed to stay inside the window.
- **The webhook isn't verified yet.** It doesn't check `X-Twilio-Signature`; add that before using it with a real shop.
- **The PDF link is guarded only by its random token.** It's unguessable, but anyone holding the link can open the PDF, which is how Twilio fetches it too.
