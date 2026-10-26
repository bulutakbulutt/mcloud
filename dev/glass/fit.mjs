// Fits the theme's SVG glass to Apple's native glass: renders the same backgrounds with a parametric filter in
// Chromium (2x) and compares against captures of NSGlassView (fit/apple/*.png).
//   node fit.mjs eval '<json params>' [outdir]   -> prints the error per pattern (and saves renders)
//   node fit.mjs fit  '<json params>'            -> coordinate descent from these params, prints the best
import { createRequire } from 'module';
import zlib from 'zlib';
import fs from 'fs';
const require = createRequire(new URL('../../', import.meta.url));
const { chromium } = require('playwright');
const here = new URL('.', import.meta.url).pathname;
const patterns = (process.env.PATTERNS || 'scene,vstripes,hstripes,grays,h1,h4,h8,h15,h27,v1,v4,v8,v15').split(',');
const weights = { scene: 4, scene2: 4, grays: 2, grid: 3, checker: 3, vedge: 2, hedge: 2, mf00: 3, mf03: 3, mf06: 3, mf09: 3, mf12: 3, mf15: 3, mf18: 3, mf21: 3, mf24: 3, mf27: 3, mf30: 3 };

function png(buf) {
  let i = 8, idat = [], w, h, ct;
  while (i < buf.length) { const l = buf.readUInt32BE(i), t = buf.toString('ascii', i + 4, i + 8), c = buf.subarray(i + 8, i + 8 + l); if (t === 'IHDR') { w = c.readUInt32BE(0); h = c.readUInt32BE(4); ct = c[9]; } if (t === 'IDAT') idat.push(c); i += 12 + l; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), bpp = ct === 6 ? 4 : 3, stride = w * bpp, out = new Uint8Array(w * h * 3);
  let prev = new Uint8Array(stride), p = 0;
  for (let y = 0; y < h; y++) { const f = raw[p], line = Uint8Array.from(raw.subarray(p + 1, p + 1 + stride)); p += 1 + stride;
    for (let j = 0; j < stride; j++) { const a = j >= bpp ? line[j - bpp] : 0, b = prev[j], c = j >= bpp ? prev[j - bpp] : 0;
      if (f === 1) line[j] = (line[j] + a) & 255; else if (f === 2) line[j] = (line[j] + b) & 255; else if (f === 3) line[j] = (line[j] + ((a + b) >> 1)) & 255;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); line[j] = (line[j] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255; } }
    for (let x = 0; x < w; x++) for (let k = 0; k < 3; k++) out[(y * w + x) * 3 + k] = line[x * bpp + k];
    prev = line; }
  return { w, h, d: out };
}
const apple = Object.fromEntries(patterns.map(n => [n, png(fs.readFileSync(`${here}apple/${n}.png`))]));

// The page: background image, bar with backdrop-filter, filter rebuilt from params by window.build(params).
const page_html = `<!doctype html><html><body style="margin:0;background:#000">
<img id="bg" style="position:absolute;left:0;top:0;width:781px;display:block">
<div id="bar" style="position:absolute;left:40px;top:40px;width:701px;height:55px;border-radius:27.5px"></div>
<svg width="0" height="0" style="position:absolute"><filter id="g" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"></filter></svg>
<script>
window.build = p => {
  const w = 701, h = p.barH || 55, r = h / 2, bar = document.getElementById('bar'), f = document.getElementById('g');
  bar.style.top = (p.barTop ?? 40) + 'px'; bar.style.height = h + 'px'; bar.style.borderRadius = r + 'px';
  // Shift (pt, inward positive) by distance from the edge: piecewise linear through p.knots/p.shift.
  const K = p.knots, V = p.shift, shiftAt = d => { if (d >= K[K.length - 1]) return 0; let i = 0; while (d > K[i + 1]) i++; const t = (d - K[i]) / (K[i + 1] - K[i]); return V[i] + (V[i + 1] - V[i]) * t; };
  const max = Math.max(1e-3, ...V.map(Math.abs));
  const k = p.mapScale || 1, W = w * k, H = h * k;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const mx = x.createImageData(W, H), my = x.createImageData(W, H), mr = x.createImageData(W, H), mh = x.createImageData(W, H);
  // Highlight along the top and bottom edges: strength by distance from the edge (table every 0.5px), times the
  // vertical part of the edge normal, so the round ends' middles get none.
  const hiAt = d => p.hiA !== undefined ? p.hiA * Math.exp(-d / Math.max(.05, p.hiB)) : hiTable(d);
  const hiTable = d => { const t = p.hi || [], f = d / .5; if (!t.length || f >= t.length - 1) return 0; const i = Math.floor(f); return t[i] + (t[i + 1] - t[i]) * (f - i); };
  for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) {
    const px = (X + .5) / k, py = (y + .5) / k;
    const dx = Math.min(w - r, Math.max(r, px)) - px, dy = r - py, len = Math.hypot(dx, dy) || 1, edge = r - len, i = (y * W + X) * 4;
    mh.data[i] = mh.data[i + 1] = mh.data[i + 2] = Math.round(255 * Math.min(1, hiAt(Math.max(0, edge)) / (p.hiMax || 1) * Math.abs(dy / len) ** (p.hiPow || 1.5))); mh.data[i + 3] = 255;
    const t = shiftAt(Math.max(0, edge)) / max / len;
    const facing = (-dx * .5 + dy * .866) / len, light = Math.min(1, .15 + Math.max(0, facing) ** 1.5 + .5 * Math.max(0, -facing) ** 1.5);
    const band = 1 - Math.min(1, Math.max(0, edge) / p.rimWidth) ** 2;
    const xv = Math.round(128 + 127 * t * dx), yv = Math.round(128 + 127 * t * dy), rv = Math.round(255 * Math.min(1, p.rim * light * band));
    mx.data[i] = mx.data[i + 1] = mx.data[i + 2] = xv; my.data[i] = my.data[i + 1] = my.data[i + 2] = yv; mr.data[i] = mr.data[i + 1] = mr.data[i + 2] = rv;
    mx.data[i + 3] = my.data[i + 3] = mr.data[i + 3] = 255;
  }
  const url = d => { x.putImageData(d, 0, 0); return c.toDataURL(); };
  const hiImg = p.hi ? '<feImage result="mh" preserveAspectRatio="none" width="701" height="' + h + '" href="' + url(mh) + '"/>' : '';
  const lut = p.lut.map(v => (v / 255).toFixed(4)).join(' '), tf = 'type="table" tableValues="' + lut + '"';
  f.setAttribute('color-interpolation-filters', p.linear ? 'linearRGB' : 'sRGB');
  f.innerHTML = hiImg + '<feImage result="mx" preserveAspectRatio="none" width="701" height="' + h + '" href="' + url(mx) + '"/>'
    + '<feImage result="my" preserveAspectRatio="none" width="701" height="' + h + '" href="' + url(my) + '"/>'
    + '<feImage result="mr" preserveAspectRatio="none" width="701" height="' + h + '" href="' + url(mr) + '"/>'
    + '<feColorMatrix in="mx" values="1 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 1" result="x"/><feColorMatrix in="my" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 1" result="y"/>'
    + '<feComposite in="x" in2="y" operator="arithmetic" k2="1" k3="1" result="map"/>'
    + '<feGaussianBlur in="SourceGraphic" stdDeviation="' + Math.max(0, p.preBlur) + '" edgeMode="duplicate" result="pre"/>'
    + '<feDisplacementMap in="pre" in2="map" scale="' + (2 * max) + '" xChannelSelector="R" yChannelSelector="B"/>'
    + '<feGaussianBlur stdDeviation="' + Math.max(0, p.blur) + '" edgeMode="duplicate" result="core"/>'
    // Darken mix: bright pixels pulled toward the darker surroundings (min with a wide blur), dark ones kept.
    + (p.darkMix ? '<feGaussianBlur in="core" stdDeviation="' + p.darkBlur + '" edgeMode="duplicate" result="dhalo"/><feBlend in="core" in2="dhalo" mode="darken" result="dk"/><feComposite in="core" in2="dk" operator="arithmetic" k2="' + (1 - p.darkMix) + '" k3="' + p.darkMix + '" result="core"/>' : '')
    + (p.wideMix ? '<feGaussianBlur in="core" stdDeviation="' + p.wideBlur + '" edgeMode="duplicate" result="halo"/><feComposite in="core" in2="halo" operator="arithmetic" k2="' + (1 - p.wideMix) + '" k3="' + p.wideMix + '"/>' : '')
    + '<feColorMatrix type="saturate" values="' + p.sat + '"/>'
    + (p.lumTone
      // Tone by luminance, keeping hue: out = a*in + b(Y), b(Y) = T(Y) - a*Y, stored as (b+1)/2 in a grey image.
      ? '<feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0 1" result="soft"/><feColorMatrix values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0"/>'
        + '<feComponentTransfer result="off">' + ['R','G','B'].map(c => '<feFunc' + c + ' type="table" tableValues="' + p.lut.map((t, k) => (((t / 255) - p.a * k / (p.lut.length - 1)) + 1) / 2).map(v => v.toFixed(4)).join(' ') + '"/>').join('') + '</feComponentTransfer>'
        + '<feComposite in="soft" in2="off" operator="arithmetic" k2="' + p.a + '" k3="2" k4="-1" result="glass"/>'
        + (p.hi ? '<feComposite in="glass" in2="mh" operator="arithmetic" k1="' + (-p.hiMax) + '" k2="1" k3="' + (p.hiC * p.hiMax) + '" result="glass"/>' : '')
      : '<feComponentTransfer result="glass"><feFuncR ' + tf + '/><feFuncG ' + tf + '/><feFuncB ' + tf + '/></feComponentTransfer>')
    + '<feColorMatrix in="mr" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0" result="rim"/>'
    + '<feFlood flood-color="' + p.rimColor + '"/><feComposite in2="rim" operator="in"/><feComposite in2="glass" operator="over"/>';
  bar.style.backdropFilter = 'url(#g)';
};
</script></body></html>`;

const browser = await chromium.launch({ executablePath: process.env.PWB });
const page = await browser.newPage({ viewport: { width: 781, height: 135 }, deviceScaleFactor: 2 });
await page.setContent(page_html);
const bgs = Object.fromEntries(patterns.map(n => [n, 'data:image/png;base64,' + fs.readFileSync(`${here}bg/${n}.png`).toString('base64')]));

async function render(p, name) {
  // Music's own frames: its player sits at 40.5pt and is 54pt tall in those crops; the lab's is 40pt and 55pt.
  p = name.startsWith('mf') ? { ...p, barTop: 40.5, barH: 54 } : { ...p, barTop: 40, barH: 55 };
  await page.evaluate(([src, p]) => new Promise(res => { const img = document.getElementById('bg'); img.onload = () => { window.build(p); requestAnimationFrame(() => requestAnimationFrame(res)); }; img.src = src; }), [bgs[name], p]);
  return png(await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 781, height: apple[name].h / 2 } }));
}
// Error inside the bar (plus 1pt), mean abs per channel.
// Captures of Apple Music's own player (mf*) carry its icons; compare only the stretches between them there.
const glyphFree = x => (x >= 420 && x < 700) || (x >= 860 && x < 1180);
function error(a, b, name = '') {
  let e = 0, n = 0;
  for (let y = 78; y < 192 && y < a.h; y++) for (let x = 78; x < 1484; x += 2) { if (name.startsWith('mf') && !glyphFree(x)) continue; const o = (y * a.w + x) * 3; for (let k = 0; k < 3; k++) { e += Math.abs(a.d[o + k] - b.d[o + k]); n++; } }
  return e / n;
}
async function score(p, save) {
  let total = 0, wsum = 0; const parts = {};
  for (const n of patterns) { const img = await render(p, n); const e = error(img, apple[n], n); parts[n] = +e.toFixed(2); const w = weights[n] || 1; total += e * w; wsum += w;
    if (save) fs.writeFileSync(`${save}/${n}.png`, await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 781, height: apple[n].h / 2 } })); }
  return { total: +(total / wsum).toFixed(3), parts };
}

const [mode, json, outdir] = process.argv.slice(2);
let p = JSON.parse(json);
if (mode === 'eval') { if (outdir) fs.mkdirSync(outdir, { recursive: true }); console.log(JSON.stringify(await score(p, outdir))); }
else {
  // Coordinate descent over the numeric fields listed in FIT (comma list; array fields fit per element).
  const fields = (process.env.FIT || 'blur,sat').split(',');
  let best = await score(p); console.log('start', best.total, JSON.stringify(best.parts));
  for (let round = 0, step = 1; round < Number(process.env.ROUNDS || 4); round++, step /= 2) {
    for (const f of fields) {
      const idxs = Array.isArray(p[f]) ? p[f].map((_, i) => i) : [null];
      for (const i of idxs) {
        const base = i === null ? p[f] : p[f][i], d = (process.env['STEP_' + f] ? Number(process.env['STEP_' + f]) : Math.max(.05, Math.abs(base) * .3 || 1)) * step;
        for (const dir of [1, -1]) {
          for (;;) {
            const q = structuredClone(p); if (i === null) q[f] = +(q[f] + dir * d).toFixed(4); else q[f][i] = +(q[f][i] + dir * d).toFixed(4);
            if (f === 'lut') q.lut[i] = Math.max(0, Math.min(255, q.lut[i]));
            const s = await score(q); if (s.total < best.total - 1e-3) { p = q; best = s; console.log(f, i ?? '', i === null ? p[f] : p[f][i], best.total); } else break;
          }
        }
      }
    }
  }
  console.log('BEST', best.total, JSON.stringify(best.parts)); console.log(JSON.stringify(p));
}
await browser.close();
