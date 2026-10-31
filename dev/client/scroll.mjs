// Scrolling smoothness of the artist page and its ⓘ sheet in the live client (macOS). Spotify must run with
// --remote-debugging-port=9229; it is brought to the front. Input goes through CDP wheel events (Chromium's real
// scroll path) in two profiles:
//   wheel     a mouse wheel spun fast: 100px notches every 50ms, sent without waiting (Chromium animates each notch)
//   trackpad  Input.synthesizeScrollGesture: precise deltas generated every frame, at 600, 1200 and 2400px/s each way.
//             (Precise wheel events sent one by one over CDP arrive ~20ms apart and move the page only every other
//             frame: a measurement artefact, not a dropped frame.)
// Frame intervals are rAF timestamps in the page. Per artist and target: cold (UI reloaded, first visit, as soon as the
// photo has loaded) and warm (the same again).
//   node dev/client/scroll.mjs <page|sheet> <artist id> [<artist id>…]
// Reports fps, the share of frames slower than 60fps (> 17.5ms), the intervals over 25ms, and a histogram.
// Restart Spotify normally afterwards.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
const [target = 'page', ...ids] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let browser, page;
const connect = async () => { browser = await chromium.connectOverCDP('http://127.0.0.1:9229'); page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('xpui')); };
const scroller = () => target === 'sheet' ? '.am-info-scroll' : '#am-artist';
async function reloadUI() {
  await page.evaluate(() => setTimeout(() => location.reload(), 20)); await sleep(3000); await browser.close().catch(() => {}); await connect();
  await page.waitForFunction(() => typeof window.Spicetify?.GraphQL?.Request === 'function', null, { timeout: 30000 }); await sleep(1500);
}
async function open(id) {
  await page.evaluate(id => Spicetify.Platform.History.push('/artist/' + id), id);
  await page.waitForFunction(() => document.querySelector('.am-artist-name') && document.querySelector('.am-hero-info') && [...document.querySelectorAll('.am-hero-media img,.am-hero-portrait')].every(i => i.complete), null, { timeout: 25000 });
  if (target !== 'sheet') return;
  await sleep(500); await page.evaluate(() => document.querySelector('.am-hero-info').click());
  await page.waitForFunction(() => [...document.querySelectorAll('.am-info-photo')].length && [...document.querySelectorAll('.am-info-photo')].every(i => i.complete), null, { timeout: 20000 });
}
const cdp = () => page.context().newCDPSession(page);
async function wheelAt(session, x, y, dy) { await session.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy }); }
async function input(profile, x, y) {
  const s = await cdp();
  if (profile === 'wheel') { for (const dir of [1, -1]) for (let t = 0; t < 2500; t += 50) { wheelAt(s, x, y, 100 * dir).catch(() => {}); await sleep(50); } }
  else for (const dir of [-1, 1]) for (const speed of [600, 1200, 2400]) {
    await s.send('Input.synthesizeScrollGesture', { x: Math.round(x), y: Math.round(y), yDistance: dir * Math.round(speed * .7), speed, gestureSourceType: 'mouse', preventFling: true });
    await sleep(150);
  }
  await s.detach().catch(() => {});
}
async function pass(profile) {
  const box = await page.evaluate(sel => { const v = document.querySelector(sel); v.scrollTop = 0; const r = v.getBoundingClientRect(); return { x: r.left + r.width * .55, y: r.top + r.height * .55 }; }, scroller());
  await page.mouse.move(box.x, box.y); await sleep(250);
  await page.evaluate(() => { window.__f = []; const f = t => { window.__f.push(t); window.__raf = requestAnimationFrame(f); }; window.__raf = requestAnimationFrame(f); });
  await input(profile, box.x, box.y); await sleep(300);
  return page.evaluate(() => {
    cancelAnimationFrame(window.__raf); const f = window.__f, d = f.slice(1).map((t, i) => t - f[i]);
    const bins = { '<=17.5': 0, '17.5-25': 0, '25-40': 0, '>40': 0 }; for (const x of d) bins[x <= 17.5 ? '<=17.5' : x <= 25 ? '17.5-25' : x <= 40 ? '25-40' : '>40']++;
    return { fps: 1000 * d.length / (f.at(-1) - f[0]), slow: 100 * d.filter(x => x > 17.5).length / d.length, hitches: d.filter(x => x > 25).map(Math.round), bins };
  });
}
await connect(); execSync(`osascript -e 'tell application "Spotify" to activate'`);
for (const id of ids) for (const profile of ['wheel', 'trackpad']) {
  await reloadUI(); await open(id);
  const cold = await pass(profile); await sleep(500); const warm = await pass(profile);
  const name = await page.evaluate(() => document.querySelector('.am-artist-name')?.textContent);
  for (const [k, v] of Object.entries({ cold, warm })) console.log(`${name} ${target} ${profile.padEnd(8)} ${k.padEnd(4)} ${v.fps.toFixed(1)}fps  >17.5ms ${v.slow.toFixed(1)}%  hitches [${v.hitches.join(',')}]  bins ${JSON.stringify(v.bins)}`);
  if (target === 'sheet') await page.evaluate(() => document.querySelector('.am-info-close')?.click());
}
await browser.close().catch(() => {});
