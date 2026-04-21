require("dotenv").config({ path: ".env.local" });

const express = require("express");
const bodyParser = require("body-parser");

const { broadcast, initWebSocket } = require("./websocket");

const {
  PORT,
  PUBLIC_PATH,
  USER_TOKEN,
  REFRESH_TOKEN,
  MODERATOR_LOGIN,
  CHANNEL_LOGIN,
  WEBHOOK_SECRET,
  BASE_URL,
  FOLLOWER_POLL_INTERVAL = 60000,
} = require("./config");

const { getState, setFollowers, calcularMeta } = require("./followers");
const {
  getBroadcasterId,
  getAppToken,
  validateAndRefreshToken,
} = require("./twitch");

const { createKickEventSubscriptions } = require("./kick");
const { createAllEventSubSubscriptions } = require("./eventsub");

const twitchRoutes = require("./routes/twitch");
const kickRoutes = require("./routes/kick");
const githubRoutes = require("./routes/github");
const vscodeRoutes = require("./routes/vscode");
const highlightRoutes = require("./routes/highlight");

const app = express();
app.use(express.static(PUBLIC_PATH));
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString("utf8");
  }
}));

let activeUserToken = USER_TOKEN;
app.use((req, res, next) => {
  req.userToken = activeUserToken;
  next();
});

app.use("/twitch", twitchRoutes);
app.use("/kick", kickRoutes);
app.use("/github", githubRoutes);
app.use("/vscode", vscodeRoutes);
app.use(highlightRoutes);

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

    pollFollowers(activeUserToken, broadcasterId);

    const callbackUrl = `${BASE_URL}/twitch/webhook`;
    // Crear suscripciones EventSub para twitch
    await createAllEventSubSubscriptions(
      appToken,
      activeUserToken,
      broadcasterId,
      moderatorId,
      callbackUrl,
      WEBHOOK_SECRET,
    );

    // Crear suscripciones EventSub para kick
    await createKickEventSubscriptions(process.env.KICK_ACCESS_TOKEN);

    console.log("✅ Inicialización completa");
  } catch (err) {
    console.error("❌ Error inicializando:", err.message);
  }
});

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

const kickVerifiers = new Map();

function base64url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/* =========================
   KICK AUTH
========================= */

app.get("/kick/auth", (req, res) => {
  console.log("kick auth");
  const codeVerifier = base64url(crypto.randomBytes(32));

  const codeChallenge = base64url(
    crypto.createHash("sha256").update(codeVerifier).digest(),
  );

  const state = crypto.randomBytes(16).toString("hex");

  kickVerifiers.set(state, codeVerifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.KICK_CLIENT_ID,
    redirect_uri: `${BASE_URL}/kick/callback`,
    scope: "user:read channel:read channel:write chat:write events:subscribe",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });

  const url = `https://id.kick.com/oauth/authorize?${params.toString()}`;

  console.log("Redirect OAuth Kick:", url);

  res.redirect(url);
});

/* =========================
   KICK CALLBACK
========================= */

app.get("/kick/callback", async (req, res) => {
  console.log("kick callback");
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).send("OAuth error: parámetros faltantes");
    }

    const codeVerifier = kickVerifiers.get(state);
    kickVerifiers.delete(state);

    if (!codeVerifier) {
      return res.status(400).send("OAuth error: state inválido o expirado");
    }

    console.log("Kick code recibido:", code);

    /* =========================
       FIX KICK CODE
    ========================= */

    let finalCode = code;

    try {
      const decoded = Buffer.from(code, "base64").toString("utf8");

      if (/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(decoded)) {
        finalCode = decoded;
        console.log("Kick code decodificado:", finalCode);
      }
    } catch {}

    /* =========================
       TOKEN REQUEST
    ========================= */

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.KICK_CLIENT_ID,
      client_secret: process.env.KICK_CLIENT_SECRET,
      redirect_uri: `${BASE_URL}/kick/callback`,
      code_verifier: codeVerifier,
      code: finalCode,
    });

    const response = await fetch("https://id.kick.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const raw = await response.text();

    console.log("Kick token status:", response.status);
    console.log("Kick token raw:", raw);

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(500).send(`
        Error parseando respuesta de Kick
        <pre>${raw}</pre>
      `);
    }

    if (!response.ok) {
      return res.status(response.status).send(`
        Error OAuth Kick
        <pre>${JSON.stringify(data, null, 2)}</pre>
      `);
    }

    /* =========================
       SUCCESS
    ========================= */

    res.send(`
      <h2>Kick OAuth completado</h2>

      <b>Access Token</b><br>
      <code>${data.access_token}</code><br><br>

      <b>Refresh Token</b><br>
      <code>${data.refresh_token}</code><br><br>

      <b>Expires In</b><br>
      ${data.expires_in}<br><br>

      <b>Scope</b><br>
      ${data.scope}<br><br>

      <hr>
      <pre>${JSON.stringify(data, null, 2)}</pre>
    `);
  } catch (err) {
    console.error("Kick OAuth error:", err);

    res.status(500).send(`
      Error interno OAuth Kick
      <pre>${err.stack}</pre>
    `);
  }
});

// solo para depurar
// app.get("/kick/me", async (req, res) => {
//   const r = await fetch("https://api.kick.com/public/v1/users", {
//     headers: {
//       Authorization: `Bearer ${process.env.KICK_ACCESS_TOKEN}`,
//       "Content-Type": "application/json",
//     },
//   });
//   const data = await r.json();
//   console.log("Kick me:", JSON.stringify(data, null, 2));
//   res.json(data);
// });

// solo para depurar borra suscripciones y las recrea para kick
app.get("/kick/reset-subs", async (req, res) => {
  const { refreshKickSubscriptions } = require("./kick");
  await refreshKickSubscriptions(process.env.KICK_ACCESS_TOKEN);
  res.send("Kick suscripciones reseteadas");
});

initWebSocket(server, getState);
