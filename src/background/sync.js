import { DICT_SERVER_DEFAULT } from "../shared/constants.js";
import { dictionaryStats, readAllFiles, readMeta, replaceDictionary } from "./idb.js";

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((n) => n.toString(16).padStart(2, "0")).join("");
}

function baseUrl(server) {
  const value = String(server || DICT_SERVER_DEFAULT).trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(value)) throw new Error(`invalid dictionary server: ${value}`);
  return value;
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest.version !== "string" || !manifest.version) {
    throw new Error("invalid dictionary manifest version");
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error("invalid dictionary manifest files");
  }
  const names = new Set();
  for (const file of manifest.files) {
    if (!file || typeof file.name !== "string" || !/^[A-Za-z0-9_.-]+\.json\.gz$/.test(file.name)) {
      throw new Error("invalid dictionary manifest file name");
    }
    if (names.has(file.name)) throw new Error(`duplicate dictionary file: ${file.name}`);
    if (!Number.isSafeInteger(file.size) || file.size <= 0) throw new Error(`invalid ${file.name} size`);
    if (typeof file.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(file.sha256)) {
      throw new Error(`invalid ${file.name} checksum`);
    }
    names.add(file.name);
  }
  if (manifest.url_base != null && (typeof manifest.url_base !== "string" || !/^\/dict\/[A-Za-z0-9_.-]+$/.test(manifest.url_base))) {
    throw new Error("invalid dictionary manifest URL base");
  }
}

export async function syncDictionary(server = DICT_SERVER_DEFAULT) {
  try { await navigator.storage?.persist?.(); } catch {}
  const base = baseUrl(server);
  const response = await fetch(`${base}/api/v1/manifest`, { cache: "no-store" });
  if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
  const remote = await response.json();
  validateManifest(remote);
  const local = (await readMeta()) || { version: null, files: {} };
  const stored = new Set((await readAllFiles()).map(({ name }) => name));
  const remoteFiles = remote.files || [];
  const missingFromMeta = remoteFiles.some((file) => !local.files?.[file.name]);
  const changed = remoteFiles.filter((file) =>
    local.files?.[file.name] !== file.sha256 || !stored.has(file.name),
  );
  const downloaded = new Map();
  for (const file of changed) {
    const url = `${base}${remote.url_base || ""}/${encodeURIComponent(file.name)}`;
    const result = await fetch(url, { cache: "no-store" });
    if (!result.ok) throw new Error(`${file.name} HTTP ${result.status}`);
    const bytes = await result.arrayBuffer();
    if (bytes.byteLength !== file.size) throw new Error(`${file.name} size mismatch`);
    if ((await sha256Hex(bytes)) !== file.sha256) throw new Error(`${file.name} checksum mismatch`);
    downloaded.set(file.name, bytes);
  }
  const nextFiles = Object.fromEntries(remoteFiles.map((file) => [file.name, file.sha256]));
  const stale = Object.keys(local.files || {}).filter((name) => !nextFiles[name]);
  const nextMeta = { version: remote.version || null, build: remote.build || null, files: nextFiles, syncedAt: new Date().toISOString() };
  await replaceDictionary(nextMeta, downloaded, stale);
  return { ...(await dictionaryStats()), status: "latest" };
}
