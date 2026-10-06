// Builds n8n Workflow SDK code for the WhatsApp quote agent from src/ (the tested logic):
//   dist/logic.sdk.ts  sub-workflow "WhatsApp Quote Agent - Logic" (shop settings + all logic, one Code node)
//   dist/main.sdk.ts   workflow "WhatsApp Quote Agent" (Twilio in/out, Claude, data table, PDF link, follow-ups)
//   dist/logic.js      the Code node's full source (what goes in the "Quote logic" node)
//   node n8n-cloud/build.js
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const DATA_TABLE = { __rl: true, mode: 'id', value: 'X4jQZjAWjXGWqe8k', cachedResultName: 'wa_quotes' };
const ANTHROPIC_CRED = { id: 'K04J9OtEOhP48ePn', name: 'Anthropic account' };
const MODEL = 'claude-opus-5-5';
const LOGIC_WORKFLOW_ID = 'Uqlmvc3j5XMOnXcM'; // "WhatsApp Quote Agent - Logic" in diegobatista-ai.app.n8n.cloud
const COLUMNS = ['number', 'status', 'customer_phone', 'customer_name', 'messages', 'media_url', 'media_type',
  'spec', 'pricing', 'original_total', 'final_total', 'pdf_token', 'last_customer_msg_at', 'sent_at',
  'followup_sent_at', 'accepted_at'];

const lib = ['config.js', 'fonts.js', 'lib.js'].map((f) => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
const read = (f) => fs.readFileSync(path.join(SRC, 'nodes', f), 'utf8');
const logicSource = '// Generated from the goFactori repo (n8n-cloud/src). Shop settings: CONFIG right below.\n'
  + `${lib}\n// ---------- entry point ----------\n${read('logic.js')}`;
const code = (snippet) => JSON.stringify(read(snippet));
const j = (v) => JSON.stringify(v);
const upsertColumns = j({
  mappingMode: 'defineBelow',
  matchingColumns: [],
  value: Object.fromEntries(COLUMNS.map((c) => [c, `__EXPR__{{ $json.row.${c} }}`])),
  schema: COLUMNS.map((c) => ({ id: c, displayName: c, required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true })),
}).replace(/"__EXPR__(\{\{[^"]*\}\})"/g, "expr('$1')");

const bool = (left) => `{ options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 }, conditions: [{ leftValue: expr(${j(left)}), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }`;

const sendNode = (v, name) => `const ${v} = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.5,
  config: {
    name: ${j(name)}, onError: 'continueRegularOutput', retryOnFail: true, maxTries: 3,
    parameters: {
      method: 'POST',
      url: expr('https://api.twilio.com/2010-04-01/Accounts/{{ $json.account_sid }}/Messages.json'),
      authentication: 'genericCredentialType', genericAuthType: 'httpBasicAuth',
      sendBody: true, contentType: 'raw', rawContentType: 'application/x-www-form-urlencoded',
      body: expr('{{ $json.twilio_form }}'),
      options: {},
    },
    credentials: { httpBasicAuth: newCredential('Twilio (Basic Auth)') },
  },
  output: [{ sid: 'SM123', status: 'queued' }],
});`;

const upsertNode = (v, name) => `const ${v} = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: {
    name: ${j(name)},
    parameters: {
      resource: 'row', operation: 'upsert', dataTableId: ${j(DATA_TABLE)}, matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'number', condition: 'eq', keyValue: expr('{{ $json.row.number }}') }] },
      columns: quoteColumns,
      options: {},
    },
  },
  output: [{ id: 1, number: 'Q-1001', status: 'pending_approval' }],
});`;

const codeNode = (v, name, snippet, output) => `const ${v} = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: ${j(name)}, parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: ${code(snippet)} } },
  output: ${j(output)},
});`;

const logicCall = (collectVar, collectName, collector, execVar, execName, output) => `${codeNode(collectVar, collectName, collector, [{ op: 'x' }])}

const ${execVar} = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.4,
  config: {
    name: ${j(execName)},
    parameters: { mode: 'once', source: 'database',
      workflowId: { __rl: true, mode: 'id', value: '${LOGIC_WORKFLOW_ID}', cachedResultName: 'WhatsApp Quote Agent - Logic' },
      options: { waitForSubWorkflow: true } },
  },
  output: ${j(output)},
});`;

const claudeNode = (v, name, resource) => `const ${v} = node({
  type: '@n8n/n8n-nodes-langchain.anthropic', version: 1,
  config: {
    name: ${j(name)}, onError: 'continueRegularOutput',
    parameters: {
      resource: '${resource}', operation: 'analyze',
      modelId: { __rl: true, mode: 'id', value: '${MODEL}' },
      text: expr("{{ $('Decide what to do').first().json.claude_prompt }}"),
      inputType: 'binary', binaryPropertyName: 'data', simplify: true,
      options: { maxTokens: 4000 },
    },
    credentials: { anthropicApi: ${j(ANTHROPIC_CRED)} },
  },
  output: [{ content: [{ type: 'text', text: '{"part_name": "Mounting Bracket"}' }] }],
});`;

const getRows = (v, name, filter, extra) => `const ${v} = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: {
    name: ${j(name)}, alwaysOutputData: true, executeOnce: true,${extra || ''}
    parameters: {
      resource: 'row', operation: 'get', dataTableId: ${j(DATA_TABLE)}, returnAll: true,${filter ? `
      matchType: 'allConditions', filters: { conditions: [${filter}] },` : ''}
    },
  },
  output: [{ id: 1, number: 'Q-1001', status: 'sent', pdf_token: 'abc' }],
});`;

const ifNode = (v, name, cond, extra) => `const ${v} = ifElse({
  version: 2.3,
  config: { name: ${j(name)},${extra || ''} parameters: { conditions: ${cond} } },
});`;

const sdk = `import { workflow, node, trigger, sticky, ifElse, newCredential, expr } from '@n8n/workflow-sdk';

const quoteColumns = ${upsertColumns};

const twilioIn = trigger({
  type: 'n8n-nodes-base.webhook', version: 2.1,
  config: { name: 'Twilio WhatsApp in', parameters: { httpMethod: 'POST', path: 'wa-quote-in', responseMode: 'responseNode', options: {} } },
  output: [{ body: { From: 'whatsapp:+17875551234', Body: 'Hola, necesito 200', ProfileName: 'Juan', NumMedia: '1', MediaUrl0: 'https://api.twilio.com/x', MediaContentType0: 'application/pdf' } }],
});

const ackTwilio = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.5,
  config: { name: 'Ack Twilio', parameters: { respondWith: 'text', responseBody: '<Response></Response>',
    options: { responseHeaders: { entries: [{ name: 'Content-Type', value: 'text/xml' }] } } } },
  output: [{ body: {} }],
});

${getRows('loadQuotes', 'Load quotes')}

${logicCall('collectMessage', 'Collect message', 'collect_message.js', 'decideNode', 'Decide what to do', [{ has_quote: true, row: { number: 'Q-1001' }, replies: [], process: true, needs_extraction: true, media_type: 'application/pdf', media_url: 'https://api.twilio.com/x', claude_prompt: '...' }])}

${ifNode('savesQuote', 'Quote changed?', bool('{{ $json.has_quote }}'))}

${upsertNode('saveQuote', 'Save quote')}

${codeNode('listReplies', 'Replies to send', 'list_replies.js', [{ to: 'whatsapp:+17875551234', body: 'Hola', account_sid: 'AC123', twilio_form: 'To=...' }])}

${sendNode('sendReplies', 'Send WhatsApp')}

${ifNode('needsProcessing', 'Needs quoting?', bool("{{ $('Decide what to do').first().json.process }}"), ' executeOnce: true,')}

${ifNode('needsClaude', 'Drawing not read yet?', bool("{{ $('Decide what to do').first().json.needs_extraction }}"))}

const downloadDrawing = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.5,
  config: {
    name: 'Download drawing', onError: 'continueRegularOutput',
    parameters: {
      method: 'GET', url: expr("{{ $('Decide what to do').first().json.media_url }}"),
      authentication: 'genericCredentialType', genericAuthType: 'httpBasicAuth',
      options: { response: { response: { responseFormat: 'file', outputPropertyName: 'data' } }, timeout: 60000 },
    },
    credentials: { httpBasicAuth: newCredential('Twilio (Basic Auth)') },
  },
  output: [{}],
});

${codeNode('setFileType', 'Set file type', 'set_file_type.js', [{}])}

const pdfOrPhoto = ifElse({
  version: 2.3,
  config: { name: 'PDF or photo?', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
    conditions: [{ leftValue: expr("{{ $('Decide what to do').first().json.media_type }}"), rightValue: 'application/pdf', operator: { type: 'string', operation: 'equals' } }],
    combinator: 'and' } } },
});

${claudeNode('readPdf', 'Read drawing PDF (Claude)', 'document')}

${claudeNode('readPhoto', 'Read drawing photo (Claude)', 'image')}

${logicCall('collectReading', 'Collect drawing reading', 'collect_reading.js', 'priceDraft', 'Price and draft', [{ row: { number: 'Q-1001', status: 'pending_approval' }, replies: [] }])}

${upsertNode('savePriced', 'Save priced quote')}

${codeNode('listDraftReplies', 'Draft replies', 'list_replies_priced.js', [{ to: 'whatsapp:+17875550100', body: 'Borrador', account_sid: 'AC123', twilio_form: 'To=...' }])}

${sendNode('sendDraft', 'Send draft to owner')}

const pdfLink = trigger({
  type: 'n8n-nodes-base.webhook', version: 2.1,
  config: { name: 'Quote PDF link', parameters: { httpMethod: 'GET', path: 'wa-quote-pdf', responseMode: 'responseNode', options: {} } },
  output: [{ query: { t: 'abc', kind: 'quote' } }],
});

${getRows('findQuote', 'Find quote by link', "{ keyName: 'pdf_token', condition: 'eq', keyValue: expr('{{ $json.query.t }}') }")}

${logicCall('collectPdf', 'Collect PDF request', 'collect_pdf.js', 'renderPdf', 'Render quote PDF', [{ found: true, fileName: 'Q-1001.pdf' }])}

${ifNode('pdfFound', 'Quote found?', bool('{{ $json.found }}'))}

const respondPdf = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.5,
  config: { name: 'Return PDF', parameters: { respondWith: 'binary', responseDataSource: 'set', inputFieldName: 'data',
    options: { responseHeaders: { entries: [{ name: 'Content-Disposition', value: expr('inline; filename="{{ $json.fileName }}"') }] } } } },
  output: [{}],
});

const respondNotFound = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.5,
  config: { name: 'Not found', parameters: { respondWith: 'text', responseBody: 'Quote not found', options: { responseCode: 404 } } },
  output: [{}],
});

const every30 = trigger({
  type: 'n8n-nodes-base.scheduleTrigger', version: 1.4,
  config: { name: 'Every 30 minutes', parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 30 }] } } },
  output: [{}],
});

${getRows('loadSent', 'Load sent quotes', "{ keyName: 'status', condition: 'eq', keyValue: 'sent' }")}

${logicCall('collectSent', 'Collect sent quotes', 'collect_sent.js', 'dueFollowups', 'Due follow-ups', [{ row: { number: 'Q-1001', status: 'sent' }, has_reply: true, to: 'whatsapp:+17875551234', body: 'Hola', account_sid: 'AC123', twilio_form: 'To=...' }])}

${upsertNode('markFollowup', 'Mark follow-up')}

${ifNode('hasFollowup', 'Message to send?', bool("{{ $('Due follow-ups').item.json.has_reply }}"))}

const sendFollowup = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.5,
  config: {
    name: 'Send follow-up', onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: expr("https://api.twilio.com/2010-04-01/Accounts/{{ $('Due follow-ups').item.json.account_sid }}/Messages.json"),
      authentication: 'genericCredentialType', genericAuthType: 'httpBasicAuth',
      sendBody: true, contentType: 'raw', rawContentType: 'application/x-www-form-urlencoded',
      body: expr("{{ $('Due follow-ups').item.json.twilio_form }}"),
      options: {},
    },
    credentials: { httpBasicAuth: newCredential('Twilio (Basic Auth)') },
  },
  output: [{ sid: 'SM123', status: 'queued' }],
});

const setupNote = sticky('## WhatsApp quote agent\\n'
  + '1. Twilio sends every WhatsApp message to **Twilio WhatsApp in** (POST /webhook/wa-quote-in).\\n'
  + '2. **Decide what to do** answers instantly (Spanish) and saves the quote in the wa_quotes data table.\\n'
  + '3. New drawing: download it, Claude reads it, **Price and draft** prices it with the shop formula and sends the owner a draft.\\n'
  + '4. Owner replies 1 / new total / 0. Customer gets the English PDF from **Quote PDF link**.\\n'
  + '5. Every 30 min: one follow-up ~20h after the quote, inside the 24h window.\\n\\n'
  + '**Setup:** credential "Twilio (Basic Auth)" = Account SID / Auth Token. Shop settings (owner number, Twilio SID, rates) are CONFIG at the top of the Quote logic node in the '
  + '"WhatsApp Quote Agent - Logic" sub-workflow (source: n8n-cloud/src/config.js in the goFactori repo).', [], { color: 4, width: 560, height: 300 });

export default workflow('wa-quote-agent', 'WhatsApp Quote Agent')
  .add(twilioIn).to(ackTwilio).to(loadQuotes).to(collectMessage).to(decideNode)
  .to(savesQuote.onTrue(saveQuote.to(listReplies)).onFalse(listReplies))
  .add(listReplies).to(sendReplies)
  .to(needsProcessing.onTrue(needsClaude
    .onTrue(downloadDrawing.to(setFileType).to(pdfOrPhoto.onTrue(readPdf.to(collectReading)).onFalse(readPhoto.to(collectReading))))
    .onFalse(collectReading)))
  .add(collectReading).to(priceDraft).to(savePriced).to(listDraftReplies).to(sendDraft)
  .add(pdfLink).to(findQuote).to(collectPdf).to(renderPdf).to(pdfFound.onTrue(respondPdf).onFalse(respondNotFound))
  .add(every30).to(loadSent).to(collectSent).to(dueFollowups).to(markFollowup).to(hasFollowup.onTrue(sendFollowup))
  .add(setupNote)
  .group('Reply instantly', [ackTwilio, loadQuotes, collectMessage, decideNode, savesQuote, saveQuote, listReplies, sendReplies], {
    description: 'Answers Twilio, decides what to say (Spanish), saves the quote and sends the instant WhatsApp reply.' })
  .group('Read and price the drawing', [needsProcessing, needsClaude, downloadDrawing, setFileType, pdfOrPhoto, readPdf, readPhoto, collectReading, priceDraft, savePriced, listDraftReplies, sendDraft], {
    description: 'Claude reads the drawing, the shop formula prices it, and the owner gets the draft with a PDF link.' })
  .group('Serve the quote PDF', [findQuote, collectPdf, renderPdf, pdfFound, respondPdf, respondNotFound], {
    description: 'Builds the English quote PDF on request. Twilio downloads it from this link to attach it on WhatsApp.' })
  .group('Follow-ups', [loadSent, collectSent, dueFollowups, markFollowup, hasFollowup, sendFollowup], {
    description: 'One nudge about 20h after a quote is sent, only while the WhatsApp 24h window is still open.' });
`;

// Long code as concatenated string literals of whole lines (<= ~1500 chars each), so the SDK file stays readable.
function chunked(src) {
  const parts = [];
  let cur = '';
  for (const line of src.split('\n')) {
    if (cur && cur.length + line.length > 1500) { parts.push(cur); cur = ''; }
    cur += line + '\n';
  }
  if (cur) parts.push(cur);
  return parts.map((x) => JSON.stringify(x)).join('\n      + ');
}

const logicSdk = `import { workflow, node, trigger, sticky } from '@n8n/workflow-sdk';

const calledBy = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.2,
  config: { name: 'Called by quote agent', parameters: { inputSource: 'passthrough' } },
  output: [{ op: 'decide' }],
});

const quoteLogic = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Quote logic', parameters: { mode: 'runOnceForAllItems', language: 'javaScript',
    jsCode: ${process.env.STUB ? JSON.stringify("// replaced with dist/logic.js\nreturn $input.all();") : chunked(logicSource)} } },
  output: [{ has_quote: true }],
});

const note = sticky('## Quote logic\\nShop settings (CONFIG), pricing formula, Spanish WhatsApp copy, quote PDF and the conversation rules. '
  + 'Generated from n8n-cloud/src in the goFactori repo; edit there, run node n8n-cloud/build.js, then paste dist/logic.js here.', [], { color: 5, width: 420, height: 180 });

export default workflow('wa-quote-logic', 'WhatsApp Quote Agent - Logic')
  .add(calledBy).to(quoteLogic)
  .add(note);
`;

fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'main.sdk.ts'), sdk);
fs.writeFileSync(path.join(__dirname, 'dist', 'logic.sdk.ts'), logicSdk);
fs.writeFileSync(path.join(__dirname, 'dist', 'logic.js'), logicSource);
console.log(`wrote dist/main.sdk.ts (${(sdk.length / 1024).toFixed(0)} KB), dist/logic.sdk.ts, dist/logic.js (${(logicSource.length / 1024).toFixed(0)} KB)`);
