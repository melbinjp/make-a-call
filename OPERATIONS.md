# Operations Runbook

This document provides instructions for operating and maintaining the `make-a-call` application.

## Verification Checks

The full verification matrix can be run locally. See `CONTRIBUTING.md` for detailed instructions. The primary checks are:

-   **Code Formatting:** `npm run format -- --check`
-   **Linting:** `npm run lint` (Currently non-functional)
-   **Smoke Tests:** `npm test` (Currently non-functional)

The CI pipeline in `.github/workflows/ci.yml` automates these checks on every push and pull request to the `main` branch.

## Deployment

This is a static web application served via GitHub Pages.

### Automatic Deployment (via GitHub Actions)

The repository is configured for Continuous Deployment. Any commit merged into the `main` branch will trigger the `CI` workflow. If all checks pass, a future enhancement should be to add a deploy job that automatically pushes the build artifact to the `gh-pages` branch.

### Manual Deployment

1.  Ensure all files in the root directory are up-to-date and have been tested.
2.  Push the contents of the repository's `main` branch to the `gh-pages` branch of the repository.
    ```bash
    # From the main branch
    git push origin main:gh-pages
    ```
3.  Verify the deployment by visiting the GitHub Pages URL: [https://call.wecanuseai.com](https://call.wecanuseai.com).

### Critical: Deploying Firebase Rules

The Firebase Realtime Database rules are defined in `firebase-rules.json`. These rules are **not** automatically deployed. They must be deployed manually from the Firebase Console.

1.  Go to your Firebase project console.
2.  Navigate to **Build > Realtime Database**.
3.  Select the **Rules** tab.
4.  Copy the contents of `firebase-rules.json` from the repository.
5.  Paste the contents into the rules editor in the Firebase console.
6.  Click **Publish**.

## Rollback Plan

### Application Rollback

To roll back the application to a previous state, revert the commit that introduced the breaking change.

1.  Identify the last known-good commit hash from the `git log`.
2.  Perform a `git revert` to create a new commit that undoes the changes.
    ```bash
    # Example: Revert the most recent commit
    git revert HEAD --no-edit
    ```
3.  Push the revert commit to the `main` branch.
    ```bash
    git push origin main
    ```
    This will trigger the deployment workflow and redeploy the previous version.

### Firebase Rules Rollback

If the new Firebase rules cause issues, they can be rolled back from the Firebase Console's rule editor, which maintains a version history.

1.  In the Firebase Console **Rules** tab, click the **History** button (clock icon).
2.  Select a previous, known-good version of the rules.
3.  Click **Apply** to restore the selected version.
