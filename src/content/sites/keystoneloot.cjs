"use strict";

function visibleTooltip() {
    return (
        document.querySelector('.wowhead-tooltip[data-visible="yes"]') ||
        document.querySelector(".wowhead-tooltip")
    );
}

function placeTooltip(anchor, tooltip) {
    if (!anchor || !tooltip || !tooltip.getBoundingClientRect) return;
    const anchorRect = anchor.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const gap = 8;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    let left = anchorRect.right + gap;
    if (left + tooltipRect.width > viewportWidth - gap) {
        left = anchorRect.left - tooltipRect.width - gap;
    }
    let top = anchorRect.top;
    if (top + tooltipRect.height > viewportHeight - gap) {
        top = viewportHeight - tooltipRect.height - gap;
    }
    tooltip.style.setProperty("position", "fixed", "important");
    tooltip.style.setProperty("left", `${Math.max(gap, left)}px`, "important");
    tooltip.style.setProperty("top", `${Math.max(gap, top)}px`, "important");
}

function installKeystoneLoot() {
    let activeAnchor = null;
    let scheduled = false;
    const reposition = () => {
        scheduled = false;
        if (!activeAnchor) return;
        placeTooltip(activeAnchor, visibleTooltip());
    };
    const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(reposition);
    };
    document.addEventListener("mouseover", (event) => {
        const target = event.target && event.target.closest && event.target.closest("a[data-wowhead]");
        if (!target) return;
        activeAnchor = target;
        schedule();
    }, true);
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-visible"],
    });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
}

module.exports = { installKeystoneLoot, placeTooltip };
