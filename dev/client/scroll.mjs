// Scrolling smoothness of the artist page and its ⓘ sheet in the live client (macOS). Spotify must run with
// --remote-debugging-port=9229; it is brought to the front. Input goes through CDP wheel events (Chromium's real
// scroll path) in two profiles:
//   wheel     a mouse wheel spun fast: 100px notches every 50ms (Chromium animates each notch), down then up
//   trackpad  pixel-precise deltas every 8ms: a 350ms drag (6-14px) then momentum decaying from 30px, 4 flicks each way
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
  if (profile === 'wheel') { for (const dir of [1, -1]) for (let t = 0; t < 2500; t += 50) { await wheelAt(s, x, y, 100 * dir); await sleep(50); } }
  else for (const dir of [1, -1]) for (let flick = 0; flick < 4; flick++) {
    for (let t = 0; t < 350; t += 8) { await wheelAt(s, x, y, dir * (6 + 8 * Math.sin(Math.PI * t / 350))); await sleep(8); }
    for (let v = 30; v > .5; v *= .955) { await wheelAt(s, x, y, dir * v); await sleep(8); }
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
