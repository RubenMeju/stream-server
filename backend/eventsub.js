// backend/eventsub.js
const { CLIENT_ID } = require("./config");

/**
 * Crea suscripciones EventSub para los eventos que nos interesan
 * usando App Token o User Token según el tipo
 */

async function getExistingSubscriptions(appToken) {
  const res = await fetch(
    "https://api.twitch.tv/helix/eventsub/subscriptions",
    {
      headers: {
        "Client-ID": CLIENT_ID,
        Authorization: `Bearer ${appToken}`,
      },
    },
  );

  const data = await res.json();

  if (!res.ok) {
    console.warn("⚠️ Error leyendo suscripciones:", data);
    return [];
  }

  return data.data || [];
}

async function validateToken(token) {
  const res = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${token}` },
  });
  const data = await res.json();
  console.log("Token válido:", data);
  return data;
}

async function createAllEventSubSubscriptions(
  appToken,
  userToken, // ← nuevo parámetro
  broadcasterId,
  moderatorId,
  callbackUrl,
  secret,
) {
  await validateToken(userToken); // ← añade esta línea al inicio

  const existing = await getExistingSubscriptions(appToken);

  const events = [
    // Alguien se suscribe al canal (sub nuevo)
    {
      type: "channel.subscribe",
      version: "1",
      condition: { broadcaster_user_id: broadcasterId },
      token: appToken,
    },
    // Alguien regala suscripciones a otros usuarios
    {
      type: "channel.subscription.gift",
      version: "1",
      condition: { broadcaster_user_id: broadcasterId },
      token: appToken,
    },
    // Alguien renueva su suscripción (resub) con mensaje
    {
      type: "channel.subscription.message",
      version: "1",
      condition: { broadcaster_user_id: broadcasterId },
      token: appToken,
    },
    // Mensajes del chat — usado para detectar comandos como !github
    {
      type: "channel.chat.message",
      version: "1",
      condition: {
        broadcaster_user_id: broadcasterId,
        user_id: broadcasterId,
      },
      token: userToken,
    },
  ];

  for (const event of events) {
    const alreadyExists = existing.some(
      (sub) =>
        sub.type === event.type &&
        sub.condition.broadcaster_user_id === broadcasterId,
    );

    if (alreadyExists) {
      console.log(`ℹ️ Suscripción ya existe: ${event.type}`);
      continue;
    }

    const res = await fetch(
      "https://api.twitch.tv/helix/eventsub/subscriptions",
      {
        method: "POST",
        headers: {
          "Client-ID": CLIENT_ID,
          Authorization: `Bearer ${event.token}`, // ← usa el token del evento
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: event.type,
          version: event.version,
          condition: event.condition,
          transport: { method: "webhook", callback: callbackUrl, secret },
        }),
      },
    );

    const data = await res.json();
    res.ok
      ? console.log(`✅ Suscripción creada: ${event.type}`)
      : console.warn(`⚠️ Error creando ${event.type}:`, data);
  }
}

module.exports = { createAllEventSubSubscriptions };
