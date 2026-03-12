// backend/followers.js
const { broadcast } = require("./websocket");

let followerCount = 0;
let lastFollower = "--";

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
  // 🔹 LOG para depurar
  console.log(
    "incrementFollower → Nuevo follower:",
    name,
    "Total:",
    followerCount,
  );

  broadcast({
    type: "update",
    follow: name,
    goal: { current: followerCount, target: process.env.FOLLOWER_GOAL },
    lastFollower,
  });

  broadcast({ type: "follow", name });
}

module.exports = { setFollowers, getState, incrementFollower };
