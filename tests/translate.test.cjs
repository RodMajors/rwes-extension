"use strict";

const assert = require("assert");

const tests = [];
function test(name, fn) {
    tests.push({ name, fn });
}

test("RWES.js requires without executing browser code", () => {
    const rwes = require("../src/content/legacy.cjs");
    assert.strictEqual(typeof rwes.boot, "function");
});

const rwes = require("../src/content/legacy.cjs");
const wowheadSite = require("../src/content/sites/wowhead.cjs");
const warcraftLogsSite = require("../src/content/sites/warcraftlogs.cjs");
const raiderIoSite = require("../src/content/sites/raiderio.cjs");
const wowAnalyzerSite = require("../src/content/sites/wowanalyzer.cjs");
const maxrollSite = require("../src/content/sites/maxroll.cjs");
const mythicTrapSite = require("../src/content/sites/mythictrap.cjs");
const raidbotsSite = require("../src/content/sites/raidbots.cjs");
const liquidArmorySite = require("../src/content/sites/liquidarmory.cjs");
const icyVeinsSite = require("../src/content/sites/icyveins.cjs");
const keystoneLootSite = require("../src/content/sites/keystoneloot.cjs");
const murlokSite = require("../src/content/sites/murlok.cjs");

test("站点特判模块导出安装入口", () => {
    assert.strictEqual(typeof wowheadSite.installWowhead, "function");
    assert.strictEqual(typeof warcraftLogsSite.installWarcraftLogs, "function");
    assert.strictEqual(typeof raiderIoSite.installRaiderIo, "function");
    assert.strictEqual(typeof wowAnalyzerSite.installWowAnalyzer, "function");
    assert.strictEqual(typeof maxrollSite.installMaxroll, "function");
    assert.strictEqual(typeof mythicTrapSite.installMythicTrap, "function");
    assert.strictEqual(typeof raidbotsSite.installRaidbots, "function");
    assert.strictEqual(typeof icyVeinsSite.installIcyVeins, "function");
    assert.strictEqual(typeof keystoneLootSite.installKeystoneLoot, "function");
    assert.strictEqual(typeof murlokSite.installMurlok, "function");
    assert.match(murlokSite.layoutCss(), /body > div\.vi-layout/);
    assert.match(murlokSite.layoutCss(), /vi-layout-content/);
    assert.match(murlokSite.layoutCss(), /padding-right: clamp\(12px, 1.5vw, 24px\)/);
    assert.doesNotMatch(murlokSite.layoutCss(), /^\.vi-layout, \[class\*=\"vi-layout\"\] \{/m);
    assert.strictEqual(liquidArmorySite.isLiquidArmoryHost("liquidarmory.com"), true);
    assert.strictEqual(liquidArmorySite.isLiquidArmoryHost("www.liquidarmory.com"), true);
    assert.strictEqual(liquidArmorySite.isLiquidArmoryHost("example.com"), false);
    assert.strictEqual(typeof liquidArmorySite.installLiquidArmory, "function");
    const style = {};
    const originalDocument = global.document;
    const originalWindow = global.window;
    const anchor = {
        getBoundingClientRect: () => ({ left: 100, right: 200, top: 100, width: 100, height: 40 }),
    };
    const tooltip = {
        getBoundingClientRect: () => ({ width: 300, height: 200 }),
        style: { setProperty: (key, value) => { style[key] = value; } },
    };
    try {
        global.document = { documentElement: { clientWidth: 1280, clientHeight: 720 } };
        global.window = { innerWidth: 1280, innerHeight: 720 };
        keystoneLootSite.placeTooltip(anchor, tooltip);
        assert.strictEqual(style.position, "fixed");
        assert.strictEqual(style.left, "208px");
        assert.strictEqual(style.top, "100px");
    } finally {
        global.document = originalDocument;
        global.window = originalWindow;
    }
});

test("MythicTrap 中文路径规范化", () => {
    assert.strictEqual(mythicTrapSite.chinesePath("/venomous-abyss/boss/mythic"), "/cn/venomous-abyss/boss/mythic");
    assert.strictEqual(mythicTrapSite.chinesePath("/fr/venomous-abyss"), "/cn/venomous-abyss");
    assert.strictEqual(mythicTrapSite.chinesePath("/en/venomous-abyss"), "/cn/venomous-abyss");
    assert.strictEqual(mythicTrapSite.chinesePath("/cn/venomous-abyss"), "/cn/venomous-abyss");
    assert.strictEqual(mythicTrapSite.chinesePath("/"), "/cn/");
});

test("WCL 特判将 main-box ID 布局改为 block", () => {
    const originalLocation = global.location;
    const originalDocument = global.document;
    const originalAddStyle = global.GM_addStyle;
    const originalSetInterval = global.setInterval;
    let injectedCss = "";
    try {
        global.location = { hostname: "cn.warcraftlogs.com", href: "https://cn.warcraftlogs.com/" };
        global.document = { readyState: "loading", addEventListener: () => {} };
        global.GM_addStyle = (css) => { injectedCss = css; };
        global.setInterval = () => 0;
        warcraftLogsSite.installWarcraftLogs({ autoRedirectWCLCN: false });
        assert.match(injectedCss, /#main-box\s*\{\s*display:\s*block !important;/);
    } finally {
        global.location = originalLocation;
        global.document = originalDocument;
        global.GM_addStyle = originalAddStyle;
        global.setInterval = originalSetInterval;
    }
});

test("Raider.io 特判只处理右侧广告栏", () => {
    const originalDocument = global.document;
    const originalMutationObserver = global.MutationObserver;
    const originalAddStyle = global.GM_addStyle;
    let injectedCss = "";
    try {
        global.document = {
            readyState: "loading",
            addEventListener: () => {},
            documentElement: {},
        };
        global.MutationObserver = class {
            observe() {}
        };
        global.GM_addStyle = (css) => { injectedCss = css; };
        raiderIoSite.installRaiderIo();
        assert.match(injectedCss, /\.rio-right-pane/);
        assert.match(injectedCss, /data-rwes-rio-main-layout/);
        assert.doesNotMatch(injectedCss, /fresnel-container/);
        assert.doesNotMatch(injectedCss, /\[class\*=/);
    } finally {
        global.document = originalDocument;
        global.MutationObserver = originalMutationObserver;
        global.GM_addStyle = originalAddStyle;
    }
});

test("Raider.io 支持 raiderio.com 裸域", () => {
    const constants = require("../src/shared/constants.js");
    assert.ok(constants.SUPPORTED_MATCHES.includes("*://raiderio.com/*"));
    assert.ok(constants.SUPPORTED_MATCHES.includes("*://*.raiderio.com/*"));
});

test("WowAnalyzer 特判删除广告槽位所属链接", () => {
    const originalDocument = global.document;
    let removed = 0;
    const makeSlot = () => ({ closest: () => ({ remove: () => { removed += 1; } }) });
    try {
        global.document = { querySelectorAll: () => [makeSlot()] };
        wowAnalyzerSite.removeAds();
        assert.strictEqual(removed, 2);
    } finally {
        global.document = originalDocument;
    }
});

test("Icy-Veins 特判关闭广告拦截提示", () => {
    const originalDocument = global.document;
    let clicked = false;
    let marked = false;
    const continueItem = { textContent: "Continue without supporting us", click: () => { clicked = true; } };
    const overlay = {
        hasAttribute: () => marked,
        setAttribute: () => { marked = true; },
        querySelectorAll: () => [continueItem],
        remove: () => {},
    };
    const heading = {
        textContent: "Looks like your ad blocker is on.",
        closest: () => overlay,
    };
    try {
        global.document = { querySelectorAll: (selector) => selector === "h2" ? [heading] : [] };
        assert.strictEqual(icyVeinsSite.dismissAdblockPrompt(), true);
        assert.strictEqual(clicked, true);
        assert.strictEqual(marked, true);
    } finally {
        global.document = originalDocument;
    }
});

test("Maxroll 特判点击广告拦截提示的 No Thanks", () => {
    const originalDocument = global.document;
    let clicked = false;
    let marked = false;
    const dismissButton = { textContent: "No Thanks", click: () => { clicked = true; } };
    const overlay = {
        hasAttribute: () => marked,
        setAttribute: () => { marked = true; },
        querySelectorAll: () => [dismissButton],
        remove: () => {},
    };
    const heading = { textContent: "Attention Ad-Block User", closest: () => overlay };
    try {
        global.document = { querySelectorAll: () => [heading] };
        assert.strictEqual(maxrollSite.dismissAdblockPrompt(), true);
        assert.strictEqual(clicked, true);
        assert.strictEqual(marked, true);
    } finally {
        global.document = originalDocument;
    }
});

test("diffManifest: no changes", () => {
    const local = { version: "v1", files: { "items.json.gz": "a1" } };
    const remote = { version: "v1", files: [{ name: "items.json.gz", sha256: "a1" }] };
    const d = rwes.diffManifest(local, remote);
    assert.strictEqual(d.versionChanged, false);
    assert.deepStrictEqual(d.toDownload, []);
});

test("diffManifest: changed file listed", () => {
    const local = { version: "v1", files: { "items.json.gz": "a1" } };
    const remote = { version: "v2", files: [{ name: "items.json.gz", sha256: "a2" }] };
    const d = rwes.diffManifest(local, remote);
    assert.strictEqual(d.versionChanged, true);
    assert.strictEqual(d.toDownload.length, 1);
    assert.strictEqual(d.toDownload[0].name, "items.json.gz");
});

test("diffManifest: new file listed", () => {
    const local = { version: "v1", files: { "items.json.gz": "a1" } };
    const remote = {
        version: "v2",
        files: [
            { name: "items.json.gz", sha256: "a1" },
            { name: "spellname.json.gz", sha256: "b1" },
        ],
    };
    const d = rwes.diffManifest(local, remote);
    assert.deepStrictEqual(d.toDownload.map((f) => f.name), ["spellname.json.gz"]);
});

test("parseArtifact + lookupId", () => {
    const idx = rwes.parseArtifact({ id: { "17": "真言术：盾" }, en: { "power word: shield": "真言术：盾" } });
    assert.strictEqual(rwes.lookupId(idx, 17), "真言术：盾");
    assert.strictEqual(rwes.lookupId(idx, "17"), "真言术：盾");
    assert.strictEqual(rwes.lookupId(idx, 99), null);
});

test("parseArtifact + lookupZhId: 中文标题可反查法术 ID", () => {
    const index = rwes.parseArtifact({ id: { "1213649": "虚空射线" }, en: { "void ray": "虚空射线" } });
    assert.strictEqual(rwes.lookupZhId(index, "虚空射线"), "1213649");
    assert.deepStrictEqual(rwes.lookupZhIds(index, "虚空射线"), ["1213649"]);
    assert.strictEqual(rwes.lookupZhId(index, "未知技能"), null);
});

test("lookupZhId: 同名技能保持首个 ID 作为标题兜底", () => {
    const index = rwes.parseArtifact({ id: { "1217610": "吞噬", "473662": "吞噬" }, en: {} });
    assert.ok(["1217610", "473662"].includes(rwes.lookupZhId(index, "吞噬")));
});

test("lookupEn: case-insensitive, minLen, miss", () => {
    const idx = rwes.parseArtifact({ id: {}, en: { "fireball": "火球术" } });
    assert.strictEqual(rwes.lookupEn(idx, "  Fireball ", 3), "火球术");
    assert.strictEqual(rwes.lookupEn(idx, "Fireball", 10), null);
    assert.strictEqual(rwes.lookupEn(idx, "Icebolt", 3), null);
    assert.strictEqual(rwes.lookupEn(idx, "", 3), null);
});

test("extractWowheadId: item/spell/npc/zone/quest/achievement/currency", () => {
    assert.deepStrictEqual(rwes.extractWowheadId("https://www.wowhead.com/item=274493"), { type: "item", id: "274493" });
    assert.deepStrictEqual(rwes.extractWowheadId("https://www.wowhead.com/cn/spell=17/power-word-shield"), { type: "spell", id: "17" });
    assert.deepStrictEqual(rwes.extractWowheadId("https://www.wowhead.com/npc=123456"), { type: "npc", id: "123456" });
    assert.deepStrictEqual(rwes.extractWowheadId("https://www.wowhead.com/zone=100"), { type: "zone", id: "100" });
    assert.deepStrictEqual(rwes.extractWowheadId("https://www.wowhead.com/quest=58"), { type: "quest", id: "58" });
    assert.deepStrictEqual(rwes.extractWowheadId("https://www.wowhead.com/achievement=15"), { type: "achievement", id: "15" });
    assert.deepStrictEqual(rwes.extractWowheadId("https://www.wowhead.com/currency=2003"), { type: "currency", id: "2003" });
    assert.strictEqual(rwes.extractWowheadId("https://www.wowhead.com/guide/leveling"), null);
    assert.strictEqual(rwes.extractWowheadId("https://example.com/item=1"), null);
    assert.strictEqual(rwes.extractWowheadId(null), null);
});

test("extractWowheadId: mop-classic and bare data-wowhead formats", () => {
    assert.deepStrictEqual(rwes.extractWowheadId("https://www.wowhead.com/mop-classic/item=1234/name-of-item"), { type: "item", id: "1234" });
    assert.deepStrictEqual(rwes.extractWowheadId("item=123&ilvl=639&bonus=1234"), { type: "item", id: "123" });
    assert.deepStrictEqual(rwes.extractWowheadId("spell=17&domain=cn"), { type: "spell", id: "17" });
    assert.strictEqual(rwes.extractWowheadId("https://www.wowhead.com/mop-classic/"), null);
});

test("findNameZh: 跨表按序查找", () => {
    const indexes = {
        "itemsparse.json.gz": rwes.parseArtifact({ id: {}, en: { "void sphere": "虚空球" } }),
        "spellname.json.gz": rwes.parseArtifact({ id: {}, en: { "fireball": "火球术" } }),
        "map.json.gz": rwes.parseArtifact({ id: {}, en: { "azj-kahet": "艾基-卡赫特" } }),
    };
    assert.strictEqual(rwes.findNameZh(indexes, "Fireball", 4), "火球术");
    assert.strictEqual(rwes.findNameZh(indexes, "Void Sphere", 4), "虚空球");
    assert.strictEqual(rwes.findNameZh(indexes, "azj-kahet", 4), "艾基-卡赫特");
    assert.strictEqual(rwes.findNameZh(indexes, "Unknown Thing", 4), null);
});

test("browser modules exported for reference", () => {
    assert.strictEqual(typeof rwes.syncDictionary, "function");
    assert.strictEqual(typeof rwes.gunzipJson, "function");
    assert.strictEqual(typeof rwes.openDb, "function");
});

test("listStaleTables: prunes removed and keeps present", () => {
    const local = { "items.json.gz": "a", "spellname.json.gz": "b", "gone.json.gz": "c" };
    const remote = [{ name: "items.json.gz" }, { name: "spellname.json.gz" }];
    assert.deepStrictEqual(rwes.listStaleTables(local, remote), ["gone.json.gz"]);
});

test("listStaleTables: empty remote prunes all, null-safe", () => {
    const local = { "items.json.gz": "a" };
    assert.deepStrictEqual(rwes.listStaleTables(local, []), ["items.json.gz"]);
    assert.deepStrictEqual(rwes.listStaleTables(null, null), []);
    assert.deepStrictEqual(rwes.listStaleTables({}, null), []);
});

test("serverBaseUrl: accepts http/https, strips trailing slashes", () => {
    assert.strictEqual(rwes.serverBaseUrl("http://127.0.0.1:8000"), "http://127.0.0.1:8000");
    assert.strictEqual(rwes.serverBaseUrl("https://rwes-dict.example.com/"), "https://rwes-dict.example.com");
    assert.strictEqual(rwes.serverBaseUrl("  http://a.b:8000//  "), "http://a.b:8000");
});

test("serverBaseUrl: rejects missing scheme and empty", () => {
    assert.strictEqual(rwes.serverBaseUrl("127.0.0.1:8000"), null);
    assert.strictEqual(rwes.serverBaseUrl("rwes-dict.example.com"), null);
    assert.strictEqual(rwes.serverBaseUrl(""), null);
    assert.strictEqual(rwes.serverBaseUrl(null), null);
});

test("findNameZh: specclass combined names", () => {
    const indexes = {
        "specclass.json.gz": rwes.parseArtifact({ id: {}, en: { "demonology warlock": "恶魔学识术士" } }),
        "chrspecialization.json.gz": rwes.parseArtifact({ id: {}, en: { "demonology": "恶魔学识" } }),
    };
    assert.strictEqual(rwes.findNameZh(indexes, "Demonology Warlock", 4), "恶魔学识术士");
    assert.strictEqual(rwes.findNameZh(indexes, "Demonology", 4), "恶魔学识");
});

function fakeIndexes(entries) {
    const out = {};
    for (const [table, enMap] of Object.entries(entries)) {
        out[table] = rwes.parseArtifact({ id: {}, en: enMap });
    }
    return out;
}

test("translateText: custom UI dict hit", () => {
    const indexes = fakeIndexes({
        "custom.json.gz": { "timewalking": "时光漫游" },
    });
    assert.strictEqual(rwes.translateText("Timewalking", indexes), "时光漫游");
});

test("站点专属词典可按 hostname 精确选择并覆盖全局词条", () => {
    assert.strictEqual(rwes.siteDictionaryForHost("maxroll.gg"), "site-maxroll.json.gz");
    assert.strictEqual(rwes.siteDictionaryForHost("www.maxroll.gg"), "site-maxroll.json.gz");
    assert.strictEqual(rwes.siteDictionaryForHost("notmaxroll.gg"), null);
    const previousLocation = global.location;
    global.location = { hostname: "www.maxroll.gg" };
    try {
        const indexes = fakeIndexes({
            "site-maxroll.json.gz": { instant: "瞬发" },
            "custom.json.gz": { instant: "立即" },
        });
        assert.strictEqual(rwes.translateText("Instant", indexes), "瞬发");
    } finally {
        if (previousLocation === undefined) delete global.location;
        else global.location = previousLocation;
    }
});

test("spellDescriptionTemplate: 将已计算英文数值安全套入中文模板", () => {
    const indexes = fakeIndexes({
        "spelldescription.json.gz": {},
        "spellname.json.gz": {},
    });
    indexes["spellname.json.gz"].byId.set("1228211", "奥术宝珠");
    indexes["spelldescription.json.gz"].byId.set("1228214", {
        Description: {
            en: "Deals $1244998s1 Arcane damage every $t1 sec for $d. Summons $@spellname1228211.",
            zh: "每$t1秒造成$1244998s1点奥术伤害，持续$d。召唤$@spellname1228211。",
        },
    });
    assert.strictEqual(
        rwes.spellDescriptionTemplate("Deals 100 Arcane damage every 2 sec for 10 sec. Summons Arcane Orb.", "1228214", indexes),
        "每2秒造成100点奥术伤害，持续10秒。召唤奥术宝珠。",
    );
    assert.strictEqual(rwes.spellDescriptionTemplate("Different text", "1228214", indexes), null);
});

test("spellDescriptionTemplate: 按父技能的 spelldesc 引用匹配嵌套技能段落", () => {
    const indexes = fakeIndexes({ "spelldescription.json.gz": {}, "spellname.json.gz": {} });
    indexes["spelldescription.json.gz"].byId.set("471306", {
        Description: {
            en: "Collecting $1225789u Soul Fragments grants access to Void Metamorphosis.\n\n$@spellicon1217605 $@spellname1217605\n$@spelldesc1217605",
            zh: "收集$1225789u个灵魂残片即可使用虚空变形。\n\n$@spellicon1217605 $@spellname1217605\n$@spelldesc1217605",
        },
    });
    indexes["spelldescription.json.gz"].byId.set("1217605", {
        Description: {
            en: "You ascend to a higher state of being, substantially empowering your abilities.",
            zh: "你飞升至更高的境界，大幅强化你的技能。",
        },
    });
    assert.strictEqual(
        rwes.spellDescriptionTemplate("Collecting 50 Soul Fragments grants access to Void Metamorphosis.", "471306", indexes),
        "收集50个灵魂残片即可使用虚空变形。",
    );
    assert.strictEqual(
        rwes.spellDescriptionTemplate("You ascend to a higher state of being, substantially empowering your abilities.", "471306", indexes),
        "你飞升至更高的境界，大幅强化你的技能。",
    );
});

test("spellDescriptionTemplate: 支持公式和条件占位符", () => {
    const indexes = fakeIndexes({ "spelldescription.json.gz": {}, "spellname.json.gz": {} });
    indexes["spelldescription.json.gz"].byId.set("1217610", {
        Description: {
            en: "Devour the life essence, dealing $s1 Cosmic damage. Reduces cooldown by ${$1217607s14/1000}.1 sec.\n\n|CFFffffffGenerates $1288123s1 Fury$?a1215617[ and $1227619s3 soul fragments][].|R",
            zh: "吞噬生命精华，造成$s1点宇宙伤害。使冷却时间缩短${$1217607s14/1000}.1秒。\n\n|CFFffffff产生$1288123s1点恶魔之怒$?a1215617[和$1227619s3个灵魂残片][]。|R",
        },
    });
    assert.strictEqual(
        rwes.spellDescriptionTemplate("Devour the life essence, dealing 367 Cosmic damage. Reduces cooldown by 1.0 sec.", "1217610", indexes),
        "吞噬生命精华，造成367点宇宙伤害。使冷却时间缩短1.0秒。",
    );
    assert.strictEqual(
        rwes.spellDescriptionTemplate("Generates 16 Fury.", "1217610", indexes),
        "产生16点恶魔之怒。",
    );
});

test("spellDescriptionTemplate: 坍缩之星公式分支和多段文本", () => {
    const indexes = fakeIndexes({ "spelldescription.json.gz": {}, "spellname.json.gz": {} });
    indexes["spelldescription.json.gz"].byId.set("1221150", {
        Description: {
            en: "Channel a blast, $?a1242486[critically striking for ${$1221162s1*2}][dealing $1221162s1] Cosmic damage to your target and $?a1242486[${2*($1221162s1*($s2/100))}][${$1221162s1*($s2/100)}] Cosmic damage to nearby enemies. Damage reduced beyond $s1 targets.",
            zh: "引导能量，$?a1242486[造成${$1221162s1*2}点暴击伤害][造成$1221162s1点宇宙伤害]。对附近敌人造成$?a1242486[${2*($1221162s1*($s2/100))}][${$1221162s1*($s2/100)}]点宇宙伤害。超过$s1个目标后伤害降低。",
        },
    });
    assert.strictEqual(
        rwes.spellDescriptionTemplate("Channel a blast, dealing 1275.5% Cosmic damage to your target and 637.75% Cosmic damage to nearby enemies. Damage reduced beyond 8 targets.", "1221150", indexes),
        "引导能量，造成1275.5%点宇宙伤害。对附近敌人造成637.75%点宇宙伤害。超过8个目标后伤害降低。",
    );
});

test("renderSpellDescription: 直接生成中文说明文本", () => {
    const indexes = fakeIndexes({ "spelldescription.json.gz": {}, "spellname.json.gz": {} });
    indexes["spelldescription.json.gz"].byId.set("1217610", {
        Description: {
            zh: "吞噬目标的生命精华，造成$s1点宇宙伤害。\n\n可在移动中施放。",
            en: "Devour the life essence, dealing $s1 Cosmic damage.",
        },
    });
    assert.strictEqual(
        rwes.renderSpellDescription("Devour the life essence, dealing 367 Cosmic damage.", "1217610", indexes),
        "吞噬目标的生命精华，造成367点宇宙伤害。\n\n可在移动中施放。",
    );
});

test("translateText: full name hit incl specclass", () => {
    const indexes = fakeIndexes({
        "itemsparse.json.gz": { "void sphere": "虚空球" },
        "specclass.json.gz": { "demonology warlock": "恶魔学识术士" },
    });
    assert.strictEqual(rwes.translateText("Demonology Warlock", indexes), "恶魔学识术士");
    assert.strictEqual(rwes.translateText("Void Sphere", indexes), "虚空球");
});

test("translateText: suffix split", () => {
    const indexes = fakeIndexes({
        "itemsparse.json.gz": { "ruby whelp shell": "红玉雏龙蛋壳" },
    });
    assert.strictEqual(rwes.translateText("Ruby Whelp Shell (Crit)", indexes), "红玉雏龙蛋壳(暴击)");
    assert.strictEqual(rwes.translateText("Ruby Whelp Shell (UnknownSuffix)", indexes), null);
});

test("translateText: prefix rules", () => {
    assert.strictEqual(rwes.translateText("WoW version 12.1.0", {}), "魔兽世界版本 12.1.0");
    assert.strictEqual(rwes.translateText("Item level 639", {}), "物品等级 639");
});

test("translateText: miss, CJK skip, short skip", () => {
    const indexes = fakeIndexes({ "itemsparse.json.gz": { "staff": "法杖" } });
    assert.strictEqual(rwes.translateText("Some Random Sentence", indexes), null);
    assert.strictEqual(rwes.translateText("已经中文", indexes), null);
    assert.strictEqual(rwes.translateText("ab", indexes), null);
});

test("splitSuffix: base and suffix", () => {
    assert.deepStrictEqual(rwes.splitSuffix("Ruby Whelp Shell (Crit)"), { base: "Ruby Whelp Shell", suffix: "Crit" });
    assert.deepStrictEqual(rwes.splitSuffix("Plain Name"), { base: "Plain Name", suffix: null });
});

test("findNameZh: traitsubtree hero talent trees", () => {
    const indexes = {
        "traitsubtree.json.gz": rwes.parseArtifact({ id: {}, en: { "diabolist": "恶魔使徒" } }),
    };
    assert.strictEqual(rwes.findNameZh(indexes, "Diabolist", 3), "恶魔使徒");
});

test("findNameZh: proper-noun tables (race, covenant, bg, form)", () => {
    const indexes = {
        "chrraces.json.gz": rwes.parseArtifact({ id: {}, en: { "blood elf": "血精灵" } }),
        "covenant.json.gz": rwes.parseArtifact({ id: {}, en: { "kyrian": "格里恩" } }),
        "battlemasterlist.json.gz": rwes.parseArtifact({ id: {}, en: { "alterac valley": "奥特兰克山谷" } }),
        "spellshapeshiftform.json.gz": rwes.parseArtifact({ id: {}, en: { "cat form": "猎豹形态" } }),
    };
    assert.strictEqual(rwes.findNameZh(indexes, "Blood Elf", 3), "血精灵");
    assert.strictEqual(rwes.findNameZh(indexes, "Kyrian", 3), "格里恩");
    assert.strictEqual(rwes.findNameZh(indexes, "Alterac Valley", 3), "奥特兰克山谷");
    assert.strictEqual(rwes.findNameZh(indexes, "Cat Form", 3), "猎豹形态");
});

test("translateText: blocklist skips brand names", () => {
    const indexes = fakeIndexes({ "traitsubtree.json.gz": { "archon": "执政官" } });
    assert.strictEqual(rwes.translateText("Archon", indexes), null);
    assert.strictEqual(rwes.translateText("Archon (Crit)", indexes), null);
    assert.strictEqual(rwes.translateText("Warcraftlogs", indexes), null);
});

let passed = 0;
let failed = 0;

for (const t of tests) {
    try {
        t.fn();
        passed += 1;
        console.log("PASS " + t.name);
    } catch (e) {
        failed += 1;
        console.error("FAIL " + t.name + "\n  " + (e && e.message));
    }
}

console.log(passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
