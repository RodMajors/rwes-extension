"use strict";

function removeAds() {
    document.querySelectorAll(".in-content-ad").forEach((element) => element.remove());
}

function textOf(element) {
    return (element && element.textContent ? element.textContent : "").trim();
}

function dismissAdblockPrompt() {
    const heading = Array.from(document.querySelectorAll("h2")).find(
        (element) => textOf(element) === "Looks like your ad blocker is on.",
    );
    if (!heading) return false;
    const overlay = heading.closest("div[id]");
    if (!overlay || overlay.hasAttribute("data-rwes-icyveins-adblock")) return false;
    overlay.setAttribute("data-rwes-icyveins-adblock", "");
    const continueItem = Array.from(overlay.querySelectorAll("p, button, [role=button]")).find(
        (element) => textOf(element) === "Continue without supporting us",
    );
    if (continueItem && typeof continueItem.click === "function") continueItem.click();
    else overlay.remove();
    return true;
}

function cleanup() {
    removeAds();
    dismissAdblockPrompt();
}


function installIcyVeins() {
    GM_addStyle('.in-content-ad { display: none !important; }');
    cleanup();
    const observer = new MutationObserver(cleanup);
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

module.exports = { installIcyVeins, removeAds, dismissAdblockPrompt };
