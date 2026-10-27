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
