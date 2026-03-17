const express = require("express");
const { broadcast } = require("../websocket");

const router = express.Router();

router.post("/highlight", (req, res) => {
  broadcast({ type: "highlight-message", ...req.body });
  console.log(`⭐ Highlight: [${req.body.user}]: ${req.body.text}`);
  res.sendStatus(200);
});

module.exports = router;
