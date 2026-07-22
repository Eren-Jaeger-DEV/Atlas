/**
 * @atlas/agents — VisionGrounding
 *
 * Provides visual perception helpers, viewport bounds overlays,
 * and screenshot encoding for multimodal AI visual grounding.
 */

import type { AXNode } from "./AXTreeExtractor.js";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GroundedElement {
  id: number;
  label: string;
  box: BoundingBox;
}

export class VisionGrounding {
  /**
   * Formats grounded interactive elements into spatial prompt annotations.
   */
  public static formatSetOfMarksPrompt(elements: GroundedElement[]): string {
    return elements
      .map(
        (el) =>
          `[Mark #${el.id}] "${el.label}" at (${Math.round(el.box.x)}, ${Math.round(el.box.y)}) - ${Math.round(
            el.box.width
          )}x${Math.round(el.box.height)}px`
      )
      .join("\n");
  }

  /**
   * Generates an SVG overlay of bounding boxes for verification rendering.
   */
  public static generateOverlaySvg(elements: GroundedElement[], width = 1280, height = 800): string {
    const rects = elements
      .map(
        (el) => `
      <rect x="${el.box.x}" y="${el.box.y}" width="${el.box.width}" height="${el.box.height}" 
            fill="rgba(56, 189, 248, 0.1)" stroke="#38bdf8" stroke-width="2" rx="4"/>
      <rect x="${el.box.x}" y="${Math.max(0, el.box.y - 18)}" width="24" height="18" fill="#38bdf8" rx="2"/>
      <text x="${el.box.x + 4}" y="${Math.max(12, el.box.y - 4)}" fill="#09090b" font-size="12" font-weight="bold">${el.id}</text>`
      )
      .join("\n");

    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
  }
}
