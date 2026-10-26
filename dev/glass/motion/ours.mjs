// Same scroll offsets under our real player glass in Spotify (debug port 9229).
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(new URL('../../../', import.meta.url));
const { chromium } = require('playwright');
const [first, last, step] = process.argv.slice(2).map(Number);
const M = new URL('.', import.meta.url).pathname;
const browser = await chromium.connectOverCDP('http://127.0.0.1:9229');
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('xpui'));
const src = 'data:image/png;base64,' + fs.readFileSync(M + 'content.png').toString('base64');
const box = await page.evaluate(src => new Promise(res => {
  const p = document.getElementById('am-player'), r = p.getBoundingClientRect();
  const t = document.createElement('img'); t.id = 'am-test-pattern';
  for (const c of p.children) c.style.visibility = 'hidden';
  t.onload = () => res({ x: r.x, y: r.y });
  t.style.cssText = `position:fixed;left:${r.x - 40}px;top:${r.y - 40}px;width:781px;z-index:59;pointer-events:none`;
  t.src = src; document.body.append(t);
}), src);
const { execSync } = await import('node:child_process');
const focus = async () => { for (let k = 0; k < 20 && !(await page.evaluate(() => document.hasFocus())); k++) { execSync(`osascript -e 'tell application "Spotify" to activate'`); await page.waitForTimeout(250); } };
let i = 0;
for (let s = first; s <= last; s += step) {
  await page.evaluate(([s, y]) => new Promise(res => { document.getElementById('am-test-pattern').style.top = (y - 40 - s) + 'px'; requestAnimationFrame(() => requestAnimationFrame(res)); }), [s, box.y]);
  await focus();
  await page.screenshot({ path: `${M}ours/${String(i++).padStart(4, '0')}.png`, clip: { x: box.x - 40, y: box.y - 40, width: 781, height: 135 } });
}
await page.evaluate(() => { document.getElementById('am-test-pattern')?.remove(); for (const c of document.getElementById('am-player').children) c.style.visibility = ''; });
await browser.close().catch(() => {});
console.log('ours frames', i);
