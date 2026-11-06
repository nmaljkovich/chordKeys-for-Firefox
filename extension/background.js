(function () {
  "use strict";

  const sites = ChordKeysSites;

  browser.runtime.onInstalled.addListener(async () => {
    const stored = await browser.storage.local.get("allowedSites");
    if (!Array.isArray(stored.allowedSites)) {
      await browser.storage.local.set({ allowedSites: [...sites.DEFAULT_SITES] });
    }
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete" || !tab.url) return;

    let host;
    try {
      host = new URL(tab.url).hostname.toLowerCase();
    } catch (_error) {
      return;
    }
    if (sites.DEFAULT_SITES.some((site) => host === site || host.endsWith(`.${site}`))) return;

    void injectIfAllowed(tabId, host);
  });

  async function injectIfAllowed(tabId, host) {
    const allowedSites = await sites.getAllowedSites();
    if (!sites.matchesHost(host, allowedSites)) return;

    const optionalPattern = allowedSites
      .filter((site) => !sites.DEFAULT_SITES.includes(site))
      .find((site) => host === site || host.endsWith(`.${site}`));
    if (!optionalPattern) return;

    const origin = sites.matchPattern(optionalPattern);
    if (!await browser.permissions.contains({ origins: [origin] })) return;

    try {
      await browser.tabs.executeScript(tabId, { file: "chords.js", runAt: "document_idle" });
      await browser.tabs.executeScript(tabId, { file: "extension/sites.js", runAt: "document_idle" });
      await browser.tabs.executeScript(tabId, { file: "extension/content.js", runAt: "document_idle" });
    } catch (_error) {
      // The tab may have navigated or become unavailable while the event page woke.
    }
  }
})();
