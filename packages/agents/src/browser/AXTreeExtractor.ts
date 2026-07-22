/**
 * @atlas/agents — AXTreeExtractor
 *
 * Extracts lightweight accessibility (a11y) tree representations from raw DOM structures,
 * assigning clean integer IDs and bounding coordinates for AI model perception.
 */

export interface AXNode {
  id: number;
  role: string;
  name: string;
  value?: string;
  description?: string;
  bounds?: { x: number; y: number; width: number; height: number };
  disabled?: boolean;
  focused?: boolean;
  children?: AXNode[];
}

export interface AXTreeSummary {
  nodes: AXNode[];
  interactiveElements: Array<{ id: number; role: string; name: string; bounds?: AXNode["bounds"] }>;
  formattedTreeText: string;
}

export class AXTreeExtractor {
  private nextId = 1;

  public extractFromRawNodes(rawNodes: any[]): AXTreeSummary {
    this.nextId = 1;
    const interactiveElements: AXTreeSummary["interactiveElements"] = [];

    const processNode = (raw: any): AXNode => {
      const id = this.nextId++;
      const role = raw.role || raw.tagName?.toLowerCase() || "element";
      const name = raw.name || raw.ariaLabel || raw.innerText?.slice(0, 50) || raw.placeholder || "";
      const value = raw.value;
      const bounds = raw.bounds;
      const disabled = Boolean(raw.disabled);
      const focused = Boolean(raw.focused);

      const isInteractive =
        ["button", "input", "a", "select", "textarea", "combobox", "checkbox", "radio", "link"].includes(role.toLowerCase()) ||
        raw.isClickable;

      if (isInteractive && name) {
        interactiveElements.push({ id, role, name, bounds });
      }

      const children: AXNode[] = [];
      if (Array.isArray(raw.children)) {
        for (const child of raw.children) {
          children.push(processNode(child));
        }
      }

      return {
        id,
        role,
        name,
        value,
        bounds,
        disabled,
        focused,
        children: children.length > 0 ? children : undefined,
      };
    };

    const rootNodes = rawNodes.map(processNode);
    const formattedTreeText = this.formatTreeText(rootNodes);

    return {
      nodes: rootNodes,
      interactiveElements,
      formattedTreeText,
    };
  }

  public formatTreeText(nodes: AXNode[], depth = 0): string {
    let lines: string[] = [];
    const indent = "  ".repeat(depth);

    for (const node of nodes) {
      const valStr = node.value ? ` value="${node.value}"` : "";
      const disStr = node.disabled ? " [disabled]" : "";
      const focStr = node.focused ? " [focused]" : "";
      lines.push(`${indent}[${node.id}] ${node.role} "${node.name}"${valStr}${disStr}${focStr}`);

      if (node.children) {
        lines.push(this.formatTreeText(node.children, depth + 1));
      }
    }

    return lines.join("\n");
  }
}
