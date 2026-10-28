"use strict";

const ADBLOCK_HEADING = "Attention Ad-Block User";
const DISMISS_LABEL = "No Thanks";

function normalizedText(element) {
    return (element && element.textContent ? element.textContent : "").trim();
}

function dismissAdblockPrompt() {
    const heading = Array.from(document.querySelectorAll("h3")).find(
        (element) => normalizedText(element) === ADBLOCK_HEADING,
    );
    if (!heading) return false;
    const overlay = heading.closest("div.fixed.inset-0");
    if (!overlay) return false;
    if (overlay.hasAttribute("data-rwes-maxroll-adblock-prompt")) return false;
    overlay.setAttribute("data-rwes-maxroll-adblock-prompt", "");
    const dismissButton = Array.from(overlay.querySelectorAll("button")).find(
        (button) => normalizedText(button) === DISMISS_LABEL,
    );
    if (dismissButton) dismissButton.click();
    else overlay.remove();
    return true;
}

function installMaxroll() {
    GM_addStyle('[data-rwes-maxroll-adblock-prompt] { display: none !important; }');
    dismissAdblockPrompt();
    const observer = new MutationObserver(dismissAdblockPrompt);
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

module.exports = { installMaxroll, dismissAdblockPrompt };
