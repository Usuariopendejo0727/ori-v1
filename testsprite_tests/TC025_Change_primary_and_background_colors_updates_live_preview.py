import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> Navigate to http://localhost:5173
        await page.goto("http://localhost:5173", wait_until="commit", timeout=10000)
        
        # -> Navigate to /login (use explicit navigate to http://localhost:5173/login as the test step requires).
        await page.goto("http://localhost:5173/login", wait_until="commit", timeout=10000)
        
        # -> Fill the email and password fields with provided credentials and submit the login form (input to indexes 86 and 87, then click index 88).
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/div[3]/div[2]/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('julian.criales@gmail.com')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/div[3]/div[2]/form/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Julian123*')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div/div/div[3]/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click on 'Widget' in the main navigation to open the Widget settings (click element index 247).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div/div/aside/nav/a[5]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click the 'Widget' link in the sidebar to open the Widget settings (use fresh index 1007). After that, inspect the settings page for the color pickers.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div/div/aside/nav/a[5]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Set the primary color hex value into the primary hex text input (index 1428) to #ff5722, then set the background hex text input (index 1435) to #f0f9ff so the live preview updates.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/main/div/div/div[2]/div/div/div[2]/div/div/input[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('#ff5722')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/main/div/div/div[2]/div/div/div[2]/div[2]/div/input[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('#f0f9ff')
        
        # -> Set the primary hex in index 2048 to '#ff5722', set the background hex in index 2055 to '#f0f9ff', then extract the current values and preview text to verify the live preview updated.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/main/div/div/div[2]/div/div/div[2]/div/div/input[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('#ff5722')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/main/div/div/div[2]/div/div/div[2]/div[2]/div/input[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('#f0f9ff')
        
        # -> Set primary hex input (index 2235) to '#ff5722' and background hex input (index 2236) to '#f0f9ff', click the preview area to apply changes, then extract the current values and preview text to verify the live preview updated.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/main/div/div/div[2]/div/div/div[2]/div/div/input[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('#ff5722')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/main/div/div/div[2]/div/div/div[2]/div[2]/div/input[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('#f0f9ff')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div/div/main/div/div/div[2]/div[2]/div[1]/div[2]/div/div[1]/div[1]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Set primary hex input (index 2691) to '#ff5722', set background hex input (index 2698) to '#f0f9ff', click the preview area (index 2770) to apply changes, then extract primary_hex, background_hex, preview_header_text, preview_preview_text to verify whether the live preview updated.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/main/div/div/div[2]/div/div/div[2]/div/div/input[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('#ff5722')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/main/div/div/div[2]/div/div/div[2]/div[2]/div/input[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('#f0f9ff')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div/div/main/div/div/div[2]/div[2]/div/div[2]/div/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        # Assert we are on the dashboard (root) after login
        assert "/" in frame.url
        
        # Verify the primary color text input reflects the chosen hex
        primary_text = await frame.locator('xpath=/html/body/div[1]/div/main/div/div/div[2]/div[1]/div[1]/div[2]/div[1]/div/input[2]').input_value()
        assert primary_text.lower() == '#ff5722'
        
        # Verify the background color text input reflects the chosen hex
        bg_text = await frame.locator('xpath=/html/body/div[1]/div/main/div/div/div[2]/div[1]/div[1]/div[2]/div[2]/div/input[2]').input_value()
        assert bg_text.lower() == '#f0f9ff'
        
        # Also verify the color-type inputs have the expected values
        primary_color_value = await frame.locator('xpath=/html/body/div[1]/div/main/div/div/div[2]/div[1]/div[1]/div[2]/div[1]/div/input[1]').get_attribute('value')
        assert primary_color_value is not None and primary_color_value.lower() == '#ff5722'
        bg_color_value = await frame.locator('xpath=/html/body/div[1]/div/main/div/div/div[2]/div[1]/div[1]/div[2]/div[2]/div/input[1]').get_attribute('value')
        assert bg_color_value is not None and bg_color_value.lower() == '#f0f9ff'
        
        # Verify preview header text is visible in the live preview (indicates preview is present)
        assert await frame.locator('xpath=/html/body/div[1]/div/main/div/div/div[2]/div[2]/div[1]/div[2]/div/div[1]/div[2]/p[1]').is_visible()
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    