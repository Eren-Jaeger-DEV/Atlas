import React, { useState, useRef, useEffect } from "react";

interface SplitViewProps {
  direction?: "horizontal" | "vertical";
  minSize?: number;
  initialSizes?: number[];
  children: React.ReactNode[];
  onResize?: (sizes: number[]) => void;
}

export function SplitView({ direction = "horizontal", minSize = 100, initialSizes, children, onResize }: SplitViewProps) {
  const [sizes, setSizes] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingIdx = useRef<number | null>(null);

  useEffect(() => {
    if (initialSizes && initialSizes.length === React.Children.count(children)) {
      setSizes(initialSizes);
    } else {
      setSizes(new Array(React.Children.count(children)).fill(100 / React.Children.count(children)));
    }
  }, [children, initialSizes]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingIdx.current === null || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const idx = draggingIdx.current;
      
      let newSizes = [...sizes];
      
      if (direction === "horizontal") {
        const delta = ((e.clientX - rect.left) / rect.width) * 100 - newSizes.slice(0, idx + 1).reduce((a, b) => a + b, 0);
        newSizes[idx] = (newSizes[idx] || 0) + delta;
        newSizes[idx + 1] = (newSizes[idx + 1] || 0) - delta;
      } else {
        const delta = ((e.clientY - rect.top) / rect.height) * 100 - newSizes.slice(0, idx + 1).reduce((a, b) => a + b, 0);
        newSizes[idx] = (newSizes[idx] || 0) + delta;
        newSizes[idx + 1] = (newSizes[idx + 1] || 0) - delta;
      }
      
      // Enforce min sizes (simplified as percentage here)
      const minPct = (minSize / (direction === "horizontal" ? rect.width : rect.height)) * 100;
      if ((newSizes[idx] || 0) >= minPct && (newSizes[idx + 1] || 0) >= minPct) {
        setSizes(newSizes);
        onResize?.(newSizes);
      }
    };

    const handleMouseUp = () => {
      if (draggingIdx.current !== null) {
        draggingIdx.current = null;
        document.body.style.cursor = "default";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [sizes, direction, minSize, onResize]);

  const kids = React.Children.toArray(children);

  return (
    <div 
      ref={containerRef}
      style={{ 
        display: "flex", 
        flexDirection: direction === "horizontal" ? "row" : "column", 
        width: "100%", 
        height: "100%",
        overflow: "hidden"
      }}
    >
      {kids.map((child, idx) => (
        <React.Fragment key={idx}>
          <div style={{ 
            flexBasis: `${sizes[idx]}%`, 
            flexGrow: sizes[idx] === undefined ? 1 : 0,
            flexShrink: 0,
            overflow: "hidden" 
          }}>
            {child}
          </div>
          {idx < kids.length - 1 && (
            <div
              className={direction === "horizontal" ? "resizer-x" : "resizer-y"}
              onMouseDown={(e) => {
                e.preventDefault();
                draggingIdx.current = idx;
                document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
              }}
              style={{
                width: direction === "horizontal" ? "4px" : "100%",
                height: direction === "horizontal" ? "100%" : "4px",
                cursor: direction === "horizontal" ? "col-resize" : "row-resize",
                backgroundColor: "var(--border-color, #27272a)",
                zIndex: 10,
                flexShrink: 0
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
