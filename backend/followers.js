// backend/followers.js
const { broadcast } = require("./websocket");

let followerCount = 0;
let lastFollower = "--";

function calcularMeta(total) {
  const hitos = [
    50, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 5000, 10000,
  ];
  return hitos.find((h) => h > total) || total + 1000;
}

function setFollowers(count, last) {
  followerCount = count;
  lastFollower = last;
  // 🔹 LOG para depurar
  console.log(
    "setFollowers → Último follower:",
    lastFollower,
    "Total:",
    followerCount,
  );
}

function getState() {
  return { followerCount, lastFollower };
}

function incrementFollower(name) {
  followerCount++;
  lastFollower = name;
  console.log(
    "incrementFollower → Nuevo follower:",
    name,
    "Total:",
    followerCount,
  );

  const meta = calcularMeta(followerCount); // ← calcula la meta automáticamente

  broadcast({
    type: "update",
    follow: name,
    goal: { current: followerCount, target: meta }, // ← usa meta dinámica
    lastFollower,
  });

  broadcast({ type: "follow", name });
}

module.exports = { setFollowers, getState, incrementFollower, calcularMeta };
