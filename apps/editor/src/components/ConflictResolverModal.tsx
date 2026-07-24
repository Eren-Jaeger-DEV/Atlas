import React, { useState, useEffect } from "react";

interface ConflictResolverModalProps {
  conflictFilePath: string;
  onClose: () => void;
  onResolved: () => void;
}

export function ConflictResolverModal({ conflictFilePath, onClose, onResolved }: ConflictResolverModalProps) {
  const [conflictContent, setConflictContent] = useState("");
  const [workerAContent, setWorkerAContent] = useState("");
  const [workerBContent, setWorkerBContent] = useState("");
  const [workerALabel, setWorkerALabel] = useState("Worker A");
  const [workerBLabel, setWorkerBLabel] = useState("Worker B");
  const [isResolving, setIsResolving] = useState(false);
  const [targetAbsPath, setTargetAbsPath] = useState("");

  useEffect(() => {
    const api = (window as any).atlasAPI;
    const realPath = conflictFilePath.replace(/\.atlas-conflict$/, "");
    setTargetAbsPath(realPath);

    if (api?.readFile) {
      api.readFile(conflictFilePath).then((raw: string) => {
        setConflictContent(raw);

        // Parse conflict sections
        const parts = raw.split(/<<<<<<< Worker /);
        if (parts.length >= 2) {
          const blocks = parts.slice(1);
          if (blocks[0]) {
            const [labelA, ...bodyA] = blocks[0].split("\n");
            if (labelA) setWorkerALabel(`Worker ${labelA.slice(0, 8)}`);
            setWorkerAContent(bodyA.join("\n").replace(/>>>>>>> END[\s\S]*/, "").trim());
          }
          if (blocks[1]) {
            const [labelB, ...bodyB] = blocks[1].split("\n");
            if (labelB) setWorkerBLabel(`Worker ${labelB.slice(0, 8)}`);
            setWorkerBContent(bodyB.join("\n").replace(/>>>>>>> END[\s\S]*/, "").trim());
          }
        } else {
          setWorkerAContent(raw);
          setWorkerBContent(raw);
        }
      }).catch(console.error);
    }
  }, [conflictFilePath]);

  const handleResolve = async (chosenContent: string) => {
    setIsResolving(true);
    try {
      const api = (window as any).atlasAPI;
      if (api?.writeFile && targetAbsPath) {
        await api.writeFile(targetAbsPath, chosenContent);
        if (api?.deleteFile) {
          await api.deleteFile(conflictFilePath);
        }
      }
      onResolved();
      onClose();
    } catch (err) {
      console.error("Failed to resolve merge conflict:", err);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.65)",
      backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 999999, fontFamily: "var(--font-ui, system-ui, sans-serif)"
    }}>
      <div className="anim-scale-in" style={{
        backgroundColor: "rgba(18, 18, 21, 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid #333333", borderRadius: 8,
        width: 840, maxWidth: "94vw", height: 560, display: "flex", flexDirection: "column",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)", overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24" }}>[3-WAY MERGE RESOLUTION WORKBENCH]</div>
            <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 2, fontFamily: "monospace" }}>
              {targetAbsPath.split(/[/\\]/).pop()}
            </div>
          </div>
          <button style={{ background: "none", border: "none", color: "#71717a", fontSize: 16, cursor: "pointer" }} onClick={onClose}>✕</button>
        </div>

        {/* 2-Pane Comparison View */}
        <div style={{ flex: 1, display: "flex", borderBottom: "1px solid #27272a", overflow: "hidden" }}>
          {/* Pane A */}
          <div style={{ flex: 1, borderRight: "1px solid #27272a", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 12px", background: "rgba(56,189,248,0.1)", borderBottom: "1px solid #27272a", fontSize: 11, fontWeight: 600, color: "#38bdf8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{workerALabel} Edit</span>
              <button
                style={{ background: "#38bdf8", border: "none", borderRadius: 4, color: "#000", fontSize: 10, fontWeight: 600, padding: "3px 10px", cursor: "pointer" }}
                onClick={() => handleResolve(workerAContent)}
                disabled={isResolving}
              >
                Accept Worker A
              </button>
            </div>
            <pre style={{ flex: 1, margin: 0, padding: 12, overflow: "auto", fontFamily: "monospace", fontSize: 11, color: "#e4e4e7", lineHeight: 1.5, background: "#050505" }}>
              {workerAContent || "// Empty content"}
            </pre>
          </div>

          {/* Pane B */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 12px", background: "rgba(167,139,250,0.1)", borderBottom: "1px solid #27272a", fontSize: 11, fontWeight: 600, color: "#a78bfa", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{workerBLabel} Edit</span>
              <button
                style={{ background: "#a78bfa", border: "none", borderRadius: 4, color: "#000", fontSize: 10, fontWeight: 600, padding: "3px 10px", cursor: "pointer" }}
                onClick={() => handleResolve(workerBContent)}
                disabled={isResolving}
              >
                Accept Worker B
              </button>
            </div>
            <pre style={{ flex: 1, margin: 0, padding: 12, overflow: "auto", fontFamily: "monospace", fontSize: 11, color: "#e4e4e7", lineHeight: 1.5, background: "#050505" }}>
              {workerBContent || "// Empty content"}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 18px", background: "#09090b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, color: "#71717a" }}>
            Select an agent's version to resolve the conflict and overwrite target file cleanly.
          </div>
          <button
            style={{ background: "#27272a", border: "none", borderRadius: 4, color: "#fafafa", fontSize: 12, padding: "6px 16px", cursor: "pointer" }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
