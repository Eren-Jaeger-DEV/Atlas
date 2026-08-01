# Chapter 71 — Automated Release Announcement Webhook Pipeline

## Overview

This chapter implements automated Discord release announcements integrated directly into GitHub Actions CI/CD workflows (`release.yml` & `notify-discord-release.yml`).

---

## 1. Features Implemented

- **`notify-discord-release.yml` Workflow**: Automatically triggers when a new release tag is published on GitHub. Sends an embed notification with `@everyone` tag to the Discord `#announcements` channel.
- **Embedded Release Payload**:
  - **Direct Download Links**: Windows (`.exe`), Linux (`.deb`), Linux (`.AppImage`), macOS (`.dmg`).
  - **Feature Highlights**: Fast IDE Core, Unprivileged AI Agent Runtime, Atlas Forge SDK, Windows High-Performance Engine.
  - **Support Channels**: Links to `#bug-reports`, `#help-and-support`, `#general-chat`, and `#plugin-showcase`.
- **`release.yml` Pipeline Integration**: Added a downstream `notify-discord` job that fires immediately after cross-platform packaging completes and release assets are attached.

---

## Files Changed

| File | Change |
|---|---|
| `.github/workflows/notify-discord-release.yml` | [NEW] Standalone release webhook automation workflow |
| `.github/workflows/release.yml` | Add downstream `notify-discord` job |
