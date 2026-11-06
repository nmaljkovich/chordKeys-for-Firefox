const test = require("node:test");
const assert = require("node:assert/strict");
require("../extension/sites.js");

const { normalizeHost, matchesHost, matchPattern, DEFAULT_SITES } = globalThis.ChordKeysSites;

test("normalizes hostname-only settings input", () => {
  assert.equal(normalizeHost(" example.com "), "example.com");
  assert.equal(normalizeHost("https://www.example.com/"), "www.example.com");
  assert.equal(normalizeHost("example.com/path"), null);
  assert.equal(normalizeHost("*.example.com"), null);
});

test("site allowlist matches a host and its subdomains only", () => {
  assert.equal(matchesHost("cifraclub.com", DEFAULT_SITES), true);
  assert.equal(matchesHost("www.cifraclub.com", DEFAULT_SITES), true);
  assert.equal(matchesHost("notcifraclub.com", DEFAULT_SITES), false);
});

test("builds optional match patterns for a configured host", () => {
  assert.equal(matchPattern("example.com"), "*://*.example.com/*");
});
