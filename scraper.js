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

        await page.goto(url, {
            waitUntil: "networkidle",
            timeout: 60000
        });

        // Give JS extra time to render.
        await page.waitForTimeout(5000);

        // Page title
        const title = await page.title();
        console.log("\nTITLE:");
        console.log(title);

        // Visible text
        const bodyText = await page.locator("body").innerText();

        console.log("\nBODY PREVIEW:");
        console.log(bodyText.substring(0, 3000));

        // Raw HTML
        const html = await page.content();

        console.log("\nHTML PREVIEW:");
        console.log(html.substring(0, 5000));

        // Save full HTML to logs if desired.
        console.log("\nFULL HTML:");
        console.log(html);

        // Screenshot for debugging
        try {
            await page.screenshot({
                path: `/tmp/swimcloud-page-${pageNum}.png`,
                fullPage: true
            });

            console.log(
                `Screenshot saved: /tmp/swimcloud-page-${pageNum}.png`
            );
        } catch (err) {
            console.log("Screenshot failed:", err.message);
        }

        // List first 200 class names on the page.
        const classes = await page.evaluate(() => {
            return [
                ...new Set(
                    [...document.querySelectorAll("*")]
                        .map(el => el.className)
                        .filter(Boolean)
                )
            ].slice(0, 200);
        });

        console.log("\nCLASSES:");
        console.log(classes);

        // Check your existing selectors.
        const cardCount = await page
            .locator(".meet-result, .meet-card")
            .count();

        console.log("\nMATCHING .meet-result/.meet-card:", cardCount);

        // Temporary placeholder
        const results = [];

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

        console.log("\nNew:", newCount);
        console.log("====================================\n");

        if (newCount === 0) {
            emptyPages++;
        } else {
            emptyPages = 0;
        }

        // Stop after first page while debugging.
        finished = true;

        // Uncomment later for pagination:
        // if (emptyPages >= 2) {
        //     finished = true;
        // }

        pageNum++;
    }

    await browser.close();

    return Array.from(seen.values());
}
