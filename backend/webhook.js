// backend/webhook.js
const crypto = require("crypto");
const { WEBHOOK_SECRET, CLIENT_ID } = require("./config");
const { broadcast } = require("./websocket");

// ─────────────────────────────────────────────
// VERIFICACIÓN DE FIRMA
// ─────────────────────────────────────────────

function verifyTwitchSignature(req) {
  const messageId = req.headers["twitch-eventsub-message-id"];
  const timestamp = req.headers["twitch-eventsub-message-timestamp"];
  const signature = req.headers["twitch-eventsub-message-signature"];

  if (!messageId || !timestamp || !signature) return false;

  const hmacMessage = messageId + timestamp + req.rawBody;
  const hash = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(hmacMessage)
    .digest("hex");

  return signature === `sha256=${hash}`;
}

// ─────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────

async function sendChatMessage(broadcasterId, senderId, userToken, message) {
  const res = await fetch("https://api.twitch.tv/helix/chat/messages", {
    method: "POST",
    headers: {
      "Client-ID": CLIENT_ID,
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      broadcaster_id: broadcasterId,
      sender_id: senderId,
      message,
    }),
  });

  const data = await res.json();
  if (!res.ok) console.warn("⚠️ Error enviando mensaje al chat:", data);
  else console.log("💬 Mensaje enviado al chat:", message);
}

// ─────────────────────────────────────────────
// HANDLERS DE EVENTOS
// ─────────────────────────────────────────────

async function handleFollow(event) {
  const { incrementFollower } = require("./followers");
  const follower = event.user_name;
  console.log(`👤 Nuevo follower: ${follower}`);
  incrementFollower(follower); // broadcast ya se hace dentro de incrementFollower
}

function handleSubscribe(event) {
  broadcast({ type: "subscribe", name: event.user_name });
  console.log(`⭐ Nuevo suscriptor: ${event.user_name}`);
}

function handleGiftSub(event) {
  broadcast({
    type: "gift-sub",
    name: event.user_name,
    total: event.total || 1,
  });
  console.log(
    `🎁 Gift sub de ${event.user_name} a ${event.total || 1} usuarios`,
  );
}

function handleResub(event) {
  broadcast({
    type: "resub",
    name: event.user_name,
    message: event.message || "",
    subPlan: event.sub_plan || "",
  });
  console.log(`🔄 Resub de ${event.user_name}: ${event.sub_plan || ""}`);
}

async function handleChatMessage(event, userToken) {
  const text = event.message?.text?.trim();
  const user = event.chatter_user_name;
  const broadcasterId = event.broadcaster_user_id;
  const senderId = event.chatter_user_id;

  broadcast({
    type: "chat-message",
    user,
    text,
    color: event.color || "#00cfff",
    platform: "twitch",
  });

  const lowerText = text.toLowerCase();
  const chatCommands = {
    "!github": "🐙 Mi GitHub: https://github.com/RubenMeju",
    "!github-repo": "📁 Repo actual: visible en el overlay",
    "!github-languages": "💻 Lenguajes: visible en el overlay",
  };

  if (chatCommands[lowerText]) {
    await sendChatMessage(
      broadcasterId,
      senderId,
      userToken,
      chatCommands[lowerText],
    );
  }

  console.log(`💬 Chat [${user}]: ${text}`);
}

// ─────────────────────────────────────────────
// DISPATCHER PRINCIPAL
// ─────────────────────────────────────────────

const EVENT_HANDLERS = {
  "channel.follow": (event) => handleFollow(event),
  "channel.subscribe": (event) => handleSubscribe(event),
  "channel.subscription.gift": (event) => handleGiftSub(event),
  "channel.subscription.message": (event) => handleResub(event),
  "channel.chat.message": (event, userToken) =>
    handleChatMessage(event, userToken),
};

async function handleTwitchWebhook(req, res, isDev = false) {
  const messageType = req.headers["twitch-eventsub-message-type"];

  // 1. Challenge de verificación inicial
  if (messageType === "webhook_callback_verification") {
    console.log("🔔 Twitch verificando webhook...");
    return res.status(200).send(req.body.challenge);
  }

  // 2. Revocación
  if (messageType === "revocation") {
    console.warn(
      "⚠️ Twitch revocó una suscripción:",
      req.body?.subscription?.type,
    );
    return res.status(200).end();
  }

  // 3. Validar firma (siempre en producción, opcional en dev)
  if (!isDev && !verifyTwitchSignature(req)) {
    console.warn("🚫 Firma inválida en webhook");
    return res.status(403).end();
  }

  const eventType = req.body?.subscription?.type;
  const event = req.body?.event;

  console.log(`📨 Evento recibido: ${eventType}`);

  if (!eventType || !event) {
    console.warn("⚠️ Webhook con estructura inesperada:", req.body);
    return res.status(400).end();
  }

  const handler = EVENT_HANDLERS[eventType];

  if (handler) {
    await handler(event, req.userToken);
  } else {
    console.log(`ℹ️ Evento no manejado: ${eventType}`);
  }

  res.status(200).end();
}

module.exports = { handleTwitchWebhook, verifyTwitchSignature };
