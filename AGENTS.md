# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Cursor, …) and human contributors.

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
- The library view is routed through Spotify's history as `/?am-library=<kind>&am-folder=<uri>`, so back/forward work.
- Artist routes (`/artist/<id>`) render `#am-artist` from `Spicetify.GraphQL.Request(Definitions.queryArtistOverview)` and tint the window through `--am-tint-*` variables (`body.am-tinted`). If the API is missing or the request fails, the id is added to `nativeArtists` and Spotify's own page is shown. The mock in `dev/spicetify-mock.js` follows the `artistUnion` response shape.
- Spotify's toolbar (`#global-nav-bar`), Friend Activity and the queue keep their native React nodes; the theme only adds classes and repositions them. Do not move or clone React-owned nodes.
- A `MutationObserver` reconciles bindings after Spotify replaces host nodes. It deliberately ignores lyric-line and progress churn; keep it that way.
- User settings live in `localStorage['mcloud:settings']` and are exposed in the profile menu via `Spicetify.Menu.SubMenu('mcloud', …)`. Everything degrades gracefully when an API such as `Spicetify.Menu` is missing.

## Conventions

- **Prefix** every class, id and CSS variable the theme creates with `am-` / `--am-`.
- **User-facing strings are Turkish.** Comments and identifiers are English.
- **Match the existing dense style** in `theme.js` and `user.css`: short helpers (`el`, `button`, `svg`), compact one-line rules, and comments only where the *why* is not obvious.
- **Accent colour** comes from `--am-accent` / `--am-accent-focus`, which `theme.js` sets at runtime. Do not hard-code the red.
- **Performance is a feature.** Do no work while `document.hidden`, load artwork lazily through the shared `IntersectionObserver`, release image sources that leave the viewport, and avoid per-second DOM writes unless the value changed.
- **No network calls other than Spotify's own image CDN.** The theme must not load remote scripts, fonts or analytics.
- Spicy Lyrics is optional. Drive it only by clicking its own controls (`SpicyLyrics_PageButton`, `SpicyLyrics_FullscreenButton`).
- The installers must stay idempotent (re-running one updates the theme), must refuse to run as root/admin, and must only print Spicetify's error output when the last `apply` attempt fails.

## Verifying changes

There is no Spotify in CI, so the checks below catch syntax errors and broken wiring, not drift in Spotify's DOM. When a change depends on real Spotify markup, say so in the PR and describe how you tested it in the client.

```sh
node --check theme.js
shellcheck install.sh
pwsh -NoProfile -Command '$e=$null; [void][System.Management.Automation.Language.Parser]::ParseFile("install.ps1",[ref]$null,[ref]$e); $e'

npm i --no-save playwright && npx playwright install chromium
node dev/smoke.mjs ./shots   # optional dir for screenshots
```

When you add a feature, extend `dev/spicetify-mock.js` with any Spicetify API it uses and add a check to `dev/smoke.mjs`. CI (`.github/workflows/ci.yml`) runs all of the above.

To try a change in the real client, run `./install.sh` (or `.\install.ps1`) from the clone. It copies the local files instead of downloading them.

## Releases

Bump the version comment at the top of `theme.js` and `user.css` together. The installers default to `main`; tags can be installed with `--ref` / `-Ref`.
