module.exports = {
  activate: async function(ctx) {
    console.log("[Plugin:TypeScript] Activating TypeScript & JavaScript Language Plugin...");
    
    ctx.registerLanguage({
      id: "typescript",
      extensions: [".ts", ".tsx", ".js", ".jsx"],
      aliases: ["TypeScript", "JavaScript"],
      startLsp: async function(repoPath) {
        console.log("[Plugin:TypeScript] Starting typescript-language-server at:", repoPath);
        return { active: true, language: "typescript" };
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
