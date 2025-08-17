# Security Analysis

[MEDIUM] This document provides a security analysis of the "make-a-call" application based on code inspection.

## Third-Party Assets & CDN Usage

The application loads several scripts and stylesheets from third-party CDNs. This practice introduces a security risk: if any of these CDNs are compromised, malicious code could be injected into the application.

*   **Google Fonts**: `https://fonts.googleapis.com` and `https://fonts.gstatic.com`
*   **Font Awesome**: `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css`
*   **Firebase SDK**: `https://www.gstatic.com/firebasejs/8.10.1/...`

**Recommendation**: Implement [Subresource Integrity (SRI)](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity). This involves adding an `integrity` attribute to the `<script>` and `<link>` tags, which contains a hash of the expected file contents. The browser will refuse to load the resource if the hash of the delivered file does not match.

Example:
```html
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"
        integrity="sha384-..."
        crossorigin="anonymous"></script>
```
The correct hash values would need to be generated for each resource.

## Potential XSS / Unsafe DOM Manipulation

The application has an `escapeHtml` function and seems to use `textContent` in many places to prevent XSS, which is good practice. However, there are places where `innerHTML` is used, which can be risky if the input is not properly sanitized.

*   **`app.js`, `displayMessage` function**:
    The code uses `textContent` for the main parts of the message, but a closer look at the `renderSanitizedText` function shows it correctly creates text nodes and anchor tags, which mitigates XSS from user-supplied message text. This is well-handled.

*   **`app.js`, `secureConfirm`, `securePrompt` functions**:
    These functions use template literals to build `innerHTML`. While the `message` is sanitized, this pattern can be fragile. If a developer were to add another variable without sanitizing it, it could introduce a vulnerability.
    ```javascript
    modal.innerHTML = `
        <div class="secure-confirm-content">
            <p>${sanitizeInput(message)}</p>
            ...
        </div>
    `;
    ```
    **Recommendation**: While currently safe, a better long-term approach is to create DOM elements programmatically (`document.createElement`) and append them, which avoids parsing HTML strings entirely.

## Input Sanitization

The application includes a `sanitizeInput` function to escape HTML characters and a `validateInput` function to test against regex patterns. This is a good security measure.

*   **`app.js`, `sanitizeInput`**:
    ```javascript
    function sanitizeInput(input) {
        if (typeof input !== 'string') return String(input);
        return input.replace(/[<>"'&]/g, (match) => {
            const map = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
            return map[match];
        });
    }
    ```
This function is used in many places before displaying user-provided content, such as user names and messages, which is excellent.

## Dependency Recommendations

The application does not use `npm` for front-end dependencies, so `npm audit` is not directly applicable. However, the CDN-hosted libraries can become outdated.

*   **Firebase SDK**: The application uses version `8.10.1`. The Firebase SDK has moved to version 9 and later, which is modular (e.g., `firebase/app`, `firebase/database`). The version 8 series is no longer the latest.
    *   **Recommendation**: [MEDIUM] Upgrade to a more recent version of the Firebase SDK (e.g., the latest v9 or a later version). The current version is several years old. An upgrade would provide access to the latest security patches and features. Note that upgrading from v8 to v9 is a significant change and would require refactoring the Firebase initialization and usage code.
    *   Current (as of late 2023) is v10+. Version 8 is from 2021.

*   **Font Awesome**: The app uses `6.4.2`. This is a relatively recent version, but it's always good practice to check for the latest version periodically.

## Firebase Security Rules

The repository contains `firebase-rules.json` and `recommended-firebase-rules.json`. The `recommended-firebase-rules.json` seems more secure.

*   **`firebase-rules.json` (current, less secure):**
    ```json
    {
      "rules": {
        ".read": true,
        ".write": true
      }
    }
    ```
    This is highly insecure as it allows anyone to read and write to the entire database.

*   **`recommended-firebase-rules.json` (better):**
    ```json
    {
      "rules": {
        "channels": {
          "$channel": {
            ".read": "auth != null",
            // ... more granular rules
          }
        }
      }
    }
    ```
    This is much better but still seems to rely on Firebase Authentication, which the app does not appear to implement (it uses names, not logins). The rules need to be carefully crafted to match the application's anonymous access model, for example by validating data structure and size, but allowing writes to specific paths. The current live deployment might be using insecure rules.

**Recommendation**: [HIGH] The maintainer must ensure that the deployed Firebase instance is NOT using the wide-open `".read": true, ".write": true` rules. The rules should be updated to be as restrictive as possible, validating writes to prevent abuse. For example, participant names should have a length limit, and users should only be able to write to their own participant object.
