import { useState } from "react";
import { X, MessageSquare, Send, Check, Copy } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [type, setType] = useState<"bug" | "feature" | "docs">("feature");
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFeedback("");
      onClose();
    }, 1800);
  };

  const handleCopyDiagnostics = async () => {
    const diag = {
      app: "Atlas Studio v1.0.0",
      userAgent: navigator.userAgent,
      time: new Date().toISOString(),
      type,
      rating,
      feedback
    };
    if (window.atlasAPI?.clipboardWriteText) {
      await window.atlasAPI.clipboardWriteText(JSON.stringify(diag, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <MessageSquare size={18} color="#38bdf8" />
            <h2 style={styles.title}>Provide Feedback &amp; Diagnostic Log</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={styles.body}>
          {submitted ? (
            <div style={styles.successState}>
              <div style={styles.successIcon}>
                <Check size={28} color="#ffffff" />
              </div>
              <h3 style={{ color: "#ffffff", margin: 0 }}>Thank You for Your Feedback!</h3>
              <p style={{ color: "#a1a1aa", fontSize: "13px", margin: 0 }}>
                Your insights help us continuously polish Atlas Studio.
              </p>
            </div>
          ) : (
            <>
              <div style={styles.field}>
                <label style={styles.label}>Feedback Category</label>
                <div style={styles.typeSelector}>
                  {(["feature", "bug", "docs"] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      style={{
                        ...styles.typeBtn,
                        ...(type === cat ? styles.typeBtnActive : {})
                      }}
                      onClick={() => setType(cat)}
                    >
                      {cat === "feature" && "[FEATURE] Feature Suggestion"}
                      {cat === "bug" && "[BUG] Bug Report"}
                      {cat === "docs" && "[DOCS] Documentation"}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Overall Experience (1 - 5 Stars)</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "20px",
                        cursor: "pointer",
                        opacity: star <= rating ? 1 : 0.3
                      }}
                      onClick={() => setRating(star)}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Detailed Comments</label>
                <textarea
                  style={styles.textarea}
                  rows={4}
                  placeholder="Share your thoughts, issue tracebacks, or design suggestions..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button type="button" style={styles.secondaryBtn} onClick={handleCopyDiagnostics}>
                  <Copy size={13} />
                  <span>{copied ? "Copied JSON Payload!" : "Copy Diagnostics Payload"}</span>
                </button>
                <button type="submit" style={styles.primaryBtn}>
                  <Send size={13} />
                  <span>Submit Feedback</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  modal: {
    width: "500px",
    backgroundColor: "#090a0f",
    border: "1px solid #27272a",
    borderRadius: "8px",
    boxShadow: "0 16px 40px rgba(0, 0, 0, 0.8)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 18px",
    borderBottom: "1px solid #27272a",
    backgroundColor: "#0d0e15",
  },
  title: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#f4f4f5",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#a1a1aa",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
  },
  body: {
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#a1a1aa",
  },
  typeSelector: {
    display: "flex",
    gap: "6px",
  },
  typeBtn: {
    flex: 1,
    padding: "6px 8px",
    borderRadius: "4px",
    border: "1px solid #27272a",
    backgroundColor: "#13141f",
    color: "#a1a1aa",
    fontSize: "11px",
    cursor: "pointer",
  },
  typeBtnActive: {
    borderColor: "#38bdf8",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    color: "#ffffff",
    fontWeight: 600,
  },
  textarea: {
    backgroundColor: "#13141f",
    border: "1px solid #27272a",
    borderRadius: "6px",
    padding: "10px",
    color: "#ffffff",
    fontSize: "12px",
    fontFamily: "inherit",
    outline: "none",
    resize: "none",
  },
  successState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "30px 10px",
    gap: "10px",
    textAlign: "center",
  },
  successIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "transparent",
    border: "1px solid #3f3f46",
    color: "#e4e4e7",
    padding: "6px 12px",
    borderRadius: "4px",
    fontSize: "12px",
    cursor: "pointer",
  },
  primaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#0284c7",
    border: "none",
    color: "#ffffff",
    padding: "6px 16px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
