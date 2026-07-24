/**
 * AtlasParallel — ParallelMerger
 *
 * After all workers in a WorkerPool complete, ParallelMerger:
 * 1. Collects all file edits produced by each worker
 * 2. Detects conflicting edits (two workers touched the same file)
 * 3. For non-conflicting files: applies edits directly
 * 4. For conflicting files: runs a 3-way merge and reports the result
 * 5. Produces a unified MergeReport
 */

import fs from "node:fs";
import path from "node:path";
import type { WorkerState } from "./types.js";

export interface FileEdit {
  filePath: string;
  workerId: string;
  content: string;
}

export interface MergeConflict {
  filePath: string;
  workerIds: string[];
  conflictMarkers: string;
}

export interface MergeReport {
  applied: FileEdit[];
  conflicts: MergeConflict[];
  summary: string;
}

export class ParallelMerger {
  private repoRoot: string;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
  }

  /**
   * Extract file edits from completed worker outputs.
   * Workers are expected to have stored edited file paths in output.editedFiles.
   */
  extractEdits(workers: WorkerState[]): FileEdit[] {
    const edits: FileEdit[] = [];
    for (const w of workers) {
      if (w.status !== "done" || !w.output) continue;
      const editedFiles: string[] = w.output?.editedFiles ?? [];
      for (const filePath of editedFiles) {
        const absPath = path.isAbsolute(filePath) ? filePath : path.join(this.repoRoot, filePath);
        if (fs.existsSync(absPath)) {
          edits.push({
            filePath: absPath,
            workerId: w.id,
            content: fs.readFileSync(absPath, "utf-8")
          });
        }
      }
    }
    return edits;
  }

  /**
   * Merge all edits, detecting and handling conflicts.
   */
  async merge(workers: WorkerState[]): Promise<MergeReport> {
    const edits = this.extractEdits(workers);
    const report: MergeReport = { applied: [], conflicts: [], summary: "" };

    // Group edits by file
    const byFile = new Map<string, FileEdit[]>();
    for (const edit of edits) {
      const existing = byFile.get(edit.filePath) ?? [];
      existing.push(edit);
      byFile.set(edit.filePath, existing);
    }

    for (const [filePath, fileEdits] of byFile) {
      if (fileEdits.length === 1 && fileEdits[0]) {
        // No conflict — already applied by the worker
        report.applied.push(fileEdits[0]);
      } else {
        // Conflict — multiple workers edited the same file
        // Build a simple conflict marker file for human review
        const original = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
        let conflictContent = original;

        for (const edit of fileEdits) {
          conflictContent +=
            `\n<<<<<<< Worker ${edit.workerId.slice(0, 8)}\n` +
            edit.content +
            `\n>>>>>>> END\n`;
        }

        const conflictPath = filePath + ".atlas-conflict";
        fs.writeFileSync(conflictPath, conflictContent, "utf-8");

        report.conflicts.push({
          filePath,
          workerIds: fileEdits.map(e => e.workerId),
          conflictMarkers: conflictPath
        });
      }
    }

    // Build summary
    const doneCount = workers.filter(w => w.status === "done").length;
    const errCount = workers.filter(w => w.status === "error").length;
    const cancelCount = workers.filter(w => w.status === "cancelled").length;

    report.summary = [
      `AtlasParallel merge complete.`,
      `Workers: ${doneCount} done, ${errCount} error, ${cancelCount} cancelled.`,
      `Files applied: ${report.applied.length}.`,
      `Conflicts requiring review: ${report.conflicts.length}.`,
      ...(report.conflicts.length > 0
        ? ["Conflict files written as *.atlas-conflict — open them in the merge editor."]
        : [])
    ].join(" ");

    return report;
  }
}
