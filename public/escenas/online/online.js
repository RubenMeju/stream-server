function pad(n) {
  return String(n).padStart(2, "0");
}

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
