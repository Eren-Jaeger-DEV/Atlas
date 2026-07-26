# Chapter 48 — Security Layer Wiring & Stub Cleanup

**Date:** 2026-07-26
**Status:** Complete

## Overview

This chapter resolves all four findings from the external security audit
(`Atlas_Studio_Security_Remote_Audit.md`). The core problem was a cluster of
well-written security classes that were exported from `@atlas/core` but never
called by the actual agent tool paths that run when an agent reads files or
executes commands.

## Section 1: Security Layer Now Connected

Three security classes were wired into the live agent execution path:

### AtlasIgnore -> fs-tools.ts

`AtlasIgnore` now gates every file operation the agent can perform.

- `readFileTool` — returns `[Access denied: '...' is protected by .atlasignore rules]`
  instead of file content when a path matches any ignore rule.
- `writeFileTool` — throws before writing if the destination path is ignored.
- `listDirectoryTool` — filters ignored entries out of the directory listing so
  the agent cannot even discover protected filenames.
- `multiReplaceFileContentTool` — blocks edits to ignored target files.
- `createAtlasIgnoreForRepo(repoRoot)` — new helper that reads `.atlasignore`
  from the repo root (if present) and returns a configured `AtlasIgnore` instance.
  Built-in rules (`.env`, `id_rsa`, `id_ed25519`, `*.pem`, `credentials`,
  `secrets.json`, `.atlas/keys`) are always active regardless.

### WorkspaceTrustPolicy -> bash-tools.ts

`WorkspaceTrustPolicy` is now checked before any command reaches `exec`.
If the workspace is not in `TRUSTED` state, `runCommandTool` returns a clear
error string before touching the permission gate or spawning any process.

### SandboxWrapper -> bash-tools.ts

`SandboxWrapper.wrapCommand()` is now called on the command string before it is
passed to `execAsync`. On macOS this prepends `sandbox-exec` with an SBPL policy
restricting writes outside the repo. On Linux it wraps with `bwrap`.
On Windows the command is unchanged (no sandbox available).

### coder.ts plumbing

`CoderContext` now carries `atlasIgnore` and `workspaceTrust`. Both are
constructed at the top of `runCoder` using `createAtlasIgnoreForRepo` and a
`WorkspaceTrustPolicy` defaulting to `TRUSTED` (preserving existing behavior for
all current callers). All tool calls in `handleCoderToolCall` thread both through.

## Section 2-4: Stub Comments

Files that claimed to do things they do not do received honest `[STUB]` doc comments:

- **RemoteAuthorityTunnel.ts** — `connect()` is marked as a stub that does not
  open any real SSH, socket, or IPC connection. The class shape is preserved for
  future real implementation.
- **ProtobufTransport.ts** — Doc comment corrected: this uses a custom 9-byte
  magic-header framing with UTF-8 JSON payloads, NOT protobuf wire format.
  The misleading reference to `aiserver.v1` and `google.protobuf` is removed.
- **McpOAuthGateway.ts** — Marked as a credential cache stub. Missing pieces
  (authorization URL construction, code exchange, token refresh, PKCE verifier)
  are explicitly documented.

## Verification

- `pnpm run typecheck` — 6/6 packages successful, 0 errors.
- `@atlas/core` rebuilt cleanly before agents typecheck (dist was stale).
