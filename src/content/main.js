import { getSettings, watchSettings } from "../shared/settings.js";
import browser from "webextension-polyfill";

void (async function start() {
  const extensionApi = browser;
  globalThis.chrome = extensionApi;
  globalThis.__RWES_EXTENSION__ = true;
  globalThis.__RWES_AUTO_BOOT__ = false;
  globalThis.GM_addStyle = (css) => {
    const style = document.createElement("style");
    style.textContent = css;
    (document.head || document.documentElement).append(style);
  };
  globalThis.GM_registerMenuCommand = () => {};
  globalThis.GM_xmlhttpRequest = () => {};
  const values = await getSettings();
  globalThis.GM_getValue = (key, fallback) => values[key] ?? fallback;
  globalThis.GM_setValue = (key, value) => {
    void extensionApi.storage.local.set({ [key]: value });
  };
  await import("./legacy.cjs");
  globalThis.__RWES_LEGACY_API__?.boot();
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
      globalThis.__RWES_LEGACY_API__?.setTranslationEnabled(values.translateEnabled);
    }
    if (siteSettingChanged || (translationChanged && values.translateEnabled)) location.reload();
    else applyingSettings = false;
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.dictionaryRevision) location.reload();
  });
})();
