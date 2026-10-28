"use strict";

function removeAds() {
    document.querySelectorAll(".rio-right-pane").forEach((rightPane) => {
        const layout = rightPane.parentElement;
        if (layout) layout.setAttribute("data-rwes-rio-main-layout", "");
        rightPane.remove();
    });
}

function installRaiderIo() {
    GM_addStyle([
        ".rio-right-pane { display: none !important; }",
        "[data-rwes-rio-main-layout] { grid-template-columns: minmax(0, 1fr) !important; }",
        "[data-rwes-rio-main-layout] > :not(.rio-right-pane) { width: 100% !important; max-width: 100% !important; grid-column: 1 / -1 !important; }",
    ].join("\n"));
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", removeAds, { once: true });
    } else {
        removeAds();
    }
    const observer = new MutationObserver(removeAds);
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

module.exports = { installRaiderIo, removeAds };
