import type * as Monaco from "monaco-editor";

export interface SnippetDefinition {
  prefix: string;
  body: string | string[];
  description?: string;
  scope?: string;
}

const DEFAULT_SNIPPETS: Record<string, SnippetDefinition> = {
  "Console Log": {
    prefix: "clg",
    body: "console.log($1);",
    description: "Log output to console",
    scope: "javascript,typescript,javascriptreact,typescriptreact"
  },
  "Import Statement": {
    prefix: "imp",
    body: "import { $2 } from '$1';",
    description: "Import from a module",
    scope: "javascript,typescript,javascriptreact,typescriptreact"
  },
  "Export Function": {
    prefix: "exf",
    body: [
      "export function ${1:name}(${2:args}) {",
      "\t$3",
      "}"
    ],
    description: "Export function",
    scope: "javascript,typescript,javascriptreact,typescriptreact"
  }
};

export class SnippetManager {
  private static registered = false;

  public static async initialize(monaco: typeof Monaco) {
    if (this.registered) return;
    this.registered = true;

    try {
      // 1. Fetch user & workspace snippets
      let customSnippets: Record<string, SnippetDefinition> = {};
      if (window.atlasAPI && window.atlasAPI.getSnippets) {
        customSnippets = await window.atlasAPI.getSnippets();
      }

      const allSnippets = { ...DEFAULT_SNIPPETS, ...customSnippets };

      // 2. Group by language scope
      const snippetsByLanguage: Record<string, Monaco.languages.CompletionItem[]> = {};

      for (const [name, def] of Object.entries(allSnippets)) {
        const bodyText = Array.isArray(def.body) ? def.body.join("\n") : def.body;
        const scopes = def.scope ? def.scope.split(",").map(s => s.trim()) : ["*"];

        const item = {
          label: def.prefix,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: bodyText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: def.description || name,
          detail: name,
        } as Monaco.languages.CompletionItem;

        for (const scope of scopes) {
          if (!snippetsByLanguage[scope]) {
            snippetsByLanguage[scope] = [];
          }
          snippetsByLanguage[scope].push(item);
        }
      }

      // 3. Register providers for each language
      for (const [lang, items] of Object.entries(snippetsByLanguage)) {
        const targetLanguages = lang === "*" 
          ? monaco.languages.getLanguages().map(l => l.id) 
          : [lang];

        for (const targetLang of targetLanguages) {
          monaco.languages.registerCompletionItemProvider(targetLang, {
            provideCompletionItems: (model, position) => {
              // Create range to replace the typed prefix
              const word = model.getWordUntilPosition(position);
              const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
              };

              // Map items to include the dynamic range
              const completionItems = items.map(item => ({
                ...item,
                range
              }));

              return {
                suggestions: completionItems
              };
            }
          });
        }
      }
      
      console.log("[SnippetManager] Successfully registered snippets.");
    } catch (err) {
      console.error("[SnippetManager] Failed to initialize snippets:", err);
    }
  }
}
