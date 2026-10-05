// Node "Draft replies": one item per outgoing WhatsApp message.
return $('Price and draft').first().json.replies.map((r) => ({ json: r }));
