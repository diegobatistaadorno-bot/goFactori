// Node "Replies to send": one item per outgoing WhatsApp message.
return $('Decide what to do').first().json.replies.map((r) => ({ json: r }));
