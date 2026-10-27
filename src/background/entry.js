import { DICT_SERVER_DEFAULT } from "../shared/constants.js";
import { dictionaryStats, clearDictionary, readAllFiles, readMeta, readFile } from "./idb.js";
import { syncDictionary } from "./sync.js";
import browser from "webextension-polyfill";

globalThis.chrome = browser;

let syncPromise = null;
let clearPromise = null;

async function runSync() {
  if (clearPromise) await clearPromise;
  if (!syncPromise) {
    syncPromise = (async () => {
      const before = await dictionaryStats();
      const after = await syncDictionary();
      if (before.version !== after.version) await browser.storage.local.set({ dictionaryRevision: after.version || Date.now() });
      return after;
    })().finally(() => { syncPromise = null; });
  }
  return syncPromise;
}

function toBase64(bytes) {
  const view = new Uint8Array(bytes);
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < view.length; i += step) binary += String.fromCharCode(...view.subarray(i, i + step));
  return btoa(binary);
}

async function sendDictionary(message, sendResponse) {
  const files = [];
  for (const name of message.names || []) {
    const value = await readFile(name);
    if (value) files.push({ name, value: toBase64(value) });
  }
  const meta = (await readMeta()) || { version: null, build: null };
  sendResponse({ ok: true, meta, files });
}

chrome.runtime.onInstalled.addListener(() => { void runSync().catch((error) => console.warn("[RWES] initial sync failed", error)); });
chrome.runtime.onStartup?.addListener(() => { void runSync().catch((error) => console.warn("[RWES] startup sync failed", error)); });
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "sync") {
    runSync().then((stats) => sendResponse({ ok: true, stats })).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "clear") {
    if (!clearPromise) {
      clearPromise = Promise.resolve(syncPromise)
        .catch(() => {})
        .then(clearDictionary)
        .finally(() => { clearPromise = null; });
    }
    clearPromise
      .then(async () => {
        await browser.storage.local.set({ dictionaryRevision: Date.now() });
        sendResponse({ ok: true });
      })
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "stats") {
    dictionaryStats().then((stats) => sendResponse({ ok: true, stats })).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "dictionary") {
    sendDictionary(message, sendResponse).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "dictionary-names") {
    Promise.all([readAllFiles(), readMeta()]).then(([files, meta]) => sendResponse({ ok: true, names: files.map(({ name }) => name), meta }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "sync-if-empty") {
    readMeta().then(async (meta) => {
      if (!meta) return { stats: await runSync() };
      const lastCheck = Date.parse(meta.syncedAt || "");
      if (!Number.isFinite(lastCheck) || Date.now() - lastCheck > 24 * 60 * 60 * 1000) {
        try { return { stats: await runSync() }; }
        catch (error) { return { stats: await dictionaryStats(), warning: error.message }; }
      }
      return { stats: await dictionaryStats() };
    })
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  return false;
});
