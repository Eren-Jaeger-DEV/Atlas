# Chapter 11: Product Configuration, Design System & Exclusive Theme Library

## Overview

Antigravity IDE's configuration files reveal a deeply integrated **Google ecosystem**, a mature design system with CSS variables bridging VS Code and Tailwind, and a unique set of bundled themes that give it a distinctly modern aesthetic.

---

## 1. Product Identity & Google Integration

From `product.json`:
- **Application Name**: `antigravity-ide` (URL protocol: `antigravity-ide://`)
- **Alias**: `agy-ide`
- **Data Folder**: `.antigravity-ide`
- **Version**: `2.1.1`
- **Bundle Identifier** (macOS): `com.google.antigravity-ide`
- **Win32 App User Model ID**: `Google.AntigravityIDE`
- **Crash Reporter Company**: `Google`
- **isGoogleInternal**: `false` (this is the **external** public release)

**Key Internal URLs**:
- Docs: `https://antigravity.google/docs`
- Rules Docs: `https://antigravity.google/docs/rules`
- MCP Docs: `https://antigravity.google/docs/mcp`
- Browser Tool Docs: `https://antigravity.google/docs/browser`
- Pricing: `https://one.google.com/ai?utm_source=antigravity&utm_medium=web&utm_campaign=argon_limit_upsell`

**Insight**: The pricing page redirects to `one.google.com/ai` with a UTM campaign named `argon_limit_upsell`. **"Argon"** is the internal codename for the usage limit enforcement system. This confirms Antigravity is monetized through Google One subscriptions.

---

## 2. Extension Marketplace Strategy

Unlike Cursor (which has a private marketplace), Antigravity uses **Open VSX**:
- **Gallery Service**: `https://open-vsx.org/vscode/gallery`
- **Item URL**: `https://open-vsx.org/vscode/item`

This is the open-source, community-operated registry used by VSCodium and other VS Code forks that cannot access Microsoft's proprietary marketplace. **This means Antigravity cannot access Microsoft's exclusive extensions** but is fully compatible with the entire Open VSX catalog.

---

## 3. Antigravity Core Extension: Commands & Architecture

From `extensions/antigravity/package.json`, the core extension exposes a revealing set of commands:

### Import Commands (Competitor Intelligence)
- `antigravity.importVSCodeSettings` — import from VS Code
- `antigravity.importVSCodeExtensions`
- `antigravity.importCursorSettings` — import from **Cursor**
- `antigravity.importCursorExtensions`
- `antigravity.importWindsurfSettings` — import from **Windsurf**
- `antigravity.importWindsurfExtensions`
- `antigravity.importCiderSettings` — import from **Cider** (Google's internal IDE)

**Insight**: Antigravity explicitly knows about and supports importing from every major AI IDE competitor. The `importCiderSettings` command, available only to `antigravity.isGoogleInternal` users, confirms there is a separate internal Google build.

### Custom Editors (Flagship UI Components)
The extension registers two completely custom editors:
1. **Workflow Editor** (`antigravity.workflowEditor`) — renders `.md` files in `.agents/workflows/` directories as a rich workflow editor, not a plain text markdown editor.
2. **Rule Editor** (`antigravity.ruleEditor`) — renders `.md` files in `.agents/rules/` directories as a rich rule editor.

Both editors match files in `.agent/`, `_agent/`, `.agents/`, `_agents/` directories AND in `.gemini/jetski*/global_workflows/` — confirming the **Jetski agent** is the underlying runtime.

### Proprietary API Proposals
- `antigravityUnifiedStateSync` — a custom API for syncing state across all IDE panels
- `contribSourceControlInputBoxMenu` — integrates into the SCM commit message box
- `inlineCompletionsAdditions` — extends inline completions (used for supercomplete)

### Keybindings (Hunk Navigation)
Antigravity implements a custom diff-hunk navigation system for agent edits:
- `alt+j` — Focus next hunk
- `alt+k` — Focus previous hunk
- `alt+enter` — Accept focused hunk
- `alt+shift+backspace` — Reject focused hunk
- `alt+\` — Trigger inline suggestion manually

---

## 4. The Tailwind Design System (Extracted)

The `tailwind.config.js` is the complete specification of Antigravity's agent UI design system. This is the highest-fidelity data available outside the source code.

### Brand Color Palette

| Color | Hex | Usage |
|---|---|---|
| Brand Dark (DEFAULT) | `#09b6a2` | Primary teal accent |
| Brand Light (DEFAULT) | `#71E9D8` | Lighter teal variant |
| Surface Default | `#1d1f21` | Dark panel surfaces |
| Editor Content | `#2B2C2E` | Main editor area |
| Editor Background | `#3A3A3B` | Secondary editor surfaces |

### Custom Font Stack
- **Default Font**: `var(--default-font)` → system sans-serif stack
- **Heading Font**: `var(--header-font)` → custom heading font (injected from IDE)
- **Mono Font**: `SF Mono`, Monaco, Menlo, Courier (Apple-first priority)

### Custom Screen Breakpoints
Antigravity adds three custom "workspace" breakpoints for the panel-first agent UI:
- `ws-xs`: `16rem` — very narrow panels
- `ws-sm`: `22rem` — small panels
- `ws-md`: `30rem` — medium panels

### IDE CSS Variable Bridge
The most critical insight is the **bridge between Tailwind and VS Code's CSS variable system**. Antigravity maps VS Code theme variables to Tailwind color classes via `--codeium-*` CSS variables:

| Tailwind Class | CSS Variable | Maps To |
|---|---|---|
| `ide-chat-background` | `var(--codeium-chat-background)` | Active theme chat bg |
| `ide-editor-background` | `var(--codeium-editor-background)` | Active theme editor bg |
| `ide-button-background` | `var(--codeium-button-background)` | Active theme button |
| `foreground` | `var(--vscode-foreground)` | VS Code foreground |
| `card` | `var(--vscode-editorWidget-background)` | Widget background |

This bridge is how Antigravity's Tailwind-styled AI panels **automatically recolor when the user changes their IDE theme**. The `--codeium-*` namespace confirms this design system was originally built for (or inherited from) **Codeium**, the predecessor product, and has since been maintained for Antigravity.

### Custom Animations
```js
animation: {
  blink: '1s pulse infinite',  // Used for "thinking" indicators
}
```

---

## 5. MCP Config Schema (Antigravity-Specific Extensions)

Antigravity extends the standard MCP config with unique features:

```json
{
  "authProviderType": "google_credentials",  // Google OAuth integration
  "oauth": {
    "clientId": "...",
    "clientSecret": "..."
  },
  "tools": {
    "toolName": {
      "background": "off | always",   // Background execution mode
      "eager": true                   // Eager vs. lazy tool loading
    }
  }
}
```

**Unique to Antigravity**:
- `authProviderType: "google_credentials"` — MCP servers can authenticate using **Google Cloud credentials** (service accounts, ADC). No other IDE has this.
- `background: "always"` — Tools can be flagged to always run in background, enabling true async tool execution.
- `eager: true` — Tools can be flagged for eager loading (pre-loaded at startup) vs. lazy loading (on first use).

---

## 6. Auth Success Page Design

The `auth-success-jetski.html` page (shown after OAuth login) reveals:
- **Primary Brand Color**: `#9178b4` (soft purple — distinct from the teal brand for non-auth flows)
- **Logo**: `astro.png` (the Astro/robot mascot)
- **Redirect Message**: "Sign in successful. Redirecting to Jetski..."

This confirms the agent runtime is publicly branded as **"Jetski"** in user-facing flows, even in the public release.

---

## 7. Exclusive Theme Library

Antigravity ships **3 exclusive themes** not available in VS Code or Cursor:

### SynthWave 84
- Background: `#262335`
- Sidebar: `#241b2f`
- Accent: `#f97e72` (coral/salmon)
- Neon Colors: `#ff7edb` (magenta), `#72f1b8` (mint), `#36f9f6` (cyan), `#fede5d` (yellow)
- Perfect neon-on-dark cyberpunk aesthetic

### Tokyo Night (3 variants)
- `tokyo-night-color-theme.json`
- `tokyo-night-storm-color-theme.json`
- `tokyo-night-light-color-theme.json`

### Symbols (Icon Theme)
A custom **file icon theme** with unique symbols, including a `sync.py` script to pull from the upstream open-source repository.

These are **premium, bundled themes** that give Antigravity a more curated and modern out-of-box visual experience compared to VS Code and Cursor.
