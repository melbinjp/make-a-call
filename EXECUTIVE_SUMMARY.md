# Executive Summary

## What it is

This repository contains a peer-to-peer (P2P) voice and text communication application called "P2P Call". [HIGH] It runs entirely in a web browser and allows users to connect with each other for real-time conversations without needing to install any software. [HIGH] The application supports two main modes of connection: a "Cloud-Assisted" mode that uses Firebase to help users find each other and create groups easily using memorable codes (e.g., `happy-wolf-123`), and a "Direct Connection" mode that allows two users to connect directly using a special URL or QR code, bypassing any server. [HIGH] It also includes features like text messaging within a group, PWA support for app-like installation, and local storage of chat history. [HIGH]

## How to use it

1.  **Open the application**: Navigate to the live URL (or run it locally).
2.  **Enter your name**: A random anonymous name is provided, but you can change it.
3.  **To start a new group**: Click "Create Group". Share the invite link with others.
4.  **To join a group**: Click "Join Group" and enter the code you received.
5.  **To connect directly**: Click "Direct Connect", copy your P2P URL, and send it to your contact. They must paste it into the same "Direct Connect" modal on their end.
6.  **Once in a group**: You can send text messages immediately. To start a voice call, click the "Call" button. [HIGH]

## Top-3 Prioritized Next Steps

1.  **Secure Firebase Database (CRITICAL)**: The current Firebase security rules are wide open (`.read: true, .write: true`), allowing anyone on the internet to read, write, and delete all application data. [HIGH] This is a critical vulnerability that must be fixed immediately by implementing the stricter rules suggested in `BUGS_AND_ISSUES/1_insecure_default_firebase_rules.md`.
2.  **Add Automated Testing (HIGH)**: The project has no automated tests. This makes it risky to add new features or refactor code. [HIGH] Implementing a basic CI workflow with linting and a Playwright smoke test, as detailed in `CI_AND_TESTS.md`, would significantly improve repository health and prevent regressions.
3.  **Improve User Experience for Direct Connections (MEDIUM)**: The "Direct Connect" feature is powerful for privacy but is confusing to use. It appears to require a manual exchange of offer/answer tokens if the automatic connection fails, with no UI to support this. [MEDIUM] This flow should be streamlined or documented clearly for users. The application should also gracefully handle invalid P2P URLs instead of crashing (see `BUGS_AND_ISSUES/2_malformed_p2p_url_crashes_app.md`).

## Confidence Labels

Confidence labels per sentence are included in brackets, e.g., [HIGH], [MEDIUM], or [LOW].
*   **[HIGH]**: Claim is backed by running the code or observing the live site's behavior directly.
*   **[MEDIUM]**: Claim is based on plausible interpretation of the source code but could not be fully verified through live interaction.
*   **[LOW]**: Claim is inferred from documentation or comments and could not be verified in code or live.
