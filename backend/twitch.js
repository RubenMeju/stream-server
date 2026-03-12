const { CLIENT_ID, CLIENT_SECRET } = require("./config");
console.log({ CLIENT_ID, CLIENT_SECRET });
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
  console.log("Buscando usuario:", login);

  const res = await fetch(`https://api.twitch.tv/helix/users?login=${login}`, {
    headers: {
      "Client-ID": CLIENT_ID,
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  console.log("Respuesta Twitch users:", data);

  if (!data.data || data.data.length === 0) {
    throw new Error("Usuario no encontrado");
  }

  return data.data[0].id;
}

async function getUserToken(code) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: process.env.REDIRECT_URI,
  });

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: params,
  });
  const data = await res.json();
  return data.access_token; // este es el User Token
}

module.exports = { getAppToken, getBroadcasterId, getUserToken };
