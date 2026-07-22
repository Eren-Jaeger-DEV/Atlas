import { TaskNode, TaskType, TaskStatus } from "@atlas/core";

export class TaskDAG {
  private nodes: Map<string, TaskNode> = new Map();
  private adjList: Map<string, string[]> = new Map(); // dependent -> dependencies
  private revAdjList: Map<string, string[]> = new Map(); // dependency -> dependents

  constructor() {}

  /**
   * Adds a new task to the DAG.
   */
  addTask(node: TaskNode) {
    if (this.nodes.has(node.id)) {
      throw new Error(`Task ${node.id} already exists`);
    }
    this.nodes.set(node.id, node);
    this.adjList.set(node.id, [...node.dependencies]);
    
    if (!this.revAdjList.has(node.id)) {
      this.revAdjList.set(node.id, []);
    }

    for (const dep of node.dependencies) {
      if (!this.nodes.has(dep)) {
        throw new Error(`Dependency ${dep} does not exist`);
      }
      if (!this.revAdjList.has(dep)) {
        this.revAdjList.set(dep, []);
      }
      this.revAdjList.get(dep)!.push(node.id);
    }
  }

  /**
   * Updates a task status and returns newly available tasks if completed.
   */
  updateTaskStatus(id: string, status: TaskStatus, result?: any, error?: string): TaskNode[] {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Task ${id} not found`);

    node.status = status;
    if (result !== undefined) node.result = result;
    if (error !== undefined) node.error = error;

    if (status === "COMPLETED") {
      return this.getReadyTasks();
    }

    return [];
  }

  /**
   * Get all tasks that have no pending dependencies and are PENDING.
   */
  getReadyTasks(): TaskNode[] {
    const ready: TaskNode[] = [];
    for (const [id, node] of this.nodes.entries()) {
      if (node.status === "PENDING") {
        let allDepsMet = true;
        for (const dep of this.adjList.get(id) || []) {
          const depNode = this.nodes.get(dep);
          if (depNode?.status !== "COMPLETED") {
            allDepsMet = false;
            break;
          }
        }
        if (allDepsMet) {
          ready.push(node);
        }
      }
    }
    return ready;
  }

  getTask(id: string): TaskNode | undefined {
    return this.nodes.get(id);
  }

  getAllTasks(): TaskNode[] {
    return Array.from(this.nodes.values());
  }

  hasFailedTasks(): boolean {
    return Array.from(this.nodes.values()).some(n => n.status === "FAILED");
  }

  isComplete(): boolean {
    return Array.from(this.nodes.values()).every(n => n.status === "COMPLETED");
  }
}
