# CI and Tests

[MEDIUM] This document provides suggestions for setting up Continuous Integration (CI) and automated testing for the "make-a-call" application.

## Suggested GitHub Actions Workflow

The project currently has no CI process. A simple GitHub Actions workflow can be added to ensure code quality and catch basic errors before deployment. Since there are no dependencies to install or build steps to run, the CI can focus on linting and running a smoke test.

Here is a suggested workflow snippet to be placed in `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18' # Or the version you prefer

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Start local server
        run: python -m http.server 8000 &

      - name: Run Playwright tests
        run: npx playwright test

      # Optional: Add a linter step
      # - name: Install ESLint
      #   run: npm install eslint
      # - name: Run ESLint
      #   run: npx eslint ./**/*.js
```

To use this, you would need to add Playwright as a dev dependency: `npm install --save-dev @playwright/test`.

## Minimal Automated Smoke Test (Playwright)

An end-to-end smoke test can verify that the application loads and the main UI is functional. This helps prevent regressions.

Here is a sample Playwright script. This file should be created as `tests/smoke.spec.js`:

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Smoke Test', () => {
  const pageUrl = 'http://localhost:8000';
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Collect console errors
    consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test('should load the page without console errors', async ({ page }) => {
    await page.goto(pageUrl);

    // Check that there are no console errors on load
    expect(consoleErrors).toEqual([]);
  });

  test('should display the main call setup interface', async ({ page }) => {
    await page.goto(pageUrl);

    // Check for the main title
    await expect(page.locator('h1')).toContainText('P2P Call');

    // Check for the name input field
    await expect(page.locator('#nameInput')).toBeVisible();
    await expect(page.locator('label[for="nameInput"]')).toContainText('Your Name');

    // Check for the main action buttons
    await expect(page.locator('#createRoomBtn')).toBeVisible();
    await expect(page.locator('#joinRoomBtn')).toBeVisible();
    await expect(page.locator('#p2pConnectBtn')).toBeVisible();

    // Check for the settings button
    await expect(page.locator('#settingsBtn')).toBeVisible();
  });

  test('should be able to open and close the join group modal', async ({ page }) => {
    await page.goto(pageUrl);

    // Name is required to open modal
    await page.locator('#nameInput').fill('Test User');

    // Click to open the modal
    await page.locator('#joinRoomBtn').click();

    // Check that the modal is visible
    await expect(page.locator('#joinModal')).toBeVisible();
    await expect(page.locator('#joinModal h3')).toContainText('Join Group');

    // Click cancel to close the modal
    await page.locator('#joinModal .btn-secondary').click();

    // Check that the modal is hidden
    await expect(page.locator('#joinModal')).toBeHidden();
  });
});
```

To run this test:
1.  Install Playwright: `npm install --save-dev @playwright/test`
2.  Create the `tests/smoke.spec.js` file with the content above.
3.  Start the local server: `python -m http.server 8000`
4.  Run Playwright: `npx playwright test`
