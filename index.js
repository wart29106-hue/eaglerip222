import { connect } from "cloudflare:sockets";

export default {
  async fetch(request, env, ctx) {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    server.accept();

    const socket = connect({
      hostname: "144.31.46.5",
      port: 13569,
    });

    server.addEventListener("message", async (event) => {
      const writer = socket.writable.getWriter();
      if (typeof event.data === "string") {
        const encoder = new TextEncoder();
        await writer.write(encoder.encode(event.data));
      } else {
        await writer.write(event.data);
      }
      writer.releaseLock();
    });

    ctx.waitUntil(
      (async () => {
        const reader = socket.readable.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value && server.readyState === WebSocket.OPEN) {
              server.send(value);
            }
          }
        } catch (err) {
          // Connection closed
        } finally {
          reader.releaseLock();
        }
      })()
    );

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  },
};
