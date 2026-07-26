# Chapter 12: Cursor's Complete aiserver.v1 Protobuf API — The Full Backend Surface

## Overview

By extracting all `aiserver.v1.*` protobuf message types from `cursor-agent-exec/dist/main.js`, we've reconstructed Cursor's **entire backend API surface**. This is the complete protocol buffer schema defining every request, response, and message type that flows between the Cursor IDE and Anysphere's servers.

---

## 1. The AgentStore — Cursor's Distributed File System

One of the most significant findings: Cursor has built a **complete distributed file system** for agent state persistence, called `AgentStore`.

### AgentStore Message Types

```
AgentStore                           — The store itself
AgentStoreEntry                      — A single entry (file or directory)
AgentStoreEntryKind                  — File kind enum
AgentStoreFileEntry                  — A file entry
AgentStoreTombstone                  — Deleted entry marker
AgentStoreMount                      — A mounted directory
AgentStoreKind                       — Store kind (local, remote, etc.)
AgentStoreSourceKind                 — Source kind
AgentStoreSourceRef                  — Reference to a source
AgentStoreDirectoryListingMode       — How to list directories
AgentStoreShareVisibility            — Share access control
AgentStoreDeleteFileEntry            — Delete operation entry
AgentStoreDeleteFileResult           — Delete operation result
AgentStoreDeleteFileStatus           — Delete status enum
AgentStoreWriteFileEntry             — Write operation entry
AgentStoreWriteInstruction           — Write instruction
AgentStoreReadInstruction            — Read instruction
AgentStoreConflictWriteInstruction   — Conflict-resolution write
```

### Multipart File Operations (for large file support)

```
AgentStoreMultipartUploadContext     — Upload session context
AgentStoreMultipartUploadedPart      — A completed part
AgentStoreMultipartUploadPartInstruction  — Upload a part
AgentStoreMultipartWriteInstruction  — Multipart write session
AgentStoreMultipartWriteResult       — Result of multipart write
AgentStoreMultipartWriteSuccess      — Success response
AgentStoreMultipartWriteAbort        — Abort instruction
AgentStoreMultipartWriteCompletion   — Completion message
AgentStoreMultipartAbortResult       — Abort result
AgentStoreMultipartAbortSuccess      — Abort success
AgentStoreMultipartOperationFailure  — Failure with code
AgentStoreMultipartOperationFailureCode  — Failure code enum
```

### File Locking

```
AgentStoreFileLockHolder             — Who holds the lock
AgentStoreLockRedirect               — Redirect to the lock holder
AcquireAgentStoreFileLockRequest     — Request to acquire a lock
AcquireAgentStoreFileLockResponse    — Response
AbortAgentStoreMultipartWritesRequest/Response — Abort all pending writes
```

**Architecture Insight**: The AgentStore is a distributed, versioned, conflict-aware file system that supports:
- Multipart uploads (for large files)
- File locking (for concurrent agent access)
- Tombstones (soft deletes with conflict resolution)
- Multiple store kinds and source types

This is how Cursor's **background agents share state** across sessions and machines.

---

## 2. Team & Organization Management API

Cursor has a full **enterprise team management** API:

```
ActiveUsers                                    — Active team users
AddGithubUsersToTeamRequest/Response          — Add GitHub users to team
AddGroupMembersRequest/Response                — Add org group members
AddOrganizationGroupMembersRequest/Response    — Add organization group members
AddOrganizationIdentityProviderDomainJoin...   — SSO domain join
AddTeamGroupMembersRequest/Response            — Add team group members
AdminDeleteNamedAgentRequest/Response          — Admin delete a named agent
AdminListTeamNamedAgentsRequest/Response       — Admin list team agents
AdminListUserPrivateWorkersRequest/Response    — Admin list private workers
AdminNamedAgent                                — An admin-managed agent
AdminNamedAgentSession                         — An agent session
AdminNotificationRequestType                   — Notification type enum
AdminRemoveRepositoryRequest/Response          — Remove a repo from team
AggregateCloudAgentRunsForDashboardRequest     — Dashboard analytics
```

### Named Agents (Custom AI Personas)

```
AdminNamedAgent                      — A team-managed named AI agent
AdminNamedAgentSession               — A session of a named agent
```

**Insight**: Cursor supports **named agents** at the team level — custom AI personas (like "Code Reviewer Bot" or "PR Agent") that can be created by team admins and shared across the organization.

---

## 3. Billing & Subscription API

```
AcceptInviteRequest/Response         — Accept team invite
ActivatePromotionRequest/Response    — Activate a promo code
ActivatePromotionResponse.ActivationType  — Type of activation
ActivationStatus                     — Subscription activation status
ActiveCreditGrant                    — Active credit grant
AcknowledgeGracePeriodDisclaimerRequest/Response  — Acknowledge grace period
```

---

## 4. Plugin System API

```
AddMcpServersFromPluginRequest/Response  — Add MCP servers from a plugin
ApprovePluginRequest/Response            — Approve a plugin for use
```

---

## 5. Trace & Analytics API

```
AgentStartupTraceEvent               — Agent startup trace
AgentStartupTraceEvent.ContextLink   — Context link in trace
AgentStartupTraceEvent.SpanEnded     — Span completed
AgentStartupTraceEvent.SpanStarted   — Span started
AgentStartupTraceEvent.TurnClose     — Turn closed
AgentStartupTraceEvent.UserAction    — User action recorded
```

---

## 6. Smart Mode — AI-Powered Shell Allowlisting

One of the most sophisticated features discovered: **Smart Mode** uses an AI classifier to make shell permission decisions:

```
SMART_MODE_CLASSIFIER_DECISION_ALLOW    — Classifier decided: allow
SMART_MODE_CLASSIFIER_DECISION_BLOCK    — Classifier decided: block
"Smart allowlist: classifier result received"
"smart_allowlist_miss"
"smartModeBlockReason"
"Smart Mode shell allowlist precheck completed"
"Smart Mode shell allowlist precheck starting"
"Smart Mode shell approval provider allowed"
"Smart Mode shell classifier blocked"
"Smart Mode shell sandbox autorun bypass"
```

**Architecture**: Instead of (or in addition to) natural language rules, Cursor has a **specialized ML classifier** that evaluates each shell command against the current project context and decides whether it's safe to run. This is a second AI system on top of the main agent.

---

## 7. Sandbox Policy Architecture

```
SandboxPolicy                        — The complete sandbox policy
SandboxPolicyMergeSources            — How policies from multiple sources merge
AutoRunSandboxingControls            — Auto-run sandboxing config
sandbox_default_network_allowlist    — Default allowed domains
sandbox_denies                       — Denied operations
sandbox_network_explicit_allowlist   — Explicit domain allowlist
sandbox_network_has_defaults         — Whether defaults are applied
sandbox_policy                       — The active policy
sandbox_policy_type                  — Policy type enum
sandboxing                           — Sandboxing namespace
sandbox.json                         — Workspace sandbox config file
```

The sandbox policy comes from multiple sources and is **merged** using `SandboxPolicyMergeSources`. This means project-level, user-level, and team-level policies can all apply simultaneously, with clear merge semantics.

---

## 8. Network Sandboxing

```
networkDefault                       — Default network policy (allow/deny)
denyDomains                          — Domains to deny
dependencyDenyDomains                — Dependency-related denied domains
allowDomains                         — Domains to allow
teamNetworkAllowlist                 — Team-level network allowlist
sandbox_network_explicit_allowlist   — Workspace-level network allowlist
```

The "dependency deny domains" is fascinating — Cursor can block the **package registry** (`npm.registry`, `pypi.org`) during agent execution to prevent supply chain attacks where agent-installed packages could exfiltrate code.

---

## 9. Block-Level Diff Patch System

```
BlockDiffPatch                       — A block-level diff patch
BlockDiffPatch.Change                — Individual change
BlockDiffPatch.ModelWindow           — The model's context window for the patch
```

This is Cursor's AI-aware diff format — instead of standard unified diffs, Cursor uses "block diffs" that include the model's context window, enabling **better conflict resolution** when multiple agents edit the same file.

---

## 10. The "UNSAFE_ALWAYS_ALLOWED" Flag

A recurring pattern in the extracted code:
```js
Bo.UNSAFE_ALWAYS_ALLOWED
// Used in:
s?.includes("UNSAFE_ALWAYS_ALLOWED")
Ws(XM, true)  // readonly = true
unwrap(t, {redactUnallowedFieldsInsteadOfThrowing: r, enforcing: s})
```

When `UNSAFE_ALWAYS_ALLOWED` is set:
- All permission checks are bypassed
- Fields that would normally be redacted are exposed raw
- The agent can read and write any file

This is the internal state for "unrestricted" approval mode — and it's clearly marked `UNSAFE_` to discourage casual use.

---

## 11. Worker System

```
AdminListUserPrivateWorkersRequest/Response — Admin view of private workers
AgentWorkspaceBinding                       — Binding between agent and workspace
AddAsyncFollowupBackgroundComposerRequest   — Add async followup to background composer
```

Cursor supports **private workers** — likely dedicated compute instances for enterprise customers running agents. Workers are managed separately from the shared infrastructure and have their own workspace bindings.
