// backend/webhook.js
const crypto = require("crypto");
const { WEBHOOK_SECRET } = require("./config");
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
      console.log(
        `Se regaló una suscripción de ${user} a ${event.total || 1} usuarios`,
      );
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

      console.log(
        `Resub de ${user}: ${event.sub_plan || ""} - mensaje: ${event.message || ""}`,
      );
      break;
    }

    default:
      console.log("Evento no manejado:", eventType);
      break;
  }

  res.status(200).end();
}

module.exports = { handleTwitchWebhook, verifyTwitchSignature };
