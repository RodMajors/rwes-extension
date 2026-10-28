"use strict";

function removeAds() {
    document.querySelectorAll(".in-content-ad").forEach((element) => element.remove());
}

function installIcyVeins() {
    GM_addStyle('.in-content-ad { display: none !important; }');
    removeAds();
    const observer = new MutationObserver(removeAds);
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

module.exports = { installIcyVeins, removeAds };
