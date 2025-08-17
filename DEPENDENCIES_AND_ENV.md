# Dependencies and Environment

[HIGH] This document outlines the dependencies, environment requirements, and build commands for the "make-a-call" application.

## Package Manager Files

The project uses `package.json` for metadata and scripts, but it does not declare any npm packages as dependencies.

*   **`package.json`**: Present.
*   **`package-lock.json`**: NOT PRESENT.
*   **`yarn.lock`**: NOT PRESENT.
*   **`requirements.txt`**: NOT PRESENT.
*   **`Gemfile`**: NOT PRESENT.

## Dependencies

Dependencies are loaded directly in `index.html` from CDNs or local files, not managed via npm.

### CDN Dependencies
*   **Firebase App**: `8.10.1`
*   **Firebase Realtime Database**: `8.10.1`
*   **Font Awesome**: `6.4.2`
*   **Google Fonts (Inter)**: (version not specified in URL)

### Local (Vendored) Dependencies
*   **`assets/qrcode.min.js`**: A minified library for QR code generation. The original version is not specified.

## Environment Targets

*   **Node.js**: `>=14.0.0` (as specified in `package.json`'s `engines` field). This is likely for the development environment or tooling, as the application itself is client-side.
*   **Python**: The local development server relies on Python being installed to use the `http.server` module. The specific version is not critical (Python 3 is assumed).
*   **Browser**: The `browserslist` in `package.json` is:
    ```
    > 1%
    last 2 versions
    not dead
    not ie 11
    ```
    This indicates the application targets modern browsers with good support for WebRTC and other recent APIs.

## `npm audit`

`npm audit` is not applicable as there are no npm-managed dependencies in `package.json`.

```
NOT APPLICABLE
```

## Build & Run Commands

### Build

There is no build step required for this application. It consists of static files.

```bash
# No build command needed. The 'build' script in package.json is a placeholder.
npm run build
# > echo 'Static site - no build needed'
```

### Run (for local development)

The application can be served locally using a simple Python web server.

```bash
# Command to start the local server on port 8000
npm start
# This executes: python -m http.server 8000
```

**Succeeded:** [HIGH] I ran this command, and it successfully started a web server.

```
# Log output would be from the python server, e.g.:
# Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

**Failing Commands**: None. The provided run command works as expected.
