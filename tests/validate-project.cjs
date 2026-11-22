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
assert.match(html, /navigator\.serviceWorker\.register\("\.\/sw\.js"\)/);
assert.match(html, /id="oddsAppFrame"/, "GitHub Pages should retain its PWA origin and embed Apps Script");
assert.doesNotMatch(html, /window\.location\.replace\(GAS_URL\)/, "GitHub Pages must not redirect away from the installable origin");
const hostGuard = html.match(/&&\/(.*?)\/i\.test\(window\.location\.hostname\)/);
assert.ok(hostGuard, "PWA wrapper should have a GitHub Pages host guard");
const githubHostPattern = new RegExp(hostGuard[1], "i");
assert.ok(githubHostPattern.test("widgerestimable93.github.io"), "PWA wrapper must match GitHub Pages hostname");
assert.ok(!githubHostPattern.test("script.google.com"), "PWA wrapper must not intercept Apps Script itself");
assert.doesNotMatch(html, /71\.8%|xA · PPDA · Elo|Expected Value Scanner/, "remove unsupported metrics and stale feature labels");

const ctx = {};
vm.runInNewContext(code, ctx, { timeout: 5000 });
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
assert.doesNotMatch(code, /function (getAllMatches|getDashboard|fetchOdds|geminiAnalyze)\(/, "sensitive data builders should not be exposed to google.script.run");
assert.equal(fs.existsSync(path.join(root, "android/app/keystore.jks")), false, "signing keystore must not be tracked in the working tree");
assert.doesNotMatch(html, /71\.8%|YOUR_PAYPAL_CLIENT_ID|YOUR_PAYPAL_PLAN_ID/, "remove fake accuracy and payment placeholders");

console.log("OddsLab validation passed: PWA assets, JavaScript syntax, market mapping, Poisson rates, server guards.");
