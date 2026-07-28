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
  accessibilityNodeCount?: number;
  viewportWidth: number;
  viewportHeight: number;
  screenshotHash?: string;
}

export interface VisualVerificationResult {
  passed: boolean;
  elementDelta: number;
  layoutShiftDetected: boolean;
  layoutShiftScore: number;
  summary: string;
}

export class VisualVerifier {
  private initialSnapshots = new Map<string, VisualSnapshot>();

  captureSnapshot(
    targetUrlOrFile: string,
    domElementCount: number,
    viewport = { width: 1280, height: 720 },
    screenshotHash?: string,
    accessibilityNodeCount?: number
  ): VisualSnapshot {
    const snapshot: VisualSnapshot = {
      targetUrlOrFile,
      timestamp: Date.now(),
      domElementCount,
      accessibilityNodeCount,
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
    currentScreenshotHash?: string,
    currentAccessibilityNodeCount?: number
  ): VisualVerificationResult {
    const before = this.initialSnapshots.get(targetUrlOrFile);

    if (!before) {
      this.captureSnapshot(
        targetUrlOrFile,
        currentDomElementCount,
        { width: 1280, height: 720 },
        currentScreenshotHash,
        currentAccessibilityNodeCount
      );
      return {
        passed: false,
        elementDelta: 0,
        layoutShiftDetected: false,
        layoutShiftScore: 0,
        summary: `[WARN] Missing initial baseline for ${targetUrlOrFile}. Initial baseline recorded. Re-run verification to compare against baseline.`,
      };
    }

    const delta = currentDomElementCount - before.domElementCount;
    const hashMismatch =
      Boolean(before.screenshotHash && currentScreenshotHash) &&
      before.screenshotHash !== currentScreenshotHash;

    const axDelta =
      before.accessibilityNodeCount !== undefined && currentAccessibilityNodeCount !== undefined
        ? Math.abs(currentAccessibilityNodeCount - before.accessibilityNodeCount)
        : 0;

    const layoutShiftScore = Math.min(1.0, (Math.abs(delta) / Math.max(before.domElementCount, 1)) + (hashMismatch ? 0.5 : 0) + (axDelta > 10 ? 0.2 : 0));

    const passed = Math.abs(delta) < 20 && !hashMismatch && currentDomElementCount > 0 && layoutShiftScore < 0.5;

    return {
      passed,
      elementDelta: delta,
      layoutShiftDetected: hashMismatch || layoutShiftScore > 0.3,
      layoutShiftScore: Number(layoutShiftScore.toFixed(3)),
      summary: passed
        ? `[PASS] Visual layout intact for ${targetUrlOrFile} (element delta: ${delta}, layout shift score: ${layoutShiftScore.toFixed(3)}).`
        : `[FAIL] Visual regression or layout shift detected for ${targetUrlOrFile} (element delta: ${delta}, hashMismatch: ${hashMismatch}, score: ${layoutShiftScore.toFixed(3)}).`,
    };
  }

  /**
   * Compare two image buffer snapshots byte-by-byte for pixel diff ratio.
   */
  public comparePixelDiff(
    bufferA: Uint8Array | ArrayBuffer,
    bufferB: Uint8Array | ArrayBuffer
  ): { pixelDiffCount: number; diffPercentage: number } {
    const a = new Uint8Array(bufferA);
    const b = new Uint8Array(bufferB);
    const minLen = Math.min(a.length, b.length);
    const maxLen = Math.max(a.length, b.length);

    let diffCount = Math.abs(a.length - b.length);
    for (let i = 0; i < minLen; i++) {
      if (a[i] !== b[i]) diffCount++;
    }

    const diffPercentage = maxLen > 0 ? Number(((diffCount / maxLen) * 100).toFixed(2)) : 0;
    return { pixelDiffCount: diffCount, diffPercentage };
  }

  /**
   * Validate extracted OCR UI text against expected component text string.
   */
  public validateOCRText(
    expectedText: string,
    actualText: string
  ): { match: boolean; confidence: number } {
    if (!expectedText || !actualText) {
      return { match: expectedText === actualText, confidence: expectedText === actualText ? 1.0 : 0.0 };
    }

    const expectedNormalized = expectedText.toLowerCase().trim();
    const actualNormalized = actualText.toLowerCase().trim();

    const contains = actualNormalized.includes(expectedNormalized);
    const confidence = contains ? 0.95 : 0.2;

    return { match: contains, confidence };
  }
}
