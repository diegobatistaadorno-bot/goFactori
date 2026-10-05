// Runs the n8n Code-node snippets locally with a fake n8n runtime and an in-memory data table.
//   node n8n-cloud/test/run.js            (writes sample PDFs to n8n-cloud/test/out/)
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const SRC = path.join(__dirname, '..', 'src');
const SAMPLES = path.join(__dirname, '..', '..', 'samples', 'drawings');
const OUT = path.join(__dirname, 'out');
const OWNER = 'whatsapp:+17875550100';
const CUSTOMER = 'whatsapp:+17875551234';

const lib = ['config.js', 'fonts.js', 'lib.js'].map((f) => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n')
  .replace("'whatsapp:+1787XXXXXXX'", JSON.stringify(OWNER));

// Run one Code node the way n8n does, with $ / $input. Collector nodes run alone; the logic
// sub-workflow node runs with the shared library prepended.
function runNode(snippet, nodeOutputs, input) {
  const code = fs.readFileSync(path.join(SRC, 'nodes', snippet), 'utf8');
  const $ = (name) => {
    const items = nodeOutputs[name];
    if (!items) throw new Error(`node '${name}' has not run`);
    return { first: () => items[0], all: () => items };
  };
  const $input = { first: () => input[0], all: () => input };
  const src = snippet === 'logic.js' ? `${lib}\n${code}` : code;
  return new Function('$', '$input', src)($, $input);
}

// Collector node -> "Quote logic" sub-workflow (Execute Sub-workflow passes the items through).
const viaLogic = (collector, outputs, input) => runNode('logic.js', {}, runNode(collector, outputs, input));

// in-memory stand-in for the wa_quotes data table (upsert by number)
const table = [];
const upsert = (row) => {
  const i = table.findIndex((r) => r.number === row.number);
  if (i >= 0) table[i] = { ...table[i], ...row }; else table.push({ id: table.length + 1, ...row });
};
const sample = (id) => JSON.parse(fs.readFileSync(fs.readdirSync(SAMPLES).filter((f) => f.startsWith(id) && f.endsWith('.json')).map((f) => path.join(SAMPLES, f))[0], 'utf8'));

function inbound(body) {
  const outputs = { 'Twilio WhatsApp in': [{ json: { body } }], 'Load quotes': table.map((r) => ({ json: { ...r } })) };
  const [plan] = viaLogic('collect_message.js', outputs);
  outputs['Decide what to do'] = [plan];
  if (plan.json.has_quote) upsert(plan.json.row);
  const replies = runNode('list_replies.js', outputs).map((i) => i.json);
  let drafted = [];
  if (plan.json.process) {
    // stand-in for "Read drawing (Claude)": the node's text output containing the JSON spec
    const claude = plan.json.needs_extraction ? { content: [{ type: 'text', text: JSON.stringify(sample(body._sample)) }] } : {};
    const [priced] = viaLogic('collect_reading.js', outputs, [{ json: claude }]);
    outputs['Price and draft'] = [priced];
    upsert(priced.json.row);
    drafted = runNode('list_replies_priced.js', outputs).map((i) => i.json);
  }
  return { plan: plan.json, replies, drafted };
}

function pdf(url) {
  const u = new URL(url);
  const outputs = { 'Quote PDF link': [{ json: { query: Object.fromEntries(u.searchParams) } }] };
  const rows = table.filter((r) => r.pdf_token === u.searchParams.get('t')).map((r) => ({ json: r }));
  const [res] = viaLogic('collect_pdf.js', outputs, rows);
  return res;
}

const twilio = (from, body, extra = {}) => ({ From: from, Body: body, ProfileName: 'Juan Pérez', NumMedia: '0', ...extra });
const withDrawing = (from, body, id) => twilio(from, body, { NumMedia: '1', MediaUrl0: `https://api.twilio.com/media/${id}`, MediaContentType0: 'application/pdf', _sample: id });

fs.mkdirSync(OUT, { recursive: true });

// 1. customer sends a drawing -> instant ack, Claude reads it, owner gets the draft + PDF link
let r = inbound(withDrawing(CUSTOMER, 'Hola, necesito 200 de estas', 'PMP-1001'));
assert.strictEqual(r.replies[0].to, CUSTOMER);
assert.match(r.replies[0].body, /Recibimos su plano/);
assert.match(r.replies[0].twilio_form, /^From=whatsapp%3A%2B14155238886&To=whatsapp%3A%2B17875551234/);
assert.ok(r.plan.needs_extraction && r.plan.claude_prompt.includes('aluminum_6061'));
assert.strictEqual(r.drafted[0].to, OWNER);
assert.match(r.drafted[0].body, /Borrador Q-1001/);
const draftUrl = r.drafted[0].media_url;
assert.match(draftUrl, /wa-quote-pdf\?t=\w+&kind=draft$/);
assert.strictEqual(table[0].status, 'pending_approval');
console.log('--- owner draft ---\n' + r.drafted[0].body);

const draft = pdf(draftUrl);
assert.ok(draft.json.found);
fs.writeFileSync(path.join(OUT, 'Q-1001-draft.pdf'), Buffer.from(draft.binary.data.data, 'base64'));

// 2. owner approves -> customer gets the quote PDF link
r = inbound(twilio(OWNER, '1'));
assert.strictEqual(r.replies[0].to, CUSTOMER);
assert.match(r.replies[0].media_url, /kind=quote$/);
assert.strictEqual(table[0].status, 'sent');
const quote = pdf(r.replies[0].media_url);
fs.writeFileSync(path.join(OUT, 'Q-1001.pdf'), Buffer.from(quote.binary.data.data, 'base64'));
console.log('--- to customer ---\n' + r.replies[0].body);

// 3. customer accepts
r = inbound(twilio(CUSTOMER, 'Acepto, dale'));
assert.strictEqual(table[0].status, 'accepted');
assert.deepStrictEqual(r.replies.map((x) => x.to), [CUSTOMER, OWNER]);

// 4. drawing without quantity -> bot asks; answer resumes the same quote; owner sets a new total
r = inbound(withDrawing('whatsapp:+17875552222', '', 'PMP-1004'));
assert.match(r.drafted[0].body, /Cuántas piezas/);
assert.strictEqual(table[1].status, 'needs_quantity');
r = inbound(twilio('whatsapp:+17875552222', 'Necesito 75'));
assert.ok(r.plan.process && !r.plan.needs_extraction);
assert.strictEqual(r.drafted[0].to, OWNER);
r = inbound(twilio(OWNER, '$1,450'));
assert.strictEqual(table[1].final_total, '1450');
assert.match(r.replies[1].body, /precio ajustado/);

// 5. text only -> ask for the drawing; unknown owner text -> help
r = inbound(twilio('whatsapp:+17875553333', 'Buenas, hacen piezas en inox?'));
assert.match(r.replies[0].body, /plano en PDF/);
r = inbound(twilio(OWNER, 'como va todo?'));
assert.match(r.replies[0].body, /No hay cotizaciones pendientes/);

// 6. Claude failure -> manual review notice to owner
const outputs = { 'Twilio WhatsApp in': [{ json: { body: withDrawing('whatsapp:+17875554444', '', 'PMP-1002') } }], 'Load quotes': table.map((x) => ({ json: x })) };
const [plan] = viaLogic('collect_message.js', outputs);
outputs['Decide what to do'] = [plan];
const [failed] = viaLogic('collect_reading.js', outputs, [{ json: { error: { message: 'overloaded' } } }]);
assert.strictEqual(failed.json.row.status, 'manual_review');
assert.match(failed.json.replies[0].body, /revisión manual/);

// 7. follow-ups: quote sent 21h ago, customer last wrote just before -> one nudge
const sentAt = new Date(Date.now() - 21 * 3600e3).toISOString();
const fu = viaLogic('collect_sent.js', {}, [{ json: { ...table[1], status: 'sent', sent_at: sentAt, last_customer_msg_at: new Date(Date.now() - 21.5 * 3600e3).toISOString(), followup_sent_at: '' } }]);
assert.strictEqual(fu.length, 1);
assert.ok(fu[0].json.has_reply && /Pudo revisar/.test(fu[0].json.body));

// 8. PDF link with a bad token -> not found
assert.strictEqual(pdf('https://x/wa-quote-pdf?t=nope&kind=quote').json.found, false);

console.log('\nall n8n-cloud checks passed; PDFs in', OUT);
