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

        console.log("Loading:", url);

        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        const results = await page.evaluate(() => {
            const cards = document.querySelectorAll(".meet-result, .meet-card");

            return Array.from(cards).map(card => card.innerText);
        });

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
    }

    await browser.close();

    return Array.from(seen.values());
}
