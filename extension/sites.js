(function (root) {
  "use strict";

  const DEFAULT_SITES = Object.freeze([
    "ultimate-guitar.com",
    "lacuerda.net",
    "cifraclub.com"
  ]);

  function normalizeHost(input) {
    let host = String(input || "").trim().toLowerCase();
    host = host.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!host || /[\s/*:@?#]/.test(host)) return null;
    try {
      const parsed = new URL(`https://${host}`);
      if (parsed.hostname !== host || !host.includes(".")) return null;
      return host;
    } catch (_error) {
      return null;
    }
  }

  function matchPattern(host) {
    return `*://*.${host}/*`;
  }

  function matchesHost(hostname, sites) {
    const host = String(hostname || "").toLowerCase();
    return sites.some((site) => host === site || host.endsWith(`.${site}`));
  }

  async function getAllowedSites() {
    const stored = await browser.storage.local.get("allowedSites");
    if (!Array.isArray(stored.allowedSites)) return [...DEFAULT_SITES];
    return [...new Set(stored.allowedSites.map(normalizeHost).filter(Boolean))];
  }

  root.ChordKeysSites = { DEFAULT_SITES, normalizeHost, matchPattern, matchesHost, getAllowedSites };
})(globalThis);
