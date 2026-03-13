// UTIL
const pad = (n) => String(n).padStart(2, "0");

// Clock
function updateClock() {
  const now = new Date();
  const str = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  document.getElementById("clock-top").textContent = str;
  document.getElementById("log-time").textContent = str;
}
updateClock();
setInterval(updateClock, 1000);

// Elapsed timer
const startTime = Date.now();
setInterval(() => {
  const s = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(s / 60),
    sec = s % 60;
  document.getElementById("elapsed").textContent = `${pad(m)}:${pad(sec)}`;
}, 1000);

// ASCII background
const ASCII = "01░▒│┤╡╣║╗╝┐└┴┬├─┼╠═╬╧┘┌╔╩";
const asciiEl = document.getElementById("ascii-bg");
function genAscii() {
  let out = "";
  for (let r = 0; r < 14; r++) {
    for (let c = 0; c < 22; c++) {
      out +=
        Math.random() > 0.85
          ? ASCII[Math.floor(Math.random() * ASCII.length)]
          : " ";
    }
    out += "\n";
  }
  asciiEl.textContent = out;
}
genAscii();
setInterval(genAscii, 2000);

// WEBSOCKET
const ws = new WebSocket(
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`,
);
ws.onopen = () => console.log("WebSocket conectado");
ws.onmessage = (evt) => {
  const data = JSON.parse(evt.data);
  console.log("WS mensaje:", data); // ← añade esto temporalmente

  // ← añade este bloque
  if (data.type === "init") {
    console.log("init state:", data.state); // ← y esto
    if (data.state?.lastFollower)
      document.getElementById("last-follower").textContent =
        `Último seguidor: ${data.state.lastFollower}`;
    if (data.state?.followerCount)
      document.getElementById("follower-goal").textContent =
        `Meta seguidores: ${data.state.followerCount} / 500`;
  }

  if (data.type === "update") {
    if (data.follow)
      document.getElementById("last-follower").textContent =
        `Último seguidor: ${data.follow}`;
    if (data.goal)
      document.getElementById("follower-goal").textContent =
        `Meta seguidores: ${data.goal.current} / ${data.goal.target}`;
    if (data.donation)
      document.getElementById("last-donation").textContent =
        `Última donación: ${data.donation.name} (${data.donation.amount})`;
    if (data.subscriber)
      document.getElementById("last-subscriber").textContent =
        `Último suscriptor: ${data.subscriber}`;
  }

  if (data.type === "subscribe") {
    document.getElementById("last-subscriber").textContent =
      `Último suscriptor: ${data.name}`;
  }
};
