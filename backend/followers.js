// backend/followers.js
const { broadcast } = require("./websocket");

let followerCount = 0;
let lastFollower = "--";

function setFollowers(count, last) {
  followerCount = count;
  lastFollower = last;
}

function getState() {
  return { followerCount, lastFollower };
}

function incrementFollower(name) {
  followerCount++;
  lastFollower = name;

  broadcast({
    type: "update",
    follow: name,
    goal: { current: followerCount, target: process.env.FOLLOWER_GOAL },
    lastFollower,
  });

  broadcast({ type: "follow", name });
}

module.exports = { setFollowers, getState, incrementFollower };
