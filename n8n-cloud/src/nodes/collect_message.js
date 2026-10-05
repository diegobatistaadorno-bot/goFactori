// Node "Collect message": what the quote logic needs to decide.
return [{ json: { op: 'decide', rows: $('Load quotes').all().map((i) => i.json), body: $('Twilio WhatsApp in').first().json.body } }];
