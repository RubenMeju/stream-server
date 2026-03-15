const KICK_EVENTS = [
  { name: "chat.message.sent", version: 1 },
  { name: "channel.followed", version: 1 },
  { name: "channel.subscription.new", version: 1 },
  { name: "channel.subscription.renewal", version: 1 },
  { name: "channel.subscription.gifts", version: 1 },
  { name: "livestream.status.updated", version: 1 },
];

async function createKickEventSubscriptions(accessToken) {
  console.log("🟢 Comprobando suscripciones de Kick...");

  try {
    // Verificar si ya existen
    const checkRes = await fetch(
      "https://api.kick.com/public/v1/events/subscriptions",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const checkData = await checkRes.json();

    if (checkData?.data?.length > 0) {
      console.log(
        `ℹ️ Suscripciones Kick ya existen (${checkData.data.length})`,
      );
      return;
    }

    // Crear si no existen
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

    if (res.status === 204 || res.status === 200) {
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
