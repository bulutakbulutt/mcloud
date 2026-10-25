// Reports which font Spotify actually renders for a few theme and Spotify nodes
// (CSS.getPlatformFontsForNode), plus whether the embedded Inter has loaded.
//   node dev/client/fonts.mjs [extra selectors…]
import { chromium } from 'playwright';

const selectors = ['#am-sidebar .am-nav-row span', '.am-track-title', '#global-nav-bar input', '.main-view-container__scroll-node-child h2', '[data-testid="home-page"] span', ...process.argv.slice(2)];
const browser = await chromium.connectOverCDP('http://127.0.0.1:9229');
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('xpui'));
const cdp = await page.context().newCDPSession(page);
await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
for (const selector of selectors) {
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector }).catch(() => ({}));
  if (!nodeId) { console.log(selector, '-> none'); continue; }
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId }).catch(() => ({ fonts: [] }));
  console.log(selector, '->', fonts.map(f => `${f.familyName} ×${f.glyphCount}`).join(', ') || '(no text)');
}
console.log(await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter(f => /Inter/.test(f.family)).map(f => `${f.family}: ${f.status}`).join(', '); }));
await browser.close().catch(() => {});
