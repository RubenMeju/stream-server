require("dotenv").config({ path: ".env.local" });
const express = require("express");
const bodyParser = require("body-parser");

const {
  PORT,
  PUBLIC_PATH,
  USER_TOKEN,
  MODERATOR_LOGIN,
  CHANNEL_LOGIN,
  WEBHOOK_SECRET,
} = require("./config");

const { getState } = require("./followers");
const { getBroadcasterId, getAppToken } = require("./twitch");
const { initWebSocket } = require("./websocket");
const { handleTwitchWebhook } = require("./webhook");
const { createAllEventSubSubscriptions } = require("./eventsub");

const app = express();

app.use(express.static(PUBLIC_PATH));
app.use(bodyParser.json());

// endpoint webhook Twitch
app.post("/twitch/webhook", (req, res) => handleTwitchWebhook(req, res, true));

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.send("Sin código");

  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: "https://twitch-a7sp.onrender.com/auth/callback", // ← cambiado
  });

  const r = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: params,
  });
  const data = await r.json();
  console.log("USER TOKEN:", data.access_token);
  res.send(
    `<b>Token generado:</b> ${data.access_token}<br>Cópialo en .env.local como USER_TOKEN`,
  );
});

let server = app.listen(PORT, async () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);

  try {
    // 🔹 obtener tokens
    const appToken = await getAppToken();

    // 🔹 obtener IDs
    const broadcasterId = await getBroadcasterId(appToken, CHANNEL_LOGIN);
    const moderatorId = await getBroadcasterId(appToken, MODERATOR_LOGIN);

    console.log("Broadcaster ID:", broadcasterId);
    console.log("Moderator ID:", moderatorId);

    // 🔹 crear suscripciones
    const callbackUrl = "https://twitch-a7sp.onrender.com/twitch/webhook";

    await createAllEventSubSubscriptions(
      appToken,
      USER_TOKEN,
      broadcasterId,
      moderatorId,
      callbackUrl,
      WEBHOOK_SECRET,
    );

    console.log("✅ Inicialización completa");
  } catch (err) {
    console.error("❌ Error inicializando:", err.message);
  }
});

// WebSocket overlay
initWebSocket(server, getState);
