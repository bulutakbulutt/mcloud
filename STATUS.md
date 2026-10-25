# Status — where we left off

Working notes for the next session (people and agents). Read after AGENTS.md. Work happens on `feature/one-line-install-and-polish`; after every change `main` is fast-forwarded to the same commit and both are pushed, because the one-line installers fetch `main` and the user wants them to always install the latest files. The repo lives at `C:\dev\mcloud` on the user's machine (moved from the user profile at their request).

## Next up (in the user's order)

1. **Shift+wheel on rows should feel responsive, back and forth without hitches.** Since `72787bf` the theme leaves row scrolling to Chromium: the wheel scrolls the page, Shift+wheel (or a trackpad's horizontal swipe) scrolls a row. What likely makes it feel sticky: the rows use mandatory scroll snapping, so every wheel notch jumps a whole card and quick back-and-forth input fights the snap animation.
   - Spotify's rows: `.am-native-main` `[data-testid="component-shelf"]` scrollers have `scroll-snap-type: inline mandatory` (hashed classes; select them structurally, e.g. elements inside the shelf with `overflow-x:auto`).
   - Our rows: `#am-artist .am-shelf-track` (`scroll-snap-type:x mandatory`, `scroll-padding-left` set for the sidebar).
   - Try `scroll-snap-type: x proximity` (or none) on both and compare by hand with Shift+wheel and a trackpad; check `overscroll-behavior-x: contain` so a row's end does not hand over to anything. Do **not** reintroduce converting the plain vertical wheel to sideways: two attempts (plain, then latched per gesture) felt like the page and the rows kept taking over from each other, and the user chose Shift+wheel.
   - The smoke test's artist check already asserts that a plain wheel over a row scrolls the page and Shift+wheel scrolls the row.
2. **Player rim light is too thick.** The user finds the specular rim (~3px band, reads as ~6px on screen) too heavy. Where: `drawGlassMap()` in `theme.js` writes it into the map's blue channel as `155*light*band` with `band=1-min(1,edge/3)²`. Options, cheapest first: narrow the band (divide `edge` by 1.5–2 instead of 3); lower the strength (`155` → ~100); tone down the colour (`feColorMatrix type="saturate" values="5"` → 3, or the `slope="1.5" intercept=".14"` brighten). Compare at 1x and 2x and keep the rim reading as the page's colour, not white.
3. **Make the top bar one piece with the sidebar.** The toolbar row (`#global-nav-bar` area, grid row `global-nav`) is a solid band, measurably lighter than the glass sidebar: toolbar (39,39,39) vs sidebar ~(26–33) over a (31,31,31) page. Options: (a) cheap — give the toolbar row the sidebar's material and tone so the two read as one L-shaped frame; (b) full — let the page run under the toolbar too (span `.am-native-main` into the `global-nav` row, pad the scroll content by `--am-header`), which also needs Spotify's sticky bars moved down: `.main-topBar-container` (absolute, top 0), the home chips bar (sticky, top 0) and the track list header (sticky, inline `top: 64px`). Ask the user which before starting (b).
4. Checked only partly; ask the user when they next test:
   - **Spicy Lyrics** works in the real client here (opens and closes from the player's lyrics button, page beside the sidebar, background under the glass). The stale-page guard (`body:not(.am-spicy-route)`) covers a restart race seen once. The user had said it "doesn't open" on their side.
   - **Marketplace/Home overlap** in the toolbar was never reproduced; the fix is preventive.
   - The **home chips bar** is glass but looks dark when dark artwork scrolls under it; that is the glass working.
5. Known gaps, not started: Spotify's home carousels do not slide under the sidebar (only `#am-artist` rows do).

## Decisions and why

- **Player glass** (`#am-glass`; the comment block above it in `theme.js` has the details):
  - Apple's 2x recording mirrors the outer ~7px of the pill (shift ~17px at the edge, 0 at 7px). On 1x Windows screens that fold broke cards and round avatars into slivers and swirls, so the lens must never fold.
  - Lens: circular-arc bezel over 16px, refracted with Snell's law (n=1.5) as in [kube.io](https://kube.io/blog/liquid-glass-css-svg/), tapered by `(1-x⁴)` so there is no seam where the bezel ends, scaled until the steepest fall is −0.9 px/px (beyond −1 the image folds). Peak shift ~8.6px, 2.5px in. A squircle profile was tried: too steep at the edge, it folds unless weakened to ~4px.
  - 0.7px blur after the displacement (Chromium samples it per pixel), then a tone curve taking white to ~0.54 so white text stays readable over bright artwork (picked from a side-by-side over white cards).
  - Rim after kube.io's player (specular opacity ~0.4, saturation ~6): a saturated, brightened copy of the refracted page, strength by edge normal against a light at −60°.
  - The map is drawn at CSS size; a device-resolution map looked the same but cost ~25% more per frame while scrolling.
- **Performance:** anything animating over the player re-runs its backdrop filter every frame. The progress bar and marquee move in device-pixel `steps()`; idle playback dropped from ~27% to ~1–5% of a core (`dev/client/cpu.mjs`). Keep new animations behind the player stepped or short.
- **Sidebar and page:** the sidebar is glass (page shows through ~15% darker, as measured on Apple Music) and the page runs under it: `.am-native-main` spans the `left-sidebar` column, `.main-view-container__scroll-node-child` is padded by `--am-side`, carries the `main-view-grid-area` size container and clips horizontal overflow. `#am-artist` fills the window; its hero and rows go under the glass. Sidebar rows use fixed points (32px rows, 16px insets, 18px icons, 11px section titles), as measured on Apple Music.
- **Fonts:** Spotify pins its own font on `<html>` for non-Latin locales (Turkish included) via `.spotify-mix-non-latin` with an `!important` no `:root` rule beats; the Inter stack is declared on `body`.
- **Artist pages:** routes are matched without the locale prefix; colour is sampled from the artwork (i.scdn.co allows CORS) with Spotify's extracted colour as a 600ms fallback; grey artwork keeps a grey page; artists without `visuals.headerImage` get the round portrait layout. Back/share/more are `no-drag` (they sit in the title-bar strip).
- **Top bars:** Spotify's scrolled bars (home chips row, playlist/album title bar, track list header) are the theme's glass (`#2a2a2a` at 62%, blur 30, saturate 1.8). The home chips layer is tagged on first scroll with `data-am-glass`; Spotify's 60% black `.main-topBar-overlay` is cleared.
- **Right panel:** Friend Activity and the queue are read from the panel itself (an `<aside>` labelled like the button with `data-restore-focus-key` `buddy_feed` / `queue`) and shown as one glass sheet, so any close button closes it.
- **Player menus:** the artist — album line opens "Sanatçıya Git / Albüme Git"; the title goes to the album. The volume capsule follows Apple Music (opens after 0.5s on the speaker, mute keeps the level).
- **Windows "Transparency effects" off** reports `prefers-reduced-transparency`; the theme then shows solid surfaces with the glass rim. This is why some users saw a flat grey player.
- **macOS native Liquid Glass** cannot be used: Spotify's UI is a Chromium page, Spicetify only reaches its HTML/CSS/JS, and the native material is an AppKit view. Only Spotify could adopt it.

## Gotchas found the hard way

- `spicetify config <key> <value>` **writes**, it does not read, and the change can get applied right away. Read `config-xpui.ini` instead (path from `spicetify -c`). Remove a list item with `spicetify config extensions name-`. On this machine `extensions` should be empty (only the theme and Marketplace load).
- Spotify marks the window's top 60px (`.body-drag-top`) as a drag region; controls there need `-webkit-app-region:no-drag`. The browser preview cannot show this.
- Links inside Spotify carry a locale prefix (`/intl-tr/artist/…`); use `routePath()`.
- React rewrites `className` on some nodes while scrolling; tag those with a `data-` attribute.
- `overflow-clip-margin` accepts a plain length only (no `var()`/`clamp()`).
- `mix-blend-mode` on the player's children does not see the backdrop, so the rim lives inside the SVG filter.
- Selectors with a descendant combinator do not match nodes already removed from the DOM; checks on MutationObserver `removedNodes` need ancestor-free selectors.
- Inline-style selectors on Spotify nodes must be narrow: search page genre tiles also carry inline `background-color` and are `position:relative`.
- Spicy Lyrics mounts `#SpicyLyricsPage` in Spotify's scroll viewport (sibling of the padded content), sizes itself from its own width (`container-type:size`) and finds its host via `:is(.Root__main-view, :where(#main-view)) .main-view-container div[data-overlayscrollbars-viewport]`. Its lyrics button toggles on its own `active` flag.
- When reproducing Spotify states over the debug port, wait for extensions to load (Spicy's button appears a few seconds after start).
- `git fetch` to github.com sometimes times out from this machine; retry before pushing.

## Checking changes

- Preview and smoke test as in AGENTS.md (`node dev/smoke.mjs`, 20 checks). Playwright 1.57 matches the installed Chromium build (`npm i --no-save playwright@1.57.0`).
- **Real client:** close Spotify and start `%APPDATA%\Spotify\Spotify.exe --remote-debugging-port=9229`. Then:
  - `node dev/client/eval.mjs "<expression>" [shot.png]` runs code in the page and screenshots it;
  - `node dev/client/styles.mjs "<selector>" <property>` lists the rules setting a property, with `!important`;
  - `node dev/client/fonts.mjs` shows which font really renders.
  Restart Spotify normally afterwards so the port is not left open. Spotify here runs at devicePixelRatio ≈ 0.91, so screenshot pixels are ~0.91× CSS pixels. Install with `.\install.ps1` from the clone first (it restarts Spotify).
- CPU: `node dev/client/cpu.mjs` (preview, real GPU via ANGLE/D3D11).
- Reference material: Apple Music on macOS 26 screen recordings (player, volume capsule, sidebar) sent by the user; the measured values are in the commit messages from `4cb4d3b` on. Comparisons were always shown to the user as side-by-side screenshots, at 2x and 1x.
