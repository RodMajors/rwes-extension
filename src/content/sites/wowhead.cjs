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

function installWowhead(config) {
    const host = location.hostname;
    const path = location.pathname;
    if (config.autoRedirectWowheadCN) {
        const isTest = /\/(beta|ptr|ptr-2|alpha)(\/|$)/i.test(path);
        const alreadyCN = /\/cn(\/|$)/i.test(path) || host.startsWith("cn.");
        if (!alreadyCN && (!isTest || config.forceTestToCN)) {
            let newPath = path
                .replace(/\/(tw|de|es|mx|fr|it|pt|ru|ko|cn)(\/|$)/i, "/cn$2")
                .replace(/\/(beta|ptr|ptr-2|alpha)(\/|$)/i, "/cn$2");
            if (!/\/cn(\/|$)/i.test(newPath)) {
                newPath = newPath.replace(/^(\/(?:classic|sod|cata|mop|tbc|wrath)?)?(\/|$)/, "$1/cn$2");
            }
            const newUrl = location.origin.replace(/^(https?:\/\/)(?:[a-z]{2}\.)?/, "$1www.") + newPath + location.search + location.hash;
            if (newUrl !== location.href) {
                location.replace(newUrl);
                return true;
            }
        }
    }

    GM_addStyle([
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

module.exports = { installWowhead, pruneMain };
