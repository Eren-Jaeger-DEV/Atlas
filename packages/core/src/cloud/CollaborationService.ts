/**
 * CollaborationService
 *
 * Manages team presence indicators, shared project bookmarks, and team activity timeline.
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
  private members: TeamMember[] = [
    { id: "1", name: "Eren Jaeger", status: "active", currentFile: "App.tsx" },
    { id: "2", name: "Armin Arlert", status: "idle", currentFile: "EventBus.ts" },
    { id: "3", name: "Mikasa Ackerman", status: "offline" },
  ];

  private activities: ActivityItem[] = [
    { id: "a1", author: "Eren Jaeger", action: "Pushed 3 commits to main", timestamp: "5 mins ago" },
    { id: "a2", author: "Armin Arlert", action: "Resolved merge conflict in EditorPane.tsx", timestamp: "20 mins ago" },
    { id: "a3", author: "Mikasa Ackerman", action: "Published extension atlas.prettier v2.4", timestamp: "1 hour ago" },
  ];

  public getTeamMembers(): TeamMember[] {
    return this.members;
  }

  public getActivityTimeline(): ActivityItem[] {
    return this.activities;
  }
}
