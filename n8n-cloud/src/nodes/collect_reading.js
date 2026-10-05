// Node "Collect drawing reading": Claude's output (if it ran) + the plan, for pricing.
const plan = $('Decide what to do').first().json;
return [{ json: { op: 'price', plan, rows: $('Load quotes').all().map((i) => i.json),
  claude: plan.needs_extraction ? $input.first().json : null } }];
