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
    if (activeSpellId && !activeSpellId.includes(":")) spellIds.push(activeSpellId);
    for (const id of (Array.isArray(titleSpellId) ? titleSpellId : [titleSpellId])) {
        if (id && !spellIds.includes(id)) spellIds.push(id);
    }
    if (!spellIds.length && !triggers.length) return false;
    if (translateDescription.renderTooltip) {
        const description = tooltip.querySelector(".mx-color-gold");
        if (description) {
            const currentId = spellIds[0];
            if (description.getAttribute("data-rwes-rendered-spell") === currentId) return false;
            const rendered = translateDescription.renderTooltip(description.textContent || "", spellIds[0]);
            if (rendered) {
                description.replaceChildren();
                const lines = rendered.split(/\n/);
                lines.forEach((line, index) => {
                    if (index) description.append(document.createElement("br"));
                    description.append(document.createTextNode(line));
                });
                description.setAttribute("data-rwes-rendered-spell", currentId);
                return true;
            }
        }
    }
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
    RWES_addStyle('[data-rwes-maxroll-adblock-prompt] { display: none !important; }');
    dismissAdblockPrompt();
    let activeSpellId = null;
    document.addEventListener("pointerover", (event) => {
        const spell = event.target && event.target.closest && event.target.closest(".wow-spell[data-wow-id], .wow-trait[data-wow-id]");
        if (spell) activeSpellId = spell.getAttribute("data-wow-id");
    }, true);
    let observer = null;
    let scanning = false;
    let scanTimer = null;
    const scanNow = () => {
        if (scanning) return;
        scanning = true;
        if (observer) observer.disconnect();
        try {
            dismissAdblockPrompt();
            if (translateText) translateTooltipLabels(document, translateText);
            if (translateDescription) translateSpellTooltip(document, translateDescription, activeSpellId);
        } finally {
            scanning = false;
            if (observer) observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    };
    const scan = () => {
        if (scanTimer) return;
        scanTimer = setTimeout(() => { scanTimer = null; scanNow(); }, 50);
    };
    observer = new MutationObserver(scan);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    scan();
    return { scan };
}

module.exports = { installMaxroll, dismissAdblockPrompt, translateSpellTooltip, translateTooltipLabels };
