module.exports = {
  activate: async function(ctx) {
    console.log("[Plugin:Python] Activating Python Language Plugin...");

    ctx.registerLanguage({
      id: "python",
      extensions: [".py", ".pyw"],
      aliases: ["Python"],
      startLsp: async function(repoPath) {
        console.log("[Plugin:Python] Starting pyright at:", repoPath);
        return { active: true, language: "python" };
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
