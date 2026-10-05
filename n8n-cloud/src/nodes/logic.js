// Sub-workflow "Quote logic": one entry point for everything the main workflow asks.
// Input item: { op: 'decide' | 'price' | 'pdf' | 'followups', ... }.
const req = $input.first().json;
const rowsOf = (rows) => (rows || []).filter((r) => r && r.number);

if (req.op === 'decide') {
  const plan = decide(rowsOf(req.rows), normalizeTwilio(req.body), new Date());
  const q = plan.quote;
  return [{ json: {
    has_quote: !!q,
    row: q ? toRow(q) : {},
    replies: outbound(plan.replies),
    process: !!plan.process,
    needs_extraction: !!plan.process && !(q.spec && q.spec.quantity),
    media_type: q ? q.media_type || '' : '',
    media_url: q ? q.media_url || '' : '',
    claude_prompt: q ? extractionPrompt(q) : '',
  } }];
}

if (req.op === 'price') {
  const res = afterExtraction(rowsOf(req.rows), fromRow(req.plan.row), req.claude);
  return [{ json: { row: toRow(res.quote), replies: outbound(res.replies) } }];
}

if (req.op === 'pdf') {
  const query = req.query || {};
  const row = rowsOf(req.rows).find((r) => r.pdf_token && r.pdf_token === query.t);
  if (!row || !row.pricing) return [{ json: { found: false } }];
  const q = fromRow(row);
  const draft = query.kind === 'draft';
  const fileName = `${q.number}${draft ? '-draft' : ''}.pdf`;
  return [{ json: { found: true, fileName },
    binary: { data: { data: renderQuotePdf(q, draft), mimeType: 'application/pdf', fileName, fileExtension: 'pdf' } } }];
}

if (req.op === 'followups') {
  return dueFollowups(rowsOf(req.rows), new Date()).map((f) => ({ json: {
    row: toRow(f.quote), has_reply: f.replies.length > 0, ...(outbound(f.replies)[0] || {}),
  } }));
}

throw new Error(`unknown op '${req.op}'`);
