const cp = require("child_process");

module.exports = {
  activate: async function(ctx) {
    console.log("[Plugin:Python] Activating Python Language Plugin...");

    ctx.registerLanguage({
      id: "python",
      extensions: [".py", ".pyw"],
      aliases: ["Python"],
      startLsp: async function(repoPath) {
        const isWin = process.platform === "win32";
        const proc = cp.spawn("npx", ["-y", "--package=pyright", "pyright-langserver", "--stdio"], {
          cwd: repoPath,
          shell: isWin
        });
        return { active: true, language: "python", process: proc };
      }
    });

    ctx.registerCommand("python.runFile", "Run Current Python File", function() {
      console.log("[Plugin:Python] Running Python file...");
    });
  },
  deactivate: function() {
    console.log("[Plugin:Python] Deactivated.");
  }
};
