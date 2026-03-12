const { CLIENT_ID, CLIENT_SECRET } = require("./config");

async function getAppToken() {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    { method: "POST" },
  );
  const data = await res.json();
  if (!data.access_token) throw new Error("No se pudo obtener el App Token");
  return data.access_token;
}

async function getBroadcasterId(token, login) {
  const res = await fetch(`https://api.twitch.tv/helix/users?login=${login}`, {
    headers: {
      "Client-ID": CLIENT_ID,
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!data.data || data.data.length === 0)
    throw new Error("Usuario no encontrado");
  return data.data[0].id;
}

module.exports = { getAppToken, getBroadcasterId };
