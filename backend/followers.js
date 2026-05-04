// backend/followers.js
const { broadcast } = require("./websocket");

// ─────────────────────────────────────────────
// ESTADO
// ─────────────────────────────────────────────

let followerCount = 0;
let lastFollower = "--";

// ─────────────────────────────────────────────
// META DINÁMICA
// ─────────────────────────────────────────────

const HITOS = [50, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 5000, 10000];

function calcularMeta(total) {
  return HITOS.find((h) => h > total) ?? total + 1000;
}

// ─────────────────────────────────────────────
// MUTACIONES
// ─────────────────────────────────────────────

function setFollowers(count, last) {
  followerCount = count;
  lastFollower = last;
  console.log(
    `📊 setFollowers → total: ${followerCount} | último: ${lastFollower}`,
  );
}

function incrementFollower(name) {
  followerCount++;
  lastFollower = name;
  const meta = calcularMeta(followerCount);

  console.log(
    `🎉 incrementFollower → nuevo: ${name} | total: ${followerCount} | meta: ${meta}`,
  );

  broadcast({
    type: "update",
    follow: name,
    goal: { current: followerCount, target: meta },
    lastFollower,
  });

  broadcast({ type: "follow", name });
}

// ─────────────────────────────────────────────
// LECTURAS
// ─────────────────────────────────────────────

function getState() {
  return { followerCount, lastFollower };
}

module.exports = { setFollowers, getState, incrementFollower, calcularMeta };
