require("dotenv").config({ path: ".env.local" });

const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");

const { broadcast, initWebSocket } = require("./websocket");

const {
  PORT,
  PUBLIC_PATH,
  USER_TOKEN,
  REFRESH_TOKEN,
  MODERATOR_LOGIN,
  CHANNEL_LOGIN,
  WEBHOOK_SECRET,
  FOLLOWER_POLL_INTERVAL = 60000,
} = require("./config");

const { getState, setFollowers, calcularMeta } = require("./followers");
const {
  getBroadcasterId,
  getAppToken,
  validateAndRefreshToken,
} = require("./twitch");

const { handleTwitchWebhook } = require("./webhook");
const { createAllEventSubSubscriptions } = require("./eventsub");

const app = express();
app.use(express.static(PUBLIC_PATH));
app.use(bodyParser.json());

let activeUserToken = USER_TOKEN;

//
// ─────────────────────────────
// TWITCH WEBHOOK
// ─────────────────────────────
//

app.post("/twitch/webhook", (req, res) => {
  req.userToken = activeUserToken;
  handleTwitchWebhook(req, res, true);
});
//
// ─────────────────────────────
// GITHUB WEBHOOK
// ─────────────────────────────
//

app.post("/github/webhook", async (req, res) => {
  try {
    if (req.headers["x-github-event"] !== "push") {
      return res.sendStatus(200);
    }

    const repo = req.body.repository;
    const headCommit = req.body.head_commit;
    if (!repo) return res.sendStatus(200);

    // Total commits desde la API
    const headers = {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "User-Agent": "overlay-app",
    };

    let totalCommits = 1;
    try {
      const commitsRes = await fetch(
        `https://api.github.com/repos/${repo.owner.login}/${repo.name}/commits?per_page=1`,
        { headers },
      );
      const linkHeader = commitsRes.headers.get("link");
      if (linkHeader) {
        const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
        if (match) totalCommits = parseInt(match[1]);
      }
    } catch (e) {
      console.warn("No se pudo obtener totalCommits:", e.message);
    }

    broadcast({
      type: "github-update",
      repo: {
        name: repo.name,
        url: repo.html_url,
        private: repo.private,
      },
      commit: {
        title: headCommit?.message || "Sin mensaje",
      },
      totalCommits,
    });

    // console.log("🚀 GitHub update:", repo.name, "| commits:", totalCommits);
    res.sendStatus(200);
  } catch (err) {
    console.error("Error GitHub webhook:", err.message);
    res.sendStatus(500);
  }
});

//
// ─────────────────────────────
// AUTH CALLBACK (TWITCH)
// ─────────────────────────────
//

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.send("Sin código");

  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: "https://twitch-a7sp.onrender.com/auth/callback",
  });

  const r = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: params,
  });

  const data = await r.json();

  res.send(`
    <b>Access Token:</b> ${data.access_token}<br><br>
    <b>Refresh Token:</b> ${data.refresh_token}
  `);
});

//
// ─────────────────────────────
// START SERVER
// ─────────────────────────────
//

const server = app.listen(PORT, async () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);

  try {
    const appToken = await getAppToken();

    const { accessToken } = await validateAndRefreshToken(
      USER_TOKEN,
      REFRESH_TOKEN,
    );

    activeUserToken = accessToken;

    const broadcasterId = await getBroadcasterId(appToken, CHANNEL_LOGIN);

    const moderatorId = await getBroadcasterId(appToken, MODERATOR_LOGIN);

    // console.log("Broadcaster ID:", broadcasterId);

    pollFollowers(activeUserToken, broadcasterId);

    const callbackUrl = "https://twitch-a7sp.onrender.com/twitch/webhook";

    await createAllEventSubSubscriptions(
      appToken,
      activeUserToken,
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

//
// ─────────────────────────────
// FOLLOWERS POLLING
// ─────────────────────────────
//

async function pollFollowers(userToken, broadcasterId) {
  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${broadcasterId}&first=1`,
      {
        headers: {
          "Client-ID": process.env.CLIENT_ID,
          Authorization: `Bearer ${userToken}`,
        },
      },
    );

    const data = await res.json();

    if (res.ok && data.data?.length) {
      const lastFollower = data.data[0].user_name;
      const totalFollowers = data.total || 0;

      setFollowers(totalFollowers, lastFollower);

      const meta = calcularMeta(totalFollowers);

      broadcast({
        type: "update",
        follow: lastFollower,
        goal: {
          current: totalFollowers,
          target: meta,
        },
      });
    }
  } catch (err) {
    console.warn("Error polling followers:", err.message);
  }

  setTimeout(
    () => pollFollowers(userToken, broadcasterId),
    FOLLOWER_POLL_INTERVAL,
  );
}

// Borrar todas las suscripciones
// app.get("/delete-subs", async (req, res) => {
//   const appToken = await getAppToken();
//   const listRes = await fetch(
//     "https://api.twitch.tv/helix/eventsub/subscriptions",
//     {
//       headers: {
//         "Client-ID": process.env.CLIENT_ID,
//         Authorization: `Bearer ${appToken}`,
//       },
//     },
//   );
//   const { data } = await listRes.json();

//   for (const sub of data) {
//     await fetch(
//       `https://api.twitch.tv/helix/eventsub/subscriptions?id=${sub.id}`,
//       {
//         method: "DELETE",
//         headers: {
//           "Client-ID": process.env.CLIENT_ID,
//           Authorization: `Bearer ${appToken}`,
//         },
//       },
//     );
//     console.log("🗑️ Borrada:", sub.type);
//   }
//   res.send("Suscripciones borradas");
// });

//
// ─────────────────────────────
// VSCODE EXTENSION
// ─────────────────────────────
//

let vscodeState = {
  project: "--",
  activeFile: "--",
  language: "--",
  currentLine: 0,
  totalFiles: 0,
  totalLines: 0,
};

app.post("/vscode", (req, res) => {
  vscodeState = req.body;

  broadcast({
    type: "vscode-update",
    ...vscodeState,
  });

  console.log(
    `💻 VSCode update: ${vscodeState.project} | ${vscodeState.activeFile} | líneas archivo: ${vscodeState.currentLine}/${vscodeState.totalLines} | archivos: ${vscodeState.totalFiles}`,
  );
  res.sendStatus(200);
});

//
// ─────────────────────────────
// HIGHLIGHT MENSAJE CHAT
// ─────────────────────────────
//

app.post("/highlight", (req, res) => {
  broadcast({ type: "highlight-message", ...req.body });
  console.log(`⭐ Highlight: [${req.body.user}]: ${req.body.text}`);
  res.sendStatus(200);
});

//
// ─────────────────────────────
// KICK AUTH
// ─────────────────────────────
//

let kickCodeVerifier = "";

app.get("/kick/auth", (req, res) => {
  // Generar PKCE
  kickCodeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(kickCodeVerifier)
    .digest("base64url");

  const state = crypto.randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.KICK_CLIENT_ID,
    redirect_uri: "https://twitch-a7sp.onrender.com/kick/callback",
    scope: "user:read channel:read:chat channel:write:chat events:subscribe",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });

  res.redirect(`https://id.kick.com/oauth/authorize?${params}`);
});

app.get("/kick/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.send("Sin código");

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.KICK_CLIENT_ID,
    client_secret: process.env.KICK_CLIENT_SECRET,
    redirect_uri: "https://twitch-a7sp.onrender.com/kick/callback",
    code_verifier: kickCodeVerifier,
    code,
  });

  const r = await fetch("https://id.kick.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const data = await r.json();
  // console.log("Kick token:", data);

  res.send(`
    <b>Access Token:</b> ${data.access_token}<br><br>
    <b>Refresh Token:</b> ${data.refresh_token}
  `);
});
initWebSocket(server, getState);
