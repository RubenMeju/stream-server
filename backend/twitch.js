// backend/twitch.js
const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN } = require("./config");

// ─────────────────────────────────────────────
// APP TOKEN (Client Credentials)
// ─────────────────────────────────────────────

async function getAppToken() {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Error obteniendo app token: ${JSON.stringify(data)}`);
  }

  console.log("🔑 App token obtenido");
  return data.access_token;
}

// ─────────────────────────────────────────────
// BROADCASTER ID
// ─────────────────────────────────────────────

async function getBroadcasterId(appToken, login) {
  const res = await fetch(
    `https://api.twitch.tv/helix/users?login=${login}`,
    {
      headers: {
        "Client-ID": CLIENT_ID,
        Authorization: `Bearer ${appToken}`,
      },
    },
  );

  const data = await res.json();

  if (!res.ok || !data.data?.length) {
    throw new Error(`No se encontró el usuario: ${login}`);
  }

  const user = data.data[0];
  console.log(`👤 Broadcaster ID para ${login}: ${user.id}`);
  return user.id;
}

// ─────────────────────────────────────────────
// VALIDAR Y REFRESCAR USER TOKEN
// ─────────────────────────────────────────────

async function validateAndRefreshToken(userToken, refreshToken) {
  // Primero valida el token actual
  const validateRes = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${userToken}` },
  });

  const validateData = await validateRes.json();

  if (validateRes.ok && validateData.user_id) {
    console.log(
      `✅ User token válido para: ${validateData.login} | scopes: ${validateData.scopes?.join(", ")}`,
    );
    return { accessToken: userToken, refreshed: false };
  }

  // Si no es válido, refresca
  console.warn("⚠️ User token expirado, refrescando...");

  const refreshRes = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const refreshData = await refreshRes.json();

  if (!refreshRes.ok) {
    throw new Error(`Error refrescando token: ${JSON.stringify(refreshData)}`);
  }

  console.log("🔄 User token refrescado correctamente");
  return { accessToken: refreshData.access_token, refreshed: true };
}

module.exports = { getAppToken, getBroadcasterId, validateAndRefreshToken };