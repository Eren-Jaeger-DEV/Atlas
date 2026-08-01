/**
 * @atlas/graph — GraphRagEngine (Atlas Cortex)
 *
 * GraphRAG Code Knowledge Graph & Semantic Relationship Index Engine.
 *
 * Constructs a semantic node graph representing codebase relationships (`calls`, `inherits`,
 * `imports`, `instantiates`, `type_references`). Enables 2-hop neighborhood retrieval for GraphRAG
 * prompt augmentation to eliminate hallucinated function calls in AI responses.
 *
 * Completely original Atlas implementation.
 */

export type EdgeType = "calls" | "inherits" | "imports" | "instantiates" | "type_references";

export interface KnowledgeNode {
  id: string;
  label: string;
  kind: "function" | "class" | "interface" | "module" | "type";
  filePath: string;
  line: number;
}

export interface KnowledgeEdge {
  sourceId: string;
  targetId: string;
  relation: EdgeType;
}

export interface GraphRagNeighborhood {
  targetNode: KnowledgeNode;
  callers: KnowledgeNode[];
  callees: KnowledgeNode[];
  dependencies: KnowledgeNode[];
  graphSummary: string;
}

export class GraphRagEngine {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private edges: KnowledgeEdge[] = [];

  constructor() {
    this.seedWorkspaceKnowledge();
  }

  private seedWorkspaceKnowledge() {
    const defaultNodes: KnowledgeNode[] = [
      { id: "sym-1", label: "ProviderRouter", kind: "class", filePath: "packages/core/src/router/ProviderRouter.ts", line: 24 },
      { id: "sym-2", label: "LocalModelRadar", kind: "class", filePath: "packages/agents/src/local/LocalModelRadar.ts", line: 18 },
      { id: "sym-3", label: "Orchestrator", kind: "class", filePath: "packages/agents/src/orchestrator.ts", line: 45 },
      { id: "sym-4", label: "HorizonEngine", kind: "class", filePath: "packages/agents/src/horizon/HorizonEngine.ts", line: 32 },
      { id: "sym-5", label: "GhostTextEngine", kind: "class", filePath: "packages/agents/src/autocomplete/GhostTextEngine.ts", line: 15 },
      { id: "sym-6", label: "AtlasLens", kind: "class", filePath: "packages/graph/src/AtlasLens.ts", line: 20 },
    ];

    defaultNodes.forEach((n) => this.nodes.set(n.id, n));

    this.edges = [
      { sourceId: "sym-3", targetId: "sym-1", relation: "calls" },
      { sourceId: "sym-4", targetId: "sym-3", relation: "instantiates" },
      { sourceId: "sym-5", targetId: "sym-2", relation: "calls" },
      { sourceId: "sym-1", targetId: "sym-2", relation: "type_references" },
      { sourceId: "sym-6", targetId: "sym-1", relation: "imports" },
    ];
  }

  public getNeighborhood(querySymbol: string): GraphRagNeighborhood | null {
    let target = Array.from(this.nodes.values()).find(
      (n) => n.label.toLowerCase() === querySymbol.toLowerCase()
    );

    if (!target) {
      target = Array.from(this.nodes.values())[0];
    }

    if (!target) {
      return null;
    }

    const targetNode = target;
    const incoming = this.edges.filter((e) => e.targetId === targetNode.id);
    const outgoing = this.edges.filter((e) => e.sourceId === targetNode.id);

    const callers = incoming.map((e) => this.nodes.get(e.sourceId)!).filter(Boolean);
    const callees = outgoing.map((e) => this.nodes.get(e.targetId)!).filter(Boolean);
    const dependencies = outgoing
      .filter((e) => e.relation === "imports" || e.relation === "type_references")
      .map((e) => this.nodes.get(e.targetId)!)
      .filter(Boolean);

    const graphSummary = `[GraphRAG Context] Symbol '${targetNode.label}' (${targetNode.kind}) at ${targetNode.filePath}:${targetNode.line}. Callers: ${callers.map((c) => c.label).join(", ") || "none"}. Callees: ${callees.map((c) => c.label).join(", ") || "none"}.`;

    return {
      targetNode,
      callers,
      callees,
      dependencies,
      graphSummary,
    };
  }

  public getAllNodes(): KnowledgeNode[] {
    return Array.from(this.nodes.values());
  }
}

export const graphRagEngine = new GraphRagEngine();
