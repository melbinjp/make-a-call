# Required Secrets for GitHub Actions

This document lists the secrets that must be configured in the repository's settings for the application and CI/CD workflows to function correctly.

Navigate to **Settings → Secrets and variables → Actions** in the GitHub repository to add these secrets.

## Firebase Configuration

The application requires the following Firebase project configuration details to connect to the Firebase backend. These are used in `config.js` to initialize the Firebase client.

| Secret Name | Description | Example Value |
| --- | --- | --- |
| `FIREBASE_API_KEY` | The API key for your Firebase project. | `AIzaSy...` |
| `FIREBASE_AUTH_DOMAIN` | The authentication domain for your project. | `your-project.firebaseapp.com` |
| `FIREBASE_DATABASE_URL`| The URL for your Firebase Realtime Database. | `https://your-project-default-rtdb.firebaseio.com` |
| `FIREBASE_PROJECT_ID` | The unique identifier for your Firebase project. | `your-project-id` |
| `FIREBASE_STORAGE_BUCKET`| The storage bucket for your project. | `your-project.appspot.com` |
| `FIREBASE_MESSAGING_SENDER_ID` | The sender ID for Firebase Cloud Messaging. | `1234567890` |
| `FIREBASE_APP_ID` | The unique ID for your Firebase web app. | `1:12345...` |

**NOTE:** Do not commit secret values directly to the repository. These keys are intended to be public for client-side applications but should be managed as secrets for good practice and to prevent accidental exposure of a service account key if one is added in the future.
