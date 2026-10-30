// Frame rate and CPU of the live client (macOS), with parts of the glass hidden by CSS. Spotify must run with
// --remote-debugging-port=9229 and be visible; it is brought to the front for each run. Music plays muted, then the
// mute and play state are restored.
//   node dev/client/fps.mjs <rounds> <scenarios> <variants> [secs]
//   node dev/client/fps.mjs 2 play,marquee,hover,scroll glass,off 6
// Scenarios: paused, play (progress bar moving), marquee (a long title scrolling), hover (scrubber open, rolling
// digits), scroll (the page scrolls every frame). Per round, scenario and variant: frame intervals (rAF in the page,
// CDP attached), then CPU of Spotify's GPU process / renderer / rest (ps) and the GPU's Device Utilization (ioreg,
// whole system) with CDP detached (an attached client changes Chromium's throttling). Medians at the end.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
const [rounds = 3, scen = 'play,marquee,hover,scroll', vars = 'glass,off', secs = 8] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const VARIANTS = {
  glass: '',
  off: '.am-player-face,#am-player > .am-tglass-rim{display:none!important}#am-player{backdrop-filter:none!important}',
  blur: '.am-player-face,#am-player > .am-tglass-rim{display:none!important}#am-player.am-player-glass{backdrop-filter:blur(30px) saturate(1.3) brightness(1.1)!important}',
  norim: '#am-player > .am-tglass-rim{display:none!important}',
  nobend: '.am-player-face > .am-tglass-layer:nth-child(1){display:none!important}',
  nomid: '.am-player-face > .am-tglass-layer:nth-child(2){display:none!important}',
  notone: '.am-player-face > .am-tglass-layer:nth-child(3){display:none!important}',
  onlybend: '.am-player-face > .am-tglass-layer:not(:nth-child(1)),#am-player > .am-tglass-rim{display:none!important}',
  onlymid: '.am-player-face > .am-tglass-layer:not(:nth-child(2)),#am-player > .am-tglass-rim{display:none!important}',
  onlytone: '.am-player-face > .am-tglass-layer:not(:nth-child(3)),#am-player > .am-tglass-rim{display:none!important}',
  onlyrim: '.am-player-face{display:none!important}',
  notoolbar: '#am-toolbar-glass{display:none!important}',
  tbno5: '.am-tglass:has([style*="am-tglass-5-bend"]){display:none!important}',
  tbonly5: '.am-tglass:not(:has([style*="am-tglass-5-bend"])){display:none!important}',
  noglow: '#am-sidebar-glow{display:none!important}',
  glowclip: '#am-sidebar-glow{clip-path:inset(0 var(--am-glow) 0 0)}',
  tbwc: '#am-toolbar-glass{will-change:transform}',
  tbwc2: '#am-toolbar-glass .am-tglass{will-change:transform}',
  mainiso: '#main{isolation:auto!important;z-index:auto!important}',
  playerwc: '#am-player{will-change:transform}',
  tbop: '#am-toolbar-glass{opacity:.999}',
  tbnone: '#am-toolbar-glass :is(.am-tglass-layer,.am-tglass-rim){backdrop-filter:none!important}',
  tbblur: '#am-toolbar-glass :is(.am-tglass-layer,.am-tglass-rim){backdrop-filter:blur(3px)!important}',
  tbrimonly: '#am-toolbar-glass .am-tglass-layer{backdrop-filter:none!important}',
  tbbendonly: '#am-toolbar-glass .am-tglass-layer:not(:first-child),#am-toolbar-glass .am-tglass-rim{backdrop-filter:none!important}',
  alloff: '#am-toolbar-glass,.am-player-face,#am-player > .am-tglass-rim{display:none!important}',
};
async function connect() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9229');
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('xpui'));
  return { browser, page };
}
function snap() {
  let g = 0, r = 0, o = 0;
  for (const l of execSync('ps -A -o time=,command=').toString().split('\n')) {
    if (!/Spotify/.test(l)) continue;
    const [t, ...rest] = l.trim().split(/\s+/), cmd = rest.join(' '), p = t.split(':').map(Number), s = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
    if (cmd.includes('gpu-process')) g += s; else if (cmd.includes('(Renderer)')) r += s; else o += s;
  }
  return [g, r, o];
}
const gpuUtil = () => Number(/"Device Utilization %"=(\d+)/.exec(execSync('ioreg -r -d 1 -w 0 -c IOAccelerator').toString())?.[1] ?? NaN);
async function setup(page, scenario, variant) {
  await page.evaluate(([scenario, css]) => {
    const w = window.__fps ??= {};
    cancelAnimationFrame(w.scroll); w.scroll = 0;
    let s = document.getElementById('fps-variant'); if (!s) { s = document.createElement('style'); s.id = 'fps-variant'; document.head.append(s); } s.textContent = css;
    const P = Spicetify.Player, playing = !!P.isPlaying?.() || P.data?.isPaused === false;
    if (scenario === 'paused' && playing) P.pause(); if (scenario !== 'paused' && !playing) P.play();
    // Marquee: force the title to scroll as a long title does (28 CSS px/s, one step per device pixel).
    const t = document.querySelector('#am-player .am-marquee.am-track-title'), sub = document.querySelector('#am-player .am-marquee.am-track-subtitle');
    for (const m of [t, sub]) if (m) m.classList.remove('am-marquee-on');
    if (scenario === 'marquee' && t) { const first = t.querySelector('.am-marquee-inner > span'), wpx = 700; t.classList.add('am-marquee-on'); t.style.setProperty('--am-marquee-duration', ((wpx + 48) / 28).toFixed(1) + 's'); t.style.setProperty('--am-marquee-steps', String(Math.round((wpx + 48) * devicePixelRatio))); first.style.display = 'inline-block'; first.style.minWidth = wpx + 'px'; }
    else if (t) { const first = t.querySelector('.am-marquee-inner > span'); first.style.minWidth = ''; first.style.display = ''; }
    const seek = document.querySelector('#am-player .am-seek');
    seek?.dispatchEvent(new PointerEvent(scenario === 'hover' ? 'pointerenter' : 'pointerleave'));
    if (scenario === 'scroll') {
      const v = document.querySelector('.main-view-container__scroll-node [data-overlayscrollbars-viewport]') || document.querySelector('.main-view-container__scroll-node');
      let dir = 1; const f = () => { v.scrollTop += dir * 6; if (v.scrollTop + v.clientHeight >= v.scrollHeight - 2 || v.scrollTop > 3000) dir = -1; else if (v.scrollTop <= 0) dir = 1; w.scroll = requestAnimationFrame(f); }; w.scroll = requestAnimationFrame(f);
    }
  }, [scenario, VARIANTS[variant]]);
}
async function frames(page, ms) {
  const t = await page.evaluate(ms => new Promise(res => { const t = []; let last = performance.now(); const end = last + ms; const f = now => { t.push(now - last); last = now; if (now < end) requestAnimationFrame(f); else res(t); }; requestAnimationFrame(f); }), ms);
  const s = t.slice(3).sort((a, b) => a - b), mean = s.reduce((a, b) => a + b, 0) / s.length;
  return { fps: 1000 / mean, p95: s[Math.floor(s.length * .95)], long: s.filter(x => x > 25).length };
}
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const results = {};
let saved;
{ const { browser, page } = await connect(); saved = await page.evaluate(() => { const P = Spicetify.Player, s = { mute: P.getMute(), playing: P.isPlaying() }; P.setMute(true); return s; }); await browser.close().catch(() => {}); }
for (let round = 0; round < rounds; round++) for (const scenario of scen.split(',')) for (const variant of vars.split(',')) {
  execSync(`osascript -e 'tell application "Spotify" to activate'`);
  let { browser, page } = await connect();
  await setup(page, scenario, variant); await sleep(1500);
  const f = await frames(page, secs * 1000);
  await browser.close().catch(() => {});
  await sleep(1000);
  const a = snap(), u = []; const t0 = Date.now(); while (Date.now() - t0 < secs * 1000) { u.push(gpuUtil()); await sleep(400); } const b = snap(), dt = (Date.now() - t0) / 1000;
  const cpu = a.map((x, i) => (b[i] - x) / dt * 100);
  const key = scenario + ' ' + variant; (results[key] ??= []).push({ ...f, gpuP: cpu[0], ren: cpu[1], rest: cpu[2], util: median(u) });
  console.log(`r${round} ${key.padEnd(22)} fps ${f.fps.toFixed(1)} p95 ${f.p95.toFixed(1)} >25ms ${f.long}  cpu gpu ${cpu[0].toFixed(1)} ren ${cpu[1].toFixed(1)} rest ${cpu[2].toFixed(1)}  gpuUtil ${median(u)}`);
}
{ const { browser, page } = await connect(); await setup(page, 'play', 'glass'); await page.evaluate(s => { document.getElementById('fps-variant')?.remove(); const P = Spicetify.Player; if (!s.playing) P.pause(); setTimeout(() => P.setMute(s.mute), 500); }, saved);await sleep(1000); await browser.close().catch(() => {}); }
console.log('\nmedians');
for (const [k, rs] of Object.entries(results)) console.log(`${k.padEnd(22)} fps ${median(rs.map(r => r.fps)).toFixed(1)} p95 ${median(rs.map(r => r.p95)).toFixed(1)} >25ms ${median(rs.map(r => r.long))}  cpu gpu ${median(rs.map(r => r.gpuP)).toFixed(1)} ren ${median(rs.map(r => r.ren)).toFixed(1)} rest ${median(rs.map(r => r.rest)).toFixed(1)}  gpuUtil ${median(rs.map(r => r.util))}`);
process.exit(0);
