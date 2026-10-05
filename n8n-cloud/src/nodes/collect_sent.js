// Node "Collect sent quotes".
return [{ json: { op: 'followups', rows: $input.all().map((i) => i.json) } }];
