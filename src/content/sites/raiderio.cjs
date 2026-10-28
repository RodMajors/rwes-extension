"use strict";

function removeAds() {
    document.querySelectorAll('.rio-right-pane, [class*="ad-"], .fresnel-container').forEach((element) => element.remove());
}

function installRaiderIo() {
    GM_addStyle([
        '.rio-right-pane, [class*="ad-"], [class*="Advertisement"],',
        '.fresnel-container, [class*="slds-size--1-of-1"] > div[class*="fresnel"],',
        '.text-white > .slds-m-bottom--large { display: none !important; }',
    ].join("\n"));
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", removeAds, { once: true });
    } else {
        removeAds();
    }
    setInterval(removeAds, 2000);
}

module.exports = { installRaiderIo, removeAds };
