import React, { useState } from "react";

export interface Range {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

export interface DocumentSymbol {
  name: string;
  detail?: string;
  kind: number;
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
}

interface OutlinePanelProps {
  symbols: DocumentSymbol[];
  onSymbolClick: (symbol: DocumentSymbol) => void;
  activeLine?: number;
}

export function OutlinePanel({ symbols, onSymbolClick, activeLine }: OutlinePanelProps) {
  if (!symbols || symbols.length === 0) {
    return (
      <div style={styles.empty}>
        No symbols found in the current file.
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {symbols.map((sym, i) => (
        <SymbolItem 
          key={`${sym.name}-${i}`} 
          symbol={sym} 
          level={0} 
          onSymbolClick={onSymbolClick}
          activeLine={activeLine}
        />
      ))}
    </div>
  );
}

function SymbolItem({ symbol, level, onSymbolClick, activeLine }: { symbol: DocumentSymbol, level: number, onSymbolClick: (s: DocumentSymbol) => void, activeLine?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = symbol.children && symbol.children.length > 0;
  
  // A symbol is active if the activeLine is within its range.
  // Note: LSP ranges are 0-indexed, while activeLine might be 1-indexed. We assume activeLine is 1-indexed here, so we compare with +1.
  const isActive = activeLine !== undefined && 
                   activeLine >= symbol.range.start.line + 1 && 
                   activeLine <= symbol.range.end.line + 1;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div 
        style={{
          ...styles.item,
          paddingLeft: `${level * 12 + 8}px`,
          backgroundColor: isActive ? "#38bdf820" : "transparent",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSymbolClick(symbol);
        }}
      >
        <span 
          style={{ ...styles.chevron, visibility: hasChildren ? "visible" : "hidden", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
        
        <SymbolIcon kind={symbol.kind} />
        
        <span style={{ ...styles.name, color: isActive ? "#38bdf8" : "#e4e4e7" }}>
          {symbol.name}
        </span>
        {symbol.detail && (
          <span style={styles.detail}>{symbol.detail}</span>
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {symbol.children!.map((child, i) => (
            <SymbolItem 
              key={`${child.name}-${i}`} 
              symbol={child} 
              level={level + 1} 
              onSymbolClick={onSymbolClick} 
              activeLine={activeLine} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SymbolIcon({ kind }: { kind: number }) {
  // Mapping based on LSP SymbolKind
  // 5: Class, 6: Method, 12: Function, 13: Variable, 11: Interface, 7: Property, 14: Constant, 22: EnumMember
  let color = "#71717a";
  let text = "?";

  switch (kind) {
    case 5: // Class
      color = "#f59e0b"; text = "C"; break;
    case 6: // Method
      color = "#a78bfa"; text = "M"; break;
    case 12: // Function
      color = "#a78bfa"; text = "ƒ"; break;
    case 13: // Variable
      color = "#60a5fa"; text = "V"; break;
    case 14: // Constant
      color = "#60a5fa"; text = "C"; break;
    case 11: // Interface
      color = "#34d399"; text = "I"; break;
    case 7: // Property
      color = "#38bdf8"; text = "P"; break;
    case 10: // Enum
      color = "#f43f5e"; text = "E"; break;
    default:
      text = "·"; break;
  }

  return (
    <span style={{ ...styles.icon, color }}>
      {text}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    overflowY: "auto",
    padding: "8px 0",
  },
  empty: {
    padding: "16px",
    color: "#71717a",
    fontSize: "12px",
    textAlign: "center",
  },
  item: {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    padding: "4px 8px",
    fontSize: "12px",
    color: "#e4e4e7",
    userSelect: "none",
  },
  chevron: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "16px",
    height: "16px",
    marginRight: "4px",
    color: "#71717a",
    transition: "transform 0.15s ease",
  },
  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "16px",
    marginRight: "6px",
    fontFamily: "monospace",
    fontWeight: "bold",
    fontSize: "12px",
  },
  name: {
    whiteSpace: "nowrap",
    marginRight: "8px",
  },
  detail: {
    color: "#71717a",
    fontSize: "11px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    flex: 1,
  }
};
