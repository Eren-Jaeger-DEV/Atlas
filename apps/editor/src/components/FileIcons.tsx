import { Folder, FolderOpen, FileCode, FileText, FileJson, FileType, FileImage, FileCode2, FileBox } from "lucide-react";

interface FileIconProps {
  fileName: string;
  isDirectory?: boolean;
  isOpen?: boolean;
}

export function FileIcon({ fileName, isDirectory, isOpen }: FileIconProps) {
  if (isDirectory) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", marginRight: "6px", color: "var(--text-muted)" }}>
        {isOpen ? <FolderOpen size={16} strokeWidth={2} /> : <Folder size={16} strokeWidth={2} />}
      </span>
    );
  }

  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  switch (ext) {
    case "ts":
    case "tsx":
      return <span style={{ marginRight: "6px", color: "#3178c6", display: "flex" }}><FileCode size={15} /></span>;
    case "js":
    case "jsx":
      return <span style={{ marginRight: "6px", color: "#f7df1e", display: "flex" }}><FileCode2 size={15} /></span>;
    case "json":
      return <span style={{ marginRight: "6px", color: "#f59e0b", display: "flex" }}><FileJson size={15} /></span>;
    case "md":
      return <span style={{ marginRight: "6px", color: "var(--accent, #0ea5e9)", display: "flex" }}><FileText size={15} /></span>;
    case "py":
      return <span style={{ marginRight: "6px", color: "#3b82f6", display: "flex" }}><FileCode size={15} /></span>;
    case "css":
    case "scss":
      return <span style={{ marginRight: "6px", color: "#ec4899", display: "flex" }}><FileBox size={15} /></span>;
    case "html":
      return <span style={{ marginRight: "6px", color: "#ea580c", display: "flex" }}><FileType size={15} /></span>;
    case "png":
    case "jpg":
    case "jpeg":
    case "svg":
      return <span style={{ marginRight: "6px", color: "#10b981", display: "flex" }}><FileImage size={15} /></span>;
    default:
      return <span style={{ marginRight: "6px", color: "var(--text-muted)", display: "flex" }}><FileText size={15} /></span>;
  }
}
