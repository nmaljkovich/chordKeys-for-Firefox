(function () {
  "use strict";

  const form = document.getElementById("site-form");
  const input = document.getElementById("site-host");
  const list = document.getElementById("site-list");
  const status = document.getElementById("site-status");
  let allowedSites = [...ChordKeysSites.DEFAULT_SITES];

  async function load() {
    allowedSites = await ChordKeysSites.getAllowedSites();
    await browser.storage.local.set({ allowedSites });
    render();
  }

  function render() {
    list.replaceChildren();
    for (const host of allowedSites) {
      const item = document.createElement("li");
      item.className = "site-row";
      const name = document.createElement("span");
      name.className = "site-name";
      name.textContent = host;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-button";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", `Remove ${host}`);
      remove.addEventListener("click", () => removeSite(host));
      item.append(name, remove);
      list.append(item);
    }
  }

  async function addSite(event) {
    event.preventDefault();
    status.textContent = "";
    const host = ChordKeysSites.normalizeHost(input.value);
    if (!host) {
      status.textContent = "Enter a valid hostname only, such as example.com.";
      input.focus();
      return;
    }
    if (allowedSites.includes(host)) {
      status.textContent = `${host} is already enabled.`;
      return;
    }

    if (!ChordKeysSites.DEFAULT_SITES.includes(host)) {
      const granted = await browser.permissions.request({ origins: [ChordKeysSites.matchPattern(host)] });
      if (!granted) {
        status.textContent = `Firefox did not grant access to ${host}; it was not added.`;
        return;
      }
    }

    allowedSites = [...allowedSites, host].sort();
    await browser.storage.local.set({ allowedSites });
    input.value = "";
    status.textContent = `${host} added. Refresh its page to activate chordKeys.`;
    render();
  }

  async function removeSite(host) {
    status.textContent = "";
    if (!ChordKeysSites.DEFAULT_SITES.includes(host)) {
      try {
        await browser.permissions.remove({ origins: [ChordKeysSites.matchPattern(host)] });
      } catch (_error) {
        // Removing the allowlist entry still disables injection if permission removal is unavailable.
      }
    }
    allowedSites = allowedSites.filter((site) => site !== host);
    await browser.storage.local.set({ allowedSites });
    status.textContent = `${host} removed. Reload any open page on that site.`;
    render();
  }

  form.addEventListener("submit", addSite);
  load().catch(() => {
    status.textContent = "Could not load site settings.";
  });
})();
