import { useEffect, useRef, useState, useCallback } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, historyKeymap, history } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { foldGutter, foldKeymap, bracketMatching, syntaxHighlighting, defaultHighlightStyle, foldAll, unfoldAll } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches, openSearchPanel, findNext, findPrevious, replaceNext, replaceAll } from "@codemirror/search";

interface EditorPaneProps {
  filePath?: string;
  content?: string;
  language?: string;
  onChange?: (content: string) => void;
  onCursorChange?: (lineContent: string) => void;
}

export function EditorPane({
  filePath,
  content = "",
  language = "typescript",
  onChange,
  onCursorChange,
}: EditorPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const [showFind, setShowFind] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [showFolding, setShowFolding] = useState(true);

  // Format Document logic
  const handleFormat = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const raw = view.state.doc.toString();
    try {
      let formatted = raw;
      if (language === "json") {
        formatted = JSON.stringify(JSON.parse(raw), null, 2);
      } else {
        // Basic clean indentation / trailing whitespace trimmer
        formatted = raw
          .split("\n")
          .map(line => line.trimEnd())
          .join("\n");
      }
      if (formatted !== raw) {
        view.dispatch({
          changes: { from: 0, to: raw.length, insert: formatted }
        });
      }
    } catch {
      // Ignore formatting errors for incomplete syntax
    }
  }, [language]);

  const handleToggleFoldAll = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    if (showFolding) foldAll(view);
    else unfoldAll(view);
    setShowFolding(p => !p);
  }, [showFolding]);

  // CodeMirror Initialization
  useEffect(() => {
    if (!containerRef.current) return;

    const langExtension = language === "python" ? python() : javascript({ typescript: true, jsx: true });

    const state = EditorState.create({
      doc: content,
      extensions: [
        history(),
        lineNumbers(),
        highlightActiveLineGutter(),
        foldGutter(),
        bracketMatching(),
        closeBrackets(),
        langExtension,
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        autocompletion(),
        highlightSelectionMatches(),
        oneDark,
        EditorView.theme({
          "&": {
            height: "100%",
            fontSize: "13px",
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          },
          ".cm-scroller": { overflow: "auto" },
          ".cm-content": { padding: "8px 0" },
          "&.cm-focused": { outline: "none" },
          ".cm-gutters": {
            backgroundColor: "#0d0d10",
            borderRight: "1px solid #27272a",
            color: "#52525b",
          },
          ".cm-lineNumbers .cm-gutterElement": { paddingLeft: "8px", paddingRight: "8px" },
        }),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...lintKeymap,
          {
            key: "Mod-f",
            run: () => { setShowFind(true); setShowReplace(false); return true; }
          },
          {
            key: "Mod-h",
            run: () => { setShowFind(true); setShowReplace(true); return true; }
          },
          {
            key: "Alt-Shift-f",
            run: () => { handleFormat(); return true; }
          }
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange?.(update.state.doc.toString());
          }
          if (update.selectionSet) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            onCursorChange?.(line.text);
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language]);

  // Sync content props changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
      });
    }
  }, [content]);

  // Execute Search in CodeMirror
  const handleFindNext = () => {
    const view = viewRef.current;
    if (!view || !findText) return;
    findNext(view);
  };

  const handleFindPrev = () => {
    const view = viewRef.current;
    if (!view || !findText) return;
    findPrevious(view);
  };

  const handleReplaceNext = () => {
    const view = viewRef.current;
    if (!view || !findText) return;
    replaceNext(view);
  };

  const handleReplaceAll = () => {
    const view = viewRef.current;
    if (!view || !findText) return;
    replaceAll(view);
  };

  return (
    <div style={s.editorWrapper}>
      {/* Editor Controls Bar */}
      <div style={s.ctrlBar}>
        <span style={s.filePathTxt}>{filePath ? filePath.split(/[/\\]/).pop() : "Untitled"}</span>
        <div style={s.ctrlActions}>
          <button style={s.ctrlBtn} title="Format Document (Shift+Alt+F)" onClick={handleFormat}>
            Format
          </button>
          <button style={s.ctrlBtn} title="Toggle Fold All" onClick={handleToggleFoldAll}>
            {showFolding ? "Fold All" : "Unfold All"}
          </button>
          <button style={s.ctrlBtn} title="Find & Replace (Ctrl+F / Ctrl+H)" onClick={() => setShowFind(p => !p)}>
            Find
          </button>
        </div>
      </div>

      {/* Floating Find & Replace Overlay */}
      {showFind && (
        <div style={s.findBox}>
          <div style={s.findRow}>
            <input
              style={s.findInput}
              placeholder="Find..."
              value={findText}
              onChange={e => setFindText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleFindNext(); }}
              autoFocus
            />
            <button style={s.findBtn} onClick={handleFindPrev} title="Previous Match (Shift+Enter)">↑</button>
            <button style={s.findBtn} onClick={handleFindNext} title="Next Match (Enter)">↓</button>
            <button
              style={{ ...s.findBtn, ...(showReplace ? s.findBtnOn : {}) }}
              onClick={() => setShowReplace(p => !p)}
              title="Toggle Replace"
            >
              ⇄
            </button>
            <button style={s.findBtn} onClick={() => setShowFind(false)} title="Close (Esc)">✕</button>
          </div>

          {showReplace && (
            <div style={{ ...s.findRow, marginTop: "4px" }}>
              <input
                style={s.findInput}
                placeholder="Replace with..."
                value={replaceText}
                onChange={e => setReplaceText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleReplaceNext(); }}
              />
              <button style={s.findActBtn} onClick={handleReplaceNext}>Replace</button>
              <button style={s.findActBtn} onClick={handleReplaceAll}>All</button>
            </div>
          )}
        </div>
      )}

      {/* CodeMirror Mounting Container */}
      <div ref={containerRef} style={s.cmContainer} data-testid="editor-pane" />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  editorWrapper: {
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
  },
  filePathTxt: {
    fontFamily: "monospace",
    color: "#a1a1aa",
  },
  ctrlActions: {
    display: "flex",
    gap: "6px",
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
  cmContainer: {
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
    width: "280px",
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