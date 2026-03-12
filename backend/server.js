// backend/server.js
const express = require("express");
const bodyParser = require("body-parser");
const WebSocket = require("ws");
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const app = express();

// =============================
// Servir archivos estáticos
app.use(express.static(path.join(__dirname, "../public")));
app.use(bodyParser.json());

// =============================
// Configuración Twitch
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CHANNEL_LOGIN = process.env.CHANNEL_LOGIN || "mejudev";
const FOLLOWER_GOAL = parseInt(process.env.FOLLOWER_GOAL) || 500;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "secret123";

// =============================
// Estado del servidor
let followerCount = 0;
let lastFollower = "--"; // <--- nuevo estado
let broadcasterId = null;
let appToken = null;
let tokenExpiry = null;

// =============================
// Load / Save followers
async function loadFollowers() {
  try {
    const data = JSON.parse(await fs.readFile("followers.json", "utf8"));
    followerCount = data.count;
  } catch {
    followerCount = 0;
  }
}

async function saveFollowers() {
  try {
    await fs.writeFile(
      "followers.json",
      JSON.stringify({ count: followerCount }, null, 2),
    );
  } catch (err) {
    console.error("Error guardando followers:", err.message);
  }
}

// =============================
// Twitch API
async function getAppToken() {
  if (appToken && tokenExpiry && Date.now() < tokenExpiry - 60000)
    return appToken;
  try {
    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
    });
    if (!res.ok) throw new Error(`Error token Twitch: ${res.status}`);
    const data = await res.json();
    appToken = data.access_token;
    tokenExpiry = Date.now() + data.expires_in * 1000;
    return appToken;
  } catch (err) {
    console.error("Error obteniendo app token:", err.message);
    throw err;
  }
}

async function getBroadcasterId(token) {
  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/users?login=${CHANNEL_LOGIN}`,
      {
        headers: { "Client-ID": CLIENT_ID, Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok) throw new Error(`Error Twitch API: ${res.status}`);
    const data = await res.json();
    return data.data[0]?.id || null;
  } catch (err) {
    console.error("Error obteniendo broadcasterId:", err.message);
    return null;
  }
}

// =============================
// WebSocket
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, async () => {
  console.log(`Servidor HTTP corriendo en puerto ${PORT}`);
  await loadFollowers();
  try {
    appToken = await getAppToken();
    broadcasterId = await getBroadcasterId(appToken);
    console.log(
      `✅ Conexión a Twitch exitosa. Followers actuales: ${followerCount}`,
    );
  } catch {
    console.log("⚠️ No se pudo conectar a Twitch, modo test activo.");
  }
});

const wss = new WebSocket.Server({ server });

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

wss.on("connection", (ws) => {
  console.log("Cliente WebSocket conectado");
  ws.send(
    JSON.stringify({
      type: "goal",
      current: followerCount,
      goal: FOLLOWER_GOAL,
      lastFollower,
    }),
  );
});

// =============================
// Seguridad Webhook
function verifyTwitchSignature(req) {
  const messageId = req.headers["twitch-eventsub-message-id"];
  const timestamp = req.headers["twitch-eventsub-message-timestamp"];
  const signature = req.headers["twitch-eventsub-message-signature"];
  if (!messageId || !timestamp || !signature) return false;
  const body = JSON.stringify(req.body);
  const hmacMessage = messageId + timestamp + body;
  const hash = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(hmacMessage)
    .digest("hex");
  return signature === `sha256=${hash}`;
}

// =============================
// Webhook Twitch
app.post("/webhook", async (req, res) => {
  if (!verifyTwitchSignature(req)) return res.status(403).end();
  const data = req.body;

  if (data.subscription?.type === "channel.follow") {
    const follower = data.event.user_name;
    followerCount++;
    lastFollower = follower; // <--- actualizar último seguidor
    await saveFollowers();
    broadcast({
      type: "update",
      follow: follower,
      goal: { current: followerCount, target: FOLLOWER_GOAL },
      lastFollower,
    });
  }

  res.status(200).end();
});

// =============================
// Endpoint de prueba
app.get("/test-follow", async (req, res) => {
  const follower =
    req.query.name || `TestUser${Math.floor(Math.random() * 1000)}`;
  followerCount++;
  lastFollower = follower; // <--- actualizar último seguidor
  await saveFollowers();
  broadcast({
    type: "update",
    follow: follower,
    goal: { current: followerCount, target: FOLLOWER_GOAL },
    lastFollower,
  });
  res.send(`Simulado seguidor: ${follower}`);
});
