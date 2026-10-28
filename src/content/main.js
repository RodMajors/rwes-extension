import { getSettings, watchSettings } from "../shared/settings.js";
import browser from "webextension-polyfill";

void (async function start() {
  const extensionApi = browser;
  globalThis.chrome = extensionApi;
  globalThis.RWES_addStyle = (css) => {
    const style = document.createElement("style");
    style.textContent = css;
    (document.head || document.documentElement).append(style);
  };
  const values = await getSettings();
  globalThis.__RWES_SETTINGS__ = values;
  await import("./legacy.cjs");
  globalThis.__RWES_API__?.boot();
  let applyingSettings = false;
  watchSettings(async () => {
    if (applyingSettings) return;
    applyingSettings = true;
    const previous = { ...values };
    Object.assign(values, await getSettings());
    const siteSettingChanged = [
      "autoRedirectWowheadCN",
      "autoRedirectWCLCN",
      "autoRedirectMythicTrapCN",
      "forceTestToCN",
    ].some((key) => previous[key] !== values[key]);
    const translationChanged = previous.translateEnabled !== values.translateEnabled;
    if (translationChanged && !values.translateEnabled) {
      globalThis.__RWES_API__?.setTranslationEnabled(values.translateEnabled);
    }
    if (siteSettingChanged || (translationChanged && values.translateEnabled)) location.reload();
    else applyingSettings = false;
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.dictionaryRevision) location.reload();
  });
})();
