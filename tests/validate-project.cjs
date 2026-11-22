"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const code = read("Code.gs");
const html = read("index.html");
const sw = read("sw.js");
const manifest = JSON.parse(read("manifest.webmanifest"));

new vm.Script(code, { filename: "Code.gs" });
new vm.Script(sw, { filename: "sw.js" });

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((source) => source.trim());
assert.ok(inlineScripts.length >= 1, "index.html should contain app JavaScript");
inlineScripts.forEach((source, i) => new vm.Script(source, { filename: `index.inline.${i + 1}.js` }));

assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "./");
assert.equal(manifest.scope, "./");
assert.ok(manifest.icons.some((icon) => icon.sizes.split(/\s+/).includes("192x192")));
assert.ok(manifest.icons.some((icon) => icon.sizes.split(/\s+/).includes("512x512")));
manifest.icons.forEach((icon) => assert.ok(fs.existsSync(path.join(root, icon.src.replace(/^\.\//, ""))), `missing icon ${icon.src}`));
assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
const pwaManifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
assert.equal(pwaManifest.id, "./", "PWA should have a stable install identity");
assert.ok(pwaManifest.icons.some(icon => icon.sizes === "192x192" && icon.type === "image/png"));
assert.ok(pwaManifest.icons.some(icon => icon.sizes === "512x512" && icon.type === "image/png"));
for (const icon of ["icon-192.png", "icon-512.png"]) assert.ok(fs.statSync(path.join(root, icon)).size > 0, `${icon} should exist`);
assert.match(html, /navigator\.serviceWorker\.register\("\.\/sw\.js"\)/);
assert.match(html, /id="oddsAppFrame"/, "GitHub Pages should retain its PWA origin and embed Apps Script");
assert.doesNotMatch(html, /window\.location\.replace\(GAS_URL\)/, "GitHub Pages must not redirect away from the installable origin");
const hostGuard = html.match(/&&\/(.*?)\/i\.test\(window\.location\.hostname\)/);
assert.ok(hostGuard, "PWA wrapper should have a GitHub Pages host guard");
const githubHostPattern = new RegExp(hostGuard[1], "i");
assert.ok(githubHostPattern.test("widgerestimable93.github.io"), "PWA wrapper must match GitHub Pages hostname");
assert.ok(!githubHostPattern.test("script.google.com"), "PWA wrapper must not intercept Apps Script itself");
assert.doesNotMatch(html, /71\.8%|xA · PPDA · Elo|Expected Value Scanner/, "remove unsupported metrics and stale feature labels");
assert.doesNotMatch(html, /xG Timeline|Confidence intervals|Confiance ≥60%|Anomalies ML|xG:/, "avoid claiming unavailable features or mislabeled market estimates");
assert.match(html, /id="oddsNotice"/, "the UI should warn when displaying stale odds snapshots");
assert.match(html, /data-match-id=/, "match navigation should use escaped data attributes");
assert.doesNotMatch(html, /onclick="openCard|onclick="togPick|onclick="admTog/, "API and account values should not be interpolated into inline JavaScript handlers");
assert.match(html, /esc\(m\.home/, "external team names should be HTML-escaped before rendering");
assert.match(html, /Écart indicatif seulement[\s\S]*non backtesté/, "model-market differences should not be presented as validated value bets");
assert.match(html, /8 grandes ligues/);
assert.match(html, /Actualisation<\/span><span class="mib-val c">environ toutes les 26 h/);

const ctx = {};
vm.runInNewContext(code, ctx, { timeout: 5000 });
assert.equal(ctx.CFG.LEAGUES.length, 8, "free plan should query eight selected competitions");
const clientLeagues = html.match(/var LEAGUES=\[([\s\S]*?)\];/);
assert.ok(clientLeagues, "the frontend should declare its competition filters");
assert.equal(
  JSON.stringify([...clientLeagues[1].matchAll(/\{key:"(?!all")([^"]+)"/g)].map(match => match[1])),
  JSON.stringify(ctx.CFG.LEAGUES.map(league => league.key)),
  "frontend filters and backend quotas should use the same competitions"
);
assert.equal(ctx.CFG.ODDS_REFRESH_H, 26, "refresh cadence should reserve free-plan quota headroom");
assert.equal(ctx.CFG.CACHE_TTL, 21600, "Apps Script memory cache must respect its six-hour maximum");
assert.equal(ctx.CFG.ERROR_CACHE_TTL, 3600, "API failures should be retried hourly, including after a quota reset");
const odds = ctx.extractOdds([{
  markets: [
    { key: "h2h", outcomes: [
      { name: "Draw", price: 3.25 },
      { name: "Away FC", price: 4.5 },
      { name: "Home FC", price: 2.1 }
    ] },
    { key: "totals", outcomes: [
      { name: "Over", point: 2.5, price: 1.9 },
      { name: "Under", point: 2.5, price: 1.95 }
    ] }
  ]
}], "Home FC", "Away FC");
assert.deepEqual(JSON.parse(JSON.stringify(odds)), {
  h: 2.1, d: 3.25, a: 4.5, over15: 0, under15: 0, over25: 1.9, under25: 1.95
}, "outcome order must not affect 1X2 mapping");

const matrix = ctx.poissonMatrix(1.6, 0.8);
const matrixTotal = matrix.flat().reduce((sum, p) => sum + p, 0);
assert.ok(Math.abs(matrixTotal - 1) < 0.001, "Poisson matrix should be normalized");
const fitted = ctx.fitGoalRates(
  { h: 2.1, d: 3.25, a: 4.5, over25: 1.9, under25: 1.95 },
  { avgGoals: 2.65 }
);
assert.ok(Number.isFinite(fitted.home) && fitted.home > 0);
assert.ok(Number.isFinite(fitted.away) && fitted.away > 0);

assert.match(code, /requireAdmin_\(p\.token\)/, "admin reads must verify a server-side token");
assert.match(code, /requirePremium_\(getAuthorizedUser_\(p\)\)/, "premium endpoints must check entitlements");
assert.match(code, /computeHmacSha256Signature/, "auth tokens should be signed with a server secret");
assert.match(code, /sub\.status===\"ACTIVE\"/, "PayPal activation must verify active subscription status");
assert.match(code, /PAYPAL_CLIENT_SECRET/, "PayPal secret must remain server-side");
assert.match(code, /function getDB_\(/);
assert.match(code, /function fetchOdds_\(/);
assert.match(code, /!\/\^\[A-Za-z0-9_-\]\{1,80\}\$\/\.test\(String\(raw\.id\|\|""\)\)/, "provider event IDs should be restricted before reaching client attributes");
assert.match(code, /WINDOW_H:\s*168/, "upcoming match search should cover seven days");
assert.match(code, /The Odds API HTTP /, "API HTTP failures should be surfaced instead of silently treated as no fixtures");
assert.match(code, /all_matches_daily8_error_/, "API errors should be cached per key so a replacement credential can retry immediately");
assert.match(code, /OddsCache_v1/, "daily odds snapshots should persist beyond the Apps Script cache lifetime");
assert.match(code, /function oddsKeyTag_\(/, "changing the Odds API key should invalidate in-memory data caches");
assert.match(code, /keyTag===keyTag/, "snapshots from a previous API credential should be refreshed before being treated as current");
let fakeApiKey = "first-placeholder-key";
ctx.PropertiesService = { getScriptProperties: () => ({ getProperty: (name) => name === "ODDS_KEY" ? fakeApiKey : "" }) };
ctx.Utilities = {
  DigestAlgorithm: { SHA_256: "SHA_256" },
  computeDigest: (_algorithm, value) => {
    let hash = 2166136261;
    for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return [hash >>> 24, hash >>> 16, hash >>> 8, hash].map(byte => (byte & 255) > 127 ? (byte & 255) - 256 : byte & 255);
  }
};
const firstKeyTag = ctx.oddsKeyTag_();
fakeApiKey = "second-placeholder-key";
assert.notEqual(ctx.oddsKeyTag_(), firstKeyTag, "replacement API keys must produce a distinct cache namespace");
assert.doesNotMatch(code, /function (getAllMatches|getDashboard|fetchOdds|geminiAnalyze)\(/, "sensitive data builders should not be exposed to google.script.run");
assert.equal(fs.existsSync(path.join(root, "android/app/keystore.jks")), false, "signing keystore must not be tracked in the working tree");
assert.doesNotMatch(html, /71\.8%|YOUR_PAYPAL_CLIENT_ID|YOUR_PAYPAL_PLAN_ID/, "remove fake accuracy and payment placeholders");

console.log("OddsLab validation passed: PWA assets, JavaScript syntax, market mapping, Poisson rates, server guards.");
