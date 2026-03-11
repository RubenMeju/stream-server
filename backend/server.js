const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const readline = require('readline');
const fs = require('fs');

const app = express();
// Servir archivos estáticos de la carpeta public
app.use(express.static('frontend'));
app.use(bodyParser.json());

// =============================
// CONFIG TWITCH
// =============================
const CLIENT_ID = "jcgvtr09bln474qdy7hhdw9x595wc1";          // Poner tu CLIENT_ID
const CLIENT_SECRET = "oc16hb1c3v359syyzg2xjq3v3cetz5";  // Poner tu CLIENT_SECRET
const CHANNEL_LOGIN = "mejudev";
const FOLLOWER_GOAL = 500;

// Tu subdominio fijo de ngrok
const NGROK_URL = "https://synoetic-gregorio-unenviously.ngrok-free.dev";

let followerCount = 0;
let broadcasterId = null;
let appToken = null;

// =============================
// LOAD / SAVE FOLLOWERS
// =============================
function loadFollowers() {
  try {
    const data = JSON.parse(fs.readFileSync("followers.json"));
    followerCount = data.count;
  } catch {
    followerCount = 0;
  }
}

function saveFollowers() {
  fs.writeFileSync("followers.json", JSON.stringify({ count: followerCount }, null, 2));
}

// =============================
// TWITCH API FUNCTIONS
// =============================
// Usa el fetch global de Node directamente
async function getAppToken() {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials"
    })
  });
  const data = await res.json();
  return data.access_token;
}

async function getBroadcasterId(token) {
  const res = await fetch(`https://api.twitch.tv/helix/users?login=${CHANNEL_LOGIN}`, {
    headers: {
      "Client-ID": CLIENT_ID,
      "Authorization": "Bearer " + token
    }
  });
  const data = await res.json();
  return data.data[0]?.id;
}

async function getFollowers(token) {
  if (!broadcasterId) return followerCount;
  const res = await fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${broadcasterId}`, {
    headers: {
      "Client-ID": CLIENT_ID,
      "Authorization": "Bearer " + token
    }
  });
  const data = await res.json();
  return data.total ?? followerCount;
}

// =============================
// WEBSOCKET
// =============================
const wss = new WebSocket.Server({ port: 8080 });

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

wss.on('connection', ws => {
  console.log("Cliente WebSocket conectado");
  ws.send(JSON.stringify({ type: "goal", current: followerCount, goal: FOLLOWER_GOAL }));
});

// =============================
// WEBHOOK TWITCH
// =============================
app.post('/webhook', (req, res) => {
  const data = req.body;
  if (data.subscription?.type === 'channel.follow') {
    const follower = data.event.user_name;
    console.log("Nuevo seguidor:", follower);
    followerCount++;
    saveFollowers();
    broadcast({ type: "follow", name: follower });
    broadcast({ type: "goal", current: followerCount, goal: FOLLOWER_GOAL });
  }
  res.status(200).end();
});

// =============================
// HTTP SERVER
// =============================
app.listen(80, () => {
  console.log("Servidor HTTP puerto 80");
  console.log(`URL pública de Twitch/Webhooks: ${NGROK_URL}`);
});

// =============================
// MODO TEST / READLINE
// =============================
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function modoTest(input) {
  if (input.startsWith("follow ")) {
    const follower = input.replace("follow ", "").trim();
    followerCount++;
    saveFollowers();
    broadcast({ type: "follow", name: follower });
    broadcast({ type: "goal", current: followerCount, goal: FOLLOWER_GOAL });
  }
}

rl.on('line', (input) => modoTest(input));

// =============================
// INICIO
// =============================
async function init() {
  loadFollowers();
  console.log("Followers guardados:", followerCount);

  try {
    appToken = await getAppToken();
    broadcasterId = await getBroadcasterId(appToken);
    const realFollowers = await getFollowers(appToken);
    followerCount = realFollowers;
    saveFollowers();
    console.log("✅ Conexión a Twitch exitosa. Followers reales:", followerCount);
  } catch (err) {
    console.log("⚠️ No se pudo conectar a Twitch, modo test activo.");
    console.log(err.message);
  }

  console.log("\nServidor listo. Esperando alertas de seguidores...");
}

init();