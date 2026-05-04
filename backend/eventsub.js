// backend/eventsub.js
const { CLIENT_ID } = require("./config");

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

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
  console.log("🔑 Token validado:", data.login, "| Scopes:", data.scopes);
  return data;
}

async function createSubscription(token, event, callbackUrl, secret) {
  const res = await fetch(
    "https://api.twitch.tv/helix/eventsub/subscriptions",
    {
      method: "POST",
      headers: {
        "Client-ID": CLIENT_ID,
        Authorization: `Bearer ${token}`,
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

  if (res.ok) {
    console.log(`✅ Suscripción creada: ${event.type}`);
  } else {
    console.warn(`⚠️ Error creando ${event.type}:`, JSON.stringify(data));
  }

  return { ok: res.ok, data };
}

// ─────────────────────────────────────────────
// DEFINICIÓN DE EVENTOS
// ─────────────────────────────────────────────

/**
 * Devuelve la lista de eventos a suscribir.
 *
 * IMPORTANTE – channel.follow v2:
 *   - Requiere User Access Token (NO app token)
 *   - El token debe tener el scope: moderator:read:followers
 *   - La condition necesita tanto broadcaster_user_id como moderator_user_id
 */
function buildEventList(appToken, userToken, broadcasterId, moderatorId) {
  return [
    {
      type: "channel.subscribe",
      version: "1",
      condition: { broadcaster_user_id: broadcasterId },
      token: appToken,
    },
    {
      type: "channel.subscription.gift",
      version: "1",
      condition: { broadcaster_user_id: broadcasterId },
      token: appToken,
    },
    {
      type: "channel.subscription.message",
      version: "1",
      condition: { broadcaster_user_id: broadcasterId },
      token: appToken,
    },
    {
      // Mensajes del chat. user_id = quién lee los mensajes (el moderador/bot)
      type: "channel.chat.message",
      version: "1",
      condition: {
        broadcaster_user_id: broadcasterId,
        user_id: moderatorId, // ← FIX: era broadcasterId, debe ser moderatorId
      },
      token: appToken,
    },
    {
      // channel.follow v2 con webhook requiere appToken (NO userToken)
      type: "channel.follow",
      version: "2",
      condition: {
        broadcaster_user_id: broadcasterId,
        moderator_user_id: moderatorId,
      },
      token: appToken,
    },
  ];
}

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────

async function createAllEventSubSubscriptions(
  appToken,
  userToken,
  broadcasterId,
  moderatorId,
  callbackUrl,
  secret,
) {
  console.log("📡 Iniciando suscripciones EventSub...");

  // Valida el userToken antes de intentar crear la suscripción de follow
  const tokenInfo = await validateToken(userToken);
  if (!tokenInfo.user_id) {
    console.error("❌ userToken inválido – no se pueden crear suscripciones");
    return;
  }

  const hasFollowerScope = tokenInfo.scopes?.includes(
    "moderator:read:followers",
  );
  if (!hasFollowerScope) {
    console.warn(
      "⚠️  El userToken NO tiene el scope 'moderator:read:followers'.",
      "channel.follow NO funcionará.",
    );
  }

  // Borra las suscripciones existentes en estado failed para poder recrearlas
  const existing = await getExistingSubscriptions(appToken);
  const failedIds = existing
    .filter((s) => s.status === "webhook_callback_verification_failed")
    .map((s) => s.id);

  if (failedIds.length > 0) {
    console.log(
      `🗑️  Borrando ${failedIds.length} suscripciones en estado failed...`,
    );
    await deleteSubscriptions(appToken, failedIds);
  }

  // Recarga tras borrar
  const active = await getExistingSubscriptions(appToken);

  const events = buildEventList(appToken, userToken, broadcasterId, moderatorId);

  for (const event of events) {
    const alreadyExists = active.some(
      (sub) =>
        sub.type === event.type &&
        sub.status !== "webhook_callback_verification_failed" &&
        sub.condition.broadcaster_user_id === broadcasterId,
    );

    if (alreadyExists) {
      console.log(`ℹ️  Suscripción ya activa: ${event.type}`);
      continue;
    }

    await createSubscription(event.token, event, callbackUrl, secret);
  }

  console.log("📡 Proceso de suscripciones EventSub completado.");
}

async function deleteSubscriptions(appToken, ids) {
  for (const id of ids) {
    await fetch(
      `https://api.twitch.tv/helix/eventsub/subscriptions?id=${id}`,
      {
        method: "DELETE",
        headers: {
          "Client-ID": CLIENT_ID,
          Authorization: `Bearer ${appToken}`,
        },
      },
    );
    console.log(`🗑️  Suscripción borrada: ${id}`);
  }
}

module.exports = { createAllEventSubSubscriptions, deleteSubscriptions };