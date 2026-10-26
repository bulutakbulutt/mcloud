# Native glass lab (macOS 26+)

Tools used to fit `#am-glass` in `theme.js` to macOS's own Liquid Glass. Apple Music's player is an `NSGlassView`
(a private `NSGlassEffectView` subclass); at the regular style it renders exactly like `NSGlassEffectView` and
SwiftUI's `.glassEffect(.regular)`, so the lab uses those. Results depend on System Settings › Appearance ›
Liquid Glass (`NSGlassTintAmount`); the fit was made at 0 (the leftmost setting). Pass `-NSGlassTintAmount <v>`
to try another.

```sh
swiftc -O -target arm64-apple-macosx26.0 GlassLab.swift -o GlassLab   # glass over built-in patterns (700x54)
swiftc -O -target arm64-apple-macosx26.0 Lab2.swift -o Lab2           # glass over any 2x PNG (701x55, Music's size)
swiftc -O -target arm64-apple-macosx26.0 ScrollLab.swift -o ScrollLab # same, scrolling on command
./capture.sh vstripes empty out.png
./cap2.sh out.png background.png nsglass

python3 mkbg.py bg                                  # fit backgrounds
for f in bg/*.png; do ./cap2.sh apple/$(basename $f) $f nsglass; done
PWB=<chromium> node fit.mjs eval '<params json>' renders/
```

**Focus matters.** macOS glass has two states: in a key (focused) window it is nearly clear; in a background
window it turns diffuse. Borderless windows cannot become key by default, so `Lab2`/`ScrollLab` subclass NSWindow to
allow it and keep taking focus back, and `cap2.sh` only keeps a shot taken while the window was key. Apple Music
must be frontmost when you capture it too.

Motion: `ScrollLab` scrolls a tall 2x image under the glass one step per stdin line; `motion/native.sh` and
`motion/ours.mjs` (Spotify on debug port 9229, kept focused) capture the same offsets for a side-by-side video.

Window capture (`screencapture -l`) needs the Screen Recording permission for the terminal.
