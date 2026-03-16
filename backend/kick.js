const KICK_EVENTS = [
  { name: "chat.message.sent", version: 1 },
  { name: "channel.followed", version: 1 },
  { name: "channel.subscription.new", version: 1 },
  { name: "channel.subscription.renewal", version: 1 },
  { name: "channel.subscription.gifts", version: 1 },
  { name: "livestream.status.updated", version: 1 },
];

async function getKickSubscriptions(accessToken) {
  const res = await fetch(
    "https://api.kick.com/public/v1/events/subscriptions",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );
  const data = await res.json();
  return data?.data || [];
}

async function deleteKickSubscriptions(accessToken, ids) {
  const params = ids.map((id) => `id=${id}`).join("&");
  const res = await fetch(
    `https://api.kick.com/public/v1/events/subscriptions?${params}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  console.log("🗑️ Kick subs borradas:", res.status);
}

async function createKickEventSubscriptions(accessToken) {
  console.log("🟢 Comprobando suscripciones de Kick...");

  try {
    const existing = await getKickSubscriptions(accessToken);

    if (existing.length > 0) {
      console.log(`ℹ️ Suscripciones Kick ya existen (${existing.length})`);
      return;
    }

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
        }),
      },
    );

    if (res.status === 200) {
      const data = await res.json();
      console.log("✅ Suscripciones Kick creadas:", data);
    } else {
      const data = await res.json();
      console.warn("⚠️ Error creando suscripciones Kick:", data);
    }
  } catch (err) {
    console.warn("⚠️ Error creando suscripciones Kick:", err.message);
  }
}

async function refreshKickSubscriptions(accessToken) {
  const existing = await getKickSubscriptions(accessToken);
  if (existing.length > 0) {
    const ids = existing.map((s) => s.id);
    await deleteKickSubscriptions(accessToken, ids);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // ← espera 1s
  }
  await createKickEventSubscriptions(accessToken);
}

module.exports = { createKickEventSubscriptions, refreshKickSubscriptions };
