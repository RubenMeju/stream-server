//////////////////////////////////////////////////////////////////
// STATE
//////////////////////////////////////////////////////////////////

const state = {
  followers: 0,
  goal: 0,
};

let alertaActiva = false;
const queue = [];

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
// FOLLOWER BAR
//////////////////////////////////////////////////////////////////

function renderGoalProgress() {
  if (!state.followers || !state.goal) return;

  const pct = Math.floor((state.followers / state.goal) * 100);

  addLine(`followers: ${state.followers} / ${state.goal}`, "white");

  addLine(`goal_progress: ${pct}%`, "warn");
}

//////////////////////////////////////////////////////////////////
// ANIMATION
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
// ALERT SYSTEM (QUEUE SAFE)
//////////////////////////////////////////////////////////////////

async function processQueue() {
  if (alertaActiva || queue.length === 0) return;

  alertaActiva = true;
  const name = queue.shift();

  await mostrarAlerta(name);

  alertaActiva = false;
  processQueue();
}

function enqueueAlert(name) {
  queue.push(name);
  processQueue();
}

//////////////////////////////////////////////////////////////////
// MAIN ALERT
//////////////////////////////////////////////////////////////////

async function mostrarAlerta(name) {
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

  addLine("Tracing route... DIRECT HIT", "dim");
  await sleep(400);

  addLine("[ALERT] INTRUSION DETECTED", "red");
  await sleep(300);

  addLine("Cracking permissions...", "white");

  await animateCrackBar();
  await sleep(200);

  addLine("[SUCCESS] Access granted", "success");
  await sleep(300);

  addLine("FOLLOWER role acquired", "warn");
  await sleep(400);

  addLine("━━━━━━━━━━━━━━━━━━━━━━", "dim");
  await sleep(150);

  const span = document.createElement("span");
  span.className = "follower-name";
  span.textContent = "> " + name;

  dom.body.insertBefore(span, dom.cursor());
  dom.body.insertBefore(document.createElement("br"), dom.cursor());

  await sleep(200);

  addLine("ha obtenido permisos de SEGUIDOR", "bright");

  await sleep(150);

  renderGoalProgress();

  await sleep(120);

  addLine("━━━━━━━━━━━━━━━━━━━━━━", "dim");

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
  const loc = window.location;
  const wsProtocol = loc.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${wsProtocol}://${loc.host}/`);

  socket.onopen = () => console.log("WebSocket conectado");

  socket.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);

      // INIT STATE
      if (data.type === "init") {
        state.followers = data.state?.followerCount || 0;
        state.goal = 500;
      }

      // UPDATE STATE
      if (data.type === "update") {
        state.followers = data.goal?.current ?? state.followers;
        state.goal = data.goal?.target ?? state.goal;
      }

      // FOLLOW EVENT
      if (data.type === "follow") {
        enqueueAlert(data.name || data.user);
      }
    } catch (e) {
      console.log("mensaje ignorado");
    }
  };

  socket.onerror = (err) => console.error("WebSocket error", err);
}

initSocket();
