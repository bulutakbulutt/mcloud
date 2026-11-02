# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Cursor, …) and human contributors.

Work in progress, open tasks and the reasons behind recent design decisions are in [STATUS.md](STATUS.md); read it before continuing.

## What this is

mcloud is a [Spicetify](https://spicetify.app) theme that restyles the Spotify desktop client to look like Apple Music on macOS. Spicetify installs it under the theme name `AppleMusicMac`; keep that name, because existing installs and the installers depend on it.

| File | Role |
| --- | --- |
| `theme.js` | All runtime behaviour, in one async IIFE injected by Spicetify (`inject_theme_js 1`). |
| `user.css` | Layout and styling (`inject_css 1`). |
| `color.ini` | Spicetify colour scheme `[Dark]`. |
| `install.sh` / `install.ps1` | One-line theme installers for macOS/Linux and Windows. They never install Spicetify itself. |
| `dev/` | Browser preview with a mocked Spotify DOM and Spicetify API, plus a Playwright smoke test. |

There is no build step and no runtime dependency. Spotify loads `theme.js` and `user.css` exactly as committed.

## How `theme.js` works

- It waits for `Spicetify.Platform.History`, then binds Spotify's own layout panes by **grid area name** (`left-sidebar`, `main-view`, …) instead of hashed class names, and tags them with `am-native-*` classes that `user.css` hides or restyles.
- It adds its own UI: `#am-sidebar` (navigation and the profile chip), `#am-player` (floating player), `#am-library` (library grid) and `#am-popover` (shared menu for "…" and the profile).
- The player's centre "LCD" mirrors Apple Music: artwork (click = fullscreen), a title and marquee subtitle, and a scrubber that is a transparent `<input type="range">` over a hairline bar. Hovering it adds `.am-scrubbing`, which blurs the text, thickens the bar and shows rolling time digits (`rollText`).
- The sidebar's "Playlists" section lists pinned and recent playlists from `Spicetify.Platform.LibraryAPI.getContents` (Spotify's own sidebar order, Recents sort) and creates playlists and folders with `RootlistAPI`; both refresh on those APIs' `getEvents()` 'update'.
- The library view is routed through Spotify's history as `/?am-library=<kind>&am-folder=<uri>`, so back/forward work.
- Links inside Spotify's pages carry a locale prefix (`/intl-tr/artist/<id>`); match routes with `routePath()`, which strips it.
- Artist routes (`/artist/<id>`) render `#am-artist` from `Spicetify.GraphQL.Request(Definitions.queryArtistOverview)` and tint the window through `--am-tint-*` variables (`body.am-tinted`). If the API is missing or the request fails, the id is added to `nativeArtists` and Spotify's own page is shown. The mock in `dev/spicetify-mock.js` follows the `artistUnion` response shape.
- The page runs under the glass sidebar, as in Apple Music: `user.css` spans Spotify's main view across the `left-sidebar` column and pads `.main-view-container__scroll-node-child` by `--am-side` (the `main-view-grid-area` size container moves with it). `#am-artist` fills the window the same way. Keep page content out of the first `--am-side` pixels.
- Spotify's toolbar (`#global-nav-bar`), Friend Activity and the queue keep their native React nodes; the theme only adds classes and repositions them. Do not move or clone React-owned nodes.
- A `MutationObserver` reconciles bindings after Spotify replaces host nodes. It deliberately ignores lyric-line and progress churn; keep it that way.
- User settings live in `localStorage['mcloud:settings']` and are exposed in the profile menu via `Spicetify.Menu.SubMenu('mcloud', …)`. Everything degrades gracefully when an API such as `Spicetify.Menu` is missing.

## Conventions

- **Prefix** every class, id and CSS variable the theme creates with `am-` / `--am-`.
- **User-facing strings come in Turkish and English:** write them as `T('Türkçe','English')` in `theme.js` (CSS labels through `--am-t-*` variables). The language follows Spotify's (`Spicetify.Locale`) unless `settings.lang` picks one. The installers stay Turkish. Comments and identifiers are English.
- **Match the existing dense style** in `theme.js` and `user.css`: short helpers (`el`, `button`, `svg`), compact one-line rules, and comments only where the *why* is not obvious.
- **Accent colour** comes from `--am-accent` / `--am-accent-focus`, which `theme.js` sets at runtime. Do not hard-code the red.
- **Performance is a feature.** Do no work while `document.hidden`, load artwork lazily through the shared `IntersectionObserver`, release image sources that leave the viewport, and avoid per-second DOM writes unless the value changed.
- **No network calls other than Spotify's own image CDN.** The theme must not load remote scripts, fonts or analytics.
- Spicy Lyrics is optional. Drive it only by clicking its own controls (`SpicyLyrics_PageButton`, `SpicyLyrics_FullscreenButton`).
- `install.ps1` must stay pure ASCII. Windows PowerShell 5.1 reads BOM-less files as ANSI, and a BOM breaks `iwr | iex`; write Turkish text as `\uXXXX` escapes inside `T '...'`.
- The embedded font is Inter subset to Latin + Latin Extended-A with its variable axes (`pyftsubset InterVariable.woff2 --unicodes="U+0000-00FF,U+0100-017F,U+0218-021B,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+20BA,U+2122,U+2190-2193,U+2212,U+2215,U+FEFF,U+FFFD" --layout-features='kern,liga,calt,ccmp,locl,mark,mkmk,tnum,case' --flavor=woff2`), base64-encoded into the last `@font-face` in `user.css`. Its licence is in `licenses/Inter-OFL.txt`.
- On Windows Spotify marks the window's top 60px (`.body-drag-top`) as a title-bar drag region, which swallows clicks. Theme controls placed there need `-webkit-app-region:no-drag`. The browser preview cannot show this, so check it in the client.
- The Liquid Glass player uses an SVG displacement filter (`#am-glass`) in `backdrop-filter`. It works in Chromium (Spotify's engine) only; keep the plain blur declaration before it as the fallback.
- Menus (ours and Spotify's) get `menuGlass`: one filter per open menu with a nine-piece bend map and Apple's tone as colour steps Skia folds into one pass. On Spotify's menus the glass goes on each `[data-tippy-root]`'s `::before`, never on the `ul`: some submenus are nested inside the parent list, and a filter there makes the list their containing block and clips them. Keep the tone to colour steps (a primitive that reads the bent page twice reruns the whole lens).
- The installers must stay idempotent (re-running one updates the theme), must refuse to run as root/admin, and must only print Spicetify's error output when the last `apply` attempt fails.

## Verifying changes

There is no Spotify in CI, so the checks below catch syntax errors and broken wiring, not drift in Spotify's DOM. When a change depends on real Spotify markup, say so in the PR and describe how you tested it in the client. `dev/client/` holds scripts that inspect the running client over its DevTools port (start Spotify with `--remote-debugging-port=9229`); STATUS.md describes them.

```sh
node --check theme.js
shellcheck install.sh
pwsh -NoProfile -Command '$e=$null; [void][System.Management.Automation.Language.Parser]::ParseFile("install.ps1",[ref]$null,[ref]$e); $e'

npm i --no-save playwright && npx playwright install chromium
node dev/smoke.mjs ./shots   # optional dir for screenshots
```

When you add a feature, extend `dev/spicetify-mock.js` with any Spicetify API it uses and add a check to `dev/smoke.mjs`. CI (`.github/workflows/ci.yml`) runs all of the above.

To try a change in the real client, run `./install.sh` (or `.\install.ps1`) from the clone. It copies the local files instead of downloading them.

## Replying to issues

- Show the change, not only a description: a reply that reports a fix includes screenshots from the real client. Use before/after where there is a "before" (the reporter's own screenshot works), and put Apple Music beside it when matching Apple Music was the point.
- Crop the maintainer's personal data out of every screenshot: the sidebar's playlists, the profile, and the now-playing bar.
- `gh` cannot upload attachments, so host the images in a gist and link their raw URLs.
- Show the maintainer the draft and every image, and post only after they approve.

## Releases

Bump the version comment at the top of `theme.js` and `user.css` together. The installers default to `main`; tags can be installed with `--ref` / `-Ref`.

Marketplace loads `theme.js` and `user.css` from jsDelivr's `@main`, which caches for up to 12 hours; `.github/workflows/purge-cdn.yml` purges it two minutes after the last push to main that touches them (a newer push cancels the wait), once, waiting out jsDelivr's throttle instead of purging again. Batch merges: repeated purges make jsDelivr throttle longer.
