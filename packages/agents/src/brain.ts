import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface BrainContext {
  repoRoot: string;
}

export class BrainManager {
  private repoRoot: string;
  private brainDir: string;
  private sessionId: string;
  private sessionDir: string;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
    this.brainDir = path.join(repoRoot, ".atlas", "brain");
    this.sessionId = randomUUID();
    this.sessionDir = path.join(this.brainDir, this.sessionId);
    this.initialize();
  }

  private initialize() {
    const dirs = [
      this.brainDir,
      this.sessionDir,
      path.join(this.sessionDir, "artifacts"),
      path.join(this.sessionDir, "scratch"),
      path.join(this.sessionDir, "transcripts")
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getScratchDir(): string {
    return path.join(this.sessionDir, "scratch");
  }

  public getArtifactsDir(): string {
    return path.join(this.sessionDir, "artifacts");
  }

  public getTranscriptsDir(): string {
    return path.join(this.sessionDir, "transcripts");
  }

  public appendTranscript(event: any) {
    const transcriptFile = path.join(this.getTranscriptsDir(), "transcript.jsonl");
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...event
    }) + "\n";
    fs.appendFileSync(transcriptFile, entry, "utf-8");
  }

  public writeArtifact(filename: string, content: string) {
    const artifactPath = path.join(this.getArtifactsDir(), filename);
    fs.writeFileSync(artifactPath, content, "utf-8");
  }

  public getArtifact(filename: string): string | null {
    const artifactPath = path.join(this.getArtifactsDir(), filename);
    if (fs.existsSync(artifactPath)) {
      return fs.readFileSync(artifactPath, "utf-8");
    }
    return null;
  }

  public getSkills(): Array<{ name: string; content: string }> {
    const skillsDir = path.join(this.repoRoot, ".atlas", "skills");
    if (!fs.existsSync(skillsDir)) return [];
    
    const skills: Array<{ name: string; content: string }> = [];
    const files = fs.readdirSync(skillsDir);
    for (const file of files) {
      if (file.endsWith(".md")) {
        const content = fs.readFileSync(path.join(skillsDir, file), "utf-8");
        skills.push({ name: file.replace(".md", ""), content });
      }
    }
    return skills;
  }
}
