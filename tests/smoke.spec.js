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
    await expect(page.locator('label[for="nameInput"]')).toContainText(
      'Your Name'
    );

    // Check for the main action buttons
    await expect(page.locator('#createRoomBtn')).toBeVisible();
    await expect(page.locator('#joinRoomBtn')).toBeVisible();
    await expect(page.locator('#p2pConnectBtn')).toBeVisible();

    // Check for the settings button
    await expect(page.locator('#settingsBtn')).toBeVisible();
  });

  test('should be able to open and close the join group modal', async ({
    page,
  }) => {
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

  test('should handle malformed P2P URL gracefully', async ({ page }) => {
    // Navigate to a URL with an invalid base64 string in the 'p' parameter
    await page.goto(`${pageUrl}?p=not-valid-base64`);

    // The app should not crash, so we check for the main title again
    await expect(page.locator('h1')).toContainText('P2P Call');

    // Check for a user-facing notification about the invalid link
    const notification = page.locator('.notification.is-danger');
    await expect(notification).toBeVisible();
    await expect(notification).toContainText('Invalid P2P link');

    // Crucially, there should be no uncaught exceptions in the console
    expect(consoleErrors).toEqual([]);
  });
});
