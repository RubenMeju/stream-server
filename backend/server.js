// backend/server.js
const express = require("express");
const bodyParser = require("body-parser");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();

// =============================
// Servir archivos estáticos (HTML/JS/CSS)
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());

// =============================
// Configuración Twitch desde .env
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CHANNEL_LOGIN = process.env.CHANNEL_LOGIN || "mejudev";
const FOLLOWER_GOAL = parseInt(process.env.FOLLOWER_GOAL) || 500;

// =============================
// Estado del servidor
let followerCount = 0;
let broadcasterId = null;
let appToken = null;

// =============================
// Load / Save followers
function loadFollowers() {
  try {
    const data = JSON.parse(fs.readFileSync("followers.json"));
    followerCount = data.count;
  } catch {
    followerCount = 0;
  }
}

function saveFollowers() {
  fs.writeFileSync(
    "followers.json",
    JSON.stringify({ count: followerCount }, null, 2),
  );
}

// =============================
// Twitch API
async function getAppToken() {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  const data = await res.json();
  return data.access_token;
}

async function getBroadcasterId(token) {
  const res = await fetch(
    `https://api.twitch.tv/helix/users?login=${CHANNEL_LOGIN}`,
    {
      headers: { "Client-ID": CLIENT_ID, Authorization: `Bearer ${token}` },
    },
  );
  const data = await res.json();
  return data.data[0]?.id;
}

// =============================
// HTTP Server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, async () => {
  console.log(`Servidor HTTP corriendo en puerto ${PORT}`);
  loadFollowers();
  try {
    appToken = await getAppToken();
    broadcasterId = await getBroadcasterId(appToken);
    console.log(
      `✅ Conexión a Twitch exitosa. Followers actuales: ${followerCount}`,
    );
  } catch (err) {
    console.log("⚠️ No se pudo conectar a Twitch, modo test activo.");
    console.log(err.message);
  }
});

// =============================
// WebSocket
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
    }),
  );
});

// =============================
// Webhook Twitch
app.post("/webhook", (req, res) => {
  const data = req.body;
  if (data.subscription?.type === "channel.follow") {
    const follower = data.event.user_name;
    followerCount++;
    saveFollowers();
    broadcast({ type: "follow", name: follower });
    broadcast({ type: "goal", current: followerCount, goal: FOLLOWER_GOAL });
  }
  res.status(200).end();
});

// =============================
// Endpoint de prueba
app.get("/test-follow", (req, res) => {
  const follower =
    req.query.name || `TestUser${Math.floor(Math.random() * 1000)}`;
  followerCount++;
  saveFollowers();
  broadcast({ type: "follow", name: follower });
  broadcast({ type: "goal", current: followerCount, goal: FOLLOWER_GOAL });
  res.send(`Simulado seguidor: ${follower}`);
});
