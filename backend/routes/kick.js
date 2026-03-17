const express = require("express");
const crypto = require("crypto");
const { broadcast } = require("../websocket");
const { refreshKickSubscriptions } = require("../kick");
const { BASE_URL, KICK_CLIENT_ID, KICK_CLIENT_SECRET } = require("../config");

const router = express.Router();

const KICK_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq/+l1WnlRrGSolDMA+A8
6rAhMbQGmQ2SapVcGM3zq8ANXjnhDWocMqfWcTd95btDydITa10kDvHzw9WQOqp2
MZI7ZyrfzJuz5nhTPCiJwTwnEtWft7nV14BYRDHvlfqPUaZ+1KR4OCaO/wWIk/rQ
L/TjY0M70gse8rlBkbo2a8rKhu69RQTRsoaf4DVhDPEeSeI5jVrRDGAMGL3cGuyY
6CLKGdjVEM78g3JfYOvDU/RvfqD7L89TZ3iN94jrmWdGz34JNlEI5hqK8dd7C5EF
BEbZ5jgB8s8ReQV8H+MkuffjdAj3ajDDX3DOJMIut1lBrUVD1AaSrGCKHooWoL2e
twIDAQAB
-----END PUBLIC KEY-----`;

function verifyKickSignature(req) {
  try {
    const messageId = req.headers["kick-event-message-id"];
    const timestamp = req.headers["kick-event-message-timestamp"];
    const signature = req.headers["kick-event-signature"];

    if (!messageId || !timestamp || !signature) {
      console.log("🔑 Faltan headers de firma");
      return false;
    }

    const rawBody = req.body;
    const prefix = Buffer.from(`${messageId}.${timestamp}.`);
    const signaturePayload = Buffer.concat([prefix, rawBody]);

    console.log("🔑 Verificando firma Kick...");

    return crypto.verify(
      "sha256",
      signaturePayload,
      { key: KICK_PUBLIC_KEY, padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(signature, "base64"),
    );
  } catch (err) {
    console.warn("⚠️ Error verificando firma Kick:", err.message);
    return false;
  }
}

function base64url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

const kickVerifiers = new Map();

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      console.log("📨 Kick webhook recibido");

      if (!verifyKickSignature(req)) {
        console.warn("⚠️ Firma Kick inválida");
        return res.sendStatus(403);
      }

      const eventType = req.headers["kick-event-type"];
      let body;
      try {
        body = JSON.parse(req.body);
      } catch {
        console.warn("⚠️ No se pudo parsear el body de Kick");
        return res.sendStatus(200);
      }

      console.log("📨 Kick event:", eventType);

      switch (eventType) {
        case "chat.message.sent": {
          const user = body.sender?.username;
          const text = body.content;
          const color = body.sender?.identity?.username_color || "#00ff88";
          broadcast({
            type: "chat-message",
            user,
            text,
            color,
            platform: "kick",
          });
          console.log(`💬 Kick Chat [${user}]: ${text}`);
          break;
        }
        case "channel.followed": {
          const follower = body.follower?.username;
          if (follower) {
            broadcast({ type: "follow", name: follower, platform: "kick" });
            console.log(`💚 Kick Follow: ${follower}`);
          }
          break;
        }
        case "channel.subscription.new":
        case "channel.subscription.renewal": {
          const user = body.subscriber?.username;
          broadcast({ type: "subscribe", name: user, platform: "kick" });
          console.log(`💚 Kick Sub: ${user}`);
          break;
        }
        case "channel.subscription.gifts": {
          const gifter = body.gifter?.username || "Anónimo";
          const total = body.giftees?.length || 1;
          broadcast({
            type: "gift-sub",
            name: gifter,
            total,
            platform: "kick",
          });
          console.log(`💚 Kick Gift Sub: ${gifter} x${total}`);
          break;
        }
        case "livestream.status.updated": {
          console.log(`📺 Kick stream ${body.is_live ? "ONLINE" : "OFFLINE"}`);
          break;
        }
        default:
          console.log("Kick evento no manejado:", eventType);
          break;
      }

      res.sendStatus(200);
    } catch (err) {
      console.error("Error Kick webhook:", err.message);
      res.sendStatus(500);
    }
  },
);

router.get("/auth", (req, res) => {
  console.log("kick auth");
  const codeVerifier = base64url(crypto.randomBytes(32));

  const codeChallenge = base64url(
    crypto.createHash("sha256").update(codeVerifier).digest(),
  );

  const state = crypto.randomBytes(16).toString("hex");

  kickVerifiers.set(state, codeVerifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: KICK_CLIENT_ID,
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

router.get("/callback", async (req, res) => {
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

    let finalCode = code;

    try {
      const decoded = Buffer.from(code, "base64").toString("utf8");

      if (/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(decoded)) {
        finalCode = decoded;
        console.log("Kick code decodificado:", finalCode);
      }
    } catch {}

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: KICK_CLIENT_ID,
      client_secret: KICK_CLIENT_SECRET,
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

router.get("/reset-subs", async (req, res) => {
  await refreshKickSubscriptions(process.env.KICK_ACCESS_TOKEN);
  res.send("Kick suscripciones reseteadas");
});

module.exports = router;
