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

/**
 * Envía un mensaje a todos los clientes conectados
 * @param {*} message
 */
function broadcast(message) {
  if (!wss) return;
  const WebSocket = require("ws");
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (err) {
        console.warn("Error enviando mensaje WebSocket:", err.message);
      }
    }
  });
}

module.exports = { initWebSocket, broadcast };
