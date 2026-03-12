//////////////////////////////////////////////////////////////////
// STATE
//////////////////////////////////////////////////////////////////

const state = {
  lastFollowers: null,
  goalFollowers: null,
};

//////////////////////////////////////////////////////////////////
// DOM
//////////////////////////////////////////////////////////////////

const dom = {
  alerta: document.getElementById("alerta"),
  body: document.getElementById("termBody"),
  cursor: () => document.getElementById("cursor"),
  cdFill: document.getElementById("cdFill"),
  sound: document.getElementById("alertSound"),
  clock: document.getElementById("termClock"),
};

//////////////////////////////////////////////////////////////////
// UTILS
//////////////////////////////////////////////////////////////////

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function addLine(text, cls = "") {
  const span = document.createElement("span");
  span.className = "line " + cls;
  span.textContent = text;

  dom.body.insertBefore(span, dom.cursor());
  dom.body.insertBefore(document.createElement("br"), dom.cursor());
}

async function typeLine(text, cls = "", delay = 38) {
  const span = document.createElement("span");
  span.className = "line " + cls;

  dom.body.insertBefore(span, dom.cursor());

  for (const ch of text) {
    span.textContent += ch;
    await sleep(delay + Math.random() * 18);
  }

  dom.body.insertBefore(document.createElement("br"), dom.cursor());
}

//////////////////////////////////////////////////////////////////
// UI
//////////////////////////////////////////////////////////////////

function resetTerminal() {
  dom.body.innerHTML = '<span class="cursor" id="cursor"></span>';
}

function showTerminal() {
  dom.alerta.classList.remove("hiding", "visible");
  dom.alerta.style.display = "block";

  requestAnimationFrame(() => dom.alerta.classList.add("visible"));
}

function hideTerminal() {
  dom.alerta.classList.add("hiding");

  setTimeout(() => {
    dom.alerta.style.display = "none";
    dom.alerta.classList.remove("hiding");
  }, 200);
}

//////////////////////////////////////////////////////////////////
// ANIMATIONS
//////////////////////////////////////////////////////////////////

async function animateCrackBar() {
  const wrap = document.createElement("div");
  wrap.className = "crack-bar-wrap";

  const bg = document.createElement("div");
  bg.className = "crack-bar-bg";

  const fill = document.createElement("div");
  fill.className = "crack-bar-fill";

  const pct = document.createElement("span");
  pct.className = "crack-pct";
  pct.textContent = "0%";

  bg.appendChild(fill);
  wrap.appendChild(bg);
  wrap.appendChild(pct);

  dom.body.insertBefore(wrap, dom.cursor());
  dom.body.insertBefore(document.createElement("br"), dom.cursor());

  for (let i = 0; i <= 100; i += Math.floor(Math.random() * 7) + 2) {
    const v = Math.min(i, 100);

    fill.style.width = v + "%";
    pct.textContent = v + "%";

    await sleep(40 + Math.random() * 30);
  }

  fill.style.width = "100%";
  pct.textContent = "100%";
}

//////////////////////////////////////////////////////////////////
// FOLLOWER NAME
//////////////////////////////////////////////////////////////////

function renderFollower(name) {
  const span = document.createElement("span");
  span.className = "follower-name";
  span.textContent = "> " + name;

  dom.body.insertBefore(span, dom.cursor());
  dom.body.insertBefore(document.createElement("br"), dom.cursor());
}

//////////////////////////////////////////////////////////////////
// FOLLOWER GOAL
//////////////////////////////////////////////////////////////////

async function renderGoalProgress() {
  if (state.lastFollowers === null || state.goalFollowers === null) return;

  const prev = state.lastFollowers - 1;
  const pct = Math.floor((state.lastFollowers / state.goalFollowers) * 100);

  addLine(`followers_acquired: ${prev} → ${state.lastFollowers}`, "white");

  await sleep(120);

  addLine(`goal_progress: ${pct}%`, "warn");
}

//////////////////////////////////////////////////////////////////
// MAIN ALERT
//////////////////////////////////////////////////////////////////
let alertaActiva = false;

async function mostrarAlerta(nombre) {
  if (alertaActiva) return; // ← evita llamadas duplicadas
  alertaActiva = true;

  resetTerminal();
  showTerminal();

  dom.sound.currentTime = 0;
  dom.sound.play().catch(() => {});

  await sleep(120);

  await typeLine("$ ./stream_monitor.sh --watch live", "dim", 30);

  await sleep(200);

  addLine("[INFO] Monitoring incoming connections...", "dim");

  await sleep(500);

  addLine("[WARN] Anomalous traffic detected on port 1984", "warn");

  await sleep(300);

  await typeLine("$ traceroute --source unknown", "dim", 28);

  await sleep(250);

  addLine("Tracing route... 3 hops... 1 hop... DIRECT HIT", "dim");

  await sleep(400);

  addLine("[ALERT] !! INTRUSION ATTEMPT DETECTED !!", "red");

  await sleep(300);

  addLine("Cracking stream permissions...", "white");

  await animateCrackBar();

  await sleep(200);

  addLine("[SUCCESS] Firewall bypassed. Access granted.", "success");

  await sleep(300);

  addLine("Escalating privileges... FOLLOWER role acquired", "warn");

  await sleep(400);

  addLine("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "dim");

  await sleep(150);

  renderFollower(nombre);

  await sleep(200);

  addLine("ha hackeado el directo y obtenido permisos de SEGUIDOR", "bright");

  await sleep(150);

  await renderGoalProgress();

  await sleep(120);

  addLine("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "dim");

  startCountdown();
}

//////////////////////////////////////////////////////////////////
// COUNTDOWN
//////////////////////////////////////////////////////////////////

function startCountdown() {
  dom.cdFill.style.animation = "none";
  dom.cdFill.getBoundingClientRect();
  dom.cdFill.style.animation = "cdFillAnim 5s linear forwards";

  setTimeout(() => {
    hideTerminal();
    alertaActiva = false; // ← resetea el flag al cerrar
  }, 5000);
}

//////////////////////////////////////////////////////////////////
// CLOCK
//////////////////////////////////////////////////////////////////

function updateClock() {
  const now = new Date();

  dom.clock.textContent = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

setInterval(updateClock, 1000);
updateClock();

//////////////////////////////////////////////////////////////////
// WEBSOCKET
//////////////////////////////////////////////////////////////////

function initSocket() {
  // Después (producción Render):
  const loc = window.location;
  const wsProtocol = loc.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${wsProtocol}://${loc.host}/`);

  socket.onopen = () => console.log("WebSocket conectado");

  socket.onerror = (err) => console.error("WebSocket error", err);
  socket.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);

      if (data.type === "update") {
        if (data.goal?.current !== undefined)
          state.lastFollowers = data.goal.current;
        if (data.goal?.target !== undefined)
          state.goalFollowers = data.goal.target;
      }

      if (data.type === "init") {
        if (data.state?.followerCount !== undefined)
          state.lastFollowers = data.state.followerCount;
        state.goalFollowers = 500;
      }

      if (data.type === "follow") mostrarAlerta(data.name); // ← solo una vez, al final
    } catch {
      console.log("mensaje ignorado");
    }
  };
}

initSocket();
