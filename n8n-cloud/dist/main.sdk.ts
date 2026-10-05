import { workflow, node, trigger, sticky, ifElse, newCredential, expr } from '@n8n/workflow-sdk';

const quoteColumns = {"mappingMode":"defineBelow","matchingColumns":[],"value":{"number":expr('{{ $json.row.number }}'),"status":expr('{{ $json.row.status }}'),"customer_phone":expr('{{ $json.row.customer_phone }}'),"customer_name":expr('{{ $json.row.customer_name }}'),"messages":expr('{{ $json.row.messages }}'),"media_url":expr('{{ $json.row.media_url }}'),"media_type":expr('{{ $json.row.media_type }}'),"spec":expr('{{ $json.row.spec }}'),"pricing":expr('{{ $json.row.pricing }}'),"original_total":expr('{{ $json.row.original_total }}'),"final_total":expr('{{ $json.row.final_total }}'),"pdf_token":expr('{{ $json.row.pdf_token }}'),"last_customer_msg_at":expr('{{ $json.row.last_customer_msg_at }}'),"sent_at":expr('{{ $json.row.sent_at }}'),"followup_sent_at":expr('{{ $json.row.followup_sent_at }}'),"accepted_at":expr('{{ $json.row.accepted_at }}')},"schema":[{"id":"number","displayName":"number","required":false,"defaultMatch":false,"display":true,"type":"string","canBeUsedToMatch":true},{"id":"status","displayName":"status","required":false,"defaultMatch":false,"display":true,"type":"string","canBeUsedToMatch":true},{"id":"customer_phone","displayName":"customer_phone","required":false,"defaultMatch":false,"display":true,"type":"string","canBeUsedToMatch":true},{"id":"customer_name","displayName":"customer_name","required":false,"defaultMatch":false,"display":true,"type":"string","canBeUsedToMatch":true},{"id":"messages","displayName":"messages","required":false,"defaultMatch":false,"display":true,"type":"string","canBeUsedToMatch":true},{"id":"media_url","displayName":"media_url","required":false,"defaultMatch":false,"display":true,"type":"string","canBeUsedToMatch":true},{"id":"media_type","displayName":"media_type","required":false,"defaultMatch":false,"display":true,"type":"string","canBeUsedToMatch":true},{"id":"spec","displayName":"spec","required":false,"defaultMatch":false,"display":true,"type":"string","canBeUsedToMatch":true},{"id":"pricing","displayName":"pricing","required":false,"defaultMatch":false,"display":true,"type":"string","canBeUsedToMatch":true},{"id":"original_total","displayName":"original_total","required":false,"defaultMatch":false,"display":true,"type":"string","canBeUsedToMatch":true},{"id":"final_total","displayName":"final_total","required":false,"defaultMatch":false,"display":true,"type":"string","canBeUsedToMatch":true},{"id":"pdf_token","displayName":"pdf_token","required":false,"defaultMatch":false,"display":true,"type":"string","canBeUsedToMatch":true},{"id":"last_customer_msg_at","displayName":"last_customer_msg_at","required":false,"defaultMatch":false,"display":true,"type":"string","canBeUsedToMatch":true},{"id":"sent_at","displayName":"sent_at","required":false,"defaultMatch":false,"display":true,"type":"string","canBeUsedToMatch":true},{"id":"followup_sent_at","displayName":"followup_sent_at","required":false,"defaultMatch":false,"display":true,"type":"string","canBeUsedToMatch":true},{"id":"accepted_at","displayName":"accepted_at","required":false,"defaultMatch":false,"display":true,"type":"string","canBeUsedToMatch":true}]};

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

const loadQuotes = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: {
    name: "Load quotes", alwaysOutputData: true, executeOnce: true,
    parameters: {
      resource: 'row', operation: 'get', dataTableId: {"__rl":true,"mode":"id","value":"X4jQZjAWjXGWqe8k","cachedResultName":"wa_quotes"}, returnAll: true,
    },
  },
  output: [{ id: 1, number: 'Q-1001', status: 'sent', pdf_token: 'abc' }],
});

const collectMessage = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: "Collect message", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "// Node \"Collect message\": what the quote logic needs to decide.\nreturn [{ json: { op: 'decide', rows: $('Load quotes').all().map((i) => i.json), body: $('Twilio WhatsApp in').first().json.body } }];\n" } },
  output: [{"op":"x"}],
});

const decideNode = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.4,
  config: {
    name: "Decide what to do",
    parameters: { mode: 'once', source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'Uqlmvc3j5XMOnXcM', cachedResultName: 'WhatsApp Quote Agent - Logic' },
      options: { waitForSubWorkflow: true } },
  },
  output: [{"has_quote":true,"row":{"number":"Q-1001"},"replies":[],"process":true,"needs_extraction":true,"media_type":"application/pdf","media_url":"https://api.twilio.com/x","claude_prompt":"..."}],
});

const savesQuote = ifElse({
  version: 2.3,
  config: { name: "Quote changed?", parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 }, conditions: [{ leftValue: expr("{{ $json.has_quote }}"), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' } } },
});

const saveQuote = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: {
    name: "Save quote",
    parameters: {
      resource: 'row', operation: 'upsert', dataTableId: {"__rl":true,"mode":"id","value":"X4jQZjAWjXGWqe8k","cachedResultName":"wa_quotes"}, matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'number', condition: 'eq', keyValue: expr('{{ $json.row.number }}') }] },
      columns: quoteColumns,
      options: {},
    },
  },
  output: [{ id: 1, number: 'Q-1001', status: 'pending_approval' }],
});

const listReplies = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: "Replies to send", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "// Node \"Replies to send\": one item per outgoing WhatsApp message.\nreturn $('Decide what to do').first().json.replies.map((r) => ({ json: r }));\n" } },
  output: [{"to":"whatsapp:+17875551234","body":"Hola","account_sid":"AC123","twilio_form":"To=..."}],
});

const sendReplies = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.5,
  config: {
    name: "Send WhatsApp", onError: 'continueRegularOutput', retryOnFail: true, maxTries: 3,
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
});

const needsProcessing = ifElse({
  version: 2.3,
  config: { name: "Needs quoting?", executeOnce: true, parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 }, conditions: [{ leftValue: expr("{{ $('Decide what to do').first().json.process }}"), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' } } },
});

const needsClaude = ifElse({
  version: 2.3,
  config: { name: "Drawing not read yet?", parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 }, conditions: [{ leftValue: expr("{{ $('Decide what to do').first().json.needs_extraction }}"), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' } } },
});

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

const pdfOrPhoto = ifElse({
  version: 2.3,
  config: { name: 'PDF or photo?', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
    conditions: [{ leftValue: expr("{{ $('Decide what to do').first().json.media_type }}"), rightValue: 'application/pdf', operator: { type: 'string', operation: 'equals' } }],
    combinator: 'and' } } },
});

const readPdf = node({
  type: '@n8n/n8n-nodes-langchain.anthropic', version: 1,
  config: {
    name: "Read drawing PDF (Claude)", onError: 'continueRegularOutput',
    parameters: {
      resource: 'document', operation: 'analyze',
      modelId: { __rl: true, mode: 'id', value: 'claude-opus-5-5' },
      text: expr("{{ $('Decide what to do').first().json.claude_prompt }}"),
      inputType: 'binary', binaryPropertyName: 'data', simplify: true,
      options: { maxTokens: 4000 },
    },
    credentials: { anthropicApi: {"id":"K04J9OtEOhP48ePn","name":"Anthropic account"} },
  },
  output: [{ content: [{ type: 'text', text: '{"part_name": "Mounting Bracket"}' }] }],
});

const readPhoto = node({
  type: '@n8n/n8n-nodes-langchain.anthropic', version: 1,
  config: {
    name: "Read drawing photo (Claude)", onError: 'continueRegularOutput',
    parameters: {
      resource: 'image', operation: 'analyze',
      modelId: { __rl: true, mode: 'id', value: 'claude-opus-5-5' },
      text: expr("{{ $('Decide what to do').first().json.claude_prompt }}"),
      inputType: 'binary', binaryPropertyName: 'data', simplify: true,
      options: { maxTokens: 4000 },
    },
    credentials: { anthropicApi: {"id":"K04J9OtEOhP48ePn","name":"Anthropic account"} },
  },
  output: [{ content: [{ type: 'text', text: '{"part_name": "Mounting Bracket"}' }] }],
});

const collectReading = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: "Collect drawing reading", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "// Node \"Collect drawing reading\": Claude's output (if it ran) + the plan, for pricing.\nconst plan = $('Decide what to do').first().json;\nreturn [{ json: { op: 'price', plan, rows: $('Load quotes').all().map((i) => i.json),\n  claude: plan.needs_extraction ? $input.first().json : null } }];\n" } },
  output: [{"op":"x"}],
});

const priceDraft = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.4,
  config: {
    name: "Price and draft",
    parameters: { mode: 'once', source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'Uqlmvc3j5XMOnXcM', cachedResultName: 'WhatsApp Quote Agent - Logic' },
      options: { waitForSubWorkflow: true } },
  },
  output: [{"row":{"number":"Q-1001","status":"pending_approval"},"replies":[]}],
});

const savePriced = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: {
    name: "Save priced quote",
    parameters: {
      resource: 'row', operation: 'upsert', dataTableId: {"__rl":true,"mode":"id","value":"X4jQZjAWjXGWqe8k","cachedResultName":"wa_quotes"}, matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'number', condition: 'eq', keyValue: expr('{{ $json.row.number }}') }] },
      columns: quoteColumns,
      options: {},
    },
  },
  output: [{ id: 1, number: 'Q-1001', status: 'pending_approval' }],
});

const listDraftReplies = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: "Draft replies", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "// Node \"Draft replies\": one item per outgoing WhatsApp message.\nreturn $('Price and draft').first().json.replies.map((r) => ({ json: r }));\n" } },
  output: [{"to":"whatsapp:+17875550100","body":"Borrador","account_sid":"AC123","twilio_form":"To=..."}],
});

const sendDraft = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.5,
  config: {
    name: "Send draft to owner", onError: 'continueRegularOutput', retryOnFail: true, maxTries: 3,
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
});

const pdfLink = trigger({
  type: 'n8n-nodes-base.webhook', version: 2.1,
  config: { name: 'Quote PDF link', parameters: { httpMethod: 'GET', path: 'wa-quote-pdf', responseMode: 'responseNode', options: {} } },
  output: [{ query: { t: 'abc', kind: 'quote' } }],
});

const findQuote = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: {
    name: "Find quote by link", alwaysOutputData: true, executeOnce: true,
    parameters: {
      resource: 'row', operation: 'get', dataTableId: {"__rl":true,"mode":"id","value":"X4jQZjAWjXGWqe8k","cachedResultName":"wa_quotes"}, returnAll: true,
      matchType: 'allConditions', filters: { conditions: [{ keyName: 'pdf_token', condition: 'eq', keyValue: expr('{{ $json.query.t }}') }] },
    },
  },
  output: [{ id: 1, number: 'Q-1001', status: 'sent', pdf_token: 'abc' }],
});

const collectPdf = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: "Collect PDF request", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "// Node \"Collect PDF request\".\nreturn [{ json: { op: 'pdf', query: $('Quote PDF link').first().json.query, rows: $input.all().map((i) => i.json) } }];\n" } },
  output: [{"op":"x"}],
});

const renderPdf = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.4,
  config: {
    name: "Render quote PDF",
    parameters: { mode: 'once', source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'Uqlmvc3j5XMOnXcM', cachedResultName: 'WhatsApp Quote Agent - Logic' },
      options: { waitForSubWorkflow: true } },
  },
  output: [{"found":true,"fileName":"Q-1001.pdf"}],
});

const pdfFound = ifElse({
  version: 2.3,
  config: { name: "Quote found?", parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 }, conditions: [{ leftValue: expr("{{ $json.found }}"), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' } } },
});

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

const loadSent = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: {
    name: "Load sent quotes", alwaysOutputData: true, executeOnce: true,
    parameters: {
      resource: 'row', operation: 'get', dataTableId: {"__rl":true,"mode":"id","value":"X4jQZjAWjXGWqe8k","cachedResultName":"wa_quotes"}, returnAll: true,
      matchType: 'allConditions', filters: { conditions: [{ keyName: 'status', condition: 'eq', keyValue: 'sent' }] },
    },
  },
  output: [{ id: 1, number: 'Q-1001', status: 'sent', pdf_token: 'abc' }],
});

const collectSent = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: "Collect sent quotes", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "// Node \"Collect sent quotes\".\nreturn [{ json: { op: 'followups', rows: $input.all().map((i) => i.json) } }];\n" } },
  output: [{"op":"x"}],
});

const dueFollowups = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.4,
  config: {
    name: "Due follow-ups",
    parameters: { mode: 'once', source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'Uqlmvc3j5XMOnXcM', cachedResultName: 'WhatsApp Quote Agent - Logic' },
      options: { waitForSubWorkflow: true } },
  },
  output: [{"row":{"number":"Q-1001","status":"sent"},"has_reply":true,"to":"whatsapp:+17875551234","body":"Hola","account_sid":"AC123","twilio_form":"To=..."}],
});

const markFollowup = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: {
    name: "Mark follow-up",
    parameters: {
      resource: 'row', operation: 'upsert', dataTableId: {"__rl":true,"mode":"id","value":"X4jQZjAWjXGWqe8k","cachedResultName":"wa_quotes"}, matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'number', condition: 'eq', keyValue: expr('{{ $json.row.number }}') }] },
      columns: quoteColumns,
      options: {},
    },
  },
  output: [{ id: 1, number: 'Q-1001', status: 'pending_approval' }],
});

const hasFollowup = ifElse({
  version: 2.3,
  config: { name: "Message to send?", parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 }, conditions: [{ leftValue: expr("{{ $('Due follow-ups').item.json.has_reply }}"), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' } } },
});

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

const setupNote = sticky('## WhatsApp quote agent\n'
  + '1. Twilio sends every WhatsApp message to **Twilio WhatsApp in** (POST /webhook/wa-quote-in).\n'
  + '2. **Decide what to do** answers instantly (Spanish) and saves the quote in the wa_quotes data table.\n'
  + '3. New drawing: download it, Claude reads it, **Price and draft** prices it with the shop formula and sends the owner a draft.\n'
  + '4. Owner replies 1 / new total / 0. Customer gets the English PDF from **Quote PDF link**.\n'
  + '5. Every 30 min: one follow-up ~20h after the quote, inside the 24h window.\n\n'
  + '**Setup:** credential "Twilio (Basic Auth)" = Account SID / Auth Token. Shop settings (owner number, Twilio SID, rates) are CONFIG at the top of the Quote logic node in the '
  + '"WhatsApp Quote Agent - Logic" sub-workflow (source: n8n-cloud/src/config.js in the goFactori repo).', [], { color: 4, width: 560, height: 300 });

export default workflow('wa-quote-agent', 'WhatsApp Quote Agent')
  .add(twilioIn).to(ackTwilio).to(loadQuotes).to(collectMessage).to(decideNode)
  .to(savesQuote.onTrue(saveQuote.to(listReplies)).onFalse(listReplies))
  .add(listReplies).to(sendReplies)
  .to(needsProcessing.onTrue(needsClaude
    .onTrue(downloadDrawing.to(pdfOrPhoto.onTrue(readPdf.to(collectReading)).onFalse(readPhoto.to(collectReading))))
    .onFalse(collectReading)))
  .add(collectReading).to(priceDraft).to(savePriced).to(listDraftReplies).to(sendDraft)
  .add(pdfLink).to(findQuote).to(collectPdf).to(renderPdf).to(pdfFound.onTrue(respondPdf).onFalse(respondNotFound))
  .add(every30).to(loadSent).to(collectSent).to(dueFollowups).to(markFollowup).to(hasFollowup.onTrue(sendFollowup))
  .add(setupNote)
  .group('Reply instantly', [ackTwilio, loadQuotes, collectMessage, decideNode, savesQuote, saveQuote, listReplies, sendReplies], {
    description: 'Answers Twilio, decides what to say (Spanish), saves the quote and sends the instant WhatsApp reply.' })
  .group('Read and price the drawing', [needsProcessing, needsClaude, downloadDrawing, pdfOrPhoto, readPdf, readPhoto, collectReading, priceDraft, savePriced, listDraftReplies, sendDraft], {
    description: 'Claude reads the drawing, the shop formula prices it, and the owner gets the draft with a PDF link.' })
  .group('Serve the quote PDF', [findQuote, collectPdf, renderPdf, pdfFound, respondPdf, respondNotFound], {
    description: 'Builds the English quote PDF on request. Twilio downloads it from this link to attach it on WhatsApp.' })
  .group('Follow-ups', [loadSent, collectSent, dueFollowups, markFollowup, hasFollowup, sendFollowup], {
    description: 'One nudge about 20h after a quote is sent, only while the WhatsApp 24h window is still open.' });
