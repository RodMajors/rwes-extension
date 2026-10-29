"use strict";

const SITE_DEFINITIONS = [
    ["wowhead", ["wowhead.com"], "site-wowhead.json.gz"],
    ["warcraftlogs", ["warcraftlogs.com"], "site-warcraftlogs.json.gz"],
    ["raiderio", ["raiderio.com", "raider.io"], "site-raiderio.json.gz"],
    ["wipefest", ["wipefest.gg"], "site-wipefest.json.gz"],
    ["bloodmallet", ["bloodmallet.com"], "site-bloodmallet.json.gz"],
    ["wowanalyzer", ["wowanalyzer.com"], "site-wowanalyzer.json.gz"],
    ["maxroll", ["maxroll.gg"], "site-maxroll.json.gz"],
    ["mythictrap", ["mythictrap.com"], "site-mythictrap.json.gz"],
    ["mythicstats", ["mythicstats.com"], "site-mythicstats.json.gz"],
    ["archon", ["archon.gg"], "site-archon.json.gz"],
    ["raidbots", ["raidbots.com"], "site-raidbots.json.gz"],
    ["liquidarmory", ["liquidarmory.com"], "site-liquidarmory.json.gz"],
    ["questionablyepic", ["questionablyepic.com"], "site-questionablyepic.json.gz"],
    ["icy-veins", ["icy-veins.com"], "site-icy-veins.json.gz"],
    ["keystoneloot", ["keystoneloot.io"], "site-keystoneloot.json.gz"],
    ["murlok", ["murlok.io"], "site-murlok.json.gz"],
    ["lorrgs", ["lorrgs.io"], "site-lorrgs.json.gz"],
    ["simulationcraft", ["simulationcraft.org"], "site-simulationcraft.json.gz"],
];

function domainPattern(domain) {
    const escaped = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|\\.)${escaped}$`, "i");
}

const SITE_ENTRIES = SITE_DEFINITIONS.flatMap(([site, domains, dictionary]) =>
    domains.map((domain) => ({ site, domain, dictionary, pattern: domainPattern(domain) })),
);

const SUPPORTED_MATCHES = SITE_ENTRIES.flatMap(({ domain }) => [
    `*://${domain}/*`,
    `*://*.${domain}/*`,
]);

function siteEntryForHost(hostname) {
    const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
    return SITE_ENTRIES.find((entry) => entry.pattern.test(host)) || null;
}

function siteMatches(hostname, siteName) {
    const entry = siteEntryForHost(hostname);
    return Boolean(entry && entry.site === siteName);
}

function siteDictionaryForHost(hostname) {
    const entry = siteEntryForHost(hostname);
    return entry ? entry.dictionary : null;
}

module.exports = {
    SITE_DEFINITIONS,
    SUPPORTED_MATCHES,
    siteEntryForHost,
    siteMatches,
    siteDictionaryForHost,
};
