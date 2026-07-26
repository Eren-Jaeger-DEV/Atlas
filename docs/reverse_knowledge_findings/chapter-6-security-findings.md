# Chapter 6: Security and API Keys

## Overview
While searching the Antigravity IDE bundles for hardcoded secrets and credentials, we made an interesting discovery inside the main `jetskiAgent/main.js` bundled React application.

## Hardcoded API Keys
The application ships with a hardcoded Google API key embedded directly in the minified JavaScript code. 

**Code Snippet Found:**
```javascript
imn="5372208",
smn="AIzaSyCNwssj18yx5z0YgvDoBCiewnY_xSXyaWk",
xTi=`https://feedback-pa.googleapis.com/v1/feedback/products/${imn}/web:submit?key=${smn}`
```

### Analysis
- The API key (`AIzaSy...`) is used to authenticate requests to `feedback-pa.googleapis.com`.
- It is paired with a product ID (`5372208`).
- This endpoint is used by the IDE to submit bug reports, feature requests, and general feedback directly from the user's client to Google's internal feedback tracking system.
- While embedding an API key in a client-side bundle is generally considered bad practice for sensitive services, this specific key appears to be scoped strictly to the Feedback API endpoint, which is meant to accept unauthenticated telemetry/feedback from clients anyway.

## Takeaways for Atlas Studio
If we implement a feedback submission form in **Atlas Studio**, we must ensure we follow your workspace rule (#4): **Credential Security**. We should never commit or push API keys or private tokens. Instead of hardcoding keys in the frontend bundle like Antigravity did, we should route feedback submissions through our own secured backend server (`CloudSyncEngine.ts`), keeping all API keys safely stored on the server-side as environment variables.
