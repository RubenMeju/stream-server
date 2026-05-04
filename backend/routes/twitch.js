const express = require("express");
const { handleTwitchWebhook } = require("../webhook");
const { deleteSubscriptions } = require("../eventsub");
const { CLIENT_ID } = require("../config");

const router = express.Router();
const isDev = process.env.NODE_ENV !== "production";

console.log(`🔥 Twitch router cargado [modo: ${isDev ? "DEV" : "PROD"}]`);

// Lazy getter para romper la dependencia circular con twitch.js.
// Si se pusiera require('../twitch') al top, Node lo resolvería antes de que
// twitch.js terminara de cargarse y exploataría. Llamándolo dentro de cada
// handler el require ocurre en tiempo de ejecución, cuando todo ya está listo.
function getTwitch() {
  return require("../twitch");
}

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
  try {
    const { getAppToken } = getTwitch();
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
  } catch (err) {
    console.error("❌ Error listando suscripciones:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// DIAGNÓSTICO – borra suscripciones failed
// ─────────────────────────────────────────────

router.get("/subs/clear-failed", async (req, res) => {
  try {
    const { getAppToken } = getTwitch();
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
  } catch (err) {
    console.error("❌ Error borrando suscripciones:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
