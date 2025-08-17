# Architecture

[HIGH] This document describes the architecture of the "make-a-call" application, based on code inspection.

## Textual Architecture Diagram

The application is a client-side, single-page application (SPA) that runs entirely in the browser. It uses Firebase as an optional backend for signaling in "Cloud Assisted" mode.

```
+-----------------------------------------------------------------+
|                           User's Browser                        |
|-----------------------------------------------------------------|
|                                                                 |
|   +--------------------------+     +-------------------------+  |
|   |       index.html         | --> |       style.css         |  |
|   | (UI Structure, Entry)    |     | (Styling)               |  |
|   +--------------------------+     +-------------------------+  |
|                                                                 |
|   +--------------------------+     +-------------------------+  |
|   |         app.js           | <-> |       config.js         |  |
|   | (Main App Logic, WebRTC) |     | (Firebase Config)       |  |
|   +--------------------------+     +-------------------------+  |
|      |          ^                                               |
|      |          | (Signaling Messages)                          |
|      v          |                                               |
|   +--------------------------+     +-------------------------+  |
|   |     WebRTC (native)      |     |  qrcode.min.js (lib)    |  |
|   | (P2P Media/Data)         |     |                         |  |
|   +--------------------------+     +-------------------------+  |
|                                                                 |
+--------------------------------|--------------------------------+
                                 |
           (Signaling, "Cloud Assisted" mode)
                                 |
+--------------------------------V--------------------------------+
|                        Firebase Realtime Database               |
+-----------------------------------------------------------------+

```

**Entry Point**: The user loads `index.html`.

**Rendering Pipeline**:
1.  `index.html` defines the static DOM structure.
2.  `style.css` provides the styling.
3.  External assets (Google Fonts, Font Awesome) are loaded from CDNs.
4.  JavaScript libraries (`firebase`, `qrcode.min.js`) are loaded.
5.  `config.js` provides Firebase credentials.
6.  `app.js` initializes the application, sets up event listeners, and handles all user interactions and application logic.
7.  UI updates are done by manipulating the DOM directly (e.g., adding/removing the `hidden` class, changing text content).

**Asset Loaders**: Assets are loaded via standard HTML tags (`<link>`, `<script>`) in `index.html`.

**UI**: The UI is contained in `index.html` and styled by `style.css`. It's not component-based.

**API**: The application uses two "APIs":
1.  **WebRTC (Browser Native):** For the core peer-to-peer audio and data channels.
2.  **Firebase Realtime Database API:** For signaling when not in "P2P Only" mode. This is used to exchange connection information between peers to establish the WebRTC connection.

## File Map

*   **Entry Point & UI**:
    *   `index.html`: The main and only HTML file, contains the entire UI structure.
    *   `style.css`: The single stylesheet for the application.
*   **Application Logic & State**:
    *   `app.js`: The core of the application. It likely handles UI events, state management, WebRTC logic, and Firebase integration. The entire application state is managed within this file.
*   **Configuration**:
    *   `config.js`: Holds the Firebase configuration. This file is essential for the "Cloud Assisted" mode to work.
*   **Service Worker**:
    *   `sw.js`: Implements the service worker for PWA features (e.g., offline caching).
    *   `manifest.json`: The PWA manifest file.
*   **Libraries (Assets)**:
    *   `assets/qrcode.min.js`: A third-party library for generating QR codes.
*   **Backend (as a service)**:
    *   `firebase-rules.json`: Security rules for the Firebase Realtime Database.
*   **Documentation**:
    *   `docs/`: Contains additional documentation.
    *   `README.md`: Project overview and setup instructions.

## Runtime Assumptions

*   **Modern Browser**: The application relies on modern web APIs like WebRTC and Service Workers. The `browserslist` in `package.json` suggests good support for recent versions of major browsers.
*   **No WebGL or WASM**: There is no indication of WebGL or WebAssembly usage. [HIGH]
*   **Firebase Backend**: For "Cloud Assisted" mode, a correctly configured Firebase project is required. [HIGH]
*   **Internet Connection**: Required for loading the application and for communication (either to Firebase or directly between peers). The service worker might provide a basic offline shell of the app.
