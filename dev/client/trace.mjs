// node dev/client/trace.mjs <name> [css]: a 4s Chrome trace of the live client while the title marquee runs, with an
// optional CSS override, saved as trace-<name>.json; prints the event names with the most total time per
// process/thread. Per frame, compare `SkCanvas::saveLayer` (one per backdrop filter run) and Graphite's
// `TaskList::addCommands`, and `root_damage_rect` in `DirectRenderer::DrawFrame ProcessForOverlays`.
import { chromium } from 'playwright';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const [name, css = ''] = process.argv.slice(2);
execSync(`osascript -e 'tell application "Spotify" to activate'`);
const browser = await chromium.connectOverCDP('http://127.0.0.1:9229');
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('xpui'));
await page.evaluate(css => { let s = document.getElementById('fps-variant'); if (!s) { s = document.createElement('style'); s.id = 'fps-variant'; document.head.append(s); } s.textContent = css;
  const t = document.querySelector('#am-player .am-marquee.am-track-title'), first = t.querySelector('.am-marquee-inner > span'); t.classList.add('am-marquee-on'); t.style.setProperty('--am-marquee-duration', '26.7s'); t.style.setProperty('--am-marquee-steps', String(Math.round(748 * devicePixelRatio))); first.style.display = 'inline-block'; first.style.minWidth = '700px'; }, css);
await new Promise(r => setTimeout(r, 1500));
const cdp = await browser.newBrowserCDPSession();
const chunks = [];
cdp.on('Tracing.dataCollected', e => chunks.push(...e.value));
const done = new Promise(r => cdp.once('Tracing.tracingComplete', r));
await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['viz', 'gpu', 'cc', 'skia', 'disabled-by-default-skia', 'disabled-by-default-skia.gpu', 'gpu.dawn', 'disabled-by-default-gpu.dawn', 'disabled-by-default-viz.gpu_composite_time', 'toplevel', 'mojom', 'ipc'], recordMode: 'recordContinuously' }, transferMode: 'ReportEvents' });
await new Promise(r => setTimeout(r, 4000));
await cdp.send('Tracing.end'); await done;
fs.writeFileSync(`trace-${name}.json`, JSON.stringify(chunks));
const threads = {}; for (const e of chunks) if (e.ph === 'M' && e.name === 'thread_name') threads[e.pid + ':' + e.tid] = e.args.name; const procs = {}; for (const e of chunks) if (e.ph === 'M' && e.name === 'process_name') procs[e.pid] = e.args.name;
const tot = {};
for (const e of chunks) if (e.ph === 'X' && e.dur) { const k = `${procs[e.pid] || e.pid}/${threads[e.pid + ':' + e.tid] || e.tid} ${e.name}`; const t = tot[k] ??= { n: 0, d: 0 }; t.n++; t.d += e.dur / 1000; }
for (const [k, t] of Object.entries(tot).sort((a, b) => b[1].d - a[1].d).slice(0, 40)) console.log(t.d.toFixed(0).padStart(7) + 'ms', String(t.n).padStart(5), k);
await page.evaluate(() => document.getElementById('fps-variant')?.remove());
await browser.close().catch(() => {});
process.exit(0);
