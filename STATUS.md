# Status — where we left off

Working notes for the next session (people and agents). Read after AGENTS.md. Last updated with commit `29e565b` on `feature/one-line-install-and-polish`; `main` is kept fast-forwarded to the same commit so the one-line installers serve it.

## Next up

1. **Player rim light is too thick.** The user finds the specular rim (~3px band, reads as ~6px on screen) too heavy and wants it thinner. Where: `drawGlassMap()` in `theme.js` writes the rim into the map's blue channel as `155*light*band` with `band=1-min(1,edge/3)²`. Options, cheapest first:
   - narrow the band: divide `edge` by 1.5–2 instead of 3;
   - lower the strength: `155` → ~100;
   - tone down the colour: `feColorMatrix type="saturate" values="5"` → 3, or the `slope="1.5" intercept=".14"` brighten.
   Compare at 1x and 2x before committing (see *Checking changes*), and keep the rim reading as the page's colour, not white.
2. Things checked only partly, worth a look when the user next tests:
   - **Spicy Lyrics layout** was verified in the real client on this machine (page beside the sidebar, background under the glass). The stale-page fix (`body:not(.am-spicy-route)`) covers a restart race seen once; ask the user if Spicy still "doesn't open".
   - **Marketplace/Home overlap** in the toolbar was never reproduced; the fix (natural width for the history and custom-navlinks groups, `justify-content:safe center`) is preventive.
   - The **home chips bar** is glass now but looks dark when dark artwork scrolls under it; that is the glass working, not a bug.
3. Known gaps, not started: the top toolbar row (`#global-nav-bar` area) is a solid band rather than glass over the page; Spotify's home carousels do not slide under the sidebar (only `#am-artist` rows do).

## Decisions and why

- **Player glass** (`#am-glass`, see the comment block above it in `theme.js`):
  - Apple's 2x recording mirrors the outer ~7px of the pill (measured: shift ~17px at the edge, falling to 0 at 7px). On 1x Windows screens that fold broke cards and round avatars into slivers and swirls, so the lens must never fold.
  - Current lens: circular-arc bezel over 16px, refracted with Snell's law (n=1.5) as in [kube.io](https://kube.io/blog/liquid-glass-css-svg/), tapered by `(1-x⁴)` so there is no seam where the bezel ends, scaled until the steepest fall is −0.9 px/px (beyond −1 the image folds). Peak shift ~8.6px, 2.5px in from the edge.
  - 0.7px blur after the displacement (Chromium samples it per pixel), then a tone curve that takes white to ~0.54 so the white text stays readable over bright artwork.
  - Rim after kube.io's player (specular opacity ~0.4, saturation ~6): saturated, brightened copy of the refracted page, strength by edge normal against a light at −60°.
  - The map is drawn at CSS size: a device-resolution map looked the same but cost ~25% more per frame while scrolling.
- **Performance:** anything animating over the player re-runs its backdrop filter every frame. The progress bar and marquee move in device-pixel `steps()`; idle playback dropped from ~27% to ~1–5% of a core. Keep new animations behind the player stepped or short.
- **Sidebar and page:** the sidebar is glass and the page runs under it (`.am-native-main` spans the `left-sidebar` column; `.main-view-container__scroll-node-child` is padded by `--am-side` and carries the `main-view-grid-area` size container). `#am-artist` fills the window; its hero and rows go under the glass.
- **Fonts:** Spotify pins its own font on `<html>` for non-Latin locales (Turkish included) with an `!important` no `:root` rule beats; the Inter stack is declared on `body`.
- **Artist colour** is sampled from the artwork (i.scdn.co allows CORS); grey artwork keeps a grey page. Artists without `visuals.headerImage` get the round portrait layout.
- **Right panel:** Friend Activity and the queue are read from the panel itself (an `<aside>` labelled like the button with `data-restore-focus-key` `buddy_feed` / `queue`), so any close button closes the sheet.
- **Wheel over rows:** latched per gesture like browser scroll latching (400ms pause ends a gesture); a page scroll passing over a row never turns sideways.
- **Windows "Transparency effects" off** reports `prefers-reduced-transparency`; the theme then shows solid surfaces with the glass rim (this is why some people saw a flat player).
- **macOS native Liquid Glass** cannot be used: Spotify's UI is a Chromium page, Spicetify only reaches its HTML/CSS/JS, and the native material is an AppKit view. Only Spotify could adopt it.

## Gotchas found the hard way

- `spicetify config <key> <value>` **writes**, it does not read, and Spicetify may apply it right away. To inspect config, read `config-xpui.ini` (path from `spicetify -c`). To remove a list item: `spicetify config extensions name-`.
- Spotify marks the window's top 60px (`.body-drag-top`) as a drag region; controls there need `-webkit-app-region:no-drag`.
- Links inside Spotify carry a locale prefix (`/intl-tr/artist/…`); use `routePath()`.
- React rewrites `className` on some nodes as you scroll; tag those with a `data-` attribute instead of a class.
- `overflow-clip-margin` accepts a plain length only (no `var()`/`clamp()`).
- `mix-blend-mode` on the player's children does not see the backdrop, so the rim must live inside the SVG filter.
- Nested selectors with a descendant combinator (`.a .b`) do not match nodes already removed from the DOM; MutationObserver checks on removed nodes need selectors without ancestors.

## Checking changes

- Preview and smoke test as in AGENTS.md (`node dev/smoke.mjs`, 20 checks at the time of writing).
- **Real client:** close Spotify, start it with `%APPDATA%\Spotify\Spotify.exe --remote-debugging-port=9229`, then attach Playwright with `chromium.connectOverCDP('http://127.0.0.1:9229')` and pick the page whose URL contains `xpui`. That allows `page.evaluate`, screenshots, `CSS.getPlatformFontsForNode`, `CSS.getMatchedStylesForNode` and `Browser.setWindowBounds`. Restart Spotify normally afterwards so the port is not left open. Spotify on this machine runs at devicePixelRatio ≈ 0.91.
- CPU: sum Chromium process CPU time (`Win32_Process` Kernel+User time) around an idle-while-playing window, with and without the glass; launch Playwright's Chromium with `--enable-gpu --use-angle=d3d11` for a real GPU.
- Reference recordings used for measurements were Apple Music on macOS 26 (the player, the volume capsule and the sidebar); measured values are in the commit messages from `4cb4d3b` on.
