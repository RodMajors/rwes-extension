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

function translateSpellTooltip(root, translateDescription, activeSpellId) {
    const scope = root || document;
    const triggers = Array.from(document.querySelectorAll(".wow-spell:hover[data-wow-id], .wow-spell:focus[data-wow-id], .wow-trait:hover[data-wow-id], .wow-trait:focus[data-wow-id]"));
    if (activeSpellId && !triggers.some((element) => element.getAttribute("data-wow-id") === activeSpellId)) {
        triggers.unshift({ getAttribute: () => activeSpellId });
    }
    const tooltip = scope.querySelector(".mxt-Tooltip") || document.querySelector(".mxt-Tooltip");
    if (!tooltip) return false;
    const title = tooltip.querySelector(".mxt-title");
    const titleSpellId = title && translateDescription.resolveTitle
        ? translateDescription.resolveTitle(title.textContent.trim())
        : null;
    const spellIds = [];
    if (titleSpellId) spellIds.push(titleSpellId);
    if (activeSpellId && !activeSpellId.includes(":") && !spellIds.includes(activeSpellId)) spellIds.push(activeSpellId);
    if (!spellIds.length && !triggers.length) return false;
    const walker = document.createTreeWalker(tooltip, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let translated = false;
    for (const node of nodes) {
        const original = node.nodeValue.trim();
        let replacement = null;
        for (const spellId of spellIds) {
            replacement = translateDescription(original, spellId);
            if (replacement) break;
        }
        if (replacement && replacement !== original) {
            node.nodeValue = node.nodeValue.replace(original, replacement);
            translated = true;
        }
    }
    if (!translated) return false;
    return true;
}

function translateTooltipLabels(root, translateText) {
    const tooltip = (root || document).querySelector(".mxt-Tooltip") || document.querySelector(".mxt-Tooltip");
    if (!tooltip) return 0;
    const walker = document.createTreeWalker(tooltip, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let count = 0;
    for (const node of nodes) {
        const original = node.nodeValue;
        const translated = translateText(original.trim());
        if (translated && translated !== original.trim()) {
            node.nodeValue = original.replace(original.trim(), translated);
            count += 1;
        }
    }
    return count;
}

function installMaxroll(translateDescription, translateText) {
    GM_addStyle('[data-rwes-maxroll-adblock-prompt] { display: none !important; }');
    dismissAdblockPrompt();
    let activeSpellId = null;
    document.addEventListener("pointerover", (event) => {
        const spell = event.target && event.target.closest && event.target.closest(".wow-spell[data-wow-id], .wow-trait[data-wow-id]");
        if (spell) activeSpellId = spell.getAttribute("data-wow-id");
    }, true);
    const scan = () => {
        dismissAdblockPrompt();
        if (translateText) translateTooltipLabels(document, translateText);
        if (translateDescription) translateSpellTooltip(document, translateDescription, activeSpellId);
    };
    const observer = new MutationObserver(scan);
    observer.observe(document.documentElement, { childList: true, characterData: true, subtree: true });
    scan();
    return { scan };
}

module.exports = { installMaxroll, dismissAdblockPrompt, translateSpellTooltip, translateTooltipLabels };
