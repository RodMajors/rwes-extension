import { getSettings, setSetting } from "../shared/settings.js";
import browser from "webextension-polyfill";

const $ = (selector) => document.querySelector(selector);
const status = $("#status");
const formatBytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

async function refreshStats() {
  const response = await browser.runtime.sendMessage({ type: "stats" });
  if (!response?.ok) throw new Error(response?.error || "状态读取失败");
  $("#version").textContent = response.stats.version || "尚未同步";
  $("#cache").textContent = response.stats.tableCount
    ? `${formatBytes(response.stats.bytes)} · ${response.stats.tableCount} 张表`
    : "无本地缓存";
}

async function runSync() {
  status.textContent = "正在同步…";
  status.removeAttribute("data-error");
  $("#sync").disabled = true;
  try {
    const result = await browser.runtime.sendMessage({ type: "sync" });
    if (!result?.ok) throw new Error(result?.error || "同步失败");
    status.textContent = "已是最新";
  } catch (error) {
    status.textContent = error.message;
    status.dataset.error = "true";
  } finally {
    $("#sync").disabled = false;
    await refreshStats().catch(() => {});
  }
}

async function init() {
  $("#app-version").textContent = `v${browser.runtime.getManifest().version}`;
  const settings = await getSettings();
  document.querySelectorAll("[data-setting]").forEach((input) => {
    input.checked = Boolean(settings[input.dataset.setting]);
    input.addEventListener("change", () => { void setSetting(input.dataset.setting, input.checked); });
  });
  $("#sync").addEventListener("click", () => void runSync());
  $("#clear").addEventListener("click", async () => {
    if (!confirm("清空本地词典缓存？")) return;
    const result = await browser.runtime.sendMessage({ type: "clear" });
    if (!result?.ok) { status.textContent = result?.error || "清理失败"; status.dataset.error = "true"; return; }
    status.textContent = "缓存已清空";
    await refreshStats();
  });
  try { await refreshStats(); status.textContent = "已缓存"; }
  catch (error) { status.textContent = error.message; status.dataset.error = "true"; }
}
void init();
