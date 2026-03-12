const TOTAL_TIME = 10 * 60; // 10 minutos
const termLines = [
  { text: "Iniciando motor de memes...", delay: 500 },
  { text: "Cargando 1.234 videos de gatos...", delay: 5500, success: true },

  // Secuencia de la paloma
  { text: "Conectando a Twitch… vía paloma mensajera", delay: 11000 },
  { text: "¡La paloma se ha perdido!", delay: 17000, error: true },
  { text: "Buscando paloma en el espacio-tiempo…", delay: 23000 },
  {
    text: "Hackeando Twitch para recuperar la paloma…",
    delay: 29000,
    error: true,
  },
  {
    text: "Paloma encontrada en la dimensión de los gatos…",
    delay: 35000,
    success: true,
  },
  { text: "Reconectando stream…", delay: 41000, error: true },

  // Secuencia normal
  { text: "Autenticando sesión cuántica...", delay: 47000, success: true },
  { text: "Lanzando overlays… paciencia, o no", delay: 53000 },
  { text: "Calibrando audio a 11/10 decibelios", delay: 59000, success: true },
  { text: "Conectando con el chat…", delay: 65000, error: true },
  { text: "Colacao para el streamer…", delay: 71000 },
  { text: "Sincronizando relojes con universo paralelo…", delay: 77000 },
  { text: "Actualizando gráficos mentales…", delay: 83000, error: true },
  { text: "Verificando trolls amistosos…", delay: 89000 },
  { text: "Ajustando niveles de hype…", delay: 95000, success: true },
  { text: "Entrenando a los bots para el chat…", delay: 101000 },
  { text: "Afinando la conexión con la fuerza…", delay: 107000 },
  {
    text: "¡Sistema listo! Que comience el show…",
    delay: 113000,
    success: true,
  },
];
const termBody = document.getElementById("terminal-body");

// Build terminal lines
termLines.forEach((item, i) => {
  const line = document.createElement("div");
  line.className =
    "t-line" + (item.success ? " success" : "") + (item.error ? " error" : "");
  line.innerHTML = `<span class="prompt">&gt; </span>${item.text}`;
  line.id = `tline-${i}`;
  termBody.appendChild(line);
});

// separator
const sep = document.createElement("div");
sep.className = "t-sep";
sep.id = "t-sep";
termBody.appendChild(sep);

// cursor line
const cursorLine = document.createElement("div");
cursorLine.id = "cursor-line";
cursorLine.innerHTML = `<span class="prompt">&gt; </span><span class="cursor-blink"></span>`;
termBody.appendChild(cursorLine);

// reveal lines
termLines.forEach((item, i) => {
  setTimeout(() => {
    document.getElementById(`tline-${i}`).classList.add("done");
  }, item.delay);
});
setTimeout(() => {
  document.getElementById("t-sep").classList.add("done");
  cursorLine.classList.add("visible");
}, 3800);

// ASCII noise
const ASCII_CHARS = "01░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌";
const asciiDiv = document.getElementById("ascii-lines");
let asciiActive = false;
setTimeout(() => {
  asciiActive = true;
}, 1000);

setInterval(() => {
  if (!asciiActive) return;
  let line = "";
  for (let i = 0; i < 48; i++) {
    line += ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
  }
  asciiDiv.innerHTML += line + "\n";
  const rows = asciiDiv.innerHTML.split("\n");
  if (rows.length > 7) asciiDiv.innerHTML = rows.slice(-7).join("\n");
}, 120);

// COUNTDOWN
let remaining = TOTAL_TIME;
const countdownEl = document.getElementById("countdown");
const barFill = document.getElementById("bar-fill");
const barPct = document.getElementById("bar-pct");
const liveBadge = document.getElementById("live-badge");

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
}

countdownEl.textContent = formatTime(remaining);

const timer = setInterval(() => {
  remaining--;
  if (remaining <= 0) {
    clearInterval(timer);
    countdownEl.textContent = "00:00";
    barFill.style.width = "100%";
    barPct.textContent = "100%";
    asciiActive = false;

    return;
  }
  const pct = ((TOTAL_TIME - remaining) / TOTAL_TIME) * 100;
  countdownEl.textContent = formatTime(remaining);
  barFill.style.width = pct + "%";
  barPct.textContent = Math.round(pct) + "%";
}, 1000);

// FPS counter (cosmetic)
let lastTime = performance.now();
let frames = 0;
const fpsEl = document.getElementById("fps-counter");
function fpsLoop(now) {
  frames++;
  if (now - lastTime >= 1000) {
    fpsEl.textContent = frames + " FPS";
    frames = 0;
    lastTime = now;
  }
  requestAnimationFrame(fpsLoop);
}
requestAnimationFrame(fpsLoop);
