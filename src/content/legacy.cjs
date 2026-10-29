
const { installWowhead, toChineseWowheadUrl } = require("./sites/wowhead.cjs");
const { installWarcraftLogs } = require("./sites/warcraftlogs.cjs");
const { installRaiderIo } = require("./sites/raiderio.cjs");
const { installWowAnalyzer } = require("./sites/wowanalyzer.cjs");
const { installMaxroll } = require("./sites/maxroll.cjs");
const { installMythicTrap } = require("./sites/mythictrap.cjs");
const { installRaidbots } = require("./sites/raidbots.cjs");
const { installLiquidArmory } = require("./sites/liquidarmory.cjs");
const { installIcyVeins } = require("./sites/icyveins.cjs");
const { installKeystoneLoot } = require("./sites/keystoneloot.cjs");
const { installMurlok } = require("./sites/murlok.cjs");
const { siteMatches, siteDictionaryForHost } = require("../shared/sites.cjs");

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
        const byId = new Map(Object.entries((obj && obj.id) || {}));
        const byEn = new Map(
            Object.entries((obj && obj.en) || {}).map(function (entry) {
                return [normalizeVisibleText(entry[0]).toLowerCase(), entry[1]];
            }),
        );
        const byBlock = new Map(
            Object.entries((obj && obj.blocks) || {}).map(function (entry) {
                return [normalizeVisibleText(entry[0]).toLowerCase(), entry[1]];
            }),
        );
        const byZh = new Map();
        for (const [id, zh] of byId) {
            if (typeof zh === "string" && zh.trim()) {
                const ids = byZh.get(zh.trim()) || [];
                ids.push(id);
                byZh.set(zh.trim(), ids);
            }
        }
        return {
            byId: byId,
            byEn: byEn,
            byBlock: byBlock,
            byZh: byZh,
        };
    }

    function lookupId(index, id) {
        if (!index) return null;
        return index.byId.get(String(id)) || null;
    }

    function lookupEn(index, name, minLen) {
        if (!index) return null;
        const n = normalizeVisibleText(name).toLowerCase();
        if (!n || n.length < (minLen || 1)) return null;
        return index.byEn.get(n) || null;
    }

    function normalizeVisibleText(value) {
        return String(value == null ? "" : value)
            .replace(/[\s\u00a0]+/g, " ")
            .trim();
    }

    function lookupBlock(index, text) {
        if (!index || !index.byBlock) return null;
        const key = normalizeVisibleText(text).toLowerCase();
        return key ? index.byBlock.get(key) || null : null;
    }

    function lookupZhId(index, name) {
        if (!index || !index.byZh || !name) return null;
        const ids = index.byZh.get(String(name).trim());
        return ids && ids[0] || null;
    }

    function lookupZhIds(index, name) {
        if (!index || !index.byZh || !name) return [];
        return (index.byZh.get(String(name).trim()) || []).slice();
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

    function findNameZh(indexes, text, minLen) {
        for (const t of NAME_TABLES) {
            const zh = lookupEn(indexes[t + ".json.gz"], text, minLen);
            if (zh) return zh;
        }
        return null;
    }

    function lookupIdWithSiteOverride(index, id, indexes) {
        const siteDictionary = siteDictionaryForHost(location.hostname);
        return lookupId(siteDictionary ? indexes[siteDictionary] : null, id) || lookupId(index, id);
    }

    function lookupEnWithSiteOverride(index, name, minLen, indexes) {
        const siteDictionary = siteDictionaryForHost(location.hostname);
        return lookupEn(siteDictionary ? indexes[siteDictionary] : null, name, minLen) || lookupEn(index, name, minLen);
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

        // 1) 当前站点专属词条优先于全局词条,允许相同英文在不同站点采用不同译法。
        const siteDictionary = siteDictionaryForHost(typeof location !== "undefined" ? location.hostname : "");
        let out = siteDictionary ? lookupEn(indexes[siteDictionary], t, 2) : null;
        // 2) 通用 UI 词条
        if (!out) out = lookupEn(indexes["custom.json.gz"], t, 2);
        // 3) 全名查找(物品/法术/地图/…含 specclass 组合词,minLen 3;黑名单品牌词跳过)
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

    function spellDescriptionTemplate(text, spellId, indexes) {
        const artifact = indexes["spelldescription.json.gz"];
        const candidates = [];
        const queued = [String(spellId)];
        const seen = new Set();
        while (queued.length && seen.size < 32) {
            const id = queued.shift();
            if (seen.has(id)) continue;
            seen.add(id);
            candidates.push(id);
            const spell = artifact && artifact.byId.get(id);
            for (const locale of ["en", "zh"]) {
                const description = spell && spell.Description && spell.Description[locale];
                if (!description) continue;
                for (const match of description.matchAll(/\$@spelldesc(\d+)/gi)) {
                    if (!seen.has(match[1])) queued.push(match[1]);
                }
            }
        }
        for (const candidateId of candidates) {
            const translated = spellDescriptionForId(text, candidateId, indexes);
            if (translated) return translated;
        }
        return null;
    }

    function renderSpellDescription(text, spellId, indexes) {
        const artifact = indexes["spelldescription.json.gz"];
        const names = indexes["spellname.json.gz"];
        const values = String(text || "").match(/\[[^\]]+\]|\b\d+(?:\.\d+)?%?\b/g) || [];
        let valueIndex = 0;
        const visited = new Set();
        function render(id) {
            const key = String(id);
            if (visited.has(key) || visited.size > 8) return null;
            const record = artifact && artifact.byId.get(key);
            const source = record && record.Description && record.Description.zh;
            if (!source) return null;
            visited.add(key);
            const output = renderTemplate(source);
            visited.delete(key);
            return output;
        }
        function renderTemplate(source) {
            let out = source;
            let conditional;
            while ((conditional = findConditionalPlaceholder(out))) {
                const branches = conditional.branches;
                const chosen = branches[0] || branches[1] || "";
                out = out.slice(0, conditional.start) + chosen + out.slice(conditional.end);
            }
            out = out.replace(/\$@(spelldesc|spellname)(\d+)/gi, function (token, kind, refId) {
                if (kind.toLowerCase() === "spellname") return lookupId(names, refId) || token;
                return render(refId) || "";
            });
            out = out.replace(/\|[cC][0-9a-fA-F]{8}|\|[rR]/g, "");
            out = out.replace(/\$\{[^{}]*\}(?:\.\d+)?|\$\d+[a-zA-Z]\d*|\$[a-zA-Z]\d*/gi, function () {
                return values[valueIndex++] || "";
            });
            return out.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
        }
        return render(spellId);
    }

    function spellDescriptionForId(text, spellId, indexes) {
        const artifact = indexes["spelldescription.json.gz"];
        const record = artifact && artifact.byId.get(String(spellId));
        const english = record && record.Description && record.Description.en;
        const chinese = record && record.Description && record.Description.zh;
        if (!english || !chinese) return null;
        const enBlocks = english.split(/\n\s*\n/).map(function (part) { return part.trim(); }).filter(Boolean);
        const zhBlocks = chinese.split(/\n\s*\n/).map(function (part) { return part.trim(); }).filter(Boolean);
        for (let block = 0; block < enBlocks.length; block += 1) {
            const translated = matchSpellDescriptionBlock(text, enBlocks[block], zhBlocks[block], indexes);
            if (translated) return translated;
        }
        return null;
    }

    function matchSpellDescriptionBlock(text, english, chinese, indexes) {
        if (!english || !chinese) return null;
        english = english.replace(/\|[cC][0-9a-fA-F]{8}|\|[rR]/g, "").trim();
        chinese = chinese.replace(/\|[cC][0-9a-fA-F]{8}|\|[rR]/g, "").trim();
        const englishVariants = expandDescriptionVariants(english);
        const chineseVariants = new Map(expandDescriptionVariants(chinese).map(function (entry) { return [entry.path, entry.text]; }));
        for (const variant of englishVariants) {
            const translated = matchDescriptionVariant(text, variant.text, chineseVariants.get(variant.path), indexes);
            if (translated) return translated;
        }
        return null;
    }

    function expandDescriptionVariants(source) {
        const found = findConditionalPlaceholder(source);
        if (!found) return [{ text: source, path: "" }];
        const before = source.slice(0, found.start);
        const after = source.slice(found.end);
        const trueVariants = expandDescriptionVariants(found.branches[0]);
        const falseVariants = expandDescriptionVariants(found.branches[1]);
        const out = [];
        for (const variant of trueVariants) out.push(...expandDescriptionVariants(before + variant.text + after).map(function (entry) { return { text: entry.text, path: "1" + variant.path + entry.path }; }));
        for (const variant of falseVariants) out.push(...expandDescriptionVariants(before + variant.text + after).map(function (entry) { return { text: entry.text, path: "0" + variant.path + entry.path }; }));
        return out;
    }

    function findConditionalPlaceholder(source) {
        const start = source.search(/\$\?[^[]+\[/);
        if (start < 0) return null;
        const firstOpen = source.indexOf("[", start);
        const first = readBalancedBracket(source, firstOpen);
        if (!first) return null;
        const second = readBalancedBracket(source, first.end);
        if (!second) return null;
        return { start: start, end: second.end, branches: [first.value, second.value] };
    }

    function readBalancedBracket(source, openIndex) {
        if (source[openIndex] !== "[") return null;
        let depth = 0;
        for (let i = openIndex; i < source.length; i += 1) {
            if (source[i] === "[") depth += 1;
            else if (source[i] === "]") {
                depth -= 1;
                if (depth === 0) return { value: source.slice(openIndex + 1, i), end: i + 1 };
            }
        }
        return null;
    }

    function matchDescriptionVariant(text, english, chinese, indexes) {
        if (!english || !chinese) return null;
        const tokenRegex = /\$\{[^{}]*\}(?:\.\d+)?|\$@[a-z]+\d+|\$\d+[a-zA-Z]\d*|\$[a-zA-Z]\d*/gi;
        const tokens = [];
        let tokenMatch;
        tokenRegex.lastIndex = 0;
        while ((tokenMatch = tokenRegex.exec(english))) tokens.push(tokenMatch[0]);
        const zhTokens = [];
        tokenRegex.lastIndex = 0;
        while ((tokenMatch = tokenRegex.exec(chinese))) zhTokens.push(tokenMatch[0]);
        if (tokens.length !== zhTokens.length) return null;
        let pattern = "^";
        let cursor = 0;
        const captures = [];
        let match;
        tokenRegex.lastIndex = 0;
        while ((match = tokenRegex.exec(english))) {
            pattern += escapeRegExp(english.slice(cursor, match.index)) + "(.+?)";
            if (!match[0].startsWith("$?")) captures.push(match[0]);
            cursor = match.index + match[0].length;
        }
        pattern += escapeRegExp(english.slice(cursor)) + "$";
        const values = new RegExp(pattern, "is").exec(String(text).trim());
        if (!values) return null;
        const replacements = new Map();
        let replacementIndex = 0;
        captures.forEach(function (token, i) {
            const key = token.toLowerCase();
            const queue = replacements.get(key) || [];
            queue.push(values[i + 1] || "");
            replacements.set(key, queue);
        });
        return chinese.replace(tokenRegex, function (token) {
            const queue = replacements.get(token.toLowerCase());
            const value = queue && queue.length ? queue.shift() : (values[++replacementIndex] || "");
            const nameMatch = /^\$@spellname(\d+)$/i.exec(token);
            if (nameMatch) return lookupId(indexes["spellname.json.gz"], nameMatch[1]) || value;
            if (token === "$d") return value.replace(/\bsec\b/gi, "秒").replace(/\bmin\b/gi, "分钟").replace(/\s+(秒|分钟)/g, "$1");
            return value;
        });
    }

    function escapeRegExp(value) {
        return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    // ==================== 扩展词典数据解码 ====================

    async function gunzipJson(arrayBuffer) {
        const ds = new DecompressionStream("gzip");
        const stream = new Blob([arrayBuffer]).stream().pipeThrough(ds);
        const buf = await new Response(stream).arrayBuffer();
        return JSON.parse(new TextDecoder("utf-8").decode(buf));
    }

    async function syncDictionary(state) {
            const syncState = await chrome.runtime.sendMessage({ type: "sync-if-empty" });
            if (!syncState || !syncState.ok) throw new Error((syncState && syncState.error) || "dictionary check failed");
            let listing = await chrome.runtime.sendMessage({ type: "dictionary-names" });
            if (!listing || !listing.ok) throw new Error((listing && listing.error) || "dictionary unavailable");
            const requiredTables = REQUIRED_TABLES.slice();
            const siteDictionary = siteDictionaryForHost(location.hostname);
            if (siteDictionary) requiredTables.push(siteDictionary);
            if (siteDictionary === "site-maxroll.json.gz") requiredTables.push("spelldescription.json.gz");
            let names = (listing.names || []).filter(function (name) { return requiredTables.includes(name); });
            if (!names.length) {
                const synced = await chrome.runtime.sendMessage({ type: "sync" });
                if (!synced || !synced.ok) throw new Error((synced && synced.error) || "dictionary sync failed");
                listing = await chrome.runtime.sendMessage({ type: "dictionary-names" });
                if (!listing || !listing.ok) throw new Error("dictionary unavailable");
                names = (listing.names || []).filter(function (name) { return requiredTables.includes(name); });
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

    // ==================== 站点适配器 ====================

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
        const zh = lookupIdWithSiteOverride(idx, ref.id, state.indexes);
        if (!zh) return false;

        let changed = false;
        // 1) 直接子文本节点(文本等于英文名才替换)
        for (const node of Array.from(el.childNodes)) {
            if (node.nodeType !== 3) continue;
            const raw = node.nodeValue;
            if (!raw || !raw.trim()) continue;
            const t = raw.trim();
            if (lookupEnWithSiteOverride(idx, t, 1, state.indexes) === zh) {
                node.nodeValue = raw.replace(t, zh);
                changed = true;
            }
        }
        // 2) 图标链接:链接内非中文叶子(文本须命中英文名)
        if (!changed) {
            const leaf = firstNonCJKLeaf(el);
            const leafText = leaf && (leaf.textContent || "").trim();
            if (leafText && lookupEnWithSiteOverride(idx, leafText, 1, state.indexes) === zh) {
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
                    if (!leafText || lookupEnWithSiteOverride(idx, leafText, 1, state.indexes) !== zh)
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
        const zh = lookupIdWithSiteOverride(idx, ref.id, state.indexes);
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
        if (lookupEnWithSiteOverride(idx, t, 1, state.indexes) !== zh) return false;
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

    const BLOCK_TRANSLATED_ATTR = "data-rwes-block-zh";
    const BLOCK_CANDIDATE_SELECTOR =
        "p,li,blockquote,figcaption,dd,dt,h1,h2,h3,h4,h5,h6";

    function parseBlockTemplate(template) {
        const source = String(template || "");
        const root = { type: "root", children: [] };
        const stack = [root];
        const token = /\{\{([#/]?)(\d+)\}\}/g;
        let cursor = 0;
        let match;
        while ((match = token.exec(source))) {
            if (match.index > cursor) {
                stack[stack.length - 1].children.push({
                    type: "text",
                    value: source.slice(cursor, match.index),
                });
            }
            const marker = match[1];
            const id = Number(match[2]);
            if (marker === "/") {
                const current = stack[stack.length - 1];
                if (stack.length === 1 || current.id !== id) return null;
                stack.pop();
            } else {
                const node = {
                    type: marker === "#" ? "wrapper" : "slot",
                    id: id,
                    children: [],
                };
                stack[stack.length - 1].children.push(node);
                if (marker === "#") stack.push(node);
            }
            cursor = token.lastIndex;
        }
        if (stack.length !== 1) return null;
        if (cursor < source.length) {
            root.children.push({ type: "text", value: source.slice(cursor) });
        }
        return root;
    }

    function blockSlotTree(element) {
        const slots = Array.from(element.querySelectorAll("*"));
        const ids = new Map(slots.map(function (node, id) { return [node, id]; }));
        const children = new Map([[null, []]]);
        slots.forEach(function (node, id) {
            let parent = node.parentElement;
            while (parent && parent !== element && !ids.has(parent)) {
                parent = parent.parentElement;
            }
            const parentId = parent === element ? null : ids.get(parent);
            if (!children.has(parentId)) children.set(parentId, []);
            children.get(parentId).push(id);
            if (!children.has(id)) children.set(id, []);
        });
        return { slots: slots, children: children };
    }

    function validateBlockTree(ast, slotTree) {
        const seen = new Set();
        function visit(nodes, parentId) {
            const structural = nodes.filter(function (node) {
                return node.type === "slot" || node.type === "wrapper";
            });
            const expected = slotTree.children.get(parentId) || [];
            if (structural.length !== expected.length) return false;
            for (let i = 0; i < structural.length; i += 1) {
                const node = structural[i];
                if (node.id !== expected[i] || seen.has(node.id)) return false;
                seen.add(node.id);
                const childIds = slotTree.children.get(node.id) || [];
                if (childIds.length && node.type !== "wrapper") return false;
                if (!childIds.length && node.type !== "slot") return false;
                if (node.type === "wrapper" && !visit(node.children, node.id)) return false;
            }
            return true;
        }
        return visit(ast.children, null) && seen.size === slotTree.slots.length;
    }

    function applyBlockTranslation(element, template) {
        const ast = parseBlockTemplate(template);
        if (!ast) return false;
        const slotTree = blockSlotTree(element);
        if (!validateBlockTree(ast, slotTree)) return false;
        function render(nodes) {
            const fragment = document.createDocumentFragment();
            nodes.forEach(function (node) {
                if (node.type === "text") {
                    fragment.append(document.createTextNode(node.value));
                    return;
                }
                const source = slotTree.slots[node.id];
                if (node.type === "wrapper") source.replaceChildren(render(node.children));
                fragment.append(source);
            });
            return fragment;
        }
        element.replaceChildren(render(ast.children));
        element.setAttribute(BLOCK_TRANSLATED_ATTR, "1");
        return true;
    }

    const INLINE_BLOCK_SLOT_SELECTOR =
        "a,code,button,[role=button],input,select,textarea";

    function serializeBlockWithInlineSlots(element) {
        const slots = [];
        let source = "";
        function walk(node) {
            Array.from(node.childNodes || []).forEach(function (child) {
                if (child.nodeType === 3) {
                    source += child.nodeValue || "";
                    return;
                }
                if (child.nodeType !== 1) return;
                if (child.matches && child.matches(INLINE_BLOCK_SLOT_SELECTOR)) {
                    const id = slots.length;
                    slots.push(child);
                    source += "{{" + id + "}}";
                } else {
                    walk(child);
                }
            });
        }
        walk(element);
        return { key: normalizeVisibleText(source), slots: slots };
    }

    function applyInlineBlockTranslation(element, template, slots, index) {
        const ast = parseBlockTemplate(template);
        if (!ast || !slots || !slots.length) return false;
        const structural = ast.children.filter(function (node) {
            return node.type !== "text";
        });
        if (structural.some(function (node) { return node.type !== "slot"; })) return false;
        if (structural.length !== slots.length) return false;
        for (let i = 0; i < structural.length; i += 1) {
            if (structural[i].id !== i) return false;
        }
        const owners = slots.map(function (slot) {
            let owner = slot;
            while (owner.parentElement && owner.parentElement !== element) {
                owner = owner.parentElement;
            }
            return owner.parentElement === element ? owner : null;
        });
        if (owners.some(function (owner) { return !owner; })) return false;
        if (new Set(owners).size !== owners.length) return false;
        slots.forEach(function (slot) {
            const hasElementChildren = slot.children && slot.children.length;
            const translatedLabel = hasElementChildren
                ? null
                : lookupBlock(index, slot.textContent);
            if (translatedLabel) slot.textContent = translatedLabel;
        });
        owners.forEach(function (owner, id) {
            if (owner !== slots[id]) owner.replaceChildren(slots[id]);
        });
        const fragment = document.createDocumentFragment();
        ast.children.forEach(function (node) {
            if (node.type === "text") {
                fragment.append(document.createTextNode(node.value));
            } else {
                fragment.append(owners[node.id]);
            }
        });
        element.replaceChildren(fragment);
        element.setAttribute(BLOCK_TRANSLATED_ATTR, "1");
        return true;
    }

    function scanBlockTranslations(root, state) {
        const siteDictionary = siteDictionaryForHost(location.hostname);
        const index = siteDictionary && state.indexes[siteDictionary];
        if (!index || !index.byBlock || !index.byBlock.size) return 0;
        const candidates = [];
        if (root.matches && root.matches(BLOCK_CANDIDATE_SELECTOR)) candidates.push(root);
        if (root.querySelectorAll) {
            candidates.push(...root.querySelectorAll(BLOCK_CANDIDATE_SELECTOR));
        }
        let count = 0;
        candidates.forEach(function (element) {
            if (element.hasAttribute(BLOCK_TRANSLATED_ATTR)) return;
            if (element.closest("[" + BLOCK_TRANSLATED_ATTR + "]")) return;
            const inline = serializeBlockWithInlineSlots(element);
            const inlineTemplate = inline.slots.length
                ? lookupBlock(index, inline.key)
                : null;
            if (
                inlineTemplate &&
                applyInlineBlockTranslation(
                    element,
                    inlineTemplate,
                    inline.slots,
                    index,
                )
            ) {
                count += 1;
                return;
            }
            const text = normalizeVisibleText(element.textContent);
            if (!text || text.length > 2000 || !/[A-Za-z]/.test(text)) return;
            const template = lookupBlock(index, text);
            if (template && applyBlockTranslation(element, template)) count += 1;
        });
        return count;
    }

    function shouldScanTextNodeText(text, state) {
        const normalized = normalizeVisibleText(text);
        if (!normalized || !/[A-Za-z]/.test(normalized)) return false;
        if (normalized.length <= 200) return true;
        if (normalized.length > 2000) return false;
        const siteDictionary = siteDictionaryForHost(
            typeof location !== "undefined" ? location.hostname : "",
        );
        const siteIndex = siteDictionary && state.indexes[siteDictionary];
        return Boolean(lookupEn(siteIndex, normalized, 2));
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
                    p.closest(
                        "script,style,textarea,[contenteditable='true'],[" +
                            BLOCK_TRANSLATED_ATTR +
                            "]",
                    )
                )
                    return NodeFilter.FILTER_REJECT;
                if (!shouldScanTextNodeText(node.nodeValue, state))
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
        scanBlockTranslations(scope, state);
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
        const CONFIG = { ...__RWES_SETTINGS__ };

        const host = location.hostname;

        // ==================== 各站点特判 ====================
        if (siteMatches(host, "wowhead") && installWowhead(CONFIG)) return;
        if (siteMatches(host, "warcraftlogs") && installWarcraftLogs(CONFIG)) return;
        if (siteMatches(host, "raiderio")) installRaiderIo();
        if (siteMatches(host, "wowanalyzer")) installWowAnalyzer();
        if (siteMatches(host, "mythictrap") && installMythicTrap(CONFIG)) return;
        if (siteMatches(host, "raidbots")) installRaidbots();
        if (siteMatches(host, "liquidarmory")) {
            // LiquidArmory 使用 ptr-2 Wowhead 链接，强制转换到简中正式路径。
            installLiquidArmory();
        }
        if (siteMatches(host, "icy-veins")) installIcyVeins();
        if (siteMatches(host, "keystoneloot")) installKeystoneLoot();
        if (siteMatches(host, "murlok")) installMurlok();

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
            return toChineseWowheadUrl(url, {
                forceTest:
                    CONFIG.forceTestToCN ||
                    siteMatches(host, "liquidarmory"),
            });
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
        const CONFIG_TRANSLATE = { translateEnabled: __RWES_SETTINGS__.translateEnabled };
        translationEnabled = CONFIG_TRANSLATE.translateEnabled;

        const dictState = { indexes: {} };
        let maxrollHandlers = null;
        if (siteMatches(host, "maxroll")) {
            const descriptionTranslator = function (text, spellId) {
                return spellDescriptionTemplate(text, spellId, dictState.indexes);
            };
            descriptionTranslator.renderTooltip = function (text, spellId) {
                return renderSpellDescription(text, spellId, dictState.indexes);
            };
            descriptionTranslator.resolveTitle = function (title) {
                return lookupZhIds(dictState.indexes["spellname.json.gz"], title);
            };
            maxrollHandlers = installMaxroll(descriptionTranslator, function (text) {
                return translateText(text, dictState.indexes);
            });
        }

        if (CONFIG_TRANSLATE.translateEnabled) {
            syncDictionary(dictState)
                .then(function () {
                    scheduleScan(dictState, 0);
                    if (maxrollHandlers) maxrollHandlers.scan();
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
            else if (translationEnabled) scheduleScan({ indexes: {} }, 0);
        },
        diffManifest: diffManifest,
        listStaleTables: listStaleTables,
        translateText: translateText,
        spellDescriptionTemplate: spellDescriptionTemplate,
        renderSpellDescription: renderSpellDescription,
        siteDictionaryForHost: siteDictionaryForHost,
        siteMatches: siteMatches,
        splitSuffix: splitSuffix,
        NAME_BLOCKLIST: NAME_BLOCKLIST,
        SUFFIX_CN: SUFFIX_CN,
        PREFIX_RULES: PREFIX_RULES,
        parseArtifact: parseArtifact,
        normalizeVisibleText: normalizeVisibleText,
        lookupBlock: lookupBlock,
        parseBlockTemplate: parseBlockTemplate,
        validateBlockTree: validateBlockTree,
        applyBlockTranslation: applyBlockTranslation,
        serializeBlockWithInlineSlots: serializeBlockWithInlineSlots,
        applyInlineBlockTranslation: applyInlineBlockTranslation,
        scanBlockTranslations: scanBlockTranslations,
        shouldScanTextNodeText: shouldScanTextNodeText,
        lookupId: lookupId,
        lookupIdWithSiteOverride: lookupIdWithSiteOverride,
        lookupEnWithSiteOverride: lookupEnWithSiteOverride,
        lookupEn: lookupEn,
        lookupZhId: lookupZhId,
        lookupZhIds: lookupZhIds,
        extractWowheadId: extractWowheadId,
        findNameZh: findNameZh,
        TYPE_TABLE: TYPE_TABLE,
        syncDictionary: syncDictionary,
        gunzipJson: gunzipJson,
    };
})();
module.exports = api;
globalThis.__RWES_API__ = api;
