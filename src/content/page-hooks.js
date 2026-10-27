export async function installPageHooks() {
  const hook = () => {
    window.whTooltips = window.whTooltips || {};
    window.whTooltips.domain = "cn";
    window.whTooltips.locale = "cn";
    if (window.Locale) {
      try {
        window.Locale = { getId: () => 4, getName: () => "zhcn" };
      } catch {}
    }
  };
  hook();
}
