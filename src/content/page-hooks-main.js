(() => {
  let tooltipConfig = { ...(window.whTooltips || {}), domain: "cn", locale: "cn" };
  let locale = { getId: () => 4, getName: () => "zhcn" };

  try {
    Object.defineProperty(window, "whTooltips", {
      configurable: true,
      enumerable: true,
      get: () => tooltipConfig,
      set: (value) => { tooltipConfig = { ...(value || {}), domain: "cn", locale: "cn" }; },
    });
    Object.defineProperty(window, "Locale", {
      configurable: true,
      enumerable: true,
      get: () => locale,
      set: () => { locale = { getId: () => 4, getName: () => "zhcn" }; },
    });
  } catch {
    window.whTooltips = tooltipConfig;
    window.Locale = locale;
  }
})();
