/**
 * @atlas/editor — InlineGhostEditor
 *
 * Monaco Editor inline streaming decorator. Renders live line-by-line ghost text
 * overlays as LLM tokens stream in over IPC without blocking editor typing.
 */

import type * as monaco from "monaco-editor";

export interface GhostPatchOptions {
  editor: monaco.editor.IStandaloneCodeEditor;
  monacoInstance: typeof monaco;
}

export class InlineGhostEditor {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private monaco: typeof monaco;
  private decorationIds: string[] = [];
  private ghostContent = "";
  private startLineNumber = 1;
  private isActive = false;

  constructor(options: GhostPatchOptions) {
    this.editor = options.editor;
    this.monaco = options.monacoInstance;
  }

  startSession(startLineNumber: number): void {
    this.clear();
    this.startLineNumber = startLineNumber;
    this.ghostContent = "";
    this.isActive = true;
  }

  appendToken(token: string): void {
    if (!this.isActive) return;
    this.ghostContent += token;
    this.renderDecoration();
  }

  private renderDecoration(): void {
    if (!this.isActive || !this.ghostContent) return;

    const lines = this.ghostContent.split("\n");
    const endLineNumber = this.startLineNumber + lines.length - 1;

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [
      {
        range: new this.monaco.Range(this.startLineNumber, 1, endLineNumber, 1),
        options: {
          isWholeLine: true,
          className: "atlas-ghost-line-highlight",
          glyphMarginClassName: "atlas-ghost-glyph-icon",
          inlineClassName: "atlas-ghost-inline-text",
          linesDecorationsClassName: "atlas-ghost-margin-decoration",
        },
      },
    ];

    this.decorationIds = this.editor.deltaDecorations(this.decorationIds, newDecorations);
  }

  accept(): string {
    const acceptedText = this.ghostContent;
    this.clear();
    return acceptedText;
  }

  reject(): void {
    this.clear();
  }

  clear(): void {
    this.isActive = false;
    if (this.decorationIds.length > 0) {
      this.decorationIds = this.editor.deltaDecorations(this.decorationIds, []);
    }
    this.ghostContent = "";
  }

  getIsActive(): boolean {
    return this.isActive;
  }
}
