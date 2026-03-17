const express = require("express");
const { broadcast } = require("../websocket");

const router = express.Router();

let vscodeState = {
  project: "--",
  activeFile: "--",
  language: "--",
  currentLine: 0,
  totalFiles: 0,
  totalLines: 0,
};

router.post("/", (req, res) => {
  vscodeState = req.body;

  broadcast({
    type: "vscode-update",
    ...vscodeState,
  });

  console.log(
    `💻 VSCode update: ${vscodeState.project} | ${vscodeState.activeFile} | líneas archivo: ${vscodeState.currentLine}/${vscodeState.totalLines} | archivos: ${vscodeState.totalFiles}`,
  );
  res.sendStatus(200);
});

router.post("/highlight", (req, res) => {
  broadcast({ type: "highlight-message", ...req.body });
  console.log(`⭐ Highlight: [${req.body.user}]: ${req.body.text}`);
  res.sendStatus(200);
});

module.exports = router;
