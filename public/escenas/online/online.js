// ─────────────── FUNCIONES DE UTILIDAD ───────────────
function calcularMeta(total) {
  const hitos = [
    50, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 5000, 10000,
  ];
  return hitos.find((h) => h > total) || total + 1000;
}

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
  console.log("MENSAJE RECIBIDO:", event.data);
  const data = JSON.parse(event.data);
  if (data.type === "init") {
    const elFollower = document.getElementById("last-follower");
    if (elFollower && data.state?.lastFollower) {
      elFollower.textContent = `Último seguidor: ${data.state.lastFollower}`;
    }
    const elGoal = document.getElementById("follower-goal");
    if (elGoal && data.state?.followerCount) {
      // ← calcula la meta en el cliente igual que en el servidor
      const meta = calcularMeta(data.state.followerCount);
      elGoal.textContent = `Seguidores ${data.state.followerCount} / ${meta}`;
    }
  }

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
      el.textContent = `Seguidores: ${data.goal.current} / ${data.goal.target}`;
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

  // ─────────────── HIGHLIGHT MENSAJE CHAT───────────────
  if (data.type === "highlight-message") {
    const container = document.getElementById("highlight-message");
    const userEl = document.getElementById("highlight-user");
    const textEl = document.getElementById("highlight-text");

    if (container && userEl && textEl) {
      userEl.textContent = data.user;
      userEl.style.color = data.color || "#9146ff";
      textEl.textContent = data.text;

      container.classList.remove("highlight-hidden");
      container.classList.add("highlight-visible");

      // Desaparece después de 8 segundos
      clearTimeout(window._highlightTimeout);
      window._highlightTimeout = setTimeout(() => {
        container.classList.remove("highlight-visible");
        container.classList.add("highlight-hidden");
      }, 8000);
    }
  }

  // ─────────────── GITHUB UPDATE ───────────────
  if (data.type === "github-update") {
    const commitEl = document.getElementById("last-commit");
    const repoEl = document.getElementById("repo-info");

    if (commitEl) {
      commitEl.textContent = `Commit: ${data.commit.title}`;
    }

    if (repoEl) {
      const { name, private: isPrivate } = data.repo;
      repoEl.textContent = isPrivate
        ? `Repo: ${name} 🔒 · commits: ${data.totalCommits}`
        : `Repo: ${name} · commits: ${data.totalCommits}`;
    }
  }

  // ─────────────── VSCODE UPDATE ───────────────
  if (data.type === "vscode-update") {
    const langMap = {
      typescript: { label: "TYPESCRIPT", color: "#3178C6" },
      javascript: { label: "JAVASCRIPT", color: "#F7DF1E" },
      python: { label: "PYTHON", color: "#FFD43B" },
      css: { label: "CSS", color: "#264DE4" },
      html: { label: "HTML", color: "#E34F26" },
      json: { label: "JSON", color: "#00cfff" },
      jsx: { label: "REACT JSX", color: "#61DAFB" },
      tsx: { label: "REACT TSX", color: "#3178C6" },
    };

    const lang = langMap[data.language] || {
      label: data.language?.toUpperCase() || "--",
      color: "#00cfff",
    };
    const fileName = data.activeFile ? data.activeFile.split("/").pop() : "--";

    const left = document.getElementById("side-label-left");
    const right = document.getElementById("side-label-right");

    if (left) {
      left.textContent = `${lang.label} :: ${fileName} :: ${data.project}`;
      left.style.color = lang.color;
      left.style.textShadow = `0 0 8px ${lang.color}`;
      left.style.opacity = "0.6";
    }

    if (right) {
      right.textContent = `${data.project} :: ${fileName} :: ${lang.label}`;
      right.style.color = lang.color;
      right.style.textShadow = `0 0 8px ${lang.color}`;
      right.style.opacity = "0.6";
    }
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
