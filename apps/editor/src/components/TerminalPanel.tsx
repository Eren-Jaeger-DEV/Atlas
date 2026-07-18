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
      fontFamily: "Consolas, 'Courier New', monospace",
      theme: {
        background: "#0f0f13",
        foreground: "#cccccc",
        cursor: "#528bff",
        selectionBackground: "#3e4451",
        black: "#1e1e24",
        red: "#e06c75",
        green: "#98c379",
        yellow: "#d19a66",
        blue: "#61afef",
        magenta: "#c678dd",
        cyan: "#56b6c2",
        white: "#abb2bf",
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
          // Ignore resize errors when unmounting
        }
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        unsub();
        term.dispose();
      };
    } else {
      term.writeln("Terminal demo mode (Electron IPC unavailable)");
      return () => term.dispose();
    }
  }, [repoPath]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Terminal</span>
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
    backgroundColor: "#0f0f13",
    color: "#ccc",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justify: "space-between",
    padding: "4px 12px",
    backgroundColor: "#16161e",
    borderBottom: "1px solid #282833",
    fontSize: "11px",
    fontWeight: "bold",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  title: {
    color: "#61afef",
  },
  subtext: {
    marginLeft: "12px",
    color: "#666",
    fontSize: "10px",
    fontWeight: "normal",
    textTransform: "none",
  },
  canvasContainer: {
    flex: 1,
    padding: "4px",
    overflow: "hidden",
  },
};
