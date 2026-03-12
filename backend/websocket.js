let wss;

/**
 * Inicializa WebSocket
 * @param {*} server - servidor HTTP de Express
 * @param {function} getFollowersState - función para obtener el estado actual
 */
function initWebSocket(server, getFollowersState) {
  const WebSocket = require("ws");
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ type: "init", state: getFollowersState() }));
  });
}

function broadcast(message) {
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(JSON.stringify(message));
  });
}

module.exports = { initWebSocket, broadcast };
