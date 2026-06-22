"""
Scrape mall selector from parquearauco.cl/mapa
Uses Playwright (headless Chromium) to render SPA and extract dropdown options.

Usage:
  pip install playwright
  playwright install chromium
  python scripts/scrape-parquearauco-malls.py
"""

import json
import asyncio
from playwright.async_api import async_playwright


URL = "https://www.parquearauco.cl/mapa"


async def scrape_mall_selector():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print(f"Loading {URL} ...")
        await page.goto(URL, wait_until="networkidle", timeout=30_000)

        # Wait for navbar to render
        await page.wait_for_timeout(3_000)

        # Try clicking the mall selector dropdown to open it
        # Based on screenshot: top-right dropdown with "Parque Arauco" label
        selector_candidates = [
            # Common patterns for dropdown triggers
            '[class*="mall-selector"]',
            '[class*="mallSelector"]',
            '[class*="mall-list"]',
            '[class*="dropdown"] >> text=Arauco',
            'button:has-text("Parque Arauco")',
            'a:has-text("Parque Arauco")',
            '[class*="select"] >> text=Arauco',
            # Generic nav dropdowns
            'nav button[class*="dropdown"]',
            'header button[class*="dropdown"]',
            '.navbar button',
        ]

        clicked = False
        for sel in selector_candidates:
            try:
                el = page.locator(sel).first
                if await el.is_visible(timeout=1_000):
                    await el.click()
                    await page.wait_for_timeout(1_000)
                    clicked = True
                    print(f"Clicked selector: {sel}")
                    break
            except Exception:
                continue

        if not clicked:
            print("Could not find dropdown trigger. Trying to extract from page source...")

        # Extract mall options from rendered DOM
        # Strategy 1: Look for dropdown list items
        malls = []
        list_selectors = [
            '[class*="mall"] li',
            '[class*="mall"] a',
            '[class*="dropdown-menu"] li',
            '[class*="dropdown-menu"] a',
            '[class*="list"] li a[href*="parque"]',
            '[class*="selector"] li',
            '[class*="selector"] option',
            'select option',
            '[role="listbox"] [role="option"]',
            '[class*="menu-item"]',
        ]

        for sel in list_selectors:
            try:
                items = page.locator(sel)
                count = await items.count()
                if count > 2:  # Likely the mall list
                    print(f"Found {count} items with: {sel}")
                    for i in range(count):
                        item = items.nth(i)
                        text = (await item.text_content() or "").strip()
                        href = await item.get_attribute("href") or ""
                        data_id = await item.get_attribute("data-id") or ""
                        data_slug = await item.get_attribute("data-slug") or ""
                        if text:
                            malls.append({
                                "name": text,
                                "href": href,
                                "data_id": data_id,
                                "data_slug": data_slug,
                            })
                    break
            except Exception:
                continue

        # Strategy 2: Intercept API call
        if not malls:
            print("DOM extraction failed. Trying API interception...")
            api_data = []

            async def handle_response(response):
                if "malls" in response.url and response.status == 200:
                    try:
                        body = await response.json()
                        api_data.append({"url": response.url, "data": body})
                    except Exception:
                        pass

            page.on("response", handle_response)
            await page.reload(wait_until="networkidle", timeout=30_000)
            await page.wait_for_timeout(5_000)

            if api_data:
                print(f"Intercepted {len(api_data)} API response(s)")
                for entry in api_data:
                    print(f"  URL: {entry['url']}")
                    data = entry["data"]
                    if isinstance(data, list):
                        for item in data:
                            name = item.get("name") or item.get("title") or item.get("mallName") or ""
                            malls.append({
                                "name": name,
                                **{k: v for k, v in item.items() if k != "name"},
                            })
                    elif isinstance(data, dict):
                        # Might be nested
                        for key, val in data.items():
                            if isinstance(val, list):
                                for item in val:
                                    if isinstance(item, dict):
                                        name = item.get("name") or item.get("title") or ""
                                        malls.append({
                                            "name": name,
                                            **{k: v for k, v in item.items() if k != "name"},
                                        })

        # Strategy 3: Full page screenshot + raw HTML dump for debugging
        if not malls:
            print("All strategies failed. Dumping debug info...")
            await page.screenshot(path="scripts/parquearauco-debug.png", full_page=True)
            html = await page.content()
            with open("scripts/parquearauco-debug.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("Saved: scripts/parquearauco-debug.png + parquearauco-debug.html")

        await browser.close()

    # Output
    if malls:
        # Dedupe by name
        seen = set()
        unique = []
        for m in malls:
            if m["name"] not in seen:
                seen.add(m["name"])
                unique.append(m)
        malls = unique

        print(f"\n{'='*60}")
        print(f"Found {len(malls)} malls:")
        print(f"{'='*60}")
        for i, mall in enumerate(malls, 1):
            print(f"  {i:2d}. {mall['name']}")

        output_path = "scripts/parquearauco-malls.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(malls, f, ensure_ascii=False, indent=2)
        print(f"\nSaved to {output_path}")
    else:
        print("\nNo malls extracted. Check debug files.")

    return malls


if __name__ == "__main__":
    asyncio.run(scrape_mall_selector())
