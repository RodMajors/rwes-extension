"use strict";

function removeAds() {
    document.querySelectorAll("aside").forEach((aside) => aside.remove());
}

function layoutCss() {
    return [
        "body > div.vi-layout, body > div[class*=\"vi-layout\"] { display: grid !important; box-sizing: border-box !important; padding-right: clamp(12px, 1.5vw, 24px) !important; grid-template-columns: var(--layout_pane_width) var(--layout_pane_width) minmax(0, 1fr) !important; grid-template-areas: \"menu index content\" !important; }",
        "body > div.vi-layout > [class*=\"vi-layout-content\"], body > div[class*=\"vi-layout\"] > [class*=\"vi-layout-content\"] { display: block !important; grid-area: content !important; min-width: 0 !important; width: 100% !important; }",
    ].join("\n");
}


function installMurlok() {
    RWES_addStyle([
        "body > div aside { display: none !important; }",
        layoutCss(),
    ].join("\n"));
    removeAds();
    const observer = new MutationObserver(removeAds);
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

module.exports = { installMurlok, removeAds, layoutCss };
