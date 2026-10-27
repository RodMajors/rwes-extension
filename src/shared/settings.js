import { SETTINGS_DEFAULTS } from "./constants.js";
import browser from "webextension-polyfill";

export async function getSettings() {
  const stored = await browser.storage.local.get(SETTINGS_DEFAULTS);
  return { ...SETTINGS_DEFAULTS, ...stored };
}

export function watchSettings(callback) {
  const listener = (changes, area) => {
    if (area !== "local") return;
    const relevant = Object.keys(SETTINGS_DEFAULTS).some((key) => changes[key]);
    if (relevant) callback();
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

export async function setSetting(key, value) {
  if (!(key in SETTINGS_DEFAULTS)) throw new Error(`unknown setting: ${key}`);
  await browser.storage.local.set({ [key]: Boolean(value) });
}
