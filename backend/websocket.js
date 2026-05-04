// backend/websocket.js
const WebSocket = require("ws");

let wss = null;

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

function initWebSocket(server, getFollowersState) {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("🔌 Cliente WebSocket conectado");
    ws.send(JSON.stringify({ type: "init", state: getFollowersState() }));

    ws.on("close", () => {
      console.log("🔌 Cliente WebSocket desconectado");
    });
  });

  console.log("✅ WebSocket server inicializado");
}

// ─────────────────────────────────────────────
// BROADCAST
// ─────────────────────────────────────────────

function broadcast(message) {
  if (!wss) {
    console.warn("⚠️ broadcast llamado antes de inicializar WebSocket");
    return;
  }

  const payload = JSON.stringify(message);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (err) {
        console.warn("⚠️ Error enviando mensaje WebSocket:", err.message);
      }
    }
  });
}

module.exports = { initWebSocket, broadcast };
