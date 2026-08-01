import React, { useState } from "react";
import { Search, Code2, Replace, Check, Sparkles, FileCode } from "lucide-react";
import { structuralAstSearch, AST_PATTERN_PRESETS, type AstMatch, type AstPatternPreset } from "@atlas/graph";

interface AstSearchPanelProps {
  workspaceRoot?: string;
  onOpenFile?: (filePath: string, line?: number) => void;
}

const EXCLUDED_DIRS = new Set(["node_modules", "dist", "dist-app", ".git", ".turbo", ".atlas", "build", "coverage"]);

export function AstSearchPanel({ workspaceRoot, onOpenFile }: AstSearchPanelProps) {
  const initialPreset: AstPatternPreset = AST_PATTERN_PRESETS[0] ?? { id: "custom", name: "Custom", pattern: "", replacement: "", description: "" };

  const [patternInput, setPatternInput] = useState<string>(initialPreset.pattern);
  const [replacementInput, setReplacementInput] = useState<string>(initialPreset.replacement);
  const [activePreset, setActivePreset] = useState<string>(initialPreset.id);
  const [matches, setMatches] = useState<AstMatch[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [replaceSuccess, setReplaceSuccess] = useState<boolean>(false);

  const handleSelectPreset = (preset: AstPatternPreset) => {
    setActivePreset(preset.id);
    setPatternInput(preset.pattern);
    setReplacementInput(preset.replacement);
  };

  // Recursively collect source files using the readDir API (no searchFiles needed)
  const collectSourceFiles = async (dirPath: string, api: NonNullable<typeof window.atlasAPI>, depth: number): Promise<string[]> => {
    if (depth > 5) return [];
    try {
      const entries = await api.readDir(dirPath);
      const filePaths: string[] = [];
      for (const entry of entries) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        if (entry.isDirectory) {
          const nested = await collectSourceFiles(entry.path, api, depth + 1);
          filePaths.push(...nested);
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          filePaths.push(entry.path);
        }
      }
      return filePaths;
    } catch {
      return [];
    }
  };

  const handleRunSearch = async () => {
    if (!patternInput.trim()) return;
    setIsSearching(true);
    setReplaceSuccess(false);

    try {
      const api = window.atlasAPI;
      if (!api?.readFile || !api?.readDir) {
        setMatches([]);
        return;
      }

      const root = workspaceRoot ?? "/home/victor/My projects/Atlas";
      let filePaths: string[] = [];

      if (api.searchFiles) {
        const res = await api.searchFiles(root, "**/*.{ts,tsx,js,jsx}");
        filePaths = res.map((f) => f.path);
      } else {
        filePaths = await collectSourceFiles(root, api, 0);
      }

      const allMatches: AstMatch[] = [];
      for (const filePath of filePaths.slice(0, 150)) {
        try {
          const content = await api.readFile(filePath);
          if (content) {
            const fileMatches = structuralAstSearch.matchContent(filePath, content, patternInput);
            allMatches.push(...fileMatches);
          }
        } catch {
          // Skip unreadable file
        }
      }

      setMatches(allMatches);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReplaceAll = async () => {
    if (!replacementInput.trim() || matches.length === 0) return;
    const api = window.atlasAPI;
    if (!api?.writeFile || !api?.readFile) return;

    setIsSearching(true);
    try {
      const fileSet = new Set(matches.map((m) => m.file));
      for (const filePath of fileSet) {
        try {
          const content = await api.readFile(filePath);
          if (content) {
            const updated = structuralAstSearch.replaceContent(content, patternInput, replacementInput);
            await api.writeFile(filePath, updated);
          }
        } catch {
          // Skip write failures gracefully
        }
      }
      setReplaceSuccess(true);
      setMatches([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <Code2 size={15} color="#38bdf8" />
        <span style={styles.title}>STRUCTURAL AST SEARCH</span>
      </div>

      {/* Preset Pills */}
      <div style={styles.section}>
        <span style={styles.sectionLabel}>PATTERN PRESETS</span>
        <div style={styles.presetGrid}>
          {AST_PATTERN_PRESETS.map((p) => (
            <button
              key={p.id}
              title={p.description}
              onClick={() => handleSelectPreset(p)}
              style={{
                ...styles.presetChip,
                borderColor: activePreset === p.id ? "#38bdf8" : "rgba(255,255,255,0.07)",
                backgroundColor: activePreset === p.id ? "rgba(56,189,248,0.14)" : "rgba(255,255,255,0.02)",
                color: activePreset === p.id ? "#38bdf8" : "#71717a",
              }}
            >
              <Sparkles size={9} />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div style={styles.section}>
        <label style={styles.label}>Search Pattern <span style={{ color: "#38bdf8" }}>($VAR wildcards)</span></label>
        <input
          style={styles.codeInput}
          value={patternInput}
          onChange={(e) => setPatternInput(e.target.value)}
          placeholder="e.g. console.log($MSG)"
          spellCheck={false}
        />

        <label style={{ ...styles.label, marginTop: "8px" }}>Replacement Template</label>
        <input
          style={styles.codeInput}
          value={replacementInput}
          onChange={(e) => setReplacementInput(e.target.value)}
          placeholder="e.g. logger.debug($MSG)"
          spellCheck={false}
        />

        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          <button style={styles.btnSearch} onClick={handleRunSearch} disabled={isSearching}>
            <Search size={12} />
            <span>{isSearching ? "Scanning..." : "Search"}</span>
          </button>
          {matches.length > 0 && (
            <button style={styles.btnReplace} onClick={handleReplaceAll} disabled={isSearching}>
              <Replace size={12} />
              <span>Replace All ({matches.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={styles.resultArea}>
        <div style={styles.resultHeader}>
          <span style={styles.sectionLabel}>AST MATCHES ({matches.length})</span>
          {replaceSuccess && (
            <span style={{ fontSize: "10px", color: "#34d399", fontWeight: 700, display: "flex", alignItems: "center", gap: "3px" }}>
              <Check size={11} /> Applied
            </span>
          )}
        </div>

        {matches.length === 0 && !isSearching && (
          <div style={styles.emptyState}>
            <Code2 size={28} color="rgba(56,189,248,0.15)" />
            <span style={{ fontSize: "12px", color: "#3f3f46", marginTop: "6px" }}>Run a pattern search above</span>
          </div>
        )}

        {matches.map((m, idx) => (
          <div
            key={`${m.file}-${m.line}-${idx}`}
            style={styles.matchCard}
            onClick={() => onOpenFile?.(m.file, m.line)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
              <FileCode size={11} color="#38bdf8" />
              <span style={styles.matchFilePath}>
                {m.file.split(/[/\\]/).slice(-2).join("/")}
                <span style={{ color: "#52525b" }}>:{m.line}</span>
              </span>
            </div>
            <div style={styles.matchCode}>{m.matchedText}</div>

            {Object.keys(m.bindings).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "5px" }}>
                {Object.entries(m.bindings).map(([k, v]) => (
                  <span key={k} style={styles.bindingTag}>
                    ${k}: <span style={{ color: "#f4f4f5" }}>{String(v).slice(0, 40)}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#09090b",
    color: "#f4f4f5",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "10px 14px",
    backgroundColor: "#111113",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#d4d4d8",
  },
  section: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    flexShrink: 0,
  },
  sectionLabel: {
    display: "block",
    fontSize: "10px",
    fontWeight: 700,
    color: "#52525b",
    letterSpacing: "0.06em",
    marginBottom: "6px",
  },
  presetGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "5px",
  },
  presetChip: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px 8px",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: 600,
    border: "1px solid transparent",
    cursor: "pointer",
    transition: "all 0.12s ease",
  },
  label: {
    display: "block",
    fontSize: "11px",
    fontWeight: 600,
    color: "#71717a",
    marginBottom: "4px",
  },
  codeInput: {
    width: "100%",
    backgroundColor: "#0e0e10",
    border: "1px solid rgba(56,189,248,0.18)",
    borderRadius: "4px",
    color: "#38bdf8",
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
    padding: "7px 10px",
    fontSize: "12px",
    outline: "none",
    boxSizing: "border-box",
  },
  btnSearch: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    backgroundColor: "#38bdf8",
    color: "#09090b",
    border: "none",
    borderRadius: "4px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  btnReplace: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    backgroundColor: "#f59e0b",
    color: "#09090b",
    border: "none",
    borderRadius: "4px",
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  resultArea: {
    flex: 1,
    overflowY: "auto",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
    flexShrink: 0,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: "32px",
    opacity: 0.8,
  },
  matchCard: {
    backgroundColor: "#111113",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "6px",
    padding: "8px 10px",
    cursor: "pointer",
    transition: "border-color 0.1s",
  },
  matchFilePath: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#d4d4d8",
    fontFamily: "'JetBrains Mono', monospace",
  },
  matchCode: {
    fontSize: "12px",
    color: "#38bdf8",
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    backgroundColor: "#0e0e10",
    padding: "4px 7px",
    borderRadius: "3px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
  bindingTag: {
    fontSize: "10px",
    fontFamily: "'JetBrains Mono', monospace",
    backgroundColor: "rgba(56,189,248,0.08)",
    color: "#38bdf8",
    padding: "2px 5px",
    borderRadius: "3px",
    border: "1px solid rgba(56,189,248,0.15)",
  },
};
