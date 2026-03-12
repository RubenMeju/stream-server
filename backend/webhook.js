// backend/webhook.js
const crypto = require("crypto");
const { WEBHOOK_SECRET } = require("./config");
const { incrementFollower, getState } = require("./followers");
const { broadcast } = require("./websocket");

function verifyTwitchSignature(req) {
  const messageId = req.headers["twitch-eventsub-message-id"];
  const timestamp = req.headers["twitch-eventsub-message-timestamp"];
  const signature = req.headers["twitch-eventsub-message-signature"];
  if (!messageId || !timestamp || !signature) return false;

  const body = JSON.stringify(req.body);
  const hmacMessage = messageId + timestamp + body;
  const hash = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(hmacMessage)
    .digest("hex");

  return signature === `sha256=${hash}`;
}

async function handleFollowWebhook(req, res, isDev) {
  if (!isDev && !verifyTwitchSignature(req)) return res.status(403).end();

  const data = req.body;
  if (data.subscription?.type === "channel.follow") {
    const follower = data.event.user_name;

    incrementFollower(follower);

    const state = getState();

    broadcast({
      type: "update",
      follow: follower,
      goal: { current: state.followerCount, target: process.env.FOLLOWER_GOAL },
      lastFollower: state.lastFollower,
    });

    broadcast({ type: "follow", name: follower });
  }

  res.status(200).end();
}

module.exports = { handleFollowWebhook, verifyTwitchSignature };
