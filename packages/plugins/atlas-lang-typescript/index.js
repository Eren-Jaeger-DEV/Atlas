const cp = require("child_process");

module.exports = {
  activate: async function(ctx) {
    console.log("[Plugin:TypeScript] Activating TypeScript & JavaScript Language Plugin...");

    ctx.registerLanguage({
      id: "typescript",
      extensions: [".ts", ".tsx", ".js", ".jsx"],
      aliases: ["TypeScript", "JavaScript"],
      startLsp: async function(repoPath) {
        let tsserverPath = require.resolve("typescript-language-server/lib/cli.mjs");
        if (tsserverPath.includes("app.asar")) {
          tsserverPath = tsserverPath.replace("app.asar", "app.asar.unpacked");
        }
        const proc = cp.spawn("node", [tsserverPath, "--stdio"], { cwd: repoPath });
        return { active: true, language: "typescript", process: proc };
      }
    });

    ctx.registerCommand("typescript.restartLsp", "Restart TypeScript Language Server", function() {
      console.log("[Plugin:TypeScript] Restarting TypeScript LSP...");
    });
  },
  deactivate: function() {
    console.log("[Plugin:TypeScript] Deactivated.");
  }
};
