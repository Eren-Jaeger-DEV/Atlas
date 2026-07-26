/**
 * @atlas/core — ShadowWorkspace
 *
 * Background unrendered workspace engine matching Cursor (`cursor-shadow-workspace`) (Chapter 14).
 * Maintains a virtual, in-memory duplicate file tree to execute background language server passes,
 * linter checks, and AST graph index updates without locking Monaco UI models or opening tabs.
 */

export interface ShadowFile {
  path: string;
  content: string;
  version: number;
  lastModified: number;
}

export class ShadowWorkspace {
  private files: Map<string, ShadowFile> = new Map();

  /**
   * Update or insert an unrendered file into the shadow workspace memory buffer.
   */
  public updateFile(path: string, content: string): ShadowFile {
    const existing = this.files.get(path);
    const version = existing ? existing.version + 1 : 1;
    const file: ShadowFile = {
      path,
      content,
      version,
      lastModified: Date.now(),
    };
    this.files.set(path, file);
    return file;
  }

  /**
   * Retrieve a shadow file by path.
   */
  public getFile(path: string): ShadowFile | undefined {
    return this.files.get(path);
  }

  /**
   * Remove a file from the shadow workspace.
   */
  public removeFile(path: string): boolean {
    return this.files.delete(path);
  }

  /**
   * List all current shadow workspace files.
   */
  public listFiles(): ShadowFile[] {
    return Array.from(this.files.values());
  }

  /**
   * Returns total memory size of shadow workspace in bytes.
   */
  public getMemoryUsageBytes(): number {
    let size = 0;
    for (const f of this.files.values()) {
      size += f.content.length * 2; // ~2 bytes per character
    }
    return size;
  }
}
