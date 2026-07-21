# Chapter 19: Inline Git Blame & Diff Gutters (Tier 2.6)

In this milestone, we integrated real-time visual source-control feedback directly into the editor pane, matching core VS Code capabilities.

## 1. Real-Time Git Status Processing
Leveraging the asynchronous Git IPC bridge in Electron, we query local Git repository info when files are loaded or edited:
- **Git Diff Gutters:** We invoke `gitDiffContent` to compare the current unsaved editor contents against the `HEAD` commit. The raw unified diff output is parsed into line-by-line markers (additions, modifications, and deletions).
- **Inline Git Blame:** We invoke `gitBlameContent` to trace authorship metadata for each line, compiling a complete map of commit hashes, authors, and dates.

## 2. High-Performance Monaco Decorations
We built an optimized rendering loop to overlay Git annotations without impacting editor performance:
- **Diff Gutters:** Added/modified/deleted ranges are mapped to Monaco decorations. We use the `linesDecorationsClassName` property to render colored vertical strips in the narrow editor margin next to line numbers, matching VS Code's native diff indicators.
- **Inline Blame:** The active line's blame details are displayed as "ghost text" at the end of the line using Monaco's `after` content decorations. As the user moves their cursor, the inline blame annotation updates instantly by querying our cached blame mapping, avoiding redundant Git process execution.
- **Intelligent Debouncing:** Git process execution is debounced by 500ms during typing to keep the editor responsive, while switching files or toggling preferences triggers immediate updates.

## 3. Preference Toggles & User Experience
We expanded the `SettingsService` and `SettingsPanel` UI with two new preferences: `gitBlameEnabled` and `gitDiffGuttersEnabled` (both defaulting to `true`). This allows developers to fully configure their source-control visualization preferences. If a file is untracked or Git is unconfigured, the system gracefully handles the errors and clears the annotations, displaying "Not Committed Yet" for uncommitted content.

## Conclusion
The addition of Inline Git Blame and Diff Gutters brings essential context and collaboration visibility directly into the editing workspace. Next on the roadmap is Tier 2.7: Multi-root Workspaces.
