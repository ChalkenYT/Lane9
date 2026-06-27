import { chromium } from "playwright";
import {
    normalizeSwimCloudUrl,
    createSwimKey,
    cleanText
} from "./utils.js";

export async function importSwimmer(inputUrl) {

    const baseUrl = normalizeSwimCloudUrl(inputUrl);

    const browser = await chromium.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox"
        ]
    });

    const page = await browser.newPage();

    const seen = new Map();

    let pageNum = 1;
    let emptyPages = 0;
    let finished = false;

    while (!finished) {

        const url =
            pageNum === 1
                ? baseUrl
                : `${baseUrl}?page=${pageNum}`;

        console.log("\n====================================");
        console.log("Loading:", url);

        // ✅ FIX: avoid networkidle (this was your timeout issue)
        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        // ✅ allow JS rendering time (critical for SwimCloud)
        await page.waitForTimeout(5000);

        // ========================
        // DEBUG INFO (keep for now)
        // ========================

        const title = await page.title();
        console.log("\nTITLE:");
        console.log(title);

        const bodyText = await page.locator("body").innerText();
        console.log("\nBODY PREVIEW:");
        console.log(bodyText.substring(0, 3000));

        const html = await page.content();
        console.log("\nHTML PREVIEW:");
        console.log(html.substring(0, 5000));

        const cardCount = await page
            .locator(".meet-result, .meet-card")
            .count();

        console.log("\nMATCHING ELEMENTS:", cardCount);

        // ========================
        // EXTRA SAFETY CHECK
        // ========================

        const isCloudflare = html.includes("Just a moment")
            || html.includes("Checking your browser")
            || title.toLowerCase().includes("just a moment");

        if (isCloudflare) {
            console.log("\n🚨 Cloudflare challenge detected");
            await browser.close();
            return {
                success: false,
                error: "Cloudflare blocking request"
            };
        }

        // ========================
        // ACTUAL SCRAPE
        // ========================

        const results = await page.evaluate(() => {
            const cards = document.querySelectorAll(
                ".meet-result, .meet-card"
            );

            return Array.from(cards).map(card => card.innerText);
        });

        console.log("\nFOUND RESULTS:", results.length);

        let newCount = 0;

        for (const raw of results) {

            const swim = {
                raw: cleanText(raw)
            };

            const key = createSwimKey(swim);

            if (!seen.has(key)) {
                seen.set(key, swim);
                newCount++;
            }
        }

        console.log("New:", newCount);

        if (newCount === 0) {
            emptyPages++;
        } else {
            emptyPages = 0;
        }

        if (emptyPages >= 2) {
            finished = true;
        }

        pageNum++;

        // (optional safety limit while debugging)
        if (pageNum > 20) finished = true;
    }

    await browser.close();

    return Array.from(seen.values());
}
