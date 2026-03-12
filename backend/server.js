const express = require("express");
const bodyParser = require("body-parser");
const { PORT, PUBLIC_PATH, CLIENT_ID, CHANNEL_LOGIN } = require("./config");
const { setFollowers, getState } = require("./followers");
const { getAppToken, getBroadcasterId } = require("./twitch");
const { initWebSocket } = require("./websocket");
const routes = require("./routes");

const app = express();

app.use(express.static(PUBLIC_PATH));
app.use(bodyParser.json());
app.use(routes);

async function loadFollowersFromTwitch() {
  try {
    const token = await getAppToken();
    const broadcasterId = await getBroadcasterId(token, CHANNEL_LOGIN);

    const res = await fetch(
      `https://api.twitch.tv/helix/users/follows?to_id=${broadcasterId}&first=1`,
      {
        headers: {
          "Client-ID": CLIENT_ID,
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await res.json();

    setFollowers(data.total || 0, data.data[0]?.from_name || "--");

    const state = getState();
    console.log(
      `Followers cargados desde Twitch: ${state.followerCount}, Último: ${state.lastFollower}`,
    );
    console.log("✅ Conexión a Twitch exitosa.");
  } catch (err) {
    console.error(
      "⚠️ No se pudo conectar a Twitch, modo test activo:",
      err.message,
    );
  }
}

// Cambia el puerto si ya está en uso
const server = app.listen(PORT, async () => {
  console.log(`Servidor HTTP corriendo en puerto ${PORT}`);
  await loadFollowersFromTwitch();
});

// Pasamos getState a WebSocket para evitar ciclos
initWebSocket(server, getState);
