import { useRef, useState, useCallback, useEffect } from "react";
import MonacoEditor, { OnMount, OnChange, loader } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import * as monaco from "monaco-editor";
import { dapClient, DAPEvent } from "../dap/DAPClient.js";
import { useContextMenu, ContextMenuItem } from "./ContextMenuProvider.js";
import { useNotification } from "./NotificationProvider.js";
import { EditorSettings } from "./SettingsPanel.js";
import { SnippetManager } from "../snippets/SnippetManager.js";
import { fetchDocumentSymbols } from "../lsp/LSPClient.js";
import { parseUnifiedDiff, parseGitBlame, BlameInfo } from "./GitHelpers.js";

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

// Configure Monaco to bundle locally rather than from CDN
loader.config({ monaco });

self.MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === "json") return new jsonWorker();
    if (label === "css" || label === "scss" || label === "less") return new cssWorker();
    if (label === "html" || label === "handlebars" || label === "razor") return new htmlWorker();
    if (label === "typescript" || label === "javascript") return new tsWorker();
    return new editorWorker();
  }
};

interface EditorPaneProps {
  filePath?: string;
  repoPath?: string;
  content?: string;
  language?: string;
  targetLine?: number;
  targetColumn?: number;
  onChange?: (content: string) => void;
  onCursorChange?: (lineContent: string, line: number, col: number) => void;
  onSymbolsChange?: (symbols: any[], currentSymbol?: string) => void;
  onEditorMount?: (editor: any) => void;
  settings?: EditorSettings;
}

function findEnclosingSymbol(symbols: any[], line: number): string | undefined {
  let best: any = undefined;
  for (const sym of symbols) {
    if (line >= sym.range.start.line && line <= sym.range.end.line) {
      best = sym;
      if (sym.children && sym.children.length > 0) {
        const childBest = findEnclosingSymbol(sym.children, line);
        if (childBest) return childBest;
      }
    }
  }
  return best?.name;
}

function inferLanguage(filePath?: string, hint?: string): string {
  if (!filePath) return hint || "typescript";
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "tsx") return "typescriptreact";
  if (ext === "jsx") return "javascriptreact";
  if (hint && hint !== "typescript") return hint;
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescriptreact",
    js: "javascript",  jsx: "javascriptreact",
    py: "python",      json: "json",
    md: "markdown",    css: "css",
    html: "html",      sh: "shell",
    yml: "yaml",       yaml: "yaml",
    rs: "rust",        go: "go",
    c: "c",            cpp: "cpp",
    java: "java",      kt: "kotlin",
    rb: "ruby",        php: "php",
    sql: "sql",        toml: "ini",
    env: "ini",        txt: "plaintext",
    cs: "csharp",      scala: "scala",
    swift: "swift",    dart: "dart",
    dockerfile: "dockerfile", xml: "xml",
    graphql: "graphql", r: "r",
    m: "objective-c",  mm: "objective-cpp"
  };
  return map[ext] ?? "plaintext";
}

export function EditorPane({
  filePath,
  repoPath,
  content = "",
  language = "typescript",
  targetLine,
  targetColumn,
  onChange,
  onCursorChange,
  onSymbolsChange,
  onEditorMount,
  settings,
}: EditorPaneProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const { showContextMenu } = useContextMenu();
  const { showNotification } = useNotification();

  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [replaceText, setReplaceText] = useState("");

  const breakpointsRef = useRef<Set<number>>(new Set());
  const decorationsRef = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  const activeLineDecoRef = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  const diffGutterDecosRef = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  const blameDecoRef = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  const blameMapRef = useRef<Record<number, BlameInfo>>({});
  const lastFilePathRef = useRef<string | undefined>(undefined);
  const updateInlineBlameRef = useRef<() => void>(() => {});
  const symbolsRef = useRef<any[]>([]);

  const updateSymbols = useCallback(async () => {
    if (!filePath) return;
    const syms = await fetchDocumentSymbols(filePath);
    symbolsRef.current = syms;
    if (onSymbolsChange) {
      const pos = editorRef.current?.getPosition();
      const currentSymName = pos ? findEnclosingSymbol(syms, pos.lineNumber - 1) : undefined;
      onSymbolsChange(syms, currentSymName);
    }
  }, [filePath, onSymbolsChange]);

  const updateInlineBlame = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !filePath) {
      blameDecoRef.current?.clear();
      return;
    }

    if (settings?.gitBlameEnabled === false) {
      blameDecoRef.current?.clear();
      return;
    }

    const pos = editor.getPosition();
    if (!pos) {
      blameDecoRef.current?.clear();
      return;
    }

    const lineNum = pos.lineNumber;
    const model = editor.getModel();
    if (!model) {
      blameDecoRef.current?.clear();
      return;
    }

    const lineContent = model.getLineContent(lineNum);
    const lineLength = lineContent.length;

    const blame = blameMapRef.current[lineNum];
    if (!blame) {
      blameDecoRef.current?.clear();
      return;
    }

    const dateStr = blame.date.split(" ")[0]; // YYYY-MM-DD
    const hashStr = blame.hash.substring(0, 8);
    const authorStr = blame.author;
    
    let text = "";
    if (hashStr.startsWith("00000000") || authorStr.toLowerCase().includes("not committed yet")) {
      text = "Not Committed Yet";
    } else {
      text = `${authorStr} • ${dateStr} • ${hashStr}`;
    }

    blameDecoRef.current?.set([
      {
        range: new monaco.Range(lineNum, lineLength + 1, lineNum, lineLength + 1),
        options: {
          after: {
            content: `   ${text}`,
            inlineClassName: "git-blame-ghost",
          },
        },
      },
    ]);
  }, [filePath, settings?.gitBlameEnabled]);

  updateInlineBlameRef.current = updateInlineBlame;

  const updateGitDecorations = useCallback(async () => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !filePath || !repoPath) {
      diffGutterDecosRef.current?.clear();
      blameDecoRef.current?.clear();
      blameMapRef.current = {};
      return;
    }

    if (settings?.gitDiffGuttersEnabled === false && settings?.gitBlameEnabled === false) {
      diffGutterDecosRef.current?.clear();
      blameDecoRef.current?.clear();
      blameMapRef.current = {};
      return;
    }

    const content = editor.getValue();
    const a = window.atlasAPI;
    if (!a) return;

    try {
      const [diffOutput, blameOutput] = await Promise.all([
        settings?.gitDiffGuttersEnabled !== false
          ? a.gitDiffContent(repoPath, filePath, content).catch(() => "")
          : Promise.resolve(""),
        settings?.gitBlameEnabled !== false
          ? a.gitBlameContent(repoPath, filePath, content).catch(() => "")
          : Promise.resolve(""),
      ]);

      // 1. Process Diff Gutters
      if (settings?.gitDiffGuttersEnabled !== false) {
        const markers = parseUnifiedDiff(diffOutput);
        const newDiffDecos: Monaco.editor.IModelDeltaDecoration[] = [];

        for (const marker of markers) {
          if (marker.type === "add" || marker.type === "mod") {
            const len = marker.length ?? 1;
            for (let i = 0; i < len; i++) {
              const line = marker.line + i;
              newDiffDecos.push({
                range: new monaco.Range(line, 1, line, 1),
                options: {
                  isWholeLine: false,
                  linesDecorationsClassName: marker.type === "add" ? "git-gutter-add" : "git-gutter-mod",
                },
              });
            }
          } else if (marker.type === "del") {
            newDiffDecos.push({
              range: new monaco.Range(marker.line, 1, marker.line, 1),
              options: {
                isWholeLine: false,
                linesDecorationsClassName: "git-gutter-del",
              },
            });
          }
        }
        diffGutterDecosRef.current?.set(newDiffDecos);
      } else {
        diffGutterDecosRef.current?.clear();
      }

      // 2. Process Blame
      if (settings?.gitBlameEnabled !== false) {
        const blameMap = parseGitBlame(blameOutput);
        blameMapRef.current = blameMap;
        updateInlineBlame();
      } else {
        blameMapRef.current = {};
        blameDecoRef.current?.clear();
      }
    } catch (err) {
      console.error("[ERROR] Failed to update git decorations:", err);
      diffGutterDecosRef.current?.clear();
      blameDecoRef.current?.clear();
      blameMapRef.current = {};
    }
  }, [filePath, repoPath, settings?.gitDiffGuttersEnabled, settings?.gitBlameEnabled, updateInlineBlame]);

  const resolvedLang = inferLanguage(filePath, language);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    if (onEditorMount) onEditorMount(editor);
    monacoRef.current = monaco;

    SnippetManager.initialize(monaco).catch(console.error);
    
    // Globally emit diagnostics for extensions
    monaco.editor.onDidChangeMarkers(() => {
      const markers = monaco.editor.getModelMarkers({});
      if ((window as any).atlasAPI?.emitEvent) {
        (window as any).atlasAPI.emitEvent("DiagnosticsUpdated", { count: markers.length });
      }
    });

    if (repoPath) {
      import("../lsp/LSPClient.js").then(async m => {
        const supported = ["typescript", "javascript", "typescriptreact", "javascriptreact", "python"];
        if (!supported.includes(resolvedLang)) {
          showNotification({
            message: `Language '${resolvedLang}' is not supported yet for advanced features (Hover, Autocomplete, etc). Basic editing will work fine.`,
            type: "info",
            duration: 5000
          });
        }
        
        // await m.initLSPClient(repoPath, resolvedLang);
        // setTimeout(updateSymbols, 1000);

        const lsp = m.getLSPClient();
        if (!lsp) return;

        // ----------------------------------------------------------------
        // LSP: Hover provider
        // ----------------------------------------------------------------
        monaco.languages.registerHoverProvider(
          ["typescript", "typescriptreact", "javascript", "javascriptreact", "python"],
          {
            provideHover: async (model: Monaco.editor.ITextModel, position: Monaco.Position) => {
              try {
                const uri = model.uri.toString();
                const result: any = await lsp.sendRequest("textDocument/hover", {
                  textDocument: { uri },
                  position: { line: position.lineNumber - 1, character: position.column - 1 }
                });
                if (!result?.contents) return null;
                const contents = Array.isArray(result.contents) ? result.contents : [result.contents];
                const value = contents.map((c: any) => (typeof c === "string" ? c : c.value ?? "")).join("\n\n");
                if (!value.trim()) return null;
                return {
                  range: result.range ? new monaco.Range(
                    result.range.start.line + 1, result.range.start.character + 1,
                    result.range.end.line + 1, result.range.end.character + 1
                  ) : undefined,
                  contents: [{ value, isTrusted: true, supportThemeIcons: true }]
                };
              } catch { return null; }
            }
          }
        );

        // ----------------------------------------------------------------
        // LSP: Definition provider (F12 / Ctrl+Click)
        // ----------------------------------------------------------------
        monaco.languages.registerDefinitionProvider(
          ["typescript", "typescriptreact", "javascript", "javascriptreact", "python"],
          {
            provideDefinition: async (model: Monaco.editor.ITextModel, position: Monaco.Position) => {
              try {
                const result: any = await lsp.sendRequest("textDocument/definition", {
                  textDocument: { uri: model.uri.toString() },
                  position: { line: position.lineNumber - 1, character: position.column - 1 }
                });
                if (!result) return null;
                const locations = Array.isArray(result) ? result : [result];
                return locations.map((loc: any) => ({
                  uri: monaco.Uri.parse(loc.uri),
                  range: new monaco.Range(
                    loc.range.start.line + 1, loc.range.start.character + 1,
                    loc.range.end.line + 1, loc.range.end.character + 1
                  )
                }));
              } catch { return null; }
            }
          }
        );

        // ----------------------------------------------------------------
        // LSP: References provider (Shift+F12)
        // ----------------------------------------------------------------
        monaco.languages.registerReferenceProvider(
          ["typescript", "typescriptreact", "javascript", "javascriptreact", "python"],
          {
            provideReferences: async (model: Monaco.editor.ITextModel, position: Monaco.Position) => {
              try {
                const result: any = await lsp.sendRequest("textDocument/references", {
                  textDocument: { uri: model.uri.toString() },
                  position: { line: position.lineNumber - 1, character: position.column - 1 },
                  context: { includeDeclaration: true }
                });
                if (!result) return null;
                return result.map((loc: any) => ({
                  uri: monaco.Uri.parse(loc.uri),
                  range: new monaco.Range(
                    loc.range.start.line + 1, loc.range.start.character + 1,
                    loc.range.end.line + 1, loc.range.end.character + 1
                  )
                }));
              } catch { return null; }
            }
          }
        );

        // ----------------------------------------------------------------
        // LSP: Rename provider (F2)
        // ----------------------------------------------------------------
        monaco.languages.registerRenameProvider(
          ["typescript", "typescriptreact", "javascript", "javascriptreact", "python"],
          {
            provideRenameEdits: async (model: Monaco.editor.ITextModel, position: Monaco.Position, newName: string) => {
              try {
                const result: any = await lsp.sendRequest("textDocument/rename", {
                  textDocument: { uri: model.uri.toString() },
                  position: { line: position.lineNumber - 1, character: position.column - 1 },
                  newName
                });
                if (!result) return null;
                const workspaceEdit: monaco.languages.WorkspaceEdit = { edits: [] };
                if (result.changes) {
                  for (const [fileUri, edits] of Object.entries(result.changes)) {
                    for (const edit of edits as any[]) {
                      workspaceEdit.edits.push({
                        resource: monaco.Uri.parse(fileUri),
                        textEdit: {
                          range: new monaco.Range(
                            edit.range.start.line + 1, edit.range.start.character + 1,
                            edit.range.end.line + 1, edit.range.end.character + 1
                          ),
                          text: edit.newText
                        },
                        versionId: undefined
                      });
                    }
                  }
                }
                if (result.documentChanges) {
                  for (const change of result.documentChanges) {
                    for (const edit of change.edits ?? []) {
                      workspaceEdit.edits.push({
                        resource: monaco.Uri.parse(change.textDocument.uri),
                        textEdit: {
                          range: new monaco.Range(
                            edit.range.start.line + 1, edit.range.start.character + 1,
                            edit.range.end.line + 1, edit.range.end.character + 1
                          ),
                          text: edit.newText
                        },
                        versionId: undefined
                      });
                    }
                  }
                }
                return workspaceEdit;
              } catch { return null; }
            }
          }
        );

        // ----------------------------------------------------------------
        // LSP: Code Action provider (Ctrl+. lightbulb)
        // ----------------------------------------------------------------
        monaco.languages.registerCodeActionProvider(
          ["typescript", "typescriptreact", "javascript", "javascriptreact", "python"],
          {
            provideCodeActions: async (model: Monaco.editor.ITextModel, range: Monaco.Range, context: Monaco.languages.CodeActionContext) => {
              try {
                const result: any = await lsp.sendRequest("textDocument/codeAction", {
                  textDocument: { uri: model.uri.toString() },
                  range: {
                    start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
                    end: { line: range.endLineNumber - 1, character: range.endColumn - 1 }
                  },
                  context: {
                    diagnostics: context.markers.map((m: Monaco.editor.IMarkerData) => ({
                      range: {
                        start: { line: m.startLineNumber - 1, character: m.startColumn - 1 },
                        end: { line: m.endLineNumber - 1, character: m.endColumn - 1 }
                      },
                      message: m.message,
                      severity: 1
                    }))
                  }
                });
                if (!result?.length) return { actions: [], dispose: () => {} };
                const actions: monaco.languages.CodeAction[] = result.map((ca: any) => ({
                  title: ca.title,
                  kind: ca.kind,
                  edit: ca.edit ? {
                    edits: Object.entries(ca.edit.changes ?? {}).flatMap(([uri, edits]) =>
                      (edits as any[]).map(e => ({
                        resource: monaco.Uri.parse(uri),
                        textEdit: {
                          range: new monaco.Range(
                            e.range.start.line + 1, e.range.start.character + 1,
                            e.range.end.line + 1, e.range.end.character + 1
                          ),
                          text: e.newText
                        },
                        versionId: undefined
                      }))
                    )
                  } : undefined,
                  isPreferred: ca.isPreferred
                }));
                return { actions, dispose: () => {} };
              } catch { return { actions: [], dispose: () => {} }; }
            }
          }
        );

        // ----------------------------------------------------------------
        // LSP: Document Formatting provider (Shift+Alt+F)
        // ----------------------------------------------------------------
        monaco.languages.registerDocumentFormattingEditProvider(
          ["typescript", "typescriptreact", "javascript", "javascriptreact", "python"],
          {
            provideDocumentFormattingEdits: async (model: Monaco.editor.ITextModel) => {
              try {
                // Try LSP format first
                const lspResult: any = await lsp.sendRequest("textDocument/formatting", {
                  textDocument: { uri: model.uri.toString() },
                  options: { tabSize: 2, insertSpaces: true }
                });
                if (lspResult?.length) {
                  return lspResult.map((edit: any) => ({
                    range: new monaco.Range(
                      edit.range.start.line + 1, edit.range.start.character + 1,
                      edit.range.end.line + 1, edit.range.end.character + 1
                    ),
                    text: edit.newText
                  }));
                }
              } catch {}
              // Fallback: atlas formatCode
              try {
                if (window.atlasAPI?.formatCode && filePath && repoPath) {
                  const formatted = await window.atlasAPI.formatCode(repoPath, filePath, model.getValue());
                  if (formatted && formatted !== model.getValue()) {
                    return [{
                      range: model.getFullModelRange(),
                      text: formatted
                    }];
                  }
                }
              } catch {}
              return [];
            }
          }
        );
      }).catch(console.error);
    }

    // Define Obsidian Theme
    monaco.editor.defineTheme("obsidian", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "52525b", fontStyle: "italic" },
        { token: "keyword", foreground: "a78bfa" },
        { token: "string", foreground: "86efac" },
        { token: "number", foreground: "f9a8d4" },
        { token: "type", foreground: "67e8f9" },
        { token: "variable", foreground: "e4e4e7" },
        { token: "function", foreground: "fbbf24" },
        { token: "class", foreground: "60a5fa" },
        { token: "operator", foreground: "e4e4e7" },
      ],
      colors: {
        "editor.background": "#000000",
        "editor.foreground": "#e4e4e7",
        "editorLineNumber.foreground": "#475569",
        "editorLineNumber.activeForeground": "#38bdf8",
        "editor.lineHighlightBackground": "#38bdf810",
        "editor.selectionBackground": "#38bdf830",
        "editor.inactiveSelectionBackground": "#38bdf815",
        "editorCursor.foreground": "#38bdf8",
        "editorGutter.background": "#000000",
        "editorWidget.background": "#050505",
        "editorWidget.border": "#38bdf8",
        "editorSuggestWidget.background": "#050505",
        "editorSuggestWidget.border": "#38bdf8",
        "editorSuggestWidget.selectedBackground": "#38bdf830",
        "editorIndentGuide.background1": "#38bdf830",
        "editorIndentGuide.activeBackground1": "#38bdf8",
        "scrollbar.shadow": "#00000000",
        "scrollbarSlider.background": "#38bdf830",
        "scrollbarSlider.hoverBackground": "#38bdf850",
        "scrollbarSlider.activeBackground": "#38bdf880",
      },
    });

    // Define Midnight Theme
    monaco.editor.defineTheme("midnight", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "64748b", fontStyle: "italic" },
        { token: "keyword", foreground: "ff79c6" },
        { token: "string", foreground: "50fa7b" },
        { token: "number", foreground: "bd93f9" },
        { token: "type", foreground: "8be9fd" },
        { token: "variable", foreground: "f8f8f2" },
        { token: "function", foreground: "50fa7b" },
        { token: "class", foreground: "8be9fd" },
        { token: "operator", foreground: "f8f8f2" },
      ],
      colors: {
        "editor.background": "#0b0f19",
        "editor.foreground": "#f1f5f9",
        "editorLineNumber.foreground": "#475569",
        "editorLineNumber.activeForeground": "#38bdf8",
        "editor.lineHighlightBackground": "#38bdf810",
        "editor.selectionBackground": "#ff79c625",
        "editorCursor.foreground": "#ff79c6",
        "editorGutter.background": "#0b0f19",
        "editorWidget.background": "#0b0f19",
        "editorWidget.border": "#38bdf8",
      }
    });

    // Define Monokai Theme
    monaco.editor.defineTheme("monokai", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "75715e", fontStyle: "italic" },
        { token: "keyword", foreground: "f92672" },
        { token: "string", foreground: "e6db74" },
        { token: "number", foreground: "ae81ff" },
        { token: "type", foreground: "66d9ef" },
        { token: "variable", foreground: "f8f8f2" },
        { token: "function", foreground: "a6e22e" },
        { token: "class", foreground: "66d9ef" },
        { token: "operator", foreground: "f92672" },
      ],
      colors: {
        "editor.background": "#272822",
        "editor.foreground": "#f8f8f2",
        "editorLineNumber.foreground": "#90908a",
        "editorLineNumber.activeForeground": "#a6e22e",
        "editor.lineHighlightBackground": "#3e3d32",
        "editor.selectionBackground": "#49483e",
        "editorCursor.foreground": "#f8f8f0",
        "editorGutter.background": "#272822",
        "editorWidget.background": "#272822",
        "editorWidget.border": "#75715e",
      }
    });

    // Define Light Theme
    monaco.editor.defineTheme("light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "71717a", fontStyle: "italic" },
        { token: "keyword", foreground: "7c3aed" },
        { token: "string", foreground: "16a34a" },
        { token: "number", foreground: "db2777" },
        { token: "type", foreground: "0891b2" },
        { token: "variable", foreground: "18181b" },
        { token: "function", foreground: "d97706" },
        { token: "class", foreground: "2563eb" },
        { token: "operator", foreground: "18181b" },
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "var(--bg-header, #18181b)",
        "editorLineNumber.foreground": "var(--text-muted, #a1a1aa)",
        "editorLineNumber.activeForeground": "#7c3aed",
        "editor.lineHighlightBackground": "#f4f4f5",
        "editor.selectionBackground": "#add6ff",
        "editorCursor.foreground": "#7c3aed",
        "editorGutter.background": "#ffffff",
        "editorWidget.background": "var(--text-main, #fafafa)",
        "editorWidget.border": "var(--text-main, #e4e4e7)",
      }
    });

    const tmTheme = (window as any).atlasTheme === 'custom' ? 'custom-imported-theme' : (settings?.theme ?? "obsidian");
    monaco.editor.setTheme(tmTheme);

    // TypeScript compiler options — strict mode
    if (monaco.languages.typescript) {
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        strict: true,
        jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
      });
    }

    // Cursor position -> line content callback
    editor.onDidChangeCursorPosition((e) => {
      const pos = e.position;
      const model = editor.getModel();
      if (!model) return;
      const lineNum = pos?.lineNumber ?? 1;
      const colNum = pos?.column ?? 1;
      
      if (onCursorChange) {
        onCursorChange(model.getLineContent(lineNum), lineNum, colNum);
      }
      if (onSymbolsChange) {
        const currentSymName = findEnclosingSymbol(symbolsRef.current, lineNum - 1);
        onSymbolsChange(symbolsRef.current, currentSymName);
      }
      
      // Update inline git blame on cursor move
      updateInlineBlameRef.current();
    });

    // Keybindings
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      setShowFind(p => !p);
      setShowReplace(false);
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {
      setShowFind(true);
      setShowReplace(true);
    });
    editor.addCommand(
      monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
      () => { editor.getAction("editor.action.formatDocument")?.run(); }
    );
    editor.addCommand(monaco.KeyCode.Escape, () => setShowFind(false));

    // Go to Line (Ctrl+G)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG, () => {
      editor.getAction("editor.action.gotoLine")?.run();
    });

    // Word wrap toggle (Alt+Z)
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyZ, () => {
      const current = editor.getOption(monaco.editor.EditorOption.wordWrap);
      editor.updateOptions({ wordWrap: current === "on" ? "off" : "on" });
    });

    // Go to Definition (F12)
    editor.addCommand(monaco.KeyCode.F12, () => {
      editor.getAction("editor.action.revealDefinition")?.run();
    });

    // Peek Definition (Alt+F12)
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.F12, () => {
      editor.getAction("editor.action.peekDefinition")?.run();
    });

    // Find All References (Shift+F12)
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.F12, () => {
      editor.getAction("editor.action.referenceSearch.trigger")?.run();
    });

    // Rename Symbol (F2)
    editor.addCommand(monaco.KeyCode.F2, () => {
      editor.getAction("editor.action.rename")?.run();
    });

    // Quick Fix / Code Actions (Ctrl+.)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period, () => {
      editor.getAction("editor.action.quickFix")?.run();
    });

    // Change All Occurrences (Ctrl+F2)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.F2, () => {
      editor.getAction("editor.action.changeAll")?.run();
    });

    // ----------------------------------------------------------------
    // Right-click context menu (replacing Monaco's default)
    // ----------------------------------------------------------------
    editor.onContextMenu((e) => {
      e.event.preventDefault();
      e.event.stopPropagation();
      const pos = e.target.position;
      const model = editor.getModel();
      const selection = editor.getSelection();
      const hasSelection = selection && !selection.isEmpty();

      const menuItems: ContextMenuItem[] = [
        {
          label: "Go to Definition",
          shortcut: "F12",
          onClick: () => editor.getAction("editor.action.revealDefinition")?.run()
        },
        {
          label: "Peek Definition",
          shortcut: "Alt+F12",
          onClick: () => editor.getAction("editor.action.peekDefinition")?.run()
        },
        {
          label: "Find All References",
          shortcut: "Shift+F12",
          onClick: () => editor.getAction("editor.action.referenceSearch.trigger")?.run()
        },
        {
          label: "Rename Symbol",
          shortcut: "F2",
          onClick: () => editor.getAction("editor.action.rename")?.run()
        },
        { separator: true },
        {
          label: "Quick Fix",
          shortcut: "Ctrl+.",
          onClick: () => editor.getAction("editor.action.quickFix")?.run()
        },
        {
          label: "Format Document",
          shortcut: "Shift+Alt+F",
          onClick: () => editor.getAction("editor.action.formatDocument")?.run()
        },
        {
          label: "Format Selection",
          shortcut: "Ctrl+K Ctrl+F",
          disabled: !hasSelection,
          onClick: () => editor.getAction("editor.action.formatSelection")?.run()
        },
        { separator: true },
        {
          label: "Cut",
          shortcut: "Ctrl+X",
          disabled: !hasSelection,
          onClick: () => editor.getAction("editor.action.clipboardCutAction")?.run()
        },
        {
          label: "Copy",
          shortcut: "Ctrl+C",
          onClick: () => editor.getAction("editor.action.clipboardCopyAction")?.run()
        },
        {
          label: "Paste",
          shortcut: "Ctrl+V",
          onClick: () => editor.getAction("editor.action.clipboardPasteAction")?.run()
        },
        { separator: true },
        {
          label: "Change All Occurrences",
          shortcut: "Ctrl+F2",
          onClick: () => editor.getAction("editor.action.changeAll")?.run()
        },
        {
          label: "Select All",
          shortcut: "Ctrl+A",
          onClick: () => editor.getAction("editor.action.selectAll")?.run()
        },
        { separator: true },
        {
          label: "Copy Line Path",
          onClick: () => {
            if (filePath && pos) {
              navigator.clipboard.writeText(`${filePath}:${pos.lineNumber}:${pos.column}`);
            }
          }
        },
        {
          label: "Command Palette",
          shortcut: "Ctrl+Shift+P",
          onClick: () => editor.getAction("editor.action.quickCommand")?.run()
        }
      ];

      showContextMenu({
        x: e.event.posx,
        y: e.event.posy,
        items: menuItems
      });
    });

    decorationsRef.current = editor.createDecorationsCollection([]);
    activeLineDecoRef.current = editor.createDecorationsCollection([]);
    diffGutterDecosRef.current = editor.createDecorationsCollection([]);
    blameDecoRef.current = editor.createDecorationsCollection([]);

    editor.onMouseDown((e) => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
      ) {
        const line = e.target.position?.lineNumber;
        if (line && filePath) {
          const bps = breakpointsRef.current;
          if (bps.has(line)) bps.delete(line);
          else bps.add(line);
          
          const newDecos = Array.from(bps).map(l => ({
            range: new monaco.Range(l, 1, l, 1),
            options: {
              isWholeLine: false,
              glyphMarginClassName: "breakpoint-glyph",
            }
          }));
          decorationsRef.current?.set(newDecos);

          // Tell DAP about the updated breakpoints for this file
          dapClient.sendRequest("setBreakpoints", {
            source: { path: filePath },
            breakpoints: Array.from(bps).map(l => ({ line: l }))
          });
        }
      }
    });

    editor.focus();
  }, [onCursorChange, onSymbolsChange, updateSymbols, filePath, repoPath]);

  // Listen for DAP paused events to show active line
  useEffect(() => {
    const unsub = dapClient.onEvent((e: DAPEvent) => {
      if (e.event === "stopped" && activeLineDecoRef.current) {
        const frames = e.body?.callFrames;
        if (frames && frames.length > 0) {
           const topFrame = frames[0];
           // If the paused file is the currently open file
           if (filePath && topFrame.url && filePath.endsWith(topFrame.url.split("/").pop()!)) {
             const line = topFrame.location.lineNumber + 1;
             activeLineDecoRef.current.set([{
               range: new monaco.Range(line, 1, line, 1),
               options: {
                 isWholeLine: true,
                 className: "debug-active-line",
                 glyphMarginClassName: "debug-active-glyph"
               }
             }]);
             editorRef.current?.revealLineInCenter(line);
           }
        }
      } else if ((e.event === "continued" || e.event === "terminated") && activeLineDecoRef.current) {
        activeLineDecoRef.current.clear();
      }
    });
    return () => { unsub(); };
  }, [filePath]);

  const handleChange: OnChange = useCallback((value) => {
    onChange?.(value ?? "");
    updateSymbols();
  }, [onChange, updateSymbols]);

  // Dynamic settings update
  useEffect(() => {
    if (editorRef.current && monacoRef.current && settings) {
      editorRef.current.updateOptions({
        fontSize: settings.fontSize,
        lineHeight: Math.max(18, Math.floor(settings.fontSize * 1.6)),
        fontFamily: settings.fontFamily,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap,
        lineNumbers: settings.lineNumbers ? "on" : "off",
        minimap: { enabled: settings.minimap },
        padding: { top: 8 }
      });
      monacoRef.current.editor.setTheme(settings.theme);
    }
  }, [settings]);

  // Sync external content changes (e.g. file switch)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    if (model.getValue() !== content) {
      model.setValue(content);
    }
  }, [content]);

  const lastContentRef = useRef<string>("");

  useEffect(() => {
    if (lastFilePathRef.current !== filePath) {
      lastFilePathRef.current = filePath;
      lastContentRef.current = content;
      diffGutterDecosRef.current?.clear();
      blameDecoRef.current?.clear();
      blameMapRef.current = {};
      updateGitDecorations();
      return;
    }

    if (lastContentRef.current === content) {
      updateGitDecorations();
      return;
    }

    lastContentRef.current = content;
    const timer = setTimeout(() => {
      updateGitDecorations();
    }, 500);
    return () => clearTimeout(timer);
  }, [content, filePath, repoPath, settings?.gitBlameEnabled, settings?.gitDiffGuttersEnabled, updateGitDecorations]);

  // Find helpers using Monaco's built-in search
  const doFind = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !findText) return;
    editor.getAction("actions.find")?.run();
  }, [findText]);

  const doFindNext = useCallback(() => {
    editorRef.current?.getAction("editor.action.nextMatchFindAction")?.run();
  }, []);

  const doFindPrev = useCallback(() => {
    editorRef.current?.getAction("editor.action.previousMatchFindAction")?.run();
  }, []);

  const doReplaceNext = useCallback(() => {
    editorRef.current?.getAction("editor.action.replaceOne")?.run();
  }, []);

  const doReplaceAll = useCallback(() => {
    editorRef.current?.getAction("editor.action.replaceAll")?.run();
  }, []);

  useEffect(() => {
    if (editorRef.current && targetLine !== undefined) {
      editorRef.current.revealLineInCenter(targetLine);
      editorRef.current.setPosition({ lineNumber: targetLine, column: targetColumn ?? 1 });
      editorRef.current.focus();
    }
    
    // Update symbols occasionally
    updateSymbols();
  }, [targetLine, targetColumn, updateSymbols, filePath]);

  return (
    <div style={s.wrapper}>
      {/* Find & Replace overlay */}
      {showFind && (
        <div className="anim-scale-in" style={s.findBox}>
          <div style={s.findRow}>
            <input
              style={s.findInput}
              placeholder="Find..."
              value={findText}
              autoFocus
              onChange={e => setFindText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") doFindNext(); if (e.key === "Escape") setShowFind(false); }}
            />
            <button className="hover-scale" style={s.findBtn} title="Previous" onClick={doFindPrev}>&#8593;</button>
            <button className="hover-scale" style={s.findBtn} title="Next" onClick={doFindNext}>&#8595;</button>
            <button
              className="hover-scale"
              style={{ ...s.findBtn, ...(showReplace ? s.findBtnOn : {}) }}
              title="Toggle Replace"
              onClick={() => setShowReplace(p => !p)}
            >
              &#8644;
            </button>
            <button className="hover-scale" style={s.findBtn} title="Close" onClick={() => setShowFind(false)}>&#10005;</button>
          </div>
          {showReplace && (
            <div style={{ ...s.findRow, marginTop: "4px" }}>
              <input
                style={s.findInput}
                placeholder="Replace with..."
                value={replaceText}
                onChange={e => setReplaceText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") doReplaceNext(); }}
              />
              <button className="hover-scale" style={s.findActBtn} onClick={doReplaceNext}>Replace</button>
              <button className="hover-scale" style={s.findActBtn} onClick={doReplaceAll}>All</button>
            </div>
          )}
        </div>
      )}

      {/* Monaco Editor */}
      <div style={s.monacoContainer}>
        <MonacoEditor
          height="100%"
          path={filePath ? (filePath.startsWith("/") || filePath.match(/^[a-zA-Z]:/) ? monaco.Uri.file(filePath).toString() : filePath) : undefined}
          language={resolvedLang}
          value={content}
          theme={settings?.theme ?? "obsidian"}
          onMount={handleMount}
          onChange={handleChange}
          options={{
            fontSize: settings?.fontSize ?? 14,
            fontFamily: settings?.fontFamily ?? "'JetBrains Mono', Consolas, monospace",
            fontLigatures: true,
            lineNumbers: settings?.lineNumbers !== false ? "on" : "off",
            lineNumbersMinChars: 3,
            glyphMargin: false,
            lineDecorationsWidth: 0,
            minimap: {
              enabled: settings?.minimap !== false,
              renderCharacters: true,
              scale: 1,
              showSlider: "mouseover",
              side: "right",
              size: "proportional",
              maxColumn: 120,
            },
            overviewRulerLanes: 0,
            overviewRulerBorder: false,
            wordWrap: settings?.wordWrap === "on" ? "on" : "off",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: settings?.tabSize ?? 2,
            insertSpaces: true,
            renderWhitespace: "selection",
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true },
            suggest: { showMethods: true, showFunctions: true, showConstructors: true, showKeywords: true },
            quickSuggestions: { other: true, comments: false, strings: false },
            parameterHints: { enabled: true },
            formatOnPaste: true,
            formatOnType: false,
            smoothScrolling: true,
            cursorBlinking: "phase",
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "gutter",
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
              horizontal: "auto",
              vertical: "auto",
              useShadows: false,
            },
            padding: { top: 8, bottom: 8 },
            lightbulb: { enabled: true as any },
          }}
        />
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    position: "relative",
    backgroundColor: "var(--bg-base, #09090b)",
  },
  ctrlBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "26px",
    backgroundColor: "transparent",
    borderBottom: "1px solid var(--border-subtle)",
    padding: "0 12px",
    fontSize: "11px",
    color: "var(--text-muted)",
    flexShrink: 0,
  },
  filePath: {
    fontFamily: "monospace",
    color: "var(--text-muted, #a1a1aa)",
  },
  ctrlActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  langBadge: {
    fontSize: "9px",
    fontWeight: 700,
    color: "var(--accent, #38bdf8)",
    backgroundColor: "rgba(56,189,248,0.08)",
    padding: "1px 6px",
    borderRadius: "3px",
    fontFamily: "monospace",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  ctrlBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    fontSize: "11.5px",
    cursor: "pointer",
    padding: "2px 6px",
    borderRadius: "4px",
    transition: "color 0.1s, background-color 0.1s",
  },
  monacoContainer: {
    flex: 1,
    overflow: "hidden",
  },
  findBox: {
    position: "absolute",
    top: "32px",
    right: "16px",
    backgroundColor: "rgba(24, 24, 27, 0.7)",
    backdropFilter: "blur(12px) saturate(1.5)",
    WebkitBackdropFilter: "blur(12px) saturate(1.5)",
    border: "1px solid var(--border-medium)",
    borderRadius: "6px",
    padding: "8px",
    zIndex: 100,
    boxShadow: "var(--shadow-lg), var(--shadow-panel)",
    display: "flex",
    flexDirection: "column",
    width: "290px",
  },
  findRow: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  findInput: {
    flex: 1,
    backgroundColor: "var(--bg-base, #09090b)",
    border: "1px solid #27272a",
    color: "var(--text-main, #fafafa)",
    borderRadius: "4px",
    padding: "3px 8px",
    fontSize: "12px",
    outline: "none",
  },
  findBtn: {
    width: "22px",
    height: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "none",
    border: "1px solid #27272a",
    color: "var(--text-muted, #a1a1aa)",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "11px",
  },
  findBtnOn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "var(--text-main, #fafafa)",
  },
  findActBtn: {
    backgroundColor: "var(--border-color, #27272a)",
    border: "none",
    color: "var(--text-main, #fafafa)",
    borderRadius: "3px",
    padding: "2px 8px",
    fontSize: "11px",
    cursor: "pointer",
  },
};