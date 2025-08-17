# Bug: Malformed P2P URL Can Crash the Application Tab

*   **Severity**: MEDIUM
*   **Reproduction**:
    1.  Open the application.
    2.  In the browser's address bar, append `?p=not-valid-base64` to the URL and press Enter.
    3.  Alternatively, click "Direct Connect", paste `?p=not-valid-base64` into the "Connect to P2P URL" input, and click "Connect".
    4.  Observe the browser console. An `InvalidCharacterError` (or similar) will be thrown because `atob()` cannot decode the string.

*   **Expected vs. Actual**:
    *   **Expected**: The application should handle the error gracefully, show a user-friendly notification like "Invalid P2P URL", and continue to function normally.
    *   **Actual**: An uncaught exception is thrown from within the `processP2PUrl` function (which is called by `checkUrlParams` on page load). This can leave the application in an inconsistent state or cause it to become unresponsive.

*   **Root-Cause**: The `processP2PUrl` and `checkUrlParams` functions do not wrap the decoding and processing of the `p` URL parameter in a `try...catch` block. The call to `atob()` is unsafe if the input is not valid Base64.

    **File**: `app.js`
    **Function**: `checkUrlParams()`
    ```javascript
    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        // ...
        const p2pData = urlParams.get('p');

        if (p2pData) {
            // This block is missing a try...catch
            const decoded = atob(decodeURIComponent(p2pData)); // This line throws the error
            const parts = decoded.split('|');
            // ...
        }
        // ...
    }
    ```

*   **Suggested Patch**:
    Wrap the P2P data processing logic in a `try...catch` block.

    ```diff
    --- a/app.js
    +++ b/app.js
    @@ -1071,17 +1071,17 @@
         const p2pData = urlParams.get('p');

         // Handle serverless P2P connection
-        if (p2pData) {
-            try {
-                const decoded = atob(decodeURIComponent(p2pData));
-                const parts = decoded.split('|');
-                const [userName, deviceHash, channelId, contactId] = parts;
-
-                // Direct serverless connection
-                this.userName = userName + ' (Direct)';
-                this.channel = channelId;
-
-                this.showNotification('Direct connection request received!', 'success');
-                this.showAnswerDialog(contactId);
-                return;
-            } catch (e) {
-                console.warn('Invalid P2P data:', e);
-            }
+        if (p2pData) {
+            try {
+                const decoded = atob(decodeURIComponent(p2pData));
+                const parts = decoded.split('|');
+                if (parts.length < 4) {
+                    throw new Error('Invalid P2P data structure');
+                }
+                const [userName, deviceHash, channelId, contactId] = parts;
+                this.processP2PUrl(urlParams.toString()); // Or call the logic directly
+            } catch (e) {
+                console.error("P2P URL processing error on load:", e);
+                this.showNotification('Invalid P2P link. It might be malformed or expired.', 'error');
+            }
+            return; // Stop further processing
         }

         // Check for previous session (with fallback)

    ```
    A similar `try...catch` should be added to the `connectViaP2PUrl` and `processP2PUrl` functions.

*   **Tests to Add**: A Playwright test could be added to navigate to a URL with a malformed `p` parameter and assert that no console errors are thrown and a specific notification is shown.
*   **Confidence**: [HIGH]
