module.exports = {
  activate: async function(ctx) {
    console.log("[Plugin:MarkdownViewer] Activating Markdown Preview Plugin...");

    ctx.registerFileViewer([".md", ".markdown"], function(filePath) {
      console.log("[Plugin:MarkdownViewer] Rendering preview for:", filePath);
      return { type: "markdown-preview", filePath: filePath };
    });

    ctx.registerCommand("markdown.openPreview", "Open Markdown Preview", function() {
      console.log("[Plugin:MarkdownViewer] Executing open preview...");
    });
  },
  deactivate: function() {
    console.log("[Plugin:MarkdownViewer] Deactivated.");
  }
};
