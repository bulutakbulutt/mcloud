// Runs an expression in the live Spotify window and optionally saves a screenshot.
// Start Spotify with the DevTools port first (close it, then):
//   %APPDATA%\Spotify\Spotify.exe --remote-debugging-port=9229
//   node dev/client/eval.mjs "<js expression, may be async>" [shot.png]
// Restart Spotify normally afterwards so the port is not left open.
import { chromium } from 'playwright';

const [expr, shot] = process.argv.slice(2);
const browser = await chromium.connectOverCDP('http://127.0.0.1:9229');
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('xpui'));
if (!page) throw new Error('Spotify page not found: is the debug port open?');
if (expr) {
  const result = await page.evaluate(expr);
  console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 1));
}
if (shot) await page.screenshot({ path: shot });
await browser.close().catch(() => {});
