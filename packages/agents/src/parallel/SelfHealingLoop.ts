/**
 * @atlas/agents — SelfHealingLoop
 *
 * Automated post-edit verification and auto-repair loop matching Antigravity (Chapter 2)
 * and VS Code Copilot (Chapter 5).
 * Executes background linter/test passes after agent code modifications and re-invokes
 * the coder agent to fix errors until the codebase is 100% clean.
 */

export interface HealingIteration {
  iteration: number;
  errorsDetected: string[];
  repairsApplied: string[];
  success: boolean;
}

export interface SelfHealingResult {
  totalIterations: number;
  finalSuccess: boolean;
  history: HealingIteration[];
}

export class SelfHealingLoop {
  private maxIterations: number;

  constructor(maxIterations = 3) {
    this.maxIterations = maxIterations;
  }

  /**
   * Run self-healing verification cycle on error logs.
   */
  public runHealingCycle(
    initialErrors: string[],
    repairCallback: (errors: string[]) => Promise<{ repairedFiles: string[]; remainingErrors: string[] }>
  ): Promise<SelfHealingResult> {
    return new Promise(async (resolve) => {
      const history: HealingIteration[] = [];
      let currentErrors = [...initialErrors];

      for (let i = 1; i <= this.maxIterations; i++) {
        if (currentErrors.length === 0) {
          return resolve({
            totalIterations: i - 1,
            finalSuccess: true,
            history,
          });
        }

        const repairResult = await repairCallback(currentErrors);
        const iterationRecord: HealingIteration = {
          iteration: i,
          errorsDetected: currentErrors,
          repairsApplied: repairResult.repairedFiles,
          success: repairResult.remainingErrors.length === 0,
        };

        history.push(iterationRecord);
        currentErrors = repairResult.remainingErrors;

        if (currentErrors.length === 0) {
          return resolve({
            totalIterations: i,
            finalSuccess: true,
            history,
          });
        }
      }

      resolve({
        totalIterations: this.maxIterations,
        finalSuccess: currentErrors.length === 0,
        history,
      });
    });
  }
}
