const express = require("express");
const { broadcast } = require("../websocket");

const router = express.Router();

router.post("/webhook", async (req, res) => {
  try {
    if (req.headers["x-github-event"] !== "push") {
      return res.sendStatus(200);
    }

    const repo = req.body.repository;
    const headCommit = req.body.head_commit;
    if (!repo) return res.sendStatus(200);

    const headers = {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "User-Agent": "overlay-app",
    };

    let totalCommits = 1;
    try {
      const commitsRes = await fetch(
        `https://api.github.com/repos/${repo.owner.login}/${repo.name}/commits?per_page=1`,
        { headers },
      );
      const linkHeader = commitsRes.headers.get("link");
      if (linkHeader) {
        const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
        if (match) totalCommits = parseInt(match[1]);
      }
    } catch (e) {
      console.warn("No se pudo obtener totalCommits:", e.message);
    }

    broadcast({
      type: "github-update",
      repo: {
        name: repo.name,
        url: repo.html_url,
        private: repo.private,
      },
      commit: {
        title: headCommit?.message || "Sin mensaje",
      },
      totalCommits,
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("Error GitHub webhook:", err.message);
    res.sendStatus(500);
  }
});

module.exports = router;
