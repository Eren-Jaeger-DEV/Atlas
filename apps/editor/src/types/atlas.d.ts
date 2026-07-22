import type { ImpactResult, GraphNode, OrchestratorEvent, RunRecord } from "@atlas/core";

export interface AtlasAPI {
  getSecureKey: (key: string) => Promise<string | null>;
  setSecureKey: (key: string, value: string) => Promise<void>;
  removeSecureKey: (key: string) => Promise<void>;

  impact: (filePath: string, symbolName?: string) => Promise<ImpactResult>;
  search: (query: string) => Promise<GraphNode[]>;

  openRepo: (repoPath: string) => Promise<void>;
  selectDirectory: () => Promise<string | null>;
  addDirectory: () => Promise<string | null>;
  addRepo: (repoPath: string) => Promise<any>;

  onFileChanged: (handler: (payload: { path: string; event: string }) => void) => () => void;
  readDir: (dirPath: string) => Promise<Array<{ name: string; path: string; isDirectory: boolean }>>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  createFile: (filePath: string, isDirectory: boolean) => Promise<void>;
  deleteFile: (filePath: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  copyFile: (srcPath: string, destPath: string) => Promise<void>;
  moveFile: (srcPath: string, destPath: string) => Promise<void>;
  getSnippets: () => Promise<Record<string, any>>;

  terminalCreate: (termId: string, cwd?: string) => Promise<void>;
  terminalGetHistory: (termId: string) => Promise<string>;
  terminalInput: (termId: string, data: string) => Promise<void>;
  terminalResize: (termId: string, cols: number, rows: number) => Promise<void>;
  onTerminalData: (handler: (data: { termId: string; data: string }) => void) => () => void;

  clipboardReadText: () => Promise<string>;
  clipboardWriteText: (text: string) => Promise<void>;

  gitStatus: (repoPath: string) => Promise<Array<{ path: string; status: string; staged: boolean }>>;
  gitStage: (repoPath: string, filePath: string) => Promise<void>;
  gitUnstage: (repoPath: string, filePath: string) => Promise<void>;
  gitCommit: (repoPath: string, message: string) => Promise<void>;
  gitDiff: (repoPath: string, filePath: string, staged: boolean) => Promise<string>;
  gitBlameContent: (repoPath: string, filePath: string, content: string) => Promise<string>;
  gitDiffContent: (repoPath: string, filePath: string, content: string) => Promise<string>;
  gitInit: (repoPath: string) => Promise<boolean>;
  gitClone: (url: string, targetPath: string) => Promise<boolean>;
  gitStashSave: (repoPath: string, message?: string) => Promise<boolean>;
  gitStashPop: (repoPath: string) => Promise<boolean>;
  gitCreateBranch: (repoPath: string, branchName: string) => Promise<boolean>;
  gitDeleteBranch: (repoPath: string, branchName: string) => Promise<boolean>;
  gitLog: (repoPath: string, limit?: number) => Promise<Array<{ hash: string; author: string; date: string; message: string }>>;
  gitBlame: (repoPath: string, filePath: string) => Promise<string>;

  run: (input: string | any[], context?: any) => Promise<any>;
  getRuns: () => Promise<any[]>;
  onEvent: (handler: (event: OrchestratorEvent) => void) => () => void;

  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
  onMenuAction: (handler: (action: string) => void) => () => void;

  getSystemUserInfo: () => Promise<{ username: string; homedir: string; platform: string; hostname: string }>;
  getGitConfig: (repoPath?: string) => Promise<{ name: string; email: string }>;
  gitStashList: (repoPath: string) => Promise<string[]>;
  scanTodos: (repoPath: string) => Promise<{ total: number }>;
  listExtensions: () => Promise<any[]>;
  installExtension: (sourcePath: string) => Promise<boolean>;
  executeExtensionCommand: (id: string, ...args: any[]) => Promise<any>;
  onExtensionRegisteredCommand: (handler: (payload: { id: string, label: string }) => void) => () => void;
  generateSbom: () => Promise<Record<string, unknown>>;
  getTasks: (repoPath: string) => Promise<Array<{ id: string; name: string; command: string; source: string }>>;

  openSettingsWindow: () => Promise<void>;
  getSettings: () => Promise<any>;
  getPaths: () => Promise<{ settingsJsonPath: string, keybindingsJsonPath: string }>;
  openFileInEditor: (filePath: string) => Promise<void>;
  checkUpdates: () => Promise<{ currentVersion: string; upToDate: boolean; message: string }>;
  getSystemDiagnostics: () => Promise<{ systemMemoryUsagePercent: number; heapUsedMB: number; cpuCount: number; uptime: number }>;

  githubDeviceLogin: (clientId: string) => Promise<any>;
  githubDevicePoll: (clientId: string, deviceCode: string) => Promise<any>;
  githubVerifyToken: (token: string) => Promise<any>;
  githubLogout: () => Promise<any>;
  githubGetStoredToken: () => Promise<string | null>;


  onOpenFileInEditor: (handler: (filePath: string) => void) => () => void;
  updateSettings: (settings: any) => Promise<void>;
  onSettingsUpdated: (handler: (settings: any) => void) => () => void;

  grantPermission: (extensionId: string, permissions: string[]) => Promise<void>;
  revokePermission: (extensionId: string) => Promise<void>;
  respondPermission: (reqId: string, granted: boolean) => Promise<void>;
  sendPlanDecision: (reqId: string, approved: boolean) => void;
  onRequestPlanApproval: (handler: (payload: { reqId: string, plan: any }) => void) => () => void;

  inlineAgentAction: (action: string, text: string) => Promise<string>;
  testProviderConnection: (providerName: string, apiKey: string, baseUrl?: string) => Promise<{ success: boolean; error?: string }>;

  getGraphData: (repoPath: string) => Promise<{ nodes: any[], edges: any[] }>;
  globalSearch: (repoPath: string, query: string, options?: any) => Promise<any[]>;
  globalReplace: (repoPath: string, query: string, replaceStr: string, options?: any) => Promise<{ filesUpdated: number, occurrences: number }>;
  formatCode: (repoPath: string, filePath: string, content: string) => Promise<string>;

  startLsp: (repoPath: string, language?: string) => Promise<string>;
  sendLspMessage: (message: string) => void;
  onLspMessage: (handler: (event: any, message: string) => void) => () => void;
  applyWorkspaceEdit: (editsByFile: Record<string, any[]>) => Promise<boolean>;

  startDap: (filePath: string, language?: string) => Promise<string>;
  sendDapMessage: (message: string) => void;
  onDapMessage: (handler: (event: any, message: string) => void) => () => void;

  scanDeps: (repoPath: string) => Promise<any>;

  emitGhostToken: (token: string, line: number) => void;
  onGhostToken: (handler: (event: any, data: { token: string; line: number }) => void) => () => void;
}
