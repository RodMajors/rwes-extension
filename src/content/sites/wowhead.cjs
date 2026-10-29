"use strict";

function pruneMain(main) {
    Array.from(main.children).forEach((child) => {
        if (child.tagName === "DIV" && !child.classList.contains("main-contents")) {
            child.remove();
        }
    });
}

function installMainCleanup() {
    const main = document.querySelector("div#main");
    if (!main) return false;
    pruneMain(main);
    const observer = new MutationObserver(() => pruneMain(main));
    observer.observe(main, { childList: true });
    return true;
}

function toChineseWowheadUrl(rawUrl, options = {}) {
    let url;
    try {
        url = new URL(rawUrl);
    } catch {
        return rawUrl;
    }
    if (!/(?:^|\.)wowhead\.com$/i.test(url.hostname)) return rawUrl;

    const isTest = /^\/(?:beta|ptr|ptr-2|alpha)(?:\/|$)/i.test(url.pathname);
    if (isTest && !options.forceTest) return rawUrl;

    let path = url.pathname
        .replace(
            /\/(tw|de|es|mx|fr|it|pt|ru|ko|cn)(\/|$)/i,
            "/cn$2",
        )
        .replace(/\/(beta|ptr|ptr-2|alpha)(\/|$)/i, "/cn$2");
    if (!/\/cn(?:\/|$)/i.test(path)) {
        path = path.replace(
            /^(\/(?:classic|sod|cata|mop|tbc|wrath)?)?(\/|$)/,
            "$1/cn$2",
        );
    }

    url.protocol = "https:";
    url.hostname = "www.wowhead.com";
    url.pathname = path;
    return url.href;
}

function installWowhead(config) {
    if (config.autoRedirectWowheadCN) {
        const newUrl = toChineseWowheadUrl(location.href, {
            forceTest: config.forceTestToCN,
        });
        if (newUrl !== location.href) {
            location.replace(newUrl);
            return true;
        }
    }

    RWES_addStyle([
        "div#main { display: block !important; grid-template-columns: none !important; }",
        "div#main > div:not(.main-contents) { display: none !important; }",
        "div#main > div.main-contents { display: block !important; width: 100% !important; max-width: none !important; min-width: 0 !important; grid-column: 1 / -1 !important; }",
    ].join("\n"));

    if (!installMainCleanup()) {
        const observer = new MutationObserver(() => {
            if (installMainCleanup()) observer.disconnect();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    return false;
}

module.exports = { installWowhead, pruneMain, toChineseWowheadUrl };
