// backend/routes/twitch.js
const express = require("express");
const { handleTwitchWebhook } = require("../webhook");
const { deleteSubscriptions } = require("../eventsub");
const { CLIENT_ID } = require("../config");

const router = express.Router();
const isDev = process.env.NODE_ENV !== "production";

console.log(`🔥 Twitch router cargado [modo: ${isDev ? "DEV" : "PROD"}]`);

// ─────────────────────────────────────────────
// WEBHOOK PRINCIPAL
// ─────────────────────────────────────────────

router.post("/webhook", async (req, res) => {
  const messageType = req.headers["twitch-eventsub-message-type"];
  console.log(`📨 Twitch webhook recibido | tipo: ${messageType}`);
  await handleTwitchWebhook(req, res, isDev);
});

// ─────────────────────────────────────────────
// DIAGNÓSTICO – lista suscripciones activas
// ─────────────────────────────────────────────

router.get("/subs", async (req, res) => {
  const { getAppToken } = require("../twitch");
  const appToken = await getAppToken();

  const response = await fetch(
    "https://api.twitch.tv/helix/eventsub/subscriptions",
    {
      headers: {
        "Client-ID": CLIENT_ID,
        Authorization: `Bearer ${appToken}`,
      },
    },
  );

  const data = await response.json();
  const summary = (data.data || []).map((s) => ({
    type: s.type,
    status: s.status,
    id: s.id,
  }));

  console.log("📋 Suscripciones activas:", summary);
  res.json(summary);
});

// ─────────────────────────────────────────────
// DIAGNÓSTICO – borra suscripciones failed
// ─────────────────────────────────────────────

router.get("/subs/clear-failed", async (req, res) => {
  const { getAppToken } = require("../twitch");
  const appToken = await getAppToken();

  const response = await fetch(
    "https://api.twitch.tv/helix/eventsub/subscriptions",
    {
      headers: {
        "Client-ID": CLIENT_ID,
        Authorization: `Bearer ${appToken}`,
      },
    },
  );

  const data = await response.json();
  const failedIds = (data.data || [])
    .filter((s) => s.status === "webhook_callback_verification_failed")
    .map((s) => s.id);

  if (failedIds.length === 0) {
    return res.send("✅ No hay suscripciones en estado failed.");
  }

  await deleteSubscriptions(appToken, failedIds);
  res.send(`🗑️ Borradas ${failedIds.length} suscripciones failed.`);
});

module.exports = router;
