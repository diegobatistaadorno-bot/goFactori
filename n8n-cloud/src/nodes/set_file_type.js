// Node "Set file type": Claude needs the real file type (some servers send application/octet-stream).
const type = $('Decide what to do').first().json.media_type;
return $input.all().map((item) => {
  if (item.binary && item.binary.data && type) item.binary.data.mimeType = type;
  return item;
});
