# chordKeys for Firefox

A Firefox WebExtension that adds a small **ck** button beside recognized chord symbols on music sites. Tapping the button shows the chord notes and a one-octave piano keyboard. Chord parsing is local and offline; page content is not sent anywhere.

## Supported sites

Ultimate Guitar, laCuerda, and Cifra Club are enabled by default. Open the add-on's **Settings** page to remove sites or add a hostname. Adding a custom hostname prompts Firefox for optional access to that site; its subdomains are included. Site changes take effect when the page is next loaded or refreshed.

## Develop and test

Requirements: Node.js, `web-ext`, and (for Android testing) Android Platform Tools (`adb`). From this directory:

```sh
node --test
web-ext lint
web-ext run --target=firefox-android --android-device=<adb-device-id>
```

Enable USB debugging on Android and **Remote debugging via USB** in Firefox. `web-ext run` installs a temporary development copy; it is not a permanent installation.

## Build an AMO submission package

Create the source package with:

```sh
web-ext build
```

This produces a ZIP under `web-ext-artifacts/` containing the manifest, parser, and extension files. The project ignores the README and tests in the packaged extension. The add-on uses a stable ID in `manifest.json` and declares that it collects no data.

To obtain a signed, unlisted `.xpi`, create AMO API credentials in the Firefox Add-ons Developer Hub and run:

```sh
web-ext sign --channel=unlisted --api-key="$AMO_JWT_ISSUER" --api-secret="$AMO_JWT_SECRET"
```

The API credentials are secrets; do not commit or share them. Signing submits the add-on to Mozilla for validation. `web-ext` writes the resulting signed `.xpi` under `web-ext-artifacts/` after approval. For personal installation on Android, install that signed file through Firefox's **Install Extension from File** flow.

## Permissions and privacy

- Required: `storage`, for the local allowed-site list.
- Site access: the three default sites are listed in the manifest. Other sites use optional host permissions requested individually when added in Settings; removing a custom site removes its optional host permission.
- No analytics, tracking, remote scripts, or network requests are used by the extension. Chord symbols are parsed locally.

## Source relationship

`chords.js` is copied from the [chordKeys piano chord dictionary](../chordKeys). Keep the parser copies in sync when changing chord parsing behavior.
