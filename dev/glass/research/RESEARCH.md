# Liquid Glass research: matching Apple Music's player in an SVG filter

What we learned measuring macOS 26's Liquid Glass (macOS 27.0.1, MacBook built-in Retina, 2x) and fitting the theme's
`#am-glass` SVG backdrop filter to it. The tools are one level up (`dev/glass`); this folder holds the data.

## Which glass Apple Music uses

- `strings /System/Applications/Music.app/Contents/MacOS/Music` shows `NSGlassView` properties
  (`topControlPlatter`, `topVolumePlatter`, `sliderAreaGlassView`), Swift classes `MPTransportPlatter`,
  `MPScrubberPlatter`, `MPTitlePlatter`, and calls to `set_variant:` and `setStyle:`.
- `NSGlassView` is a private subclass of `NSGlassEffectView` (public, macOS 26). Its private properties (dumped with
  the ObjC runtime): `_variant`, `_subvariant`, `_interactionState`, `_subduedState`, `_tintOpacityReduced`,
  `_scrimState`, `_contentLensing`, `_adaptiveAppearance`, `_useReducedShadowRadius`, `_inverseMeshed`, ...
- Over the same background, `NSGlassView`, `NSGlassEffectView` (style `.regular`) and SwiftUI
  `.glassEffect(.regular, in: .capsule)` render the same pixels. `_variant` 0, 1 and 12 match the default; 2-11 differ.
  `.clear` style differs a lot.
- The System Settings › Appearance › Liquid Glass slider is `NSGlassTintAmount` in the global domain. The user keeps it
  at the leftmost (0). Passing `-NSGlassTintAmount 0.5` or `1` to a test app changes the glass visibly; 0 matches Music.

## Ground truth: the scene behind Music's real player

The player floats over the content, so a capture with the player in place cannot be compared to "what is behind it"
directly. Making Music's window taller moves the player down (it is pinned to the bottom) while the content stays, so
the content that was under the player becomes visible: two window captures (`screencapture -l <id> -o`) give the
background and the reference (`scenes/scene*-bg.png`, `scenes/scene*-ref.png`; the player is 701x55pt, 40pt margin).
Synthetic scroll-down events (`CGEvent` scroll wheel, arrow keys) did not scroll Music's home; scroll-up did.

## Focus changes everything

- macOS glass has two looks by window focus. In a key (focused) window it is nearly clear: a 4pt checker keeps its
  pattern, faces and fabric stay readable. In a background window it is diffuse: a 1pt dot spreads over +-10pt.
- Borderless `NSWindow`s cannot become key, so the first test app always rendered the background state, and the
  first Music captures were taken while Music was in the background. The first fit (σ ≈ 6pt, two blurs) therefore
  matched the diffuse glass and looked far blurrier than Music. The user caught it by eye.
- Test windows now subclass `NSWindow` (`canBecomeKey`), retake focus every 50ms and publish their key state; the
  capture script keeps a shot only if the window was key before and after it. Apple Music is activated before each
  capture of it. Any test of glass must check focus.

## The focused glass, measured

Patterns behind the glass (2x, `fit/bg`): stripes, single lines at known distances from the rim, a grey ramp, an 8pt
grid, a 4pt checker, step edges, and real scenes. Native captures in `fit/apple` (focused) and `fit/apple-unfocused`.

- **Tone** (uniform greys, centre of the bar), in -> out: 0->32, 32->62, 64->89, 96->113, 128->134, 160->152,
  192->166, 224->177, 255->185. It works on luminance and keeps the hue: applying the curve to each channel turned
  orange into olive. Unfocused: 0->20, 128->127, 255->180.
- **Local contrast, not blur.** At a black/white step the dark side stays at 32 right up to the edge while the bright
  side rises to ~160 at once and creeps to 184 over ~30pt. Fine bright detail is dimmed (1pt grid lines 255 -> 118;
  checker white 146 instead of 185) while black stays black. A symmetric blur cannot do both; a `darken` blend
  (min of the image and a 9.5pt blur, mixed at 70%) fits it.
- **No magnification** across the face of the bar (stripe centroids stay put) and **no light from outside**: lines
  placed outside the bar never appear inside it.
- **Rim:** the outermost ~2pt show content from 14-16pt further in, folding back over ~4pt, flat from ~14pt in. The
  edge mirrors what is just inside it (text near the top shows upside down at the rim, in Music and in the lab).
- **Edge highlight (top and bottom only).** The outermost device pixel along the top and bottom edges mixes ~13%
  toward a "brighter than white" level (~2.2x), fading over ~5px: over black 32 -> 85, 62, 43, 40...; over white
  184 -> 217, 203, 191... None at the middle of the round ends (it follows the vertical part of the edge normal, fitted
  as |n_y|^3.5). It is present in the plain lab glass and in Music's real player alike (`compare/music-focused-highlight.png`);
  the first fits missed it because they sampled the middle of the bar.
- **Rim softness.** The bend lives in the outermost ~2px; a displacement map at CSS size gives it two steps on a 2x
  screen and a hard fold. Drawn at device resolution with knots every 0.5px it matches Apple's soft fold.

## The fit

`fit.mjs` renders the same backgrounds in Chromium (2x) with a parametric filter and compares with the native
captures (mean abs per channel inside the bar). Coordinate descent over the parameters. Results (`params/`):

| model | error |
| --- | --- |
| theme before this work (hand-tuned lens, white to 0.6) | 21.9 |
| fitted to the unfocused glass (σ 4 + 4.25, luminance tone) | 2.2 vs unfocused targets |
| focused, per-channel tone | ~13 |
| focused, luminance tone, slight blur | 7.4 |
| focused + darken halo | 4.2 |
| + top/bottom highlight, device-resolution maps, rim knots every 0.5px (shipped) | 2.9 |

Shipped parameters (`glassStates.focused` in `theme.js`, `params/fit-hi.log`): pre-blur 0.4px; displacement
`[15,15.6,18.1,15.7,12.25,10.9,7.5,5,0.75,0]` px at `[0,.5,1,1.5,2,3,4,6,9,14]` px from the edge; darken blend with a
9.5px blur at 70%; luminance tone with gain 1.1; highlight table `[.13,.072,.027,...]` every 0.5px toward 2.23x,
|n_y|^3.5; no saturation boost. The theme keeps only the focused look (the user's choice).

Things that did not work: a wide halo mixed in plainly (raises the black cells of the grid), blurring in linearRGB
(far off), one blur after the bend only (aliases stripes at the rim into sharp slivers), a squircle bend (folds).

## Chromium pitfalls found on the way

- On P3 screens Chromium converts the filter's `feImage` maps from sRGB to P3; red takes ~18% of green, so a vertical
  shift leaked into a sideways one ("the page slides left"). The map is two grey images recombined as R=G=x, B=y,
  with blue's ~9% share of x undone on `(color-gamut: p3)`.
- `feComposite arithmetic` on partly transparent pixels (blur near the region edge) wrecks colours; force alpha 1 first.
- Untagged PNGs drawn in a native view are treated as sRGB and converted; retag them with the screen's colour space
  when the pixels came off that screen.

## Motion

`ScrollLab` (native, focused) and `motion/ours.mjs` (Spotify on its debug port, focused) scroll the same 2x page under
the glass in the same steps (`compare/scroll-side-by-side.mp4`; frames in `local/`, not in git). Per-frame error 4.3;
change of the rim band between frames: native 5.8, ours 6.4. Frame times while scrolling Spotify are unchanged by the
device-resolution maps (p95 ~18ms with and without the glass).

## Scrolling Apple Music itself (ground truth in motion)

- Synthetic scrolling works when it looks like a trackpad: `swipe.swift` warps the cursor over Music's content and
  posts `CGEvent` scroll events through the HID tap with `scrollWheelEventIsContinuous = 1` and scroll phases
  (began 1, changed 2, ended 4). Plain wheel events posted to Music's pid (no phase, cursor elsewhere) were ignored
  going down. Music is activated first and re-activated if it loses focus; frames are window captures.
- 50 steps of -160px over 50 events moved the content exactly 6px (3pt) per step (alignment error ~0.1).
- Scrolling down moves the content up, so what passes behind the player is visible above it a few frames later. That
  gives the barless content (`music-scroll/content.png`) for the first ~30 frames; `music-scroll/ref/00NN.png` are
  Music's frames (2x, 1562 wide, player at x 40pt, top 40.5pt, 701x54pt in this crop).
- `motion/ours-music.mjs` scrolls the same content under our glass in Spotify in the same steps (focused).
- **Colour:** the stitched PNG must carry the display's profile (`sips -e display.icc`, extracted from a capture with
  `sips -x`); untagged, Spotify treats it as sRGB and converts it to P3, which made everything look paler.
- Results (shipped glass 644fe5e, aligned, glyph-free stretches only): outside the bar 0.0, middle of the bar 5.0,
  bottom 5pt band 4.7, top 5pt band 13.2 (`compare/music-vs-ours-scroll.mp4`, `compare/music-vs-ours-top-edge.png`).
  The top-band gap: where the rim mirrors bright content from inside, ours is brighter (mirror band ~142 vs Music
  ~121, edge pixel 182 vs 141); on dark content the two match row for row.
- Fitting directly to these Music frames (`fit.mjs`, patterns `mf00..mf30`, `barTop` 40.5, `barH` 54, Music's icons
  masked): 6.5 -> 5.45, preferring a weaker top highlight on bright content, a slightly shallower mirror
  (`[13,15.6,14.1,14.7,14.25,10.9,8.5,3,0.75,0]`) and a wider darken blur (19px). The highlight table it found is
  noisy (negative entries): it needs a constrained shape (e.g. a*exp(-d/b)) before shipping. `params/fit-music.log`.

### Fitting to lab patterns and Music's frames together

Each change from the Music-frame fit was tried alone on both sets (lab: 18 patterns; music: 11 Music frames):
the exponential highlight shape hurt the lab set (2.89 -> 4.11; the table's sharper falloff is right), while a wider
darken blur (13.5px), gain 1.05 and a softer mirror peak (16.1 instead of 18.1px at 1px from the edge) each helped
both. Combined and shipped: lab 2.83 (was 2.89), Music frames 5.97 (was 6.52). The remaining Music gap sits in the
top band over bright content; frames there may also carry Music's hover and title-strip effects.

## Open questions

- Synthetic scroll events scroll Music's home unreliably (up sometimes, down never), so motion against Music itself
  was compared with the lab's `NSGlassView` (proven equal to Music's player over the same background) rather than
  with Music scrolling. A recording of Music scrolling by hand would close that gap.
- The highlight table and the dark/bright edge shading are fitted on a dark page; light pages are less covered.
