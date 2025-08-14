from playwright.sync_api import sync_playwright
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Get the absolute path to the index.html file
    file_path = os.path.abspath('index.html')

    # Go to the local HTML file
    page.goto(f'file://{file_path}')

    # 1. Check the initial state and open the settings modal
    page.get_by_role("button", name="Settings").click()

    # Wait for the modal to be visible
    settings_modal = page.locator("#settingsModal")
    settings_modal.wait_for(state="visible")

    # Take a screenshot of the settings modal
    page.screenshot(path="jules-scratch/verification/01_settings_modal.png")

    # Close the settings modal
    page.get_by_role("button", name="Close").click()

    # 2. Create a room and send a message to generate some logs
    page.locator("#nameInput").fill("Jules")
    page.get_by_role("button", name="Create Group").click()

    # Wait for the call interface to be visible
    call_interface = page.locator("#callInterface")
    call_interface.wait_for(state="visible")

    # The app creates a default peer connection to itself which is weird, but it generates logs.
    # Let's wait for some logs to appear.
    page.wait_for_timeout(2000) # Wait for some events to be logged

    # 3. Open settings again and check the log
    page.get_by_role("button", name="Settings").click()
    settings_modal.wait_for(state="visible")

    # Take a screenshot of the connection log
    connection_log = page.locator("#connectionLog")
    connection_log.screenshot(path="jules-scratch/verification/02_connection_log.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
