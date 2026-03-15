const KICK_EVENTS = [
  { name: "chat.message.sent", version: 1 },
  { name: "channel.followed", version: 1 },
  { name: "channel.subscription.new", version: 1 },
  { name: "channel.subscription.renewal", version: 1 },
  { name: "channel.subscription.gifts", version: 1 },
  { name: "livestream.status.updated", version: 1 },
];

async function createKickEventSubscriptions(accessToken) {
  console.log("🟢 Creando suscripciones de Kick...");

  try {
    const res = await fetch(
      "https://api.kick.com/public/v1/events/subscriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          events: KICK_EVENTS,
          method: "webhook",
          broadcaster_user_id: parseInt(process.env.KICK_BROADCASTER_ID),
        }),
      },
    );

    if (res.status === 204) {
      console.log("✅ Suscripciones Kick creadas correctamente");
    } else {
      const data = await res.json();
      console.warn("⚠️ Error creando suscripciones Kick:", data);
    }
  } catch (err) {
    console.warn("⚠️ Error creando suscripciones Kick:", err.message);
  }
}

module.exports = { createKickEventSubscriptions };
