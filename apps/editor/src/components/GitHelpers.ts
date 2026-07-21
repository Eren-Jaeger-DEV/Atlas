export interface DiffGutterMarker {
  line: number;
  type: "add" | "mod" | "del";
  length?: number; // for add/mod ranges
}

export function parseUnifiedDiff(diffOutput: string): DiffGutterMarker[] {
  const markers: DiffGutterMarker[] = [];
  const lines = diffOutput.split("\n");
  
  for (const line of lines) {
    if (line.startsWith("@@ ")) {
      // @@ -orig_start,orig_len +new_start,new_len @@
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        const origStart = parseInt(match[1]!);
        const origLen = match[2] ? parseInt(match[2]) : 1;
        const newStart = parseInt(match[3]!);
        const newLen = match[4] ? parseInt(match[4]) : 1;
        
        if (newLen === 0) {
          // Deletion at newStart (the line after where it was deleted)
          // Git Unified Diff uses newStart to indicate where the deletion happened.
          // E.g. @@ -5,1 +4,0 @@ means line 5 was deleted. So in the new file, it would be between 4 and 5.
          // We mark the newStart line as having a deletion above it, but for gutter simplicity we just mark newStart or newStart+1.
          markers.push({ line: Math.max(1, newStart), type: "del" });
        } else if (origLen === 0) {
          // Addition
          markers.push({ line: newStart, type: "add", length: newLen });
        } else {
          // Modification
          markers.push({ line: newStart, type: "mod", length: newLen });
        }
      }
    }
  }
  
  return markers;
}

export interface BlameInfo {
  hash: string;
  author: string;
  date: string;
}

export function parseGitBlame(blameOutput: string): Record<number, BlameInfo> {
  const result: Record<number, BlameInfo> = {};
  
  // Format: ^hash (Author YYYY-MM-DD HH:MM:SS +TZ   lineNum) content...
  // Or: 00000000 (Not Committed Yet 2026...  lineNum) content...
  // We use a regex to capture it.
  const regex = /^\^?([0-9a-f]+)\s+\((.+?)\s+(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\s[+-]\d{4})\s+(\d+)\)/gm;
  
  let match;
  while ((match = regex.exec(blameOutput)) !== null) {
    const hash = match[1]!;
    const author = match[2]!.trim();
    const date = match[3]!;
    const lineNum = parseInt(match[4]!, 10);
    
    result[lineNum] = { hash, author, date };
  }
  
  return result;
}
