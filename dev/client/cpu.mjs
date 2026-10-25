// CPU used by all Chromium processes (browser, renderer, GPU) while the preview plays with nothing
// touched, with the glass on and off. Uses a real GPU (ANGLE/D3D11), so numbers track Spotify better
// than headless software rendering. Windows only (reads process times through PowerShell).
//   node dev/client/cpu.mjs
// At commit 36dc048: ~1–5% of one core with the glass, ~1–2% without; ~15% while a long title scrolls.
import { chromium } from 'playwright';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import path from 'node:path';

const preview = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'preview.html');
const ps = `(Get-CimInstance Win32_Process -Filter \\"Name='chrome.exe' or Name='chrome-headless-shell.exe'\\" | Where-Object { $_.ExecutablePath -like '*ms-playwright*' } | ForEach-Object { ($_.KernelModeTime + $_.UserModeTime) / 1e7 } | Measure-Object -Sum).Sum`;
const cpu = () => Number(execSync(`powershell -NoProfile -Command "${ps}"`).toString().trim().replace(',', '.'));
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(preview).href);
await page.waitForSelector('body.am-ready #am-sidebar');
await page.evaluate(() => { Spicetify.Platform.History.push('/artist/mock'); setInterval(() => { window.__mockState.progress += 1000; }, 1000); });
await page.waitForSelector('body.am-artist-open .am-artist-name');
await page.addStyleTag({ content: 'body.am-noglass #am-player{backdrop-filter:none!important}' });
for (const [name, glassOff] of [['glass', false], ['no glass', true], ['glass', false], ['no glass', true]]) {
  await page.evaluate(off => document.body.classList.toggle('am-noglass', off), glassOff);
  await page.waitForTimeout(2000);
  const start = cpu(); await page.waitForTimeout(8000);
  console.log(name.padEnd(9), ((cpu() - start) / 8 * 100).toFixed(1) + '% of a core');
}
await browser.close();
