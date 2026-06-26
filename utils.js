// utils.js

export function normalizeSwimCloudUrl(url) {
    let u = url.trim();

    if (!u.endsWith("/")) {
        u += "/";
    }

    if (!u.includes("/meets/")) {
        u += "meets/";
    }

    return u;
}

// Used to uniquely identify a swim
export function createSwimKey(swim) {
    return `${swim.date || ""}|${swim.meet || ""}|${swim.event || ""}|${swim.time || ""}`;
}

// Clean weird whitespace / formatting from scraped text
export function cleanText(text) {
    if (!text) return "";
    return text.replace(/\s+/g, " ").trim();
}
