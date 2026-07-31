const { marked } = require("marked");
const fs = require("fs").promises;

module.exports = {
  activate: async function(ctx) {
    console.log("[Plugin:MarkdownViewer] Activating Markdown Preview Plugin...");

    ctx.registerFileViewer([".md", ".markdown"], async function(filePath) {
      console.log("[Plugin:MarkdownViewer] Rendering preview for:", filePath);
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const html = marked.parse(content);
        return { type: "markdown-preview", html, filePath };
      } catch (e) {
        return { type: "markdown-preview", html: `<p style="color:red">Error reading file: ${e.message}</p>`, filePath };
      }
    });

    ctx.registerCommand("markdown.openPreview", "Open Markdown Preview", function() {
      console.log("[Plugin:MarkdownViewer] Executing open preview...");
    });
  },
  deactivate: function() {
    console.log("[Plugin:MarkdownViewer] Deactivated.");
  }
};
