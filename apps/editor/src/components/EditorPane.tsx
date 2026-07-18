import { useRef, useState, useCallback, useEffect } from "react";
import MonacoEditor, { OnMount, OnChange, loader } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";

// Configure Monaco to load workers from CDN in production, locally in dev
loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs",
  },
});

interface EditorPaneProps {
  filePath?: string;
  content?: string;
  language?: string;
  onChange?: (content: string) => void;
  onCursorChange?: (lineContent: string) => void;
}

function inferLanguage(filePath?: string, hint?: string): string {
  if (hint && hint !== "typescript") return hint;
  if (!filePath) return "typescript";
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescriptreact",
    js: "javascript",  jsx: "javascript",
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
  };
  return map[ext] ?? "plaintext";
}

export function EditorPane({
  filePath,
  content = "",
  language = "typescript",
  onChange,
  onCursorChange,
}: EditorPaneProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);

  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [replaceText, setReplaceText] = useState("");

  const resolvedLang = inferLanguage(filePath, language);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Atlas dark theme — matches the rest of the UI
    monaco.editor.defineTheme("atlas-dark", {
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
        "editor.background": "#09090b",
        "editor.foreground": "#e4e4e7",
        "editorLineNumber.foreground": "#3f3f46",
        "editorLineNumber.activeForeground": "#71717a",
        "editor.lineHighlightBackground": "#18181b",
        "editor.selectionBackground": "#38bdf820",
        "editor.inactiveSelectionBackground": "#38bdf810",
        "editorCursor.foreground": "#38bdf8",
        "editorGutter.background": "#09090b",
        "editorWidget.background": "#18181b",
        "editorWidget.border": "#27272a",
        "editorSuggestWidget.background": "#18181b",
        "editorSuggestWidget.border": "#27272a",
        "editorSuggestWidget.selectedBackground": "#27272a",
        "editorIndentGuide.background1": "#27272a",
        "editorIndentGuide.activeBackground1": "#3f3f46",
        "scrollbar.shadow": "#00000000",
        "scrollbarSlider.background": "#27272a80",
        "scrollbarSlider.hoverBackground": "#3f3f46",
        "scrollbarSlider.activeBackground": "#52525b",
      },
    });

    monaco.editor.setTheme("atlas-dark");

    // TypeScript compiler options — strict mode
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      strict: true,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
    });

    // Cursor position -> line content callback
    editor.onDidChangeCursorPosition(() => {
      const model = editor.getModel();
      if (!model || !onCursorChange) return;
      const lineNum = editor.getPosition()?.lineNumber ?? 1;
      onCursorChange(model.getLineContent(lineNum));
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

    editor.focus();
  }, [onCursorChange]);

  const handleChange: OnChange = useCallback((value) => {
    onChange?.(value ?? "");
  }, [onChange]);

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

  return (
    <div style={s.wrapper}>
      {/* Control bar */}
      <div style={s.ctrlBar}>
        <span style={s.filePath}>{filePath ? filePath.split(/[/\\]/).pop() : "Untitled"}</span>
        <div style={s.ctrlActions}>
          <span style={s.langBadge}>{resolvedLang}</span>
          <button
            style={s.ctrlBtn}
            title="Format Document (Alt+Shift+F)"
            onClick={() => editorRef.current?.getAction("editor.action.formatDocument")?.run()}
          >
            Format
          </button>
          <button
            style={s.ctrlBtn}
            title="Find & Replace (Ctrl+F / Ctrl+H)"
            onClick={() => setShowFind(p => !p)}
          >
            Find
          </button>
        </div>
      </div>

      {/* Find & Replace overlay */}
      {showFind && (
        <div style={s.findBox}>
          <div style={s.findRow}>
            <input
              style={s.findInput}
              placeholder="Find..."
              value={findText}
              autoFocus
              onChange={e => setFindText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") doFindNext(); if (e.key === "Escape") setShowFind(false); }}
            />
            <button style={s.findBtn} title="Previous" onClick={doFindPrev}>&#8593;</button>
            <button style={s.findBtn} title="Next" onClick={doFindNext}>&#8595;</button>
            <button
              style={{ ...s.findBtn, ...(showReplace ? s.findBtnOn : {}) }}
              title="Toggle Replace"
              onClick={() => setShowReplace(p => !p)}
            >
              &#8644;
            </button>
            <button style={s.findBtn} title="Close" onClick={() => setShowFind(false)}>&#10005;</button>
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
              <button style={s.findActBtn} onClick={doReplaceNext}>Replace</button>
              <button style={s.findActBtn} onClick={doReplaceAll}>All</button>
            </div>
          )}
        </div>
      )}

      {/* Monaco Editor */}
      <div style={s.monacoContainer}>
        <MonacoEditor
          height="100%"
          language={resolvedLang}
          value={content}
          theme="atlas-dark"
          onMount={handleMount}
          onChange={handleChange}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace",
            fontLigatures: true,
            lineNumbers: "on",
            minimap: { enabled: true, scale: 1, renderCharacters: false },
            wordWrap: "off",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
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
            overviewRulerBorder: false,
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
              useShadows: false,
            },
            padding: { top: 8, bottom: 8 },
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
    backgroundColor: "#09090b",
  },
  ctrlBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "24px",
    backgroundColor: "#0d0d10",
    borderBottom: "1px solid #27272a",
    padding: "0 8px",
    fontSize: "11px",
    color: "#71717a",
    flexShrink: 0,
  },
  filePath: {
    fontFamily: "monospace",
    color: "#a1a1aa",
  },
  ctrlActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  langBadge: {
    fontSize: "9px",
    fontWeight: 700,
    color: "#38bdf8",
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
    color: "#71717a",
    fontSize: "11px",
    cursor: "pointer",
    padding: "0 4px",
    borderRadius: "2px",
  },
  monacoContainer: {
    flex: 1,
    overflow: "hidden",
  },
  findBox: {
    position: "absolute",
    top: "28px",
    right: "16px",
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    borderRadius: "6px",
    padding: "6px 8px",
    zIndex: 100,
    boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
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
    backgroundColor: "#09090b",
    border: "1px solid #27272a",
    color: "#fafafa",
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
    color: "#a1a1aa",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "11px",
  },
  findBtnOn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#fafafa",
  },
  findActBtn: {
    backgroundColor: "#27272a",
    border: "none",
    color: "#fafafa",
    borderRadius: "3px",
    padding: "2px 8px",
    fontSize: "11px",
    cursor: "pointer",
  },
};