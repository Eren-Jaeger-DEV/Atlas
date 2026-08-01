export type HorizonStage = "discover" | "architect" | "execute" | "audit" | "completed";

export type HorizonTaskStatus = "pending" | "executing" | "verified" | "failed";

export interface HorizonTask {
  id: string;
  title: string;
  description: string;
  targetFiles: string[];
  assignedAgent: "coder" | "tester" | "reviewer";
  status: HorizonTaskStatus;
  resultSummary?: string;
  error?: string;
}

export interface HorizonWave {
  waveNumber: number;
  tasks: HorizonTask[];
  status: "pending" | "in_progress" | "completed" | "failed";
}

export interface HorizonSpec {
  id: string;
  title: string;
  description: string;
  stage: HorizonStage;
  waves: HorizonWave[];
  workspaceRoot: string;
  createdAt: string;
  updatedAt: string;
  auditPassed?: boolean;
  auditDetails?: {
    typecheckPassed: boolean;
    astCheckPassed: boolean;
    issuesFound: number;
  };
}
