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
