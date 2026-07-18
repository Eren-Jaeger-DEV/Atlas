/**
 * CollaborationService
 *
 * Manages team presence indicators and dynamic activity log from real workspace git history.
 */

export interface TeamMember {
  id: string;
  name: string;
  status: "active" | "idle" | "offline";
  currentFile?: string;
}

export interface ActivityItem {
  id: string;
  author: string;
  action: string;
  timestamp: string;
}

export class CollaborationService {
  private members: TeamMember[] = [];
  private activities: ActivityItem[] = [];

  public setTeamMembers(members: TeamMember[]): void {
    this.members = members;
  }

  public getTeamMembers(): TeamMember[] {
    return this.members;
  }

  public setActivitiesFromGitLog(commits: Array<{ author: string; message: string; date: string }>): void {
    this.activities = commits.map((c, idx) => ({
      id: `act_${idx}`,
      author: c.author || "Developer",
      action: c.message,
      timestamp: c.date,
    }));
  }

  public getActivityTimeline(): ActivityItem[] {
    return this.activities;
  }
}
