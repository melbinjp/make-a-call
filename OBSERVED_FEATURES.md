# Observed Features

[HIGH] This document details the features observed in the "make-a-call" application. Each feature's implementation, trigger, and behavior are described below.

---

### 1. Create a Group (Cloud-Assisted Mode)

- **Implementation Location**: `app.js`, `PhoneCall.createRoom()`

  ```javascript
  async createRoom() {
      const userName = this.elements.nameInput.value.trim();
      if (!userName || !validateInput(userName, 'text', 30)) {
          this.showNotification('Please enter a valid name (letters, numbers, spaces only)', 'error');
          return;
      }

      const groupId = this.generateMemorableRoomId();
      this.channel = groupId;
      this.userName = sanitizeInput(userName);
      this.roomName = groupId; // Set initial name

      // Write initial name to Firebase
      if (database) {
          database.ref(`channels/${this.channel}/name`).set(this.roomName);
      }

      try {
          this.setupSignaling(true); // Pass true for isNewRoom
          this.showCallInterface();
          this.updateRoomTitle();
          this.showNotification('Group created!', 'success');
      } catch (error) {
          console.error('Group creation failed:', sanitizeForLog(error.message));
          this.showNotification('Failed to create group', 'error');
      }
  }
  ```

- **How to Trigger**:
  1.  Open the application's main page (`index.html`).
  2.  Enter a name in the "Your Name" input field.
  3.  Click the "Create Group" button.
- **Observed Behavior**:
  1.  A unique, memorable room ID (e.g., `adj-noun-123`) is generated.
  2.  The UI switches from the setup screen to the main call interface.
  3.  A notification "Group created!" appears.
  4.  The group's name is displayed at the top of the call interface.
  5.  A shareable URL for the group is available to be copied.
- **Confidence**: [HIGH] (Verified in code and through live site interaction)

---

### 2. Join a Group (Cloud-Assisted Mode)

- **Implementation Location**: `app.js`, `PhoneCall.joinGroup()`

  ```javascript
  async joinGroup() {
      const roomCode = this.elements.roomCodeInput.value.trim();
      const userName = this.elements.nameInput.value.trim();

      if (!roomCode || !validateInput(roomCode, 'roomCode', 20)) {
          // ... error handling
          return;
      }
      // ...
      const groupExists = await this.checkRoomExists(roomCode);
      if (!groupExists) {
          this.showNotification('Group not found. Check the group code.', 'error');
          return;
      }

      this.channel = sanitizeInput(roomCode);
      this.userName = sanitizeInput(userName);
      this.closeModal('joinModal');

      try {
          this.setupSignaling();
          this.showCallInterface();
          this.showNotification('Joined group!', 'success');
      } catch (error) {
          // ... error handling
      }
  }
  ```

- **How to Trigger**:
  1.  Open the application's main page.
  2.  Enter a name.
  3.  Click "Join Group".
  4.  In the modal, enter a valid group code provided by another user.
  5.  Click the "Join" button in the modal.
- **Observed Behavior**:
  1.  The application checks if the group exists via Firebase.
  2.  If it exists, the UI switches to the call interface for that group.
  3.  The user is added to the participant list.
  4.  WebRTC connections are established with other participants in the group.
- **Confidence**: [HIGH] (Verified in code and through live site interaction)

---

### 3. Direct P2P Connection via URL/QR Code

- **Implementation Location**: `app.js`, `PhoneCall.generateMyP2PUrl()`, `PhoneCall.generateQRCode()`, `PhoneCall.connectViaP2PUrl()`

  ```javascript
  generateMyP2PUrl() {
      const baseUrl = window.location.origin + window.location.pathname;
      const channelId = this.channel || `p2p-${this.deviceHash}`;
      const p2pData = `${this.userName}|${this.deviceHash}|${channelId}|${this.contactId}`;
      const p2pUrl = `${baseUrl}?p=${encodeURIComponent(btoa(p2pData))}`;

      if (this.elements.myP2PUrl) {
          this.elements.myP2PUrl.value = p2pUrl;
      }
  }
  ```

- **How to Trigger**:
  - **To Share**:
    1.  Enter a name and click "Direct Connect".
    2.  Copy the "Your P2P URL" or have the other user scan the generated QR code.
  - **To Connect**:
    1.  Enter a name and click "Direct Connect".
    2.  Paste the received P2P URL into the "Connect to P2P URL" input and click "Connect", or click "Scan" to use the camera.
- **Observed Behavior**:
  1.  A special URL containing encoded connection data (username, device hash, etc.) is generated.
  2.  When another user opens this URL or pastes it, the application bypasses the Firebase signaling server.
  3.  The application attempts to establish a direct WebRTC connection. This feature appears to be less reliable than cloud-assisted mode and may be a work-in-progress.
- **Confidence**: [MEDIUM] (Verified in code, but live site interaction shows this might be complex for users to get working reliably without clear instructions on exchanging offers/answers manually if direct connection fails).

---

### 4. In-Call Text Messaging

- **Implementation Location**: `app.js`, `PhoneCall.sendMessage()`, `PhoneCall.handleP2PMessage()`

  ```javascript
  async sendMessage() {
      const message = this.elements.messageInput.value.trim();
      if (!message || /*...validation...*/) return;

      try {
          // ...
          const messageData = { /* ... */ };
          this.displayMessage(messageData);
          // ...
          const messageStr = JSON.stringify(messageData);
          this.dataChannels.forEach((channel, peerId) => {
              if (channel.readyState === 'open') {
                  channel.send(messageStr);
              }
          });
          // ...
      } catch (error) { /* ... */ }
  }
  ```

- **How to Trigger**:
  1.  Be in a group with at least one other connected participant.
  2.  Type a message in the input field at the bottom of the message list.
  3.  Click the send button or press Enter.
- **Observed Behavior**:
  1.  The message appears instantly in the sender's message list.
  2.  The message is sent to all other connected peers over a WebRTC `RTCDataChannel`.
  3.  Other participants see the message appear in their message list.
  4.  Messages are saved to encrypted local storage to persist history for the user.
- **Confidence**: [HIGH] (Verified in code and live site).

---

### 5. Progressive Web App (PWA) Installation

- **Implementation Location**: `sw.js`, `manifest.json`, `app.js` (`PhoneCall.installApp()`)

  ```javascript
  async installApp() {
      if ('serviceWorker' in navigator) {
          try {
              await navigator.serviceWorker.register('/sw.js');
          } catch (e) {}
      }

      if (window.deferredPrompt) {
          window.deferredPrompt.prompt();
          // ...
      } else {
          this.showNotification('Add to home screen from browser menu', 'info');
      }
      this.closeModal();
  }
  ```

- **How to Trigger**:
  1.  Open the settings modal.
  2.  Click the "Install App" button.
- **Observed Behavior**:
  1.  If the browser supports it and the criteria are met, a native installation prompt appears.
  2.  Accepting the prompt installs the web app to the user's home screen or desktop, allowing it to run in a standalone window.
  3.  The `sw.js` file enables basic offline functionality (showing the app shell).
- **Confidence**: [HIGH] (Standard PWA implementation pattern, verified in code).
