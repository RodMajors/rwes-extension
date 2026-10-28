"use strict";

const LANGUAGE_SEGMENT = /^\/(?:cn|de|en|es|fr|it|ko|pt|ru|tw)(?=\/|$)/i;

function chinesePath(pathname) {
    if (/^\/cn(?:\/|$)/i.test(pathname)) return pathname;
    if (LANGUAGE_SEGMENT.test(pathname)) {
        return pathname.replace(LANGUAGE_SEGMENT, "/cn");
    }
    return pathname === "/" ? "/cn/" : `/cn${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function removeSidebar() {
    document
        .querySelectorAll('[class*="boss_adsLayoutRightSection__"]')
        .forEach((sidebar) => sidebar.remove());
}

function installMythicTrap(config) {
    if (config.autoRedirectMythicTrapCN) {
        const nextPath = chinesePath(location.pathname);
        if (nextPath !== location.pathname) {
            location.replace(`${location.origin}${nextPath}${location.search}${location.hash}`);
            return true;
        }
    }

    RWES_addStyle([
        '[class*="boss_adsLayoutWrapper__"] { display: block !important; }',
        '[class*="boss_adsLayoutRightSection__"] { display: none !important; }',
        '[class*="boss_adsLayoutLeftSection__"] { width: 100% !important; max-width: none !important; flex: 1 1 100% !important; }',
    ].join("\n"));
    removeSidebar();
    const observer = new MutationObserver(removeSidebar);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return false;
}

module.exports = { chinesePath, installMythicTrap, removeSidebar };
