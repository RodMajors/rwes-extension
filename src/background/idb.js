import { DB_FILES_STORE, DB_META_STORE, DB_NAME, DB_VERSION } from "../shared/constants.js";

export function openDictionaryDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_META_STORE)) db.createObjectStore(DB_META_STORE);
      if (!db.objectStoreNames.contains(DB_FILES_STORE)) db.createObjectStore(DB_FILES_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readMeta() {
  const db = await openDictionaryDb();
  return requestResult(db.transaction(DB_META_STORE).objectStore(DB_META_STORE).get("manifest"));
}

export async function readFile(name) {
  const db = await openDictionaryDb();
  return requestResult(db.transaction(DB_FILES_STORE).objectStore(DB_FILES_STORE).get(name));
}

export async function readAllFiles() {
  const db = await openDictionaryDb();
  const store = db.transaction(DB_FILES_STORE).objectStore(DB_FILES_STORE);
  const [keys, values] = await Promise.all([requestResult(store.getAllKeys()), requestResult(store.getAll())]);
  return values.map((value, index) => ({ name: keys[index], value }));
}

export async function replaceDictionary(meta, files, staleNames = []) {
  const db = await openDictionaryDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([DB_META_STORE, DB_FILES_STORE], "readwrite");
    const fileStore = tx.objectStore(DB_FILES_STORE);
    for (const [name, bytes] of files) fileStore.put(bytes, name);
    for (const name of staleNames) fileStore.delete(name);
    tx.objectStore(DB_META_STORE).put(meta, "manifest");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("dictionary transaction aborted"));
  });
}

export async function clearDictionary() {
  const db = await openDictionaryDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([DB_META_STORE, DB_FILES_STORE], "readwrite");
    tx.objectStore(DB_META_STORE).clear();
    tx.objectStore(DB_FILES_STORE).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function dictionaryStats() {
  const meta = (await readMeta()) || { version: null, files: {} };
  const files = await readAllFiles();
  return {
    version: meta.version || null,
    build: meta.build || null,
    tableCount: files.length,
    bytes: files.reduce((sum, entry) => sum + (entry.value?.byteLength || 0), 0),
  };
}
