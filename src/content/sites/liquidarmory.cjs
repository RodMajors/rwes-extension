"use strict";

function isLiquidArmoryHost(hostname = location.hostname) {
    return hostname === "liquidarmory.com" || hostname.endsWith(".liquidarmory.com");
}

function normalizeWowheadLinks() {
    document.querySelectorAll('a[href*="wowhead.com"]').forEach((anchor) => {
        const href = anchor.getAttribute("href") || "";
        if (/wowhead\.com\/(?:ptr|ptr-2|beta|alpha)(?=\/|$)/i.test(href)) {
            anchor.setAttribute(
                "href",
                href.replace(/(wowhead\.com)\/(?:ptr|ptr-2|beta|alpha)(?=\/|$)/i, "$1/cn"),
            );
        }
        if (anchor.hasAttribute("data-wowhead")) {
            let data = anchor.getAttribute("data-wowhead") || "";
            data = /domain=/i.test(data)
                ? data.replace(/domain=[a-z-]+/i, "domain=cn")
                : `${data}${data ? "&" : ""}domain=cn`;
            anchor.setAttribute("data-wowhead", data);
        }
        [anchor, ...anchor.querySelectorAll("[data-env], [data-tree]")].forEach((element) => {
            ["data-env", "data-tree"].forEach((attribute) => {
                const value = element.getAttribute(attribute);
                if (/^(ptr|ptr-2|beta|alpha)$/i.test(value || "")) {
                    element.setAttribute(attribute, "live");
                }
            });
        });
    });
}

function installLiquidArmory() {
    normalizeWowheadLinks();
    const observer = new MutationObserver(normalizeWowheadLinks);
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

module.exports = { isLiquidArmoryHost, installLiquidArmory, normalizeWowheadLinks };
