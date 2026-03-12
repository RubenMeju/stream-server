// ─────────────── FUNCIONES DE UTILIDAD ───────────────
function pad(n) {
  return String(n).padStart(2, "0");
}

// ─────────────── RELOJ LOCAL ───────────────
function tick() {
  const now = new Date();
  document.getElementById("clock").textContent =
    pad(now.getHours()) +
    ":" +
    pad(now.getMinutes()) +
    ":" +
    pad(now.getSeconds());
  document.getElementById("clock-b").textContent =
    pad(now.getHours()) + ":" + pad(now.getMinutes());
}
tick();
setInterval(tick, 1000);

// ─────────────── UPTIME STREAM ───────────────
const t0 = Date.now();
function uptime() {
  const s = Math.floor((Date.now() - t0) / 1000);
  document.getElementById("uptime").textContent =
    pad(Math.floor(s / 3600)) +
    ":" +
    pad(Math.floor((s % 3600) / 60)) +
    ":" +
    pad(s % 60);
}
uptime();
setInterval(uptime, 1000);

// ─────────────── FPS ───────────────
let t = performance.now(),
  f = 0;
(function loop(now) {
  f++;
  if (now - t >= 1000) {
    document.getElementById("fps").textContent = f + " FPS";
    f = 0;
    t = now;
  }
  requestAnimationFrame(loop);
})(performance.now());

// ─────────────── WEBSOCKET PARA OVERLAY ───────────────
const ws = new WebSocket(
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`,
);

ws.onopen = () => console.log("Conectado al WebSocket del overlay");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  // ─────────────── ÚLTIMO SEGUIDOR ───────────────
  if (data.type === "update" && data.follow) {
    const el = document.getElementById("last-follower");
    if (el) {
      el.textContent = `Último seguidor: ${data.follow}`;
      el.classList.add("flash");
      setTimeout(() => el.classList.remove("flash"), 800);
    }
  }

  // ─────────────── META DE SEGUIDORES ───────────────
  if (data.type === "update" && data.goal) {
    const el = document.getElementById("follower-goal");
    if (el) {
      el.textContent = `Meta: ${data.goal.current} / ${data.goal.target}`;
    }
  }

  // ─────────────── NUEVOS SUSCRIPTORES ───────────────
  if (data.type === "subscribe") {
    const msg = `Nuevo suscriptor: ${data.name}`;
    console.log(msg);
    flashMessage(msg, "subscribe");
  }

  // ─────────────── GIFT SUBS ───────────────
  if (data.type === "gift-sub") {
    const msg = `Gift Sub de ${data.name}, total: ${data.total}`;
    console.log(msg);
    flashMessage(msg, "gift-sub");
  }

  // ─────────────── FUNCIÓN AUXILIAR PARA FLASH ───────────────
  function flashMessage(msg, cls) {
    const container = document.createElement("div");
    container.className = `flash-msg ${cls}`;
    container.textContent = msg;
    document.body.appendChild(container);
    setTimeout(() => container.remove(), 2500);
  }
};
