import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface TerminalPanelProps {
  repoPath?: string;
}

export function TerminalPanel({ repoPath }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', Consolas, monospace",
      theme: {
        background: "#09090b",
        foreground: "#fafafa",
        cursor: "#fafafa",
        selectionBackground: "#27272a",
        black: "#18181b",
        red: "#f87171",
        green: "#4ade80",
        yellow: "#facc15",
        blue: "#60a5fa",
        magenta: "#c084fc",
        cyan: "#38bdf8",
        white: "#f4f4f5",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    const api = (window as any).atlasAPI;
    const termId = "default-term";

    if (api) {
      api.terminalCreate(termId, repoPath).then(() => {
        term.onData((data: string) => {
          api.terminalInput(termId, data);
        });
      });

      const unsub = api.onTerminalData((payload: { termId: string; data: string }) => {
        if (payload.termId === termId) {
          term.write(payload.data);
        }
      });

      const handleResize = () => {
        try {
          fitAddon.fit();
          api.terminalResize(termId, term.cols, term.rows);
        } catch {
          // Ignore resize errors
        }
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        unsub();
        term.dispose();
      };
    } else {
      term.writeln("Terminal output stream ready.");
      return () => term.dispose();
    }
  }, [repoPath]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>TERMINAL</span>
        <span style={styles.subtext}>{repoPath ?? "No workspace open"}</span>
      </div>
      <div ref={containerRef} style={styles.canvasContainer} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#09090b",
    color: "#fafafa",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 14px",
    backgroundColor: "#0d0d10",
    borderBottom: "1px solid #27272a",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.5px",
  },
  title: {
    color: "#fafafa",
  },
  subtext: {
    marginLeft: "12px",
    color: "#71717a",
    fontSize: "11px",
    fontWeight: 400,
  },
  canvasContainer: {
    flex: 1,
    padding: "6px 10px",
    overflow: "hidden",
  },
};
