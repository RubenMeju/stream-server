const { exec } = require("child_process");
const { broadcast } = require("./websocket");

let lastCommit = null;

function watchRepo(repoPath) {
  console.log("👀 Observando repo:", repoPath);

  setInterval(() => {
    exec(
      `git -C ${repoPath} log -1 --pretty=format:"%H|%h|%an|%s"`,
      (err, stdout) => {
        if (err) return;

        if (!stdout) return;

        if (stdout !== lastCommit) {
          console.log("🔥 Commit detectado crudo:", stdout);
          lastCommit = stdout;

          const [hashFull, hash, author, message] = stdout.split("|");

          console.log("Nuevo commit detectado:", message);

          broadcast({
            type: "commit",
            commit: {
              hash,
              author,
              message,
            },
          });
        }
      },
    );
  }, 5000);
}

module.exports = { watchRepo };
