# Chapter 4: Security Findings

## Overview
As part of our reverse engineering, we ran security scans across the compiled bundles inside Cursor to check for leaked credentials, similar to the Google API key we found in Antigravity IDE.

## Key Findings

### No Hardcoded API Keys Found
We scanned the `usr/share/cursor/resources/app/out` bundles for common secrets, including:
- Google API Keys (`AIza...`)
- OpenAI API Keys (`sk-...`)
- Generic API keys and authorization tokens

**Result:** No hardcoded API keys were found in the frontend bundles.

### Analysis
Unlike Antigravity IDE, which hardcoded a Google API key for its telemetry and feedback endpoint (`feedback-pa.googleapis.com`), Cursor appears to route its telemetry securely through its own backend APIs (e.g., `https://api3.cursor.sh/tev1/v1`), relying on standard authentication or avoiding client-side secrets altogether. 

This is a much better security practice and reinforces our takeaway from Chapter 6 of the Antigravity research: **Atlas Studio must strictly avoid hardcoding secrets in client bundles.**
