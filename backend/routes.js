const express = require("express");
const router = express.Router();
const { incrementFollower, saveFollowers, getState } = require("./followers");
const { broadcast } = require("./websocket");
const { handleFollowWebhook } = require("./webhook");

const isDev = process.env.NODE_ENV !== "production";

router.post("/webhook", (req, res) => handleFollowWebhook(req, res, isDev));

router.get("/test-follow", async (req, res) => {
  const follower =
    req.query.name || `TestUser${Math.floor(Math.random() * 1000)}`;
  incrementFollower(follower);
  await saveFollowers();

  const state = getState();
  broadcast({
    type: "update",
    follow: follower,
    goal: { current: state.followerCount, target: process.env.FOLLOWER_GOAL },
    lastFollower: state.lastFollower,
  });
  broadcast({ type: "follow", name: follower });

  res.send(`Simulado seguidor: ${follower}`);
});

module.exports = router;
