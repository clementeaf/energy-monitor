"""
Intercept ALL API calls from parquearauco.cl/mapa when browsing the indoor map.
Clicks each mall in the selector and captures network requests.

Usage:
  .venv/bin/python scripts/scrape-parquearauco-apis.py
"""

import json
import asyncio
from playwright.async_api import async_playwright

URL = "https://www.parquearauco.cl/mapa"


async def intercept_apis():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Capture ALL API calls
        api_calls = []

        async def on_response(response):
            url = response.url
            # Skip static assets
            if any(ext in url for ext in ['.js', '.css', '.png', '.jpg', '.svg', '.woff', '.ico', '.gif']):
                return
            if response.status != 200:
                return
            content_type = response.headers.get('content-type', '')
            if 'json' in content_type or 'protobuf' in content_type or 'octet-stream' in content_type or 'pbf' in url:
                try:
                    if 'json' in content_type:
                        body = await response.json()
                    else:
                        body = f"<binary {len(await response.body())} bytes>"
                except Exception:
                    body = "<failed to read>"
                api_calls.append({
                    "url": url,
                    "status": response.status,
                    "content_type": content_type,
                    "body_preview": body if isinstance(body, str) else json.dumps(body, ensure_ascii=False)[:2000],
                })

        page.on("response", on_response)

        print(f"Loading {URL} ...")
        await page.goto(URL, wait_until="networkidle", timeout=30_000)
        await page.wait_for_timeout(3_000)

        print(f"\n{'='*60}")
        print(f"Initial page load — {len(api_calls)} API calls captured:")
        print(f"{'='*60}")
        for c in api_calls:
            print(f"  [{c['status']}] {c['url'][:120]}")
            if c['body_preview'] and len(c['body_preview']) < 500:
                print(f"        → {c['body_preview'][:300]}")

        # Now click the mall selector and pick a different mall
        initial_count = len(api_calls)

        # Click dropdown
        try:
            dropdown = page.locator('[class*="dropdown"] >> text=Arauco').first
            if await dropdown.is_visible(timeout=2_000):
                await dropdown.click()
                await page.wait_for_timeout(1_000)
                print("\nClicked mall dropdown")

                # Click a different mall (e.g., Arauco Chillán)
                mall_item = page.locator('text=Arauco Chillán').first
                if await mall_item.is_visible(timeout=2_000):
                    await mall_item.click()
                    print("Selected: Arauco Chillán")
                    await page.wait_for_timeout(5_000)
                    await page.wait_for_load_state("networkidle")
                    await page.wait_for_timeout(2_000)
        except Exception as e:
            print(f"Dropdown interaction failed: {e}")

        new_calls = api_calls[initial_count:]
        print(f"\n{'='*60}")
        print(f"After selecting mall — {len(new_calls)} NEW API calls:")
        print(f"{'='*60}")
        for c in new_calls:
            print(f"  [{c['status']}] {c['url'][:120]}")
            if c['body_preview'] and len(c['body_preview']) < 500:
                print(f"        → {c['body_preview'][:300]}")

        # Take screenshot of the map page
        await page.screenshot(path="scripts/parquearauco-map.png", full_page=False)
        print("\nScreenshot saved: scripts/parquearauco-map.png")

        # Dump all API calls
        output_path = "scripts/parquearauco-api-calls.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(api_calls, f, ensure_ascii=False, indent=2)
        print(f"All API calls saved: {output_path}")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(intercept_apis())
