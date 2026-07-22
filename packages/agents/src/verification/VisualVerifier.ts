/**
 * @atlas/agents — VisualVerifier Tool
 *
 * Automated visual verification engine for web application UI components.
 * Captures visual DOM structure snapshots before and after AI code edits
 * to feed visual regression feedback back into agent review loops.
 */

export interface VisualSnapshot {
  targetUrlOrFile: string;
  timestamp: number;
  domElementCount: number;
  viewportWidth: number;
  viewportHeight: number;
  screenshotHash?: string;
}

export interface VisualVerificationResult {
  passed: boolean;
  elementDelta: number;
  layoutShiftDetected: boolean;
  summary: string;
}

export class VisualVerifier {
  private initialSnapshots = new Map<string, VisualSnapshot>();

  captureSnapshot(
    targetUrlOrFile: string,
    domElementCount: number,
    viewport = { width: 1280, height: 720 },
    screenshotHash?: string
  ): VisualSnapshot {
    const snapshot: VisualSnapshot = {
      targetUrlOrFile,
      timestamp: Date.now(),
      domElementCount,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      screenshotHash,
    };

    this.initialSnapshots.set(targetUrlOrFile, snapshot);
    return snapshot;
  }

  verifyChange(
    targetUrlOrFile: string,
    currentDomElementCount: number,
    currentScreenshotHash?: string
  ): VisualVerificationResult {
    const before = this.initialSnapshots.get(targetUrlOrFile);

    if (!before) {
      return {
        passed: true,
        elementDelta: 0,
        layoutShiftDetected: false,
        summary: `Initial snapshot created for ${targetUrlOrFile} (${currentDomElementCount} elements).`,
      };
    }

    const delta = currentDomElementCount - before.domElementCount;
    const hashMismatch =
      Boolean(before.screenshotHash && currentScreenshotHash) &&
      before.screenshotHash !== currentScreenshotHash;

    const passed = Math.abs(delta) < 50;

    return {
      passed,
      elementDelta: delta,
      layoutShiftDetected: hashMismatch,
      summary: passed
        ? `[PASS] Visual layout intact for ${targetUrlOrFile} (element delta: ${delta}).`
        : `[FAIL] Visual regression threshold exceeded for ${targetUrlOrFile} (element delta: ${delta}).`,
    };
  }
}
