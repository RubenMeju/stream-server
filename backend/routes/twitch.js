const express = require("express");
const { handleTwitchWebhook } = require("../webhook");

const router = express.Router();
const isDev = process.env.NODE_ENV !== "production";

router.post("/webhook", (req, res) => {
  console.log("📨 Twitch webhook recibido");
  handleTwitchWebhook(req, res, isDev);
});

module.exports = router;
