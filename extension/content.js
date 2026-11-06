(function () {
  "use strict";

  if (globalThis.__chordKeysContentStarted) return;
  globalThis.__chordKeysContentStarted = true;

  const PROCESSED = "data-chordkeys-processed";
  const TOKEN_PATTERN = /(?<![\p{L}\p{N}])([A-G](?:[#b♯♭])?[A-Za-z0-9#b♭♯+°-]*(?:\/[A-G](?:[#b♯♭])?)?)(?![\p{L}\p{N}])/gu;
  const SKIP_TAGS = new Set(["BUTTON", "INPUT", "TEXTAREA", "SELECT", "SCRIPT", "STYLE", "NOSCRIPT", "SVG"]);
  const WHITE_PITCHES = new Set([0, 2, 4, 5, 7, 9, 11]);

  let popupHost = null;
  let popupRoot = null;
  let activePopup = null;
  let scanQueued = false;

  function canScan(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest(`[${PROCESSED}], [data-chordkeys-ui]`)) return false;
    if (parent.closest("a")) return false;
    if (parent.closest("code") && !parent.closest("pre")) return false;
    if (parent.closest("[contenteditable='true'], [role='textbox']")) return false;
    return !parent.closest([...SKIP_TAGS].map((tag) => tag.toLowerCase()).join(","));
  }

  function makeInlineButton(symbol, includeLabel = true, preserveLayout = false) {
    const wrapper = document.createElement("span");
    wrapper.setAttribute(PROCESSED, "");
    wrapper.className = "chordkeys-inline";
    wrapper.style.cssText = preserveLayout
      ? "position:relative;display:inline;vertical-align:baseline;white-space:pre"
      : "display:inline-flex;align-items:center;vertical-align:baseline;white-space:nowrap";
    if (includeLabel) {
      const label = document.createElement("span");
      label.textContent = symbol;
      wrapper.append(label);
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chordkeys-trigger";
    button.setAttribute("aria-label", `Show piano keys for ${symbol}`);
    button.setAttribute("title", `Show piano keys for ${symbol}`);
    const logoC = document.createElement("span");
    logoC.textContent = "c";
    const logoK = document.createElement("span");
    logoK.textContent = "k";
    logoK.style.color = "#f4c969";
    button.append(logoC, logoK);
    button.style.cssText = preserveLayout
      ? "position:absolute;z-index:10;top:-3px;left:100%;display:inline-flex;align-items:center;justify-content:center;gap:0;width:18px;height:18px;margin:0;padding:0;border:0;border-radius:5px;color:#fff;background:#2e644f;font:700 10px/1 Georgia,serif;letter-spacing:0;cursor:pointer;touch-action:manipulation"
      : "display:inline-flex;align-items:center;justify-content:center;gap:0;width:23px;height:23px;margin-inline-start:3px;padding:0;border:0;border-radius:6px;color:#fff;background:#2e644f;font:700 13px/1 Georgia,serif;letter-spacing:0;cursor:pointer;touch-action:manipulation";
    const isolatePointer = (event) => event.stopPropagation();
    button.addEventListener("pointerdown", isolatePointer);
    button.addEventListener("mousedown", isolatePointer);
    button.addEventListener("touchstart", isolatePointer, { passive: true });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showPopup(symbol, button);
    });
    wrapper.append(button);
    return wrapper;
  }

  function decorateTextNode(textNode) {
    const clickable = textNode.parentElement?.closest("a, button, [role='button']");
    if (clickable) {
      if (clickable.hasAttribute(PROCESSED)) return;
      const symbol = clickable.textContent.trim();
      if (!symbol || symbol.length > 18 || !/^[A-G](?:[#b♯♭])?[A-Za-z0-9#b♭♯+°-]*(?:\/[A-G](?:[#b♯♭])?)?$/.test(symbol)) return;
      try {
        const chord = ChordKeys.parseChord(symbol);
        if (!chord.intervals.length || chord.intervals.length > 6) return;
      } catch (_error) {
        return;
      }
      clickable.setAttribute(PROCESSED, "");
      clickable.after(makeInlineButton(symbol, false, Boolean(clickable.closest("pre"))));
      return;
    }
    if (!canScan(textNode)) return;
    const text = textNode.nodeValue;
    if (!text || text.length > 5000) return;

    const pieces = [];
    let lastIndex = 0;
    let match;
    TOKEN_PATTERN.lastIndex = 0;
    while ((match = TOKEN_PATTERN.exec(text))) {
      const symbol = match[1];
      if (symbol.length > 18) continue;
      let chord;
      try {
        chord = ChordKeys.parseChord(symbol);
      } catch (_error) {
        continue;
      }
      if (!chord.intervals.length || chord.intervals.length > 6) continue;
      if (match.index > lastIndex) pieces.push(document.createTextNode(text.slice(lastIndex, match.index)));
      pieces.push(makeInlineButton(symbol, true, Boolean(textNode.parentElement.closest("pre"))));
      lastIndex = match.index + symbol.length;
    }
    if (lastIndex === 0) return;
    if (lastIndex < text.length) pieces.push(document.createTextNode(text.slice(lastIndex)));
    textNode.replaceWith(...pieces);
  }

  function scan(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(decorateTextNode);
  }

  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(() => {
      scanQueued = false;
      scan();
    });
  }

  function ensurePopup() {
    if (popupHost) return;
    popupHost = document.createElement("div");
    popupHost.dataset.chordkeysUi = "";
    popupHost.setAttribute("aria-live", "polite");
    popupRoot = popupHost.attachShadow({ mode: "open" });
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = browser.runtime.getURL("extension/content.css");
    popupRoot.append(stylesheet);
    document.documentElement.append(popupHost);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && activePopup) closePopup();
    });
  }

  function makeKey(pitch, name, selected, isRoot) {
    const key = document.createElement("div");
    const isBlack = !WHITE_PITCHES.has(pitch);
    key.className = `mini-key ${isBlack ? "black" : "white"}${selected ? ` tone${isRoot ? " root" : ""}` : ""}`;
    key.setAttribute("aria-label", `${name}${isRoot ? ", root" : ", chord tone"}`);
    const note = document.createElement("span");
    note.textContent = name;
    key.append(note);
    return key;
  }

  function showPopup(symbol, button) {
    ensurePopup();
    const chord = ChordKeys.parseChord(symbol);
    const pitches = [...new Set(chord.intervals.map((interval) => (chord.root.pitch + interval) % 12))];
    const noteNames = pitches.map((pitch) => ChordKeys.noteName(pitch, chord.root.flat));
    const firstMidi = 60;
    const selected = ChordKeys.selectPitchInstances(firstMidi, 12, chord.root.pitch, pitches);
    const keys = Array.from({ length: 12 }, (_unused, index) => firstMidi + index)
      .filter((midi) => WHITE_PITCHES.has(midi % 12))
      .map((midi) => ({ midi, pitch: midi % 12 }));
    const blackKeys = Array.from({ length: 12 }, (_unused, index) => firstMidi + index)
      .filter((midi) => !WHITE_PITCHES.has(midi % 12))
      .map((midi) => ({ midi, pitch: midi % 12 }));

    const panel = document.createElement("section");
    panel.className = "chordkeys-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", `Piano keys for ${symbol}`);
    const heading = document.createElement("header");
    const title = document.createElement("strong");
    title.textContent = symbol;
    const close = document.createElement("button");
    close.type = "button";
    close.className = "chordkeys-close";
    close.setAttribute("aria-label", "Close piano chord popup");
    close.textContent = "×";
    close.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closePopup();
    });
    close.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closePopup();
    });
    heading.append(title, close);
    const notes = document.createElement("p");
    notes.className = "chordkeys-notes";
    notes.textContent = noteNames.join(" · ");
    const keyboard = document.createElement("div");
    keyboard.className = "mini-keyboard";
    const whites = keys.map(({ midi, pitch }) => {
      const isSelected = selected.has(midi);
      return makeKey(pitch, ChordKeys.noteName(pitch, chord.root.flat), isSelected, isSelected && pitch === chord.root.pitch);
    });
    whites.forEach((key) => keyboard.append(key));
    const whiteIndex = new Map(keys.map(({ midi }, index) => [midi, index]));
    blackKeys.forEach(({ midi, pitch }) => {
      const isSelected = selected.has(midi);
      const key = makeKey(pitch, ChordKeys.noteName(pitch, chord.root.flat), isSelected, isSelected && pitch === chord.root.pitch);
      key.style.left = `${((whiteIndex.get(midi - 1) + 1) / 7) * 100}%`;
      keyboard.append(key);
    });

    const backdrop = document.createElement("div");
    backdrop.className = "chordkeys-backdrop";
    const closeFromBackdrop = (event) => {
      if (event.target !== backdrop) return;
      event.preventDefault();
      event.stopPropagation();
      closePopup();
    };
    backdrop.addEventListener("pointerdown", closeFromBackdrop);
    backdrop.addEventListener("click", closeFromBackdrop);
    backdrop.append(panel);
    panel.append(heading, notes, keyboard);
    popupRoot.replaceChildren(popupRoot.querySelector("link"), backdrop);
    activePopup = { symbol, button };
    close.focus({ preventScroll: true });
  }

  function closePopup() {
    if (!activePopup) return;
    const button = activePopup.button;
    activePopup = null;
    popupRoot.querySelector(".chordkeys-backdrop")?.remove();
    if (button?.isConnected) button.focus({ preventScroll: true });
  }

  ChordKeysSites.getAllowedSites().then((allowedSites) => {
    if (!ChordKeysSites.matchesHost(location.hostname, allowedSites)) return;
    scan();
    new MutationObserver(queueScan).observe(document.documentElement, { childList: true, subtree: true });
  }).catch(() => {
    // If settings cannot be read, fail closed and do not scan the page.
  });
})();
