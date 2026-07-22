import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

const TooltipContainer = styled.div`
  position: absolute;
  background-color: var(--bg-panel, #1f1f23);
  color: var(--text-main, #fafafa);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  z-index: 99999;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  border: 1px solid var(--border-color, #27272a);
  pointer-events: none;
`;

export function Tooltip({ content, children, position = "right", delay = 300 }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [actualPos, setActualPos] = useState(position);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const targetRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = () => {
    if (!targetRef.current) return;
    const rect = targetRef.current.getBoundingClientRect();
    let top = 0;
    let left = 0;
    let pos = position;

    // Default dimensions in case tooltipRef isn't mounted yet, but will correct immediately on mount
    const tooltipWidth = tooltipRef.current ? tooltipRef.current.offsetWidth : 150;
    const tooltipHeight = tooltipRef.current ? tooltipRef.current.offsetHeight : 50;

    // Collision detection logic
    if (pos === "right" && rect.right + tooltipWidth > window.innerWidth) pos = "left";
    if (pos === "left" && rect.left - tooltipWidth < 0) pos = "right";
    if (pos === "bottom" && rect.bottom + tooltipHeight > window.innerHeight) pos = "top";
    if (pos === "top" && rect.top - tooltipHeight < 0) pos = "bottom";

    switch (pos) {
      case "top":
        top = rect.top - 8;
        left = rect.left + rect.width / 2;
        break;
      case "bottom":
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2;
        break;
      case "left":
        top = rect.top + rect.height / 2;
        left = rect.left - 8;
        break;
      case "right":
        top = rect.top + rect.height / 2;
        left = rect.right + 8;
        break;
    }
    setCoords({ top, left });
    setActualPos(pos);
  };

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      calculatePosition();
      setShow(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShow(false);
  };

  // Recalculate if the tooltip content dimensions change after mount
  useEffect(() => {
    if (show) {
      calculatePosition();
    }
  }, [show, content]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getTransform = () => {
    switch (actualPos) {
      case "top": return "translate(-50%, -100%)";
      case "bottom": return "translate(-50%, 0)";
      case "left": return "translate(-100%, -50%)";
      case "right": return "translate(0, -50%)";
      default: return "translate(0, 0)";
    }
  };

  return (
    <>
      <span
        ref={targetRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-describedby={show ? "tooltip-content" : undefined}
        style={{ display: "inline-block" }}
      >
        {children}
      </span>
      {show && ReactDOM.createPortal(
        <TooltipContainer
          id="tooltip-content"
          role="tooltip"
          ref={tooltipRef}
          style={{ top: coords.top, left: coords.left, transform: getTransform() }}
        >
          {content}
        </TooltipContainer>,
        document.body
      )}
    </>
  );
}
