const cp = require("child_process");

module.exports = {
  activate: async function(ctx) {
    console.log("[Plugin:Go] Activating Go Language Plugin...");

    ctx.registerLanguage({
      id: "go",
      extensions: [".go"],
      aliases: ["Go", "Golang"],
      startLsp: async function(repoPath) {
        const isWin = process.platform === "win32";
        // Spawns gopls language server on PATH or via go run / npx fallback
        const proc = cp.spawn("gopls", [], {
          cwd: repoPath,
          shell: isWin
        });
        return { active: true, language: "go", process: proc };
      }
    });

    ctx.registerCommand("go.runFile", "Run Current Go File", function() {
      console.log("[Plugin:Go] Running Go file...");
    });
  },
  deactivate: function() {
    console.log("[Plugin:Go] Deactivated.");
  }
};
