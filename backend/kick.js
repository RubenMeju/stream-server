const KICK_EVENTS = [
  "chat.message.sent",
  "channel.followed",
  "channel.subscription.new",
  "channel.subscription.renewal",
  "channel.subscription.gifts",
  "livestream.status.updated",
];

async function createKickEventSubscriptions(accessToken) {
  console.log("🟢 Creando suscripciones de Kick...");

  for (const event of KICK_EVENTS) {
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
            type: event,
            broadcaster_user_id: process.env.KICK_BROADCASTER_ID,
          }),
        },
      );

      const data = await res.json();
      res.ok
        ? console.log(`✅ Kick suscripción creada: ${event}`)
        : console.warn(`⚠️ Error Kick ${event}:`, data);
    } catch (err) {
      console.warn(`⚠️ Error creando suscripción Kick ${event}:`, err.message);
    }
  }
}

module.exports = { createKickEventSubscriptions };
