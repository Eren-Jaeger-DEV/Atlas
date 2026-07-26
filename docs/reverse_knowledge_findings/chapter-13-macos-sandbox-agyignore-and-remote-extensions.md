# Chapter 13: Antigravity's macOS Kernel Sandbox — Complete Security Model

## Overview

One of the most profound technical discoveries is Antigravity's `sandbox-wrapper.sh` — a macOS kernel-level sandbox that enforces file system and network isolation for AI-generated code execution. This is a direct integration with the macOS **Sandbox** (`sandbox-exec`) system, the same technology used by App Store applications.

---

## 1. What Is It?

`sandbox-wrapper.sh` is a script that wraps any command with macOS `sandbox-exec`, which runs the command inside a kernel-enforced sandbox profile. The profile is **dynamically generated** at runtime based on:
- The workspace directory (`$WORK_DIR`)
- Whether network access is allowed (`$ALLOW_NETWORK`)
- The contents of `.gitignore` and `.agyignore` files

This is used when Antigravity's agent executes terminal commands — instead of running them with full user permissions, they run in a kernel sandbox.

---

## 2. The `.agyignore` File

A **brand-new discovery**: Antigravity ships its own ignore file format: `.agyignore`

```bash
# Process ignore files
process_ignore_file "$WORK_DIR/.gitignore" "$WORK_DIR"
process_ignore_file "$WORK_DIR/.agyignore" "$WORK_DIR"
```

`.agyignore` follows `.gitignore` syntax and is used to **deny file access** (both read and write) to the sandboxed AI agent. Users can put sensitive files/directories in `.agyignore` to prevent the AI from ever touching them, even if they're not in `.gitignore`.

---

## 3. The Complete Sandbox Security Policy

### Default Allow Rules (always granted)

```scheme
; Process execution
(allow process-exec*)

; POSIX IPC
(allow ipc-posix-shm)    ; Shared memory
(allow ipc-posix-sem)    ; Semaphores (Python multiprocessing)

; IOKit access (limited)
(allow iokit-open
  (iokit-registry-entry-class "IOSurfaceRootUserClient")
  (iokit-registry-entry-class "RootDomainUserClient")
  (iokit-user-client-class "IOSurfaceSendRight")
)
(allow iokit-get-properties)

; Safe system sockets (no network)
(allow system-socket (require-all (socket-domain AF_SYSTEM) (socket-protocol 2)))

; Distributed notifications
(allow distributed-notification-post)
```

### Apple System Services Allowed (for fonts, security, logging)

```scheme
(allow mach-lookup
  (global-name "com.apple.distributed_notifications@Uv3")
  (global-name "com.apple.FontObjectsServer")
  (global-name "com.apple.fonts")
  (global-name "com.apple.logd")
  (global-name "com.apple.lsd.mapdb")
  (global-name "com.apple.PowerManagement.control")
  (global-name "com.apple.system.logger")
  (global-name "com.apple.system.notification_center")
  (global-name "com.apple.trustd.agent")
  (global-name "com.apple.SecurityServer")
  ; ... etc.
)
```

### Sysctl Access (CPU/memory info, no secrets)

The sandbox allows reading specific hardware and kernel sysctls like `hw.ncpu`, `hw.memsize`, `kern.osversion`, etc. — exactly what a build system needs, but nothing that could leak user data.

### File Access Policy

```scheme
; Default deny all writes
(deny file-write*)

; Allow writes to workspace
(allow file-write* (subpath "$WORK_DIR"))

; Allow writes to /tmp
(allow file-write* (subpath "/tmp"))
(allow file-write* (subpath "/private/tmp"))
```

Files blocked by `.gitignore` or `.agyignore`:
```scheme
; For each ignored path:
(deny file-read* (regex "^$WORK_DIR/(.*/)?pattern$"))
(deny file-write* (regex "^$WORK_DIR/(.*/)?pattern$"))
```

### Network Access Control

```scheme
; When ALLOW_NETWORK=false (default):
(deny network*)
```

Network access is **denied by default**. The agent must explicitly request network access via the `--allow-network` flag.

---

## 4. The `.gitignore` → Sandbox Rule Conversion Pipeline

The most technically sophisticated part: Antigravity converts `.gitignore`/`.agyignore` glob patterns into macOS Sandbox regex rules:

```bash
sed -E \
  -e '/^[[:space:]]*#/d' \            # Remove comments
  -e '/^[[:space:]]*$/d' \            # Remove blank lines
  -e '/^!/d' \                        # Remove negation patterns (not supported)
  -e 's/^[[:space:]]+//; s/[[:space:]]+$//' \  # Trim whitespace
  -e '/\/$/d' \                       # Skip directory-only patterns (known limitation)
  -e 's/\./\\./g' \                   # Escape . → \.
  -e 's/\+/\\+/g' \                   # Escape +
  -e 's/\(/\\(/g' \                   # Escape (
  -e 's/\)/\\)/g' \                   # Escape )
  -e 's/\{/\\{/g; s/\}/\\}/g' \      # Escape { }
  -e 's/\|/\\|/g' \                   # Escape |
  -e 's/\^/\\^/g; s/\$/\\$/g' \      # Escape ^ $
  -e 's|\*\*/|__GLOBSTAR_SLASH__|g' \ # Save **/ as placeholder
  -e 's/\*\*/__GLOBSTAR__/g' \        # Save ** as placeholder
  -e 's|*|[^/]*|g' \                  # * → [^/]* (no path separator)
  -e 's|?|[^/]|g' \                   # ? → single char
  -e 's|__GLOBSTAR_SLASH__|(.*/)?|g' \# Restore **/ → (.*/)?
  -e 's/__GLOBSTAR__/.*/g'            # Restore ** → .*
```

**Known Limitation** (commented in code): Directory-only patterns (ending in `/`) are skipped. This is an acknowledged gap.

---

## 5. User-Facing Sandbox Error Handling

When the sandboxed command fails due to sandbox restrictions:

```bash
if [ $EXIT_CODE -ne 0 ] && grep -q "Operation not permitted" "$TEMP_STDERR"; then
  echo "Your command might have failed due to sandbox restrictions. See \
    https://antigravity.google/docs/sandbox-mode for more details. \
    You can disable sandbox permanently in settings, or for a single run \
    by checking the 'No Sandbox' box on the next terminal command."
fi
```

The user sees a friendly message with:
- A link to documentation
- The option to **permanently disable** sandbox in settings
- The option to **temporarily disable** for a single command via a UI checkbox

---

## 6. The Language Server Binary

```
/home/victor/Downloads/Antigravity IDE/resources/app/extensions/antigravity/dist/languageServer/
└── language_server_linux_x64  (binary)
```

The Antigravity extension ships a **native binary** language server (`language_server_linux_x64`). This is distinct from VS Code's LSP clients — it's Antigravity's own AI inference server that runs locally, likely the same "Jetski" language server that handles:
- Inline completions (Supercomplete)
- Code context building
- Local inference (when using Gemini locally)

---

## 7. Remote Extensions — Cloudtop Integration

The `antigravity-remote-openssh` extension includes a remarkable command:

```
antigravity-remote-openssh.addCloudtopUrl - Add Cloudtop URL
```

**Cloudtop** is Google's internal cloud development environment (a managed VM that developers SSH into). This command lets users add their Cloudtop instance as an SSH remote directly in Antigravity IDE, creating a **seamless bridge between local Antigravity and Google's internal cloud VMs**.

This is an exclusive feature for Google employees — the command exists in the public release but is only useful to those with Cloudtop access.

---

## 8. The Code Executor Extension

`antigravity-code-executor` exposes a single command:
```
antigravity-code-executor.executeCode — Execute Code (Antigravity)
```

This extension **executes AI-generated code** directly from the Cascade chat panel. It likely:
1. Receives code generated by Cascade
2. Writes it to a temporary file
3. Executes it via the sandbox-wrapper
4. Returns the output to the Cascade panel

This is the "run this code" button in Antigravity's chat interface.

---

## 9. Dev Container Support

`antigravity-dev-containers` (version 0.0.1) provides full devcontainer support:

```
antigravity-dev-containers.reopenInContainer    — Reopen in Container
antigravity-dev-containers.showLog             — Show Dev Containers Log
antigravity-dev-containers.openInContainer     — Open Folder in Container
antigravity-dev-containers.reopenFolderLocally — Reopen Folder Locally
antigravity-dev-containers.attachToRunningContainer — Attach to Running Container
```

Uses `resolvers` and `contribViewsRemote` API proposals, enabling the Remote Explorer to show dev containers alongside SSH and WSL remotes.
