/**
 * Atlas Editor — CodeMirror 6 Editor Pane
 *
 * This component is ENTIRELY AI-blind. It renders a CodeMirror editor.
 * No agent, no AI concept, no import from @atlas/agents.
 * The AI plugin renders separately and attaches through the extension API.
 */

import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, historyKeymap, history } from "@codemirror/commands";
import { javascript, javascriptLanguage } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { foldGutter, foldKeymap, bracketMatching, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";

interface EditorPaneProps {
  filePath?: string;
  content?: string;
  language?: "typescript" | "javascript" | "python";
  onChange?: (content: string) => void;
  onCursorChange?: (line: number, col: number) => void;
}

export function EditorPane({
  content = "",
  language = "typescript",
  onChange,
  onCursorChange,
}: EditorPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const langExtension = language === "python" ? python() : javascript({ typescript: true, jsx: true });

    const state = EditorState.create({
      doc: content,
      extensions: [
        // Core
        history(),
        lineNumbers(),
        highlightActiveLineGutter(),
        foldGutter(),
        bracketMatching(),
        closeBrackets(),

        // Language
        langExtension,
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

        // Completion
        autocompletion(),
        highlightSelectionMatches(),

        // Theme
        oneDark,

        // Custom Atlas theme overrides
        EditorView.theme({
          "&": {
            height: "100%",
            fontSize: "14px",
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          },
          ".cm-scroller": { overflow: "auto" },
          ".cm-content": { padding: "8px 0" },
          "&.cm-focused": { outline: "none" },
          ".cm-gutters": {
            backgroundColor: "#0f0f13",
            borderRight: "1px solid #1e1e2e",
            color: "#44415a",
          },
          ".cm-lineNumbers .cm-gutterElement": { paddingLeft: "8px", paddingRight: "8px" },
        }),

        // Keymaps
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...lintKeymap,
        ]),

        // Update listener
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange?.(update.state.doc.toString());
          }
          if (update.selectionSet) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            onCursorChange?.(line.number, pos - line.from);
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
  }, [language]); // Recreate when language changes

  // Update content without recreating the view
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

  return (
    <div
      ref={containerRef}
      style={{ height: "100%", overflow: "hidden" }}
      data-testid="editor-pane"
    />
  );
}
