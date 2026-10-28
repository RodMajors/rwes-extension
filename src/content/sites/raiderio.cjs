"use strict";

function removeAds() {
    document.querySelectorAll(".rio-right-pane").forEach((rightPane) => {
        const layout = rightPane.closest(".slds-grid") || rightPane.parentElement;
        if (layout) layout.setAttribute("data-rwes-rio-main-layout", "");
        rightPane.remove();
    });
}

function installRaiderIo() {
    GM_addStyle([
        ".rio-right-pane { display: none !important; }",
        "[data-rwes-rio-main-layout] { grid-template-columns: minmax(0, 1fr) !important; }",
        "[data-rwes-rio-main-layout] > :not(.rio-right-pane) { width: 100% !important; max-width: 100% !important; grid-column: 1 / -1 !important; }",
        "[data-rwes-rio-main-layout].slds-grid { display: grid !important; grid-template-columns: minmax(0, 1fr) !important; }",
        "[data-rwes-rio-main-layout].slds-grid > .slds-col.slds-size--1-of-1 { width: 100% !important; max-width: 100% !important; flex: 1 1 100% !important; }",
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
