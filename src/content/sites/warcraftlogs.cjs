"use strict";

function removeAds() {
    ["#right-ad-box", "#top-banner", "#bottom-banner", "#google-center-div", ".adsbygoogle"].forEach((selector) => {
        document.querySelectorAll(selector).forEach((element) => element.remove());
    });
}

function installWarcraftLogs(config) {
    const host = location.hostname;
    if (config.autoRedirectWCLCN && !host.startsWith("cn.")) {
        const isSpecial = /^(classic|vanilla|season|ptr|beta)\./i.test(host) || host.includes(".classic.") || host.includes(".vanilla.");
        if (!isSpecial) {
            const newHost = host.replace(/^(www\.|[a-z]{2}\.)?/, "cn.");
            const newUrl = location.href.replace(host, newHost);
            if (newUrl !== location.href) {
                location.replace(newUrl);
                return true;
            }
        }
    }

    GM_addStyle([
        "#main-box { display: block !important; }",
        "#right-ad-box, #top-banner, #bottom-banner, #google-center-div, .adsbygoogle, [id*=\"ad-\"], [class*=\"ad-box\"], [class*=\"advertisement\"] {",
        "display: none !important; visibility: hidden !important; width: 0 !important; height: 0 !important;",
        "}",
    ].join("\n"));
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", removeAds, { once: true });
    } else {
        removeAds();
    }
    setInterval(removeAds, 1500);
    return false;
}

module.exports = { installWarcraftLogs, removeAds };
