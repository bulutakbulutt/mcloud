// GPU cost of a frame in the live client (macOS), with parts of the glass hidden by CSS. With vsync on, a frame that
// misses 16.7ms waits for the next one, so fps near the limit jumps between ~33 and ~56 run to run and hides small
// changes. Started this way Spotify draws as fast as the GPU allows, and the draw interval is the frame's cost:
//   /Applications/Spotify.app/Contents/MacOS/Spotify --remote-debugging-port=9229 --disable-gpu-vsync \
//     --disable-frame-rate-limit --disable-mac-overlays
//   node dev/client/cost.mjs 'glass=' 'off=#am-toolbar-glass,.am-player-face,#am-player > .am-tglass-rim{display:none!important}'
// (Without --disable-mac-overlays the glass was held at exactly 60 draws a second.) The page scrolls 3px a frame by
// rAF; viz's DirectRenderer::DrawFrame events over 2s give the interval. Rounds interleaved (ROUNDS, default 3);
// medians and the difference from the first variant at the end. Restart Spotify normally afterwards.
import { chromium } from 'playwright';
const specs = process.argv.slice(2).map(s => { const i = s.indexOf('='); return [s.slice(0, i), s.slice(i + 1)]; }), rounds = +(process.env.ROUNDS || 3);
const browser = await chromium.connectOverCDP('http://127.0.0.1:9229'), page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('xpui')), cdp = await browser.newBrowserCDPSession();
const sleep = ms => new Promise(r => setTimeout(r, ms)), res = {};
for (let r = 0; r < rounds; r++) for (const [label, css] of specs) {
  await page.evaluate(css => {
    let s = document.getElementById('cost-variant'); if (!s) { s = document.createElement('style'); s.id = 'cost-variant'; document.head.append(s); } s.textContent = css;
    const w = window.__cost ??= {}; cancelAnimationFrame(w.raf);
    const v = document.querySelector('.main-view-container__scroll-node [data-overlayscrollbars-viewport]') || document.querySelector('.main-view-container__scroll-node');
    let dir = 1; const f = () => { v.scrollTop += dir * 3; if (v.scrollTop > 2400) dir = -1; else if (v.scrollTop <= 0) dir = 1; w.raf = requestAnimationFrame(f); }; w.raf = requestAnimationFrame(f);
  }, css);
  await sleep(1200);
  const events = [], on = e => events.push(...e.value); cdp.on('Tracing.dataCollected', on);
  const done = new Promise(r => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['viz'], recordMode: 'recordContinuously' }, transferMode: 'ReportEvents' });
  await sleep(2000); await cdp.send('Tracing.end'); await done; cdp.off('Tracing.dataCollected', on);
  const ts = events.filter(e => e.name === 'DirectRenderer::DrawFrame' && (e.ph === 'X' || e.ph === 'B')).map(e => e.ts).sort((a, b) => a - b);
  const ms = (ts.at(-1) - ts[0]) / 1000 / (ts.length - 1); (res[label] ??= []).push(ms);
  console.log(`r${r} ${label.padEnd(16)} ${ms.toFixed(2)} ms/frame`);
}
await page.evaluate(() => { cancelAnimationFrame(window.__cost.raf); document.getElementById('cost-variant').remove(); });
const median = a => [...a].sort((x, y) => x - y)[a.length >> 1], base = median(Object.values(res)[0]);
console.log('median ms/frame (difference from the first):');
for (const [l, a] of Object.entries(res)) console.log(`  ${l.padEnd(16)} ${median(a).toFixed(2)}  ${(median(a) - base >= 0 ? '+' : '') + (median(a) - base).toFixed(2)}  [${a.map(x => x.toFixed(1)).join(' ')}]`);
await browser.close().catch(() => {});
process.exit(0);
