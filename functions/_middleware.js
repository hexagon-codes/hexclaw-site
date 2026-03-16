export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === "www.hexclaw.net") {
    url.host = "hexclaw.net";
    url.port = "";
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}
