"use strict";

const AD_SLOT_SELECTORS = ["#top-banner-atf", "#vertical-banner-atf"];

function removeAds() {
    AD_SLOT_SELECTORS.forEach((selector) => {
        document.querySelectorAll(selector).forEach((slot) => {
            const container = slot.closest("a");
            (container || slot).remove();
        });
    });
}

function installWowAnalyzer() {
    RWES_addStyle([
        'a:has(#top-banner-atf), a:has(#vertical-banner-atf) { display: none !important; }',
    ].join("\n"));
    removeAds();
    const observer = new MutationObserver(removeAds);
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

module.exports = { installWowAnalyzer, removeAds };
