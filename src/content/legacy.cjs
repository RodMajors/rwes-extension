// ==UserScript==
// @name         【RodMajors】魔兽世界常用网站中文用户体验增强 (Wowhead / WCL / Raider.io 等)
// @namespace    https://github.com/RWES-RodMajors-WOW-Enhance-Script/RWES
// @version      1.0.2
// @description  Wowhead/WCL 去广告 + 自动跳转简中 + 全站 Wowhead 链接/鼠标提示强制简体中文 + 多站点支持
// @author       RodMajors
// @icon         https://wowdata.rodmajors.com/icon128.png
// @icon64       https://wowdata.rodmajors.com/icon64.png
// @match        *://*.wowhead.com/*
// @match        *://*.warcraftlogs.com/*
// @match        *://*.raider.io/*
// @match        *://*.wipefest.gg/*
// @match        *://*.bloodmallet.com/*
// @match        *://*.wowanalyzer.com/*
// @match        *://*.maxroll.gg/*
// @match        *://*.mythictrap.com/*
// @match        *://*.mythicstats.com/*
// @match        *://*.archon.gg/*
// @match        *://*.raidbots.com/*
// @match        *://liquidarmory.com/*
// @match        *://*.liquidarmory.com/*
// @match        *://questionablyepic.com/*
// @match        *://*.questionablyepic.com/*
// @match        *://*.icy-veins.com/*
// @match        *://keystoneloot.io/*
// @match        *://*.keystoneloot.io/*
// @match        *://murlok.io/*
// @match        *://*.murlok.io/*
// @match        *://lorrgs.io/*
// @match        *://*.simulationcraft.org/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      wowdata.rodmajors.com
// @run-at       document-start
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/602426/%E3%80%90RodMajors%E3%80%91%E9%AD%94%E5%85%BD%E4%B8%96%E7%95%8C%E5%B8%B8%E7%94%A8%E7%BD%91%E7%AB%99%E4%B8%AD%E6%96%87%E7%94%A8%E6%88%B7%E4%BD%93%E9%AA%8C%E5%A2%9E%E5%BC%BA%20%28Wowhead%20%20WCL%20%20Raiderio%20%E7%AD%89%29.user.js
// @updateURL https://update.greasyfork.org/scripts/602426/%E3%80%90RodMajors%E3%80%91%E9%AD%94%E5%85%BD%E4%B8%96%E7%95%8C%E5%B8%B8%E7%94%A8%E7%BD%91%E7%AB%99%E4%B8%AD%E6%96%87%E7%94%A8%E6%88%B7%E4%BD%93%E9%AA%8C%E5%A2%9E%E5%BC%BA%20%28Wowhead%20%20WCL%20%20Raiderio%20%E7%AD%89%29.meta.js
// ==/UserScript==

const { installWowhead } = require("./sites/wowhead.cjs");
const { installWarcraftLogs } = require("./sites/warcraftlogs.cjs");
const { installRaiderIo } = require("./sites/raiderio.cjs");
const { installWowAnalyzer } = require("./sites/wowanalyzer.cjs");
const { installMaxroll } = require("./sites/maxroll.cjs");

const api = (function () {
    "use strict";

    // ==================== 词典纯逻辑 ====================

    const TYPE_TABLE = {
        item: "itemsparse",
        spell: "spellname",
        npc: "creature",
        zone: "areatable",
        quest: "questinfo",
        achievement: "achievement",
        currency: "currencytypes",
    };

    const NAME_TABLES = [
        "itemsparse",
        "spellname",
        "map",
        "areatable",
        "journalencounter",
        "journalinstance",
        "keystoneaffix",
        "chrspecialization",
        "specclass",
        "traitsubtree",
        "traitdefinition",
        "chrclasses",
        "chrraces",
        "achievement",
        "questinfo",
        "currencytypes",
        "uichromietimeexpansioninfo",
        "journaltier",
        "battlemasterlist",
        "covenant",
        "professionrating",
        "creaturetype",
        "creaturefamily",
        "battlepetability",
        "spellshapeshiftform",
        "lfgdungeons",
        "pvpbrawl",
        "pvptier",
        "scenario",
        "soulbind",
        "spelldispeltype",
        "mount",
    ];

    const REQUIRED_TABLES = Array.from(new Set([
        ...NAME_TABLES,
        ...Object.values(TYPE_TABLE),
        "custom",
    ])).map(function (name) { return name + ".json.gz"; });

    function diffManifest(localMeta, remote) {
        const toDownload = [];
        for (const f of remote.files || []) {
            if (!localMeta.files || localMeta.files[f.name] !== f.sha256) {
                toDownload.push(f);
            }
        }
        return {
            versionChanged: localMeta.version !== remote.version,
            toDownload: toDownload,
            remote: remote,
        };
    }

    function listStaleTables(localFiles, remoteFiles) {
        const remote = new Set(
            (remoteFiles || []).map(function (f) {
                return f.name;
            }),
        );
        return Object.keys(localFiles || {}).filter(function (n) {
            return !remote.has(n);
        });
    }

    function parseArtifact(obj) {
        return {
            byId: new Map(Object.entries((obj && obj.id) || {})),
            byEn: new Map(Object.entries((obj && obj.en) || {})),
        };
    }

    function lookupId(index, id) {
        if (!index) return null;
        return index.byId.get(String(id)) || null;
    }

    function lookupEn(index, name, minLen) {
        if (!index) return null;
        const n = String(name).trim().toLowerCase();
        if (!n || n.length < (minLen || 1)) return null;
        return index.byEn.get(n) || null;
    }

    function extractWowheadId(url) {
        if (!url) return null;
        const s = String(url);
        const m =
            /wowhead\.com\/(?:cn\/)?(?:mop-classic\/)?(item|spell|npc|zone|quest|achievement|currency)=(\d+)/i.exec(
                s,
            ) ||
            /^(item|spell|npc|zone|quest|achievement|currency)=(\d+)/i.exec(s);
        if (!m) return null;
        return { type: m[1].toLowerCase(), id: m[2] };
    }

    function serverBaseUrl(url) {
        if (!url) return null;
        const s = String(url).trim().replace(/\/+$/, "");
        if (!/^https?:\/\//i.test(s)) return null;
        return s;
    }

    function findNameZh(indexes, text, minLen) {
        for (const t of NAME_TABLES) {
            const zh = lookupEn(indexes[t + ".json.gz"], text, minLen);
            if (zh) return zh;
        }
        return null;
    }

    const NAME_BLOCKLIST = new Set([
        "archon",
        "bloodmallet",
        "warcraftlogs",
        "raidbots",
        "wowhead",
        "wipefest",
        "keystoneloot",
        "murlok",
        "questionablyepic",
        "liquidarmory",
        "maxroll",
        "wowanalyzer",
        "icy-veins",
        "lorrgs",
    ]);

    // ==================== 翻译管线(纯逻辑) ====================

    const SUFFIX_CN = {
        Crit: "暴击",
        Haste: "急速",
        Mastery: "精通",
        Versatility: "全能",
        Vers: "全能",
        Violence: "暴戾协奏",
        Predation: "掠速协奏",
        Sustenance: "给养协奏",
        Blood: "鲜血",
        Aoe: "群体",
        AoE: "群体",
        ST: "单体",
        St: "单体",
        Damage: "伤害",
        Heal: "治疗",
        Proc: "触发",
        Buff: "增益",
        Absorb: "吸收",
        Old: "旧赛季",
        OldSeason: "旧赛季",
        Legacy: "旧赛季",
    };

    const PREFIX_RULES = [
        [/^WoW version\s*/i, "魔兽世界版本 "],
        [/^Last updated\s*/i, "最后更新 "],
        [/^Last Updated\s*/, "最后更新 "],
        [/^Check out the\s*/i, "查看 "],
        [/^Sim style\s*/i, "模拟模式 "],
        [/^Item level\s*/i, "物品等级 "],
        [/^Average item level\s*/i, "平均物品等级 "],
        [/^Profile\s*[:：]\s*/i, "配置方案："],
        [/^Talents\s*[:：]\s*/i, "天赋："],
        [/^Loot Spec:\s*/i, "掉落专精："],
    ];

    function splitSuffix(name) {
        if (!name) return { base: name, suffix: null };
        const m = /^(.*?)\s*[\(\[]([^\)\]]+)[\)\]]\s*$/.exec(String(name));
        if (!m) return { base: String(name).trim(), suffix: null };
        return { base: m[1].trim(), suffix: m[2] };
    }

    function translateText(text, indexes) {
        if (!text) return null;
        const t = String(text).trim();
        if (!t || t.length < 3 || /[\u4e00-\u9fff]/.test(t)) return null;

        // 1) custom UI 词条(custom.json.gz 上线后生效,minLen 2)
        let out = lookupEn(indexes["custom.json.gz"], t, 2);
        // 2) 全名查找(物品/法术/地图/…含 specclass 组合词,minLen 3;黑名单品牌词跳过)
        if (!out && !NAME_BLOCKLIST.has(t.toLowerCase()))
            out = findNameZh(indexes, t, 3);
        // 3) 后缀拆分:"Name (Crit)" -> "名称(暴击)"
        if (!out) {
            const sp = splitSuffix(t);
            if (sp.suffix && !NAME_BLOCKLIST.has(sp.base.toLowerCase())) {
                const baseZh = findNameZh(indexes, sp.base, 3);
                if (baseZh) {
                    const sf =
                        SUFFIX_CN[sp.suffix] ||
                        SUFFIX_CN[sp.suffix.toLowerCase()] ||
                        null;
                    if (sf) out = baseZh + "(" + sf + ")";
                }
            }
        }
        // 4) 前缀规则(固定文案 + 变量)
        if (!out) {
            for (const rule of PREFIX_RULES) {
                if (rule[0].test(t)) {
                    out = t.replace(rule[0], rule[1]);
                    break;
                }
            }
        }
        return out;
    }

    // ==================== 词典存储与同步(浏览器侧) ====================

    const DB_NAME = "rwes-dict";
    const DB_VERSION = 1;

    function openDb() {
        return new Promise(function (resolve, reject) {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function () {
                const db = req.result;
                if (!db.objectStoreNames.contains("meta"))
                    db.createObjectStore("meta");
                if (!db.objectStoreNames.contains("files"))
                    db.createObjectStore("files");
            };
            req.onsuccess = function () {
                resolve(req.result);
            };
            req.onerror = function () {
                reject(req.error);
            };
        });
    }

    function idbGet(db, store, key) {
        return new Promise(function (resolve, reject) {
            const tx = db.transaction(store, "readonly");
            const req = tx.objectStore(store).get(key);
            req.onsuccess = function () {
                resolve(req.result);
            };
            req.onerror = function () {
                reject(req.error);
            };
        });
    }

    function idbPut(db, store, key, value) {
        return new Promise(function (resolve, reject) {
            const tx = db.transaction(store, "readwrite");
            tx.objectStore(store).put(value, key);
            tx.oncomplete = function () {
                resolve();
            };
            tx.onerror = function () {
                reject(tx.error);
            };
        });
    }

    function idbClearStore(db, store) {
        return new Promise(function (resolve, reject) {
            const tx = db.transaction(store, "readwrite");
            tx.objectStore(store).clear();
            tx.oncomplete = function () {
                resolve();
            };
            tx.onerror = function () {
                reject(tx.error);
            };
        });
    }

    function idbDelete(db, store, key) {
        return new Promise(function (resolve, reject) {
            const tx = db.transaction(store, "readwrite");
            tx.objectStore(store).delete(key);
            tx.oncomplete = function () {
                resolve();
            };
            tx.onerror = function () {
                reject(tx.error);
            };
        });
    }

    function gmFetch(url, responseType) {
        return new Promise(function (resolve, reject) {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                responseType: responseType,
                nocache: true,
                timeout: 60000,
                onload: function (r) {
                    if (r.status >= 200 && r.status < 300) resolve(r.response);
                    else reject(new Error("HTTP " + r.status));
                },
                onerror: function () {
                    reject(new Error("network error"));
                },
                ontimeout: function () {
                    reject(new Error("timeout"));
                },
            });
        });
    }

    async function gunzipJson(arrayBuffer) {
        const ds = new DecompressionStream("gzip");
        const stream = new Blob([arrayBuffer]).stream().pipeThrough(ds);
        const buf = await new Response(stream).arrayBuffer();
        return JSON.parse(new TextDecoder("utf-8").decode(buf));
    }

    function rebuildIndexes(db, state) {
        return new Promise(function (resolve, reject) {
            const tx = db.transaction("files", "readonly");
            const req = tx.objectStore("files").getAllKeys();
            req.onsuccess = function () {
                const keys = req.result || [];
                keys.forEach(function (name) {
                    const get = tx.objectStore("files").get(name);
                    get.onsuccess = function () {
                        state.indexes[name] = parseArtifact(get.result);
                    };
                });
            };
            tx.oncomplete = function () {
                resolve();
            };
            tx.onerror = function () {
                reject(tx.error);
            };
        });
    }

    async function syncDictionary(state) {
        if (typeof globalThis !== "undefined" && globalThis.__RWES_EXTENSION__) {
            const settings = await chrome.storage.local.get("translateEnabled");
            if (settings.translateEnabled === false) return null;
            const syncState = await chrome.runtime.sendMessage({ type: "sync-if-empty" });
            if (!syncState || !syncState.ok) throw new Error((syncState && syncState.error) || "dictionary check failed");
            let listing = await chrome.runtime.sendMessage({ type: "dictionary-names" });
            if (!listing || !listing.ok) throw new Error((listing && listing.error) || "dictionary unavailable");
            let names = (listing.names || []).filter(function (name) { return REQUIRED_TABLES.includes(name); });
            if (!names.length) {
                const synced = await chrome.runtime.sendMessage({ type: "sync" });
                if (!synced || !synced.ok) throw new Error((synced && synced.error) || "dictionary sync failed");
                listing = await chrome.runtime.sendMessage({ type: "dictionary-names" });
                if (!listing || !listing.ok) throw new Error("dictionary unavailable");
                names = (listing.names || []).filter(function (name) { return REQUIRED_TABLES.includes(name); });
            }
            for (let i = 0; i < names.length; i += 1) {
                const batch = [names[i]];
                const response = await chrome.runtime.sendMessage({ type: "dictionary", names: batch });
                if (!response || !response.ok) throw new Error((response && response.error) || "dictionary unavailable");
                for (const entry of response.files || []) {
                    const binary = atob(entry.value);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                    const obj = await gunzipJson(bytes.buffer);
                    state.indexes[entry.name] = parseArtifact(obj);
                }
            }
            if (!Object.keys(state.indexes).length) throw new Error("dictionary cache is empty");
            return listing.meta || null;
        }
        const base = serverBaseUrl(state.server);
        if (!base) {
            throw new Error(
                "dictServer 缺少 http(s):// 协议,当前值: " + state.server,
            );
        }
        const db = await openDb();
        const remote = await gmFetch(base + "/api/v1/manifest", "json");
        const urlBase = base + (remote.url_base || "");
        remote.files.forEach(function (f) {
            f.url = urlBase + "/" + f.name;
        });

        const localMeta = (await idbGet(db, "meta", "manifest")) || {
            version: null,
            files: {},
        };
        const diff = diffManifest(localMeta, remote);

        if (diff.toDownload.length) {
            for (const f of diff.toDownload) {
                const buf = await gmFetch(f.url, "arraybuffer");
                const obj = await gunzipJson(buf);
                await idbPut(db, "files", f.name, obj);
                localMeta.files[f.name] = f.sha256;
            }
        }

        const stale = listStaleTables(localMeta.files, remote.files);
        for (const name of stale) {
            await idbDelete(db, "files", name);
            delete localMeta.files[name];
        }

        localMeta.version = remote.version;
        await idbPut(db, "meta", "manifest", localMeta);
        await rebuildIndexes(db, state);
        return db;
    }

    // ==================== 站点适配器 ====================

    const DICT_SERVER_DEFAULT = "https://wowdata.rodmajors.com"; // 生产环境

    function attrIdRef(el) {
        const attrs = ["data-item-id", "data-itemid"];
        for (const a of attrs) {
            const v = el.getAttribute(a);
            if (v && /^\d+$/.test(v)) return { type: "item", id: v };
        }
        return null;
    }

    // ==================== DOM 翻译引擎 ====================

    const TRANSLATED_ATTR = "data-rwes-zh";

    function markEl(el) {
        el.setAttribute(TRANSLATED_ATTR, "1");
    }

    function firstNonCJKLeaf(root) {
        if (!root || !root.querySelectorAll) return null;
        const els = root.querySelectorAll("*");
        for (let i = 0; i < els.length; i++) {
            const el = els[i];
            if (el.children.length) continue;
            if (el.closest && el.closest("[class*='tooltip']")) continue;
            const t = (el.textContent || "").trim();
            if (
                t &&
                !/[\u4e00-\u9fff]/.test(t) &&
                /[A-Za-z]/.test(t) &&
                t.length < 100
            )
                return el;
        }
        return null;
    }

    function translateItemLink(el, state) {
        if (el.getAttribute(TRANSLATED_ATTR) === "1") return false;
        const href = el.getAttribute("href") || "";
        const ref =
            extractWowheadId(href) ||
            extractWowheadId(el.getAttribute("data-wowhead"));
        if (!ref) return false;
        const table = TYPE_TABLE[ref.type];
        const idx = table && state.indexes[table + ".json.gz"];
        if (!idx) return false;
        const zh = lookupId(idx, ref.id);
        if (!zh) return false;

        let changed = false;
        // 1) 直接子文本节点(文本等于英文名才替换)
        for (const node of Array.from(el.childNodes)) {
            if (node.nodeType !== 3) continue;
            const raw = node.nodeValue;
            if (!raw || !raw.trim()) continue;
            const t = raw.trim();
            if (lookupEn(idx, t, 1) === zh) {
                node.nodeValue = raw.replace(t, zh);
                changed = true;
            }
        }
        // 2) 图标链接:链接内非中文叶子(文本须命中英文名)
        if (!changed) {
            const leaf = firstNonCJKLeaf(el);
            const leafText = leaf && (leaf.textContent || "").trim();
            if (leafText && lookupEn(idx, leafText, 1) === zh) {
                leaf.textContent = zh;
                changed = true;
            }
        }
        // 3) 兄弟节点兜底(图标链接 + 名字 span 并排,如 QE Live/murlok;文本须命中英文名)
        if (!changed) {
            const parent = el.parentElement;
            if (parent) {
                for (const sib of Array.from(parent.children)) {
                    if (sib === el || sib.tagName === "A") continue;
                    const leaf = firstNonCJKLeaf(sib);
                    const leafText = leaf && (leaf.textContent || "").trim();
                    if (!leafText || lookupEn(idx, leafText, 1) !== zh)
                        continue;
                    leaf.textContent = zh;
                    changed = true;
                    break;
                }
            }
        }
        if (changed) markEl(el);
        return changed;
    }

    function translateDataWowhead(el, state) {
        if (el.getAttribute(TRANSLATED_ATTR) === "1") return false;
        const ref =
            extractWowheadId(el.getAttribute("data-wowhead")) ||
            (el.tagName === "A" ? extractWowheadId(el.href) : null) ||
            attrIdRef(el);
        if (!ref) return false;
        const table = TYPE_TABLE[ref.type];
        const idx = table && state.indexes[table + ".json.gz"];
        if (!idx) return false;
        const zh = lookupId(idx, ref.id);
        if (!zh) return false;
        const t = (el.textContent || "").trim();
        if (!t) {
            markEl(el);
            return false;
        } // 纯图标元素(如 raidbots 35px 图标链接):不注入文本,避免吞掉 <img>
        if (/[\u4e00-\u9fff]/.test(t)) {
            markEl(el);
            return false;
        }
        if (lookupEn(idx, t, 1) !== zh) return false;
        el.textContent = zh;
        markEl(el);
        return true;
    }

    function translateAttrs(root, state) {
        root.querySelectorAll("[title], [alt], [placeholder]").forEach(
            function (el) {
                const attr = el.hasAttribute("title")
                    ? "title"
                    : el.hasAttribute("alt")
                      ? "alt"
                      : "placeholder";
                const v = el.getAttribute(attr);
                if (!v || !v.trim() || /[\u4e00-\u9fff]/.test(v)) return;
                const t = v.trim();
                if (t.length > 120) return;
                const out = translateText(t, state.indexes);
                if (out && out !== t) el.setAttribute(attr, out);
            },
        );
    }

    function scanTextNodes(root, state) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                if (!node.nodeValue || !node.nodeValue.trim())
                    return NodeFilter.FILTER_REJECT;
                const p = node.parentElement;
                if (!p) return NodeFilter.FILTER_REJECT;
                const tag = p.tagName;
                if (
                    tag === "SCRIPT" ||
                    tag === "STYLE" ||
                    tag === "NOSCRIPT" ||
                    tag === "TEXTAREA"
                )
                    return NodeFilter.FILTER_REJECT;
                if (
                    p.closest &&
                    p.closest("script,style,textarea,[contenteditable='true']")
                )
                    return NodeFilter.FILTER_REJECT;
                const t = node.nodeValue.trim();
                if (t.length > 200 || !/[A-Za-z]/.test(t))
                    return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            },
        });
        const nodes = [];
        let cur;
        while ((cur = walker.nextNode())) nodes.push(cur);
        let count = 0;
        for (const node of nodes) {
            const raw = node.nodeValue;
            const t = raw.trim();
            let out = null;
            // 截断名兜底:"Name of..." -> 行内容器里的 item 链接按 ID 翻译
            if (/(\.{2,3}|…)$/.test(t)) {
                const parent = node.parentElement;
                const row =
                    parent &&
                    (parent.closest("div,li,td,tr") || parent.parentElement);
                const link = row && row.querySelector('a[href*="item="]');
                if (link) {
                    const ref = extractWowheadId(
                        link.getAttribute("href") || "",
                    );
                    const table = ref && TYPE_TABLE[ref.type];
                    const idx = table && state.indexes[table + ".json.gz"];
                    const zh = idx && lookupId(idx, ref.id);
                    if (zh) out = zh;
                }
            }
            if (!out) out = translateText(t, state.indexes);
            if (out && out !== t) {
                node.nodeValue = raw.replace(t, out);
                markEl(node.parentElement);
                count++;
            }
        }
        return count;
    }

    function applyTranslations(root, state) {
        if (!state.indexes) return;
        const scope = root || document.body;
        scope
            .querySelectorAll('a[href*="item="], a[href*="spell="]')
            .forEach(function (el) {
                translateItemLink(el, state);
            });
        scope
            .querySelectorAll("[data-wowhead], [data-item-id], [data-itemid]")
            .forEach(function (el) {
                translateDataWowhead(el, state);
            });
        translateAttrs(scope, state);
        scanTextNodes(scope, state);
    }

    let scanTimer = null;
    let translationEnabled = true;
    function scheduleScan(state, delay) {
        clearTimeout(scanTimer);
        scanTimer = setTimeout(
            function () {
                if (!translationEnabled) return;
                const root = document.body || document.documentElement;
                if (!root) return;
                try {
                    applyTranslations(root, state);
                } catch (e) {
                    console.warn("[RWES] 扫描失败:", e);
                }
            },
            delay == null ? 150 : delay,
        );
    }

    function boot() {
        // ==================== 配置 ====================
        const CONFIG = {
            // 是否自动把 Wowhead 页面跳转到简体中文
            autoRedirectWowheadCN: GM_getValue("autoRedirectWowheadCN", true),
            // 是否自动把 WCL 跳转到 cn 子域名(新增/强化)
            autoRedirectWCLCN: GM_getValue("autoRedirectWCLCN", true),
            // 是否把测试服链接也强制改成正式服简中(谨慎开启)
            forceTestToCN: GM_getValue("forceTestToCN", false),
        };

        // 注册油猴菜单
        if (!(typeof globalThis !== "undefined" && globalThis.__RWES_EXTENSION__)) GM_registerMenuCommand(
            (CONFIG.autoRedirectWowheadCN ? "✅" : "❌") +
                " Wowhead 自动跳转简中",
            () => {
                CONFIG.autoRedirectWowheadCN = !CONFIG.autoRedirectWowheadCN;
                GM_setValue(
                    "autoRedirectWowheadCN",
                    CONFIG.autoRedirectWowheadCN,
                );
                location.reload();
            },
        );
        if (!(typeof globalThis !== "undefined" && globalThis.__RWES_EXTENSION__)) GM_registerMenuCommand(
            (CONFIG.autoRedirectWCLCN ? "✅" : "❌") + " WCL 自动跳转 cn",
            () => {
                CONFIG.autoRedirectWCLCN = !CONFIG.autoRedirectWCLCN;
                GM_setValue("autoRedirectWCLCN", CONFIG.autoRedirectWCLCN);
                location.reload();
            },
        );
        if (!(typeof globalThis !== "undefined" && globalThis.__RWES_EXTENSION__)) GM_registerMenuCommand(
            (CONFIG.forceTestToCN ? "✅" : "❌") +
                " 测试服链接强制改正式服简中",
            () => {
                CONFIG.forceTestToCN = !CONFIG.forceTestToCN;
                GM_setValue("forceTestToCN", CONFIG.forceTestToCN);
                location.reload();
            },
        );

        const host = location.hostname;

        // ==================== 各站点特判 ====================
        if (host.includes("wowhead.com") && installWowhead(CONFIG)) return;
        if (host.includes("warcraftlogs.com") && installWarcraftLogs(CONFIG)) return;
        if (host.includes("raider.io")) installRaiderIo();
        if (host.includes("wowanalyzer.com")) installWowAnalyzer();
        if (host.includes("maxroll.gg")) installMaxroll();

        // ==================== 6. 全站 Wowhead 链接 + 鼠标提示强制简中 ====================
        // 设置全局 tooltip 域名为简中
        window.whTooltips = window.whTooltips || {};
        window.whTooltips.domain = "cn";
        window.whTooltips.locale = "cn";

        /**
         * 把任意 Wowhead URL 转成简体中文版本
         */
        function toCNWowheadUrl(url) {
            if (!url || typeof url !== "string") return url;
            if (!/wowhead\.com/i.test(url)) return url;

            // 测试服特殊处理
            const testRegex = /wowhead\.com\/(beta|ptr|ptr-2|alpha)(\/|$)/i;
            if (testRegex.test(url)) {
                if (CONFIG.forceTestToCN) {
                    url = url.replace(testRegex, "wowhead.com/cn$2");
                } else {
                    return url;
                }
            }

            // 子域名 → www.wowhead.com/cn
            url = url.replace(
                /^(https?:\/\/)(?:tw|de|es|mx|fr|it|pt|ru|ko|cn)\.wowhead\.com/i,
                "$1www.wowhead.com/cn",
            );

            // 路径语言段 → /cn/
            url = url.replace(
                /(wowhead\.com\/)(?:tw|de|es|mx|fr|it|pt|ru|ko)(\/|$)/i,
                "$1cn$2",
            );

            // 没有语言段时插入 /cn
            if (!/wowhead\.com\/cn(\/|$)/i.test(url)) {
                url = url.replace(
                    /(wowhead\.com)(\/(?:classic|sod|cata|mop|tbc|wrath)?)?(\/|$)/i,
                    "$1$2/cn$3",
                );
            }

            // 升级 http → https
            url = url.replace(/^http:/i, "https:");

            return url;
        }

        /**
         * 处理单个 a 标签或带 data-wowhead 的元素
         */
        function processElement(el) {
            // 处理 href
            if (
                el.tagName === "A" &&
                el.href &&
                /wowhead\.com/i.test(el.href)
            ) {
                const newHref = toCNWowheadUrl(el.href);
                if (newHref !== el.href) {
                    el.href = newHref;
                }
            }

            // 处理 data-wowhead
            if (el.hasAttribute("data-wowhead")) {
                let data = el.getAttribute("data-wowhead");
                if (/domain=/i.test(data)) {
                    data = data.replace(/domain=[a-z-]+/i, "domain=cn");
                } else {
                    data = (data ? data + "&" : "") + "domain=cn";
                }
                el.setAttribute("data-wowhead", data);
            }
        }

        /**
         * 扫描并处理页面上所有相关链接
         */
        function convertAllWowheadLinks() {
            document
                .querySelectorAll('a[href*="wowhead.com"]')
                .forEach(processElement);
            document.querySelectorAll("[data-wowhead]").forEach(processElement);
        }

        // 初始执行 + 监听动态内容
        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                convertAllWowheadLinks,
            );
        } else {
            convertAllWowheadLinks();
        }

        const linkObserver = new MutationObserver((mutations) => {
            let needScan = false;
            for (const m of mutations) {
                if (m.addedNodes.length) {
                    needScan = true;
                    break;
                }
            }
            if (needScan) convertAllWowheadLinks();
        });
        linkObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });

        // 延迟再扫几次(适配 SPA)
        setTimeout(convertAllWowheadLinks, 2000);
        setTimeout(convertAllWowheadLinks, 5000);

        // ==================== 自动翻译(新) ====================
        const CONFIG_TRANSLATE = {
            translateEnabled:
                typeof GM_getValue === "function"
                    ? GM_getValue("translateEnabled", true)
                    : false,
            dictServer:
                typeof GM_getValue === "function"
                    ? GM_getValue("dictServer", DICT_SERVER_DEFAULT)
                    : DICT_SERVER_DEFAULT,
        };
        translationEnabled = CONFIG_TRANSLATE.translateEnabled;

        if (!(typeof globalThis !== "undefined" && globalThis.__RWES_EXTENSION__)) GM_registerMenuCommand(
            (CONFIG_TRANSLATE.translateEnabled ? "✅" : "❌") +
                " 自动翻译英文名词",
            function () {
                CONFIG_TRANSLATE.translateEnabled =
                    !CONFIG_TRANSLATE.translateEnabled;
                GM_setValue(
                    "translateEnabled",
                    CONFIG_TRANSLATE.translateEnabled,
                );
                location.reload();
            },
        );
        if (!(typeof globalThis !== "undefined" && globalThis.__RWES_EXTENSION__)) GM_registerMenuCommand("清空词典缓存", function () {
            openDb()
                .then(function (db) {
                    return Promise.all([
                        idbClearStore(db, "files"),
                        idbClearStore(db, "meta"),
                    ]);
                })
                .catch(function (e) {
                    console.warn("[RWES] 清空词典缓存失败:", e);
                })
                .finally(function () {
                    location.reload();
                });
        });

        const dictState = { server: CONFIG_TRANSLATE.dictServer, indexes: {} };

        if (
            CONFIG_TRANSLATE.translateEnabled &&
            (typeof GM_xmlhttpRequest === "function" || (typeof globalThis !== "undefined" && globalThis.__RWES_EXTENSION__))
        ) {
            syncDictionary(dictState)
                .then(function () {
                    scheduleScan(dictState, 0);
                    const dictObserver = new MutationObserver(function (
                        mutations,
                    ) {
                        let hit = false;
                        for (const m of mutations) {
                            if (m.addedNodes.length) {
                                hit = true;
                                break;
                            }
                            if (m.type === "characterData") {
                                hit = true;
                                break;
                            }
                        }
                        if (hit) scheduleScan(dictState, 150);
                    });
                    dictObserver.observe(document.documentElement, {
                        childList: true,
                        subtree: true,
                        characterData: true,
                    });
                    window.addEventListener("popstate", function () {
                        scheduleScan(dictState, 150);
                    });
                    window.addEventListener(
                        "click",
                        function () {
                            scheduleScan(dictState, 200);
                        },
                        true,
                    );
                })
                .catch(function (e) {
                    console.warn("[RWES] 词典同步失败:", e);
                });
        }
    }

    return {
        boot: boot,
        setTranslationEnabled: function (enabled) {
            translationEnabled = Boolean(enabled);
            if (!translationEnabled) clearTimeout(scanTimer);
        else if (typeof globalThis.__RWES_EXTENSION__ === "undefined") scheduleScan({ indexes: {} }, 0);
        },
        diffManifest: diffManifest,
        listStaleTables: listStaleTables,
        translateText: translateText,
        splitSuffix: splitSuffix,
        NAME_BLOCKLIST: NAME_BLOCKLIST,
        SUFFIX_CN: SUFFIX_CN,
        PREFIX_RULES: PREFIX_RULES,
        parseArtifact: parseArtifact,
        lookupId: lookupId,
        lookupEn: lookupEn,
        extractWowheadId: extractWowheadId,
        serverBaseUrl: serverBaseUrl,
        findNameZh: findNameZh,
        TYPE_TABLE: TYPE_TABLE,
        syncDictionary: syncDictionary,
        gunzipJson: gunzipJson,
        openDb: openDb,
    };
})();
module.exports = api;
globalThis.__RWES_LEGACY_API__ = api;
