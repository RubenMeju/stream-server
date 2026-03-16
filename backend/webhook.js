// backend/webhook.js
const crypto = require("crypto");
const { WEBHOOK_SECRET, CLIENT_ID } = require("./config");
const { incrementFollower, getState, calcularMeta } = require("./followers");
const { broadcast } = require("./websocket");

// Verifica que el webhook viene de Twitch (EventSub)
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

// Envía un mensaje al chat de Twitch
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

// Maneja todos los eventos EventSub importantes
async function handleTwitchWebhook(req, res, isDev = false) {
  const messageType = req.headers["twitch-eventsub-message-type"];

  // 🔹 1. VERIFICACIÓN DEL WEBHOOK (challenge)
  if (messageType === "webhook_callback_verification") {
    console.log("Twitch verificando webhook...");
    return res.status(200).send(req.body.challenge);
  }

  // 🔹 2. REVOCACIÓN DE SUSCRIPCIÓN
  if (messageType === "revocation") {
    console.warn("Twitch revocó una suscripción:", req.body);
    return res.status(200).end();
  }

  // 🔹 3. VALIDAR FIRMA (solo en producción)
  if (!isDev && !verifyTwitchSignature(req)) {
    console.warn("Firma inválida en webhook");
    return res.status(403).end();
  }

  const data = req.body;
  const eventType = data.subscription?.type;
  const event = data.event;

  switch (eventType) {
    case "channel.follow": {
      const follower = event.user_name;
      incrementFollower(follower);
      const state = getState();
      broadcast({
        type: "update",
        follow: follower,
        goal: {
          current: state.followerCount,
          target: calcularMeta(state.followerCount),
        },
        lastFollower: state.lastFollower,
      });
      broadcast({ type: "follow", name: follower });
      console.log(`Nuevo follower: ${follower}`);
      break;
    }

    case "channel.subscribe": {
      const user = event.user_name;
      broadcast({ type: "subscribe", name: user });
      console.log(`Nuevo suscriptor: ${user}`);
      break;
    }

    case "channel.subscription.gift": {
      const user = event.user_name;
      broadcast({ type: "gift-sub", name: user, total: event.total || 1 });
      console.log(`Gift sub de ${user} a ${event.total || 1} usuarios`);
      break;
    }

    case "channel.subscription.message": {
      const user = event.user_name;
      broadcast({
        type: "resub",
        name: user,
        message: event.message || "",
        subPlan: event.sub_plan || "",
      });
      console.log(`Resub de ${user}: ${event.sub_plan || ""}`);
      break;
    }

    case "channel.chat.message": {
      const text = event.message?.text?.trim();
      const user = event.chatter_user_name;
      const broadcasterId = event.broadcaster_user_id;
      const senderId = event.chatter_user_id;
      const userToken = req.userToken;

      // ← broadcast al overlay y extensión VSCode
      broadcast({
        type: "chat-message",
        user,
        text,
        color: event.color || "#00cfff",
        platform: "twitch",
      });

      const lowerText = text.toLowerCase();

      if (lowerText === "!github") {
        await sendChatMessage(
          broadcasterId,
          senderId,
          userToken,
          "🐙 Mi GitHub: https://github.com/RubenMeju",
        );
      } else if (lowerText === "!github-repo") {
        await sendChatMessage(
          broadcasterId,
          senderId,
          userToken,
          "📁 Repo actual: visible en el overlay",
        );
      } else if (lowerText === "!github-languages") {
        await sendChatMessage(
          broadcasterId,
          senderId,
          userToken,
          "💻 Lenguajes: visible en el overlay",
        );
      }

      console.log(`💬 Chat [${user}]: ${text}`);
      break;
    }

    default:
      console.log("Evento no manejado:", eventType);
      break;
  }

  res.status(200).end();
}

module.exports = { handleTwitchWebhook, verifyTwitchSignature };
