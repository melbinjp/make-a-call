# Verification Checklist

[HIGH] This checklist should be run by the maintainer after any significant code change to ensure core functionality remains intact.

## Environment

1.  [ ] Ensure you have Python 3 installed.
2.  [ ] Clone the repository to a fresh directory.
3.  [ ] Start the local development server: `python -m http.server 8000`
4.  [ ] Open two separate browser windows (or tabs) to `http://localhost:8000`.

## Core Functionality Verification

### Test 1: Cloud-Assisted Group Call

*   **Prerequisite**: You must have a valid `config.js` file with Firebase credentials.

1.  [ ] **Window 1**: Enter the name "User A" and click "Create Group".
    *   **Assert**: The UI should switch to the call interface. The group name should be visible.
2.  [ ] **Window 1**: Copy the Group Invite URL (from the "Copy URL" button).
3.  [ ] **Window 2**: Paste the URL into the address bar and navigate.
4.  [ ] **Window 2**: Enter the name "User B". The UI should show you are in the group.
    *   **Assert**: The participant list in both windows should show "User A" and "User B".
5.  [ ] **Both Windows**: Click the "Call" button.
    *   **Assert**: The call controls (Mute, End Call, etc.) should appear. You should be able to hear audio between the two windows (if microphone is enabled).
6.  [ ] **Window 1**: Type a message in the chat box and send it.
    *   **Assert**: The message should appear in Window 2's chat box.
7.  [ ] **Window 2**: Click the "Leave" button.
    *   **Assert**: Window 2 should return to the main setup screen. Window 1 should show that "User B" has left.

### Test 2: Direct P2P Connection

1.  [ ] **Window 1**: Enter the name "User P2P A" and click "Direct Connect".
2.  [ ] **Window 1**: Copy the "Your P2P URL".
3.  [ ] **Window 2**: Enter the name "User P2P B" and click "Direct Connect".
4.  [ ] **Window 2**: Paste the URL from Window 1 into the "Connect to P2P URL" input and click "Connect".
    *   **Assert**: The application should attempt a connection. A notification indicating connection status should appear. This flow is less robust, but should not crash the app.

### Test 3: UI and State

1.  [ ] **Settings Modal**:
    *   [ ] Click the settings cog icon. The settings modal should appear.
    *   [ ] Click the "Close" button. The modal should disappear.
2.  [ ] **Name Requirement**:
    *   [ ] With an empty name field, click "Create Group" or "Join Group".
    *   **Assert**: A notification should appear prompting you to enter a name. The action should be blocked.
3.  [ ] **Invalid Group Code**:
    *   [ ] In the "Join Group" modal, enter a random, non-existent group code.
    *   **Assert**: A "Group not found" notification should appear.

## Final Checks

1.  [ ] Check the browser's developer console for any new errors or warnings during the tests.
2.  [ ] If automated tests are set up (`npx playwright test`), ensure they all pass.
