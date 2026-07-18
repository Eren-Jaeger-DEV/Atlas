# Atlas Studio Architecture RFC-011: Extension SDK & Marketplace Foundation

This RFC documents the design and implementation of **Chapter 10 (Phase 5): Extension SDK & Marketplace Foundation**, transforming Atlas Studio into an extensible platform powered by a versioned Extension SDK (`@atlas/sdk`), security permission engine (`PermissionEngine`), extension package manager (`ExtensionManager`), and in-editor Extension Gallery UI.

---

## 1. Core Architectural Principle

Every first-party subsystem (Git panel, Terminal, AI sidebar) and third-party plugin uses the exact same `@atlas/sdk` extension contracts.

```mermaid
graph TD
    SDK[@atlas/sdk Public Package] --> Manifest[manifest.json Spec & ExtensionContext]
    Manifest --> Host[ExtensionHost Runtime]
    Host --> Perms[PermissionEngine - Security Sandbox]
    Host --> Manager[ExtensionManager - Install / Uninstall / Update]
    Manager --> GalleryUI[ExtensionGallery.tsx Marketplace Panel]

    Perms --> Checks[workspace.read / workspace.write / terminal.execute / network.fetch]
```

---

## 2. Specification & Contracts

### A. Extension SDK (`packages/sdk`)
- Exposes `AtlasSDK`, `ExtensionContext`, `AtlasExtension`, `ExtensionManifest`, and `ExtensionPermission`.

### B. Security Permission Model (`PermissionEngine.ts`)
- Restricts extensions to explicitly requested permissions:
  - `workspace.read`
  - `workspace.write`
  - `terminal.execute`
  - `network.fetch`
  - `commands.execute`

### C. Extension Manager (`ExtensionManager.ts`)
- Handles `.atlasx` package registration, activation, toggling, and uninstallation.

### D. In-Editor Marketplace Gallery (`ExtensionGallery.tsx`)
- Sidebar panel for searching available extensions, inspecting permission requirements, and toggling installation.

---

## 3. Build & Test Verification

- **Unit Test Suite**: Created `packages/core/tests/sdk.test.ts` verifying permission enforcement, extension registration, and command dispatch.
- **Monorepo Tests**: 100% test suites passed across core, sdk, graph, parser, and agents.
- **Production Build**: Cleanly compiled via `pnpm build`.
