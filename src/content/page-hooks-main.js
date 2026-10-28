(() => {
  let tooltipConfig = { ...(window.whTooltips || {}), domain: "cn", locale: "cn" };

  try {
    Object.defineProperty(window, "whTooltips", {
      configurable: true,
      enumerable: true,
      get: () => tooltipConfig,
      set: (value) => { tooltipConfig = { ...(value || {}), domain: "cn", locale: "cn" }; },
    });
  } catch {
    window.whTooltips = tooltipConfig;
  }
})();
