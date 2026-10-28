"use strict";

function removeAds() {
    document.querySelectorAll("aside").forEach((aside) => aside.remove());
}

function installMurlok() {
    GM_addStyle([
        "body > div aside { display: none !important; }",
        ".vi-layout, [class*=\"vi-layout\"] {",
        "display: grid !important;",
        "grid-template-columns: var(--layout_pane_width) var(--layout_pane_width) minmax(0, 1fr) !important;",
        'grid-template-areas: "menu index content" !important;',
        "}",
        '[class*=\"vi-layout-with-ads\"] { grid-template-columns: var(--layout_pane_width) var(--layout_pane_width) minmax(0, 1fr) !important; grid-template-areas: "menu index content" !important; }',
    ].join("\n"));
    removeAds();
    const observer = new MutationObserver(removeAds);
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

module.exports = { installMurlok, removeAds };
