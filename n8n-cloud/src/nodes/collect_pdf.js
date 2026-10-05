// Node "Collect PDF request".
return [{ json: { op: 'pdf', query: $('Quote PDF link').first().json.query, rows: $input.all().map((i) => i.json) } }];
