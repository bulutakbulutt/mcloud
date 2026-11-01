// Smoke test: runs theme.js + user.css against dev/preview.html in Chromium.
// It catches runtime errors and broken wiring, not Spotify DOM drift.
//
//   npm i --no-save playwright && npx playwright install chromium
//   node dev/smoke.mjs [screenshot-dir]
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const shots = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async name => { if (shots) await page.screenshot({ path: path.join(shots, name + '.png') }); };

async function check(name, fn) {
  try { await fn(); console.log('ok  ', name); }
  catch (e) { console.log('FAIL', name); throw e; }
}

try {
  await page.goto(pathToFileURL(path.join(here, 'preview.html')).href);
  await page.waitForSelector('body.am-ready #am-sidebar');

  await check('shell renders', async () => {
    assert.equal(await page.locator('#am-sidebar .am-navigation > .am-nav-row').count(), 8);
    assert.ok(await page.locator('#am-player .am-has-track').isVisible());
    assert.equal(await page.textContent('.am-track-title .am-marquee-inner > span'), 'Nights');
    await page.waitForFunction(() => !document.querySelector('.am-track-art img').hidden);
  });
  await shot('home');

  await check('Spotify\'s green play buttons take the accent', async () => {
    const bg = await page.evaluate(() => {
      const b = document.body.appendChild(document.createElement('span'));
      b.className = 'encore-bright-accent-set'; b.style.background = 'var(--background-base)';
      const value = getComputedStyle(b).backgroundColor; b.remove(); return value;
    });
    assert.equal(bg, 'rgb(250, 45, 72)');
    // So does its playing equaliser, a green GIF: a filter fills its shape with the accent.
    const equaliser = await page.evaluate(() => {
      const img = document.body.appendChild(document.createElement('img')); img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=#/images/equaliser-animated-green.gif';
      const value = [getComputedStyle(img).filter, getComputedStyle(document.querySelector('#am-accent-fill feFlood')).floodColor]; img.remove(); return value;
    });
    assert.deepEqual(equaliser, ['url("#am-accent-fill")', 'rgb(250, 45, 72)']);
    // And Save to Your Library's tick: a Lottie animation in a shadow root, as Spotify mounts it, with green baked in.
    // Its green turns into the accent; its white plus and dark tick stay.
    const box = await page.evaluate(() => {
      const b = document.body.appendChild(document.createElement('button')); b.id = 'mock-save';
      b.style.cssText = 'position:fixed;left:600px;top:300px;padding:0;border:0;background:#1f1f1f;z-index:99';
      b.innerHTML = '<span><div style="position: relative; pointer-events: none; width: 48px; height: 16px;"><div></div></div></span>';
      b.querySelector('div > div').attachShadow({ mode: 'open' }).innerHTML = '<div style="display:flex"><i style="width:16px;height:16px;background:#1ed760"></i><i style="width:16px;height:16px;background:#fff"></i><i style="width:16px;height:16px;background:#121212"></i></div>';
      const r = b.getBoundingClientRect(); return { x: r.left, y: r.top, width: 48, height: 16 };
    });
    const shot = await page.screenshot({ clip: box });
    const pixels = await page.evaluate(async png => {
      const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      document.getElementById('mock-save').remove();
      return [8, 24, 40].map(px => [...x.getImageData(px * img.width / 48, img.height / 2, 1, 1).data.slice(0, 3)]);
    }, shot.toString('base64'));
    const expected = [[250, 45, 72], [255, 255, 255], [18, 18, 18]];
    assert.ok(pixels.every((c, i) => c.every((v, j) => Math.abs(v - expected[i][j]) <= 4)), JSON.stringify(pixels));
  });

  await check('photo header takes its colour from the bottom edge and fades into it', async () => {
    await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--am-header-base').startsWith('hsl'));
    const color = await page.evaluate(() => [document.documentElement.style.getPropertyValue('--am-header-base'),
      getComputedStyle(document.querySelector('.before-scroll-node > :has(> [data-testid="background-image"])'), '::after').backgroundImage]);
    assert.equal(color[0], 'hsl(285 50% 19%)');
    assert.match(color[1], /gradient/);
  });

  await check('photo header is sampled again when Spotify swaps the header node', async () => {
    // Spotify replaces .before-scroll-node after navigating and fills the new one later.
    await page.evaluate(() => {
      const old = document.querySelector('.before-scroll-node'), photo = old.firstElementChild;
      const next = document.createElement('div'); next.className = 'before-scroll-node';
      old.replaceWith(next); window.__photo = photo;
    });
    await page.waitForFunction(() => !document.body.classList.contains('am-image-header'));
    await page.evaluate(() => document.querySelector('.before-scroll-node').append(window.__photo));
    await page.waitForFunction(() => document.body.classList.contains('am-image-header'));
  });

  await check('a photo seen before gets its colour at once, a new one waits on the neutral colour', async () => {
    const image = '.before-scroll-node [data-testid="background-image"]';
    // Swaps the photo and reads the colour right after the theme's MutationObserver ran (its microtask comes first).
    const show = url => page.$eval(image, (e, url) => {
      e.style.backgroundImage = url;
      return new Promise(r => queueMicrotask(() => r(document.documentElement.style.getPropertyValue('--am-header-base'))));
    }, url);
    const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('mcloud:header-colors')));
    assert.ok(saved.some(([, color]) => color === 'hsl(285 50% 19%)'));
    const known = await page.$eval(image, e => e.style.backgroundImage);
    assert.equal(await show('url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGOQq7ABIgYIBQAWjgNJBxYE+AAAAABJRU5ErkJggg==")'), 'var(--am-bg)');
    await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--am-header-base').startsWith('hsl(140'));
    assert.equal(await show(known), 'hsl(285 50% 19%)');
    assert.ok(await page.evaluate(() => document.body.classList.contains('am-image-header')));
    // Under the glass sidebar the main view carries the page colour, so the sidebar does not turn grey on scroll.
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.am-native-main')).backgroundColor), 'rgb(61, 24, 73)');
  });

  await check('track list header turns to glass only while it sticks', async () => {
    const header = '[role="grid"] > .main-trackList-trackListHeader';
    const viewport = '.main-view-container__scroll-node > [data-overlayscrollbars-viewport]';
    assert.equal(await page.$eval(header, e => getComputedStyle(e).backgroundColor), 'rgba(0, 0, 0, 0)');
    // The preview's viewport grows with its content; give it a height and the rows some length so it scrolls, only
    // for this check (a longer page lets later clicks scroll the outer layout).
    await page.$eval(viewport, e => { e.style.height = '600px'; document.querySelector('.mock-rows').style.height = '1600px'; e.scrollTop = e.scrollHeight; });
    await page.waitForFunction(h => document.querySelector(h).hasAttribute('data-am-stuck'), header);
    assert.match(await page.$eval(header, e => getComputedStyle(e).transitionProperty), /backdrop-filter/);
    // Its hairline spans the band once stuck.
    await page.waitForFunction(h => getComputedStyle(document.querySelector(h)).boxShadow === 'rgba(255, 255, 255, 0.09) 0px -1px 0px 0px inset', header);
    await page.waitForFunction(h => getComputedStyle(document.querySelector(h)).backgroundColor === 'color(srgb 0.164706 0.164706 0.164706 / 0.62)', header);
    await page.$eval(viewport, e => { e.scrollTop = 0; });
    await page.waitForFunction(h => !document.querySelector(h).hasAttribute('data-am-stuck'), header);
    await page.$eval(viewport, e => { e.style.height = ''; document.querySelector('.mock-rows').style.height = ''; });
  });

  await check('scrubber: hover shows times, click seeks', async () => {
    await page.hover('.am-seek');
    await page.waitForFunction(() => document.querySelector('.am-player-track').classList.contains('am-scrubbing'));
    await page.waitForFunction(() => document.querySelector('.am-time-elapsed').textContent === '1:23');
    assert.equal(await page.textContent('.am-time-remaining'), '−2:42');
    const box = await page.locator('.am-seek').boundingBox();
    await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2);
    await page.waitForFunction(() => Math.abs(window.__mockState.progress / window.__mockState.duration - 0.75) < 0.02);
    await page.mouse.move(10, 10);
    await page.waitForFunction(() => !document.querySelector('.am-player-track').classList.contains('am-scrubbing'));
  });

  await check('subtitle asks between artist and album', async () => {
    await page.click('.am-track-subtitle');
    assert.deepEqual(await page.locator('#am-popover .am-popover-item').allTextContents(), ['Sanatçıya Git', 'Albüme Git']);
    await page.keyboard.press('Escape');
  });

  await check('Friend Activity opens as a sheet from the sidebar\'s account row', async () => {
    const friends = '#am-sidebar [aria-label="Arkadaş etkinliği"]';
    await page.click(friends);
    // The button presses at once, before Spotify has fetched and mounted the feed.
    assert.equal(await page.evaluate(() => [document.querySelector('#am-sidebar [aria-label="Arkadaş etkinliği"]').getAttribute('aria-pressed'), !!document.querySelector('.right aside[aria-label="Dinleme etkinliği"]')].join()), 'true,false');
    await page.waitForFunction(() => document.body.classList.contains('am-panel-open') && document.querySelector('.am-native-right').classList.contains('am-native-panel-open'));
    const box = await page.locator('.am-native-right').boundingBox();
    assert.ok(box.width > 200 && box.height > 200);
    // It fades in where it ends up; a sliding edge on fractional pixels shimmers.
    assert.equal(box.x, 1440 - 16 - box.width, 'sheet moves while opening');
    assert.equal(await page.getAttribute(friends, 'aria-pressed'), 'true');
    // Mid cross-fade the outgoing Now Playing view is still mounted; only the feed may show.
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="mock-npv"]')).display), 'none', 'Now Playing view shows in the sheet');
    await page.click(friends);
    // Closing hides the sheet at once, while the outgoing feed is still mounted.
    assert.equal(await page.evaluate(() => [!!document.querySelector('.right aside[aria-label="Dinleme etkinliği"]'), getComputedStyle(document.querySelector('.am-native-right')).display].join()), 'true,none');
    await page.waitForTimeout(700);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.am-native-right')).display), 'none');
  });

  await check('queue sheet closes from the panel\'s own close button', async () => {
    await page.click('#am-player button[aria-label="Çalma sırası"]');
    await page.waitForFunction(() => document.querySelector('.am-native-right').classList.contains('am-native-panel-open'));
    await page.click('.am-native-right aside button[aria-label="Kapat"]');
    await page.waitForFunction(() => !document.body.classList.contains('am-panel-open'));
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.am-native-right')).display), 'none');
  });

  await check('a playlist\'s Add and Mix work in the header capsule', async () => {
    // A playlist page with an image header and Spotify's editing row: Add (unlabelled, pressed while "Add to
    // playlist" is open in the right panel) and Mix, whose glowing pill is stacked over its real button.
    await page.evaluate(() => {
      document.querySelector('main').insertAdjacentHTML('beforeend', `<section class="mock-capsule" data-testid="playlist-page"><style>.mock-mix{position:relative}.mock-capsule button{padding:0;border:0;background:none;color:inherit}.mock-mix{display:inline-flex}.mock-mix > .mock-pill{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}.mock-pill .icon-wrapper{position:absolute;inset-inline-start:12px}</style>
        <div data-testid="entity-header"><div class="main-entityHeader-imageContainer"></div></div>
        <div class="contentSpacing" data-testid="playlist-toolbar"><div data-overlayscrollbars="host"><div data-overlayscrollbars-viewport><div>
          <button class="mock-add" data-restore-focus-key="assisted_curation" aria-pressed="false" data-encore-id="buttonPrimary"><span><span class="icon-wrapper"><svg viewBox="0 0 16 16"></svg></span>Ekle</span></button>
          <div class="mock-mix"><div><button class="mock-mix-button" aria-label="Mix" data-encore-id="buttonPrimary"><span><span class="icon-wrapper"><svg viewBox="0 0 16 16"></svg></span>Mix</span></button></div>
            <div class="mock-pill"><div><button data-encore-id="buttonSecondary"><span class="icon-wrapper"><svg viewBox="0 0 16 16"></svg></span>Mix</button></div></div></div>
        </div></div></div></div></section>`);
      const add = document.querySelector('.mock-add'), label = 'Çalma listesine ekle';
      const close = () => { add.setAttribute('aria-pressed', 'false'); swapPanel(npv); };
      window.__mockAddClose = close;
      add.addEventListener('click', () => { if (add.getAttribute('aria-pressed') === 'true') return close(); add.setAttribute('aria-pressed', 'true'); swapPanel(`<aside aria-label="${label}"><h1>${label}</h1><button aria-label="Kapat" onclick="__mockAddClose()">×</button></aside>`); });
    });
    // The pill sits on the real Mix button, so a click on it reaches the button.
    await page.evaluate(() => { const vp = document.querySelector('.main-view-container__scroll-node > [data-overlayscrollbars-viewport]'); vp.scrollTop = vp.scrollHeight; });
    assert.equal(await page.evaluate(() => { const pill = document.querySelector('.mock-pill button').getBoundingClientRect(), hit = document.elementFromPoint(pill.left + pill.width / 2, pill.top + pill.height / 2); return hit.closest('button')?.className; }), 'mock-mix-button');
    // Its icon sits exactly on the button's (Spotify places a pill's leading icon 12px from its edge), so turning mixing
    // on or off does not move it.
    assert.equal(await page.evaluate(() => { const c = s => { const r = document.querySelector(s).getBoundingClientRect(); return Math.round((r.left + r.width / 2) * 10); }; return c('.mock-pill svg') - c('.mock-mix-button svg'); }), 0);
    await page.click('.mock-add');
    await page.waitForFunction(() => document.body.classList.contains('am-panel-open'));
    assert.ok(await page.evaluate(() => { const a = document.querySelector('.am-native-right aside[aria-label="Çalma listesine ekle"]'); return a.hasAttribute('data-am-sheet') && a.getBoundingClientRect().width > 0; }), 'Add to playlist shows as the sheet');
    await page.click('.am-native-right aside[aria-label="Çalma listesine ekle"] button[aria-label="Kapat"]');
    await page.waitForFunction(() => !document.body.classList.contains('am-panel-open'));
    await page.evaluate(() => { document.querySelector('.mock-capsule').remove(); delete window.__mockAddClose; document.querySelector('.main-view-container__scroll-node > [data-overlayscrollbars-viewport]').scrollTop = 0; });
  });

  await check('star toggles Liked Songs', async () => {
    await page.click('.am-star');
    await page.waitForFunction(() => window.__mockState.liked && document.querySelector('.am-star').classList.contains('am-active'));
  });

  await check('a clicked control shows no focus ring when a key is pressed, Tab focus does', async () => {
    const ring = () => page.evaluate(() => { const a = document.activeElement; return [a.matches(':focus-visible'), getComputedStyle(a).outlineStyle]; });
    await page.click('.am-star');
    await page.keyboard.press('Shift');
    assert.deepEqual(await ring(), [true, 'none'], 'clicked star');
    await page.keyboard.press('Tab');
    assert.deepEqual(await ring(), [true, 'solid'], 'tabbed control');
    await page.click('.am-star');
  });

  await check('track menu and profile corner', async () => {
    await page.click('.am-more');
    assert.deepEqual(await page.locator('#am-popover .am-popover-item').allTextContents(), ['Çalma Listesine Ekle', 'Sıraya Ekle', 'Katkıda Bulunanları Görüntüle', 'Albüme Git', 'Sanatçıya Git', 'Şarkı Bağlantısını Kopyala']);
    // Liquid Glass: the menu's own filter, its nine-piece map placed for its size (by a ResizeObserver: after a frame's rAF callbacks, before its paint).
    const menuGlass = () => page.evaluate(async () => { for (let n = 0; n < 2; n++) await new Promise(r => requestAnimationFrame(r)); const p = document.getElementById('am-popover'), f = document.getElementById('am-menu-glass-' + p.dataset.amGlass), i = [...f.querySelectorAll('feImage')], br = i.find(e => e.dataset.piece === 'br');
      return [getComputedStyle(p).backdropFilter, i.length, i.every(e => e.getAttribute('href')?.startsWith('data:image/png')), Math.round(+br.getAttribute('x') + +br.getAttribute('width')), Math.round(+br.getAttribute('y') + +br.getAttribute('height')), p.offsetWidth, p.offsetHeight]; });
    const [filter, pieces, mapped, right, bottom, width, height] = await menuGlass();
    assert.deepEqual([filter, pieces, mapped, right, bottom], ['url("#am-menu-glass-0")', 8, true, width, height]);
    await page.waitForTimeout(150); // the opening animation scales the menu, and the submenu is placed from its rows
    // Hover submenu test: hovering 'Çalma Listesine Ekle' opens the flyout submenu to the right
    await page.hover('#am-popover .am-popover-item:has-text("Çalma Listesine Ekle")');
    assert.ok(await page.locator('#am-popover-sub').isVisible());
    assert.ok(await page.locator('#am-popover-sub .am-popover-item:has-text("+ Yeni Çalma Listesi")').isVisible());
    // Spotify's own list: playlists you can add to, those in folders too, not Spotify-made ones.
    await page.waitForFunction(() => [...document.querySelectorAll('#am-popover-sub .am-popover-item')].some(b => b.textContent === 'Neşeli'));
    const targets = await page.locator('#am-popover-sub .am-popover-item').allTextContents();
    assert.ok(targets.includes('Sabah Kahvesi') && !targets.includes('Haftalık Keşif') && !targets.includes('Yükleniyor…'), targets.join());
    // The submenu lies over the menu's edge by its padding, its first row level with the parent unless that runs off the
    // window (it does here); with the pointer in it the parent turns grey.
    const flyout = () => page.evaluate(() => { const item = document.querySelector('#am-popover .am-has-submenu').getBoundingClientRect(), sub = document.getElementById('am-popover-sub'); // offsets: its opening animation scales it
      return [Math.round(sub.offsetLeft - item.right) || 0, sub.offsetTop - item.top <= -5, document.querySelector('#am-popover .am-has-submenu').classList.contains('am-parent')]; });
    assert.deepEqual(await flyout(), [0, true, false]);
    await page.hover('#am-popover-sub .am-popover-item >> nth=1');
    assert.deepEqual(await flyout(), [0, true, true]);
    await page.hover('#am-popover .am-popover-item:has-text("Çalma Listesine Ekle")');
    await page.keyboard.press('Escape');
    assert.ok(await page.locator('#am-popover-sub').isHidden());
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Çalma Listesine Ekle', 'Escape returns focus to the submenu item');
    await page.keyboard.press('Escape');
    assert.ok(await page.locator('#am-popover').isHidden());
    // Right click on player also opens track menu
    await page.click('#am-player', { button: 'right' });
    assert.ok(await page.locator('#am-popover').isVisible());
    assert.deepEqual(await page.locator('#am-popover .am-popover-item').allTextContents(), ['Çalma Listesine Ekle', 'Sıraya Ekle', 'Katkıda Bulunanları Görüntüle', 'Albüme Git', 'Sanatçıya Git', 'Şarkı Bağlantısını Kopyala']);
    await page.keyboard.press('Escape');
    assert.ok(await page.locator('#am-popover').isHidden());
    assert.equal(await page.textContent('.am-profile-name'), 'Emir Bilici');
    assert.equal(await page.textContent('.am-avatar'), 'EB');
    // The corner opens Spotify's own account menu; the toolbar's account buttons are hidden under it.
    await page.click('.am-profile');
    assert.equal(await page.evaluate(() => window.__mockState.accountMenu), 1);
    assert.ok(await page.locator('#am-popover').isHidden());
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#global-nav-bar .am-toolbar-trailing')).visibility), 'hidden');
  });

  await check('notifications, Connect and Spicy popup buttons drive Spotify\'s own', async () => {
    await page.click('#am-sidebar [aria-label="Yenilikler"]');
    await page.waitForFunction(() => document.querySelector('#am-sidebar [aria-label="Yenilikler"]').classList.contains('am-active'));
    await page.evaluate(() => Spicetify.Platform.History.push('/'));
    const connect = '#am-player button[aria-label="Bir cihaza bağlan"]';
    await page.click(connect);
    await page.waitForFunction(() => document.querySelector('.am-native-right').classList.contains('am-native-panel-open'));
    assert.equal(await page.getAttribute(connect, 'aria-pressed'), 'true');
    await page.click(connect);
    await page.waitForFunction(() => !document.body.classList.contains('am-panel-open'));
    // Without Spicy Lyrics there is no popup lyrics window to open.
    assert.ok(await page.locator('#am-player button[aria-label="Spicy Lyrics açılır pencere"]').isHidden());
  });

  await check('sidebar resizes and resets', async () => {
    const side = () => page.evaluate(() => document.getElementById('am-sidebar').offsetWidth);
    // The edge glow reaches past the sidebar (so the artwork beside it bleeds in) and sits just under it; it draws only
    // over the sidebar (clip-path), so the player's glass redrawing beside it does not re-run it.
    const glow = await page.evaluate(() => { const g = document.getElementById('am-sidebar-glow'), s = getComputedStyle(g); return [g.offsetWidth - document.getElementById('am-sidebar').offsetWidth, /blur/.test(s.backdropFilter), Number(s.zIndex) < Number(getComputedStyle(document.getElementById('am-sidebar')).zIndex), s.clipPath]; });
    assert.deepEqual(glow, [140, true, true, 'inset(0px 140px 0px 0px)']);
    const box = await page.locator('.am-sidebar-resizer').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + 300);
    await page.mouse.down();
    await page.mouse.move(300, box.y + 300, { steps: 5 });
    await page.mouse.up();
    assert.equal(await side(), 300);
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('mcloud:settings'))).sidebar, 300);
    // At its narrowest the account row still fits: the profile chip shrinks before the bell and friends buttons spill out.
    const wide = await page.locator('.am-sidebar-resizer').boundingBox();
    await page.mouse.move(wide.x + wide.width / 2, wide.y + 300);
    await page.mouse.down();
    await page.mouse.move(40, box.y + 300, { steps: 5 });
    await page.mouse.up();
    assert.equal(await side(), 170);
    assert.ok(await page.evaluate(() => document.querySelector('#am-sidebar [aria-label="Arkadaş etkinliği"]').getBoundingClientRect().right <= document.getElementById('am-sidebar').getBoundingClientRect().right));
    await page.dblclick('.am-sidebar-resizer');
    assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue('--am-side')), '');
  });

  await check('Browse sits with Search and Home and stays selected on the page it opens', async () => {
    assert.deepEqual((await page.locator('#am-sidebar .am-navigation > .am-nav-row').allTextContents()).slice(0, 3), ['Ara', 'Ana Sayfa', 'Göz At']);
    assert.deepEqual(await page.locator('#am-sidebar .am-nav-heading').evaluateAll(h => h.map(e => e.firstChild.textContent)), ['Arşiv', 'Listeler']);
    const selected = () => page.locator('#am-sidebar .am-selected').allTextContents();
    await page.click('#am-sidebar .am-nav-row:has-text("Göz At")');
    assert.equal(await page.evaluate(() => Spicetify.Platform.History.location.pathname), '/search');
    assert.deepEqual(await selected(), ['Göz At']);
    await page.click('#am-sidebar .am-nav-row:has-text("Ara")');
    assert.deepEqual(await selected(), ['Ara']);
    await page.click('#am-sidebar .am-nav-row:has-text("Göz At")');
    await page.click('#am-sidebar .am-nav-row:has-text("Ana Sayfa")');
    assert.deepEqual(await selected(), ['Ana Sayfa']);
  });

  await check('sidebar playlists: pinned first, five recent, Show All lists the rest', async () => {
    const rows = '#am-sidebar .am-list-row', names = () => page.locator(rows + ' .am-list-name').allTextContents();
    await page.waitForFunction(() => document.querySelectorAll('#am-sidebar .am-list-row').length === 7);
    // Liked Songs is "Songs" in the Library section, so it is left out.
    assert.deepEqual(await names(), ['Ruh Hali', 'Sabah Kahvesi', 'Koşu', 'Odak', 'Yol Şarkıları', 'Gece Sürüşü', 'Ders Çalışma']);
    assert.equal(await page.locator(rows + ' .am-list-pin').count(), 2);
    // Rows load the small artwork, not the 640px one; the folder gets an icon.
    await page.waitForFunction(() => document.querySelector('#am-sidebar [data-uri="spotify:playlist:1"] img')?.getAttribute('src') === window.__mockLibrary.find(i => i.uri === 'spotify:playlist:1').images[1].url);
    assert.ok(await page.locator(rows + '[data-uri="spotify:folder:ruh"] .am-list-art svg').count());
    // The names line up with the rows above.
    const left = sel => page.$eval(sel, e => Math.round(e.getBoundingClientRect().left));
    assert.equal(await left(rows + ' .am-list-name'), await left('#am-sidebar .am-navigation > .am-nav-row span'));
    // "+" on the heading sits over the pin column.
    const centre = sel => page.$eval(sel, e => { const r = e.getBoundingClientRect(); return Math.round(r.left + r.width / 2); });
    assert.equal(await centre('#am-sidebar .am-nav-add svg'), await centre(rows + ' .am-list-pin svg'));
    // The account row keeps the same columns: avatar on the artwork, name on the names, friends on the pins.
    await page.waitForSelector('#am-sidebar .am-profile:not([hidden])');
    assert.equal(await centre('#am-sidebar .am-avatar'), await centre(rows + ' .am-list-art'));
    assert.equal(await left('#am-sidebar .am-profile-name'), await left(rows + ' .am-list-name'));
    assert.equal(await centre('#am-sidebar .am-account-button:last-child svg'), await centre(rows + ' .am-list-pin svg'));
    await shot('sidebar-lists');
    await page.click('#am-sidebar .am-list-more');
    await page.waitForFunction(() => document.querySelectorAll('#am-sidebar .am-list-row').length === 11);
    await page.waitForFunction(() => document.activeElement?.dataset?.uri === 'spotify:playlist:6');
    // One control at a time: open, the end row goes and the heading carries Show Less; focus moves to the first new row.
    assert.equal(await page.locator('#am-sidebar .am-list-more').count(), 0, 'open, the end row goes');
    assert.equal(await page.textContent('#am-sidebar .am-nav-less'), 'Daha Az Göster');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.uri), 'spotify:playlist:6', 'focus moves to the first new playlist');
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('mcloud:settings'))).lists, true);
    assert.ok(await page.locator(rows + '[data-uri="spotify:playlist:6"] .am-list-art svg').count(), 'a playlist without artwork gets an icon');
    await shot('sidebar-lists-open');
    // Open, the heading sticks to the top of the sidebar with Show Less; closing from deep in the list fades the sidebar
    // out and back in with the short list, and focus lands on Show All.
    const heading = () => page.locator('#am-sidebar .am-nav-heading:has(.am-nav-add)');
    await page.setViewportSize({ width: 1440, height: 480 });
    await page.$eval('#am-sidebar .am-navigation', n => { n.scrollTop = n.scrollHeight; });
    // Stuck, the heading floats in the sidebar (a spacer keeps its place) and the scroll area itself fades out under it,
    // so fast scrolling can't run rows over it; it has no band of its own.
    await page.waitForFunction(() => document.querySelector('#am-sidebar .am-nav-heading.am-floating'));
    assert.equal(await heading().evaluate(h => Math.round(h.getBoundingClientRect().top - document.querySelector('#am-sidebar .am-navigation').getBoundingClientRect().top)), 10);
    assert.equal(await heading().evaluate(h => getComputedStyle(h, '::before').content), 'none');
    assert.ok(await page.evaluate(() => { const n = document.querySelector('#am-sidebar .am-navigation'), h = document.querySelector('#am-sidebar .am-floating'); return !!n.querySelector('.am-heading-spacer') && /gradient/.test(getComputedStyle(n).maskImage || getComputedStyle(n).webkitMaskImage) && Math.abs(n.getBoundingClientRect().top + parseFloat(n.style.getPropertyValue('--am-mask-edge')) - h.getBoundingClientRect().bottom - 4) <= 1; }), 'the scroll area fades out under the heading');
    await shot('sidebar-lists-stuck');
    // At the end of the list nothing runs under the account row: no fade, no hairline. Scrolled up, the rows fade out
    // above it and the hairline shows.
    const hairline = state => page.waitForFunction(on => document.querySelector('#am-sidebar .am-navigation').classList.contains('am-more-below') === on && getComputedStyle(document.querySelector('#am-sidebar .am-account')).boxShadow.includes(on ? '0.08' : 'rgba(255, 255, 255, 0)'), state, { timeout: 2000 });
    await hairline(false);
    await page.$eval('#am-sidebar .am-navigation', n => { n.scrollTop -= 80; });
    await hairline(true);
    assert.match(await page.$eval('#am-sidebar .am-navigation', n => getComputedStyle(n).maskImage), /100% - 16px/);
    await page.$eval('#am-sidebar .am-navigation', n => { n.scrollTop = n.scrollHeight; });
    await hairline(false);
    // Closing from deep in the list scrolls back to where the short list rests, then folds in place. The scroll only
    // decelerates (an ease-in-out read as linear on long lists): a quarter of the way through its time it is well
    // past a quarter of the way.
    await page.evaluate(() => {
      const n = document.querySelector('#am-sidebar .am-navigation'), samples = window.__amSamples = [];
      const tick = () => { if (document.querySelector('#am-sidebar .am-list-more')) return; samples.push([performance.now(), n.scrollTop]); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    await page.click('#am-sidebar .am-nav-less');
    assert.ok(await page.evaluate(() => { const n = document.querySelector('#am-sidebar .am-navigation'); return n.classList.contains('am-closing') || n.getAnimations({ subtree: true }).length > 0; }), 'closing animates');
    await page.waitForFunction(() => document.querySelectorAll('#am-sidebar .am-list-row').length === 7 && !document.querySelector('#am-sidebar .am-floating'));
    const samples = await page.evaluate(() => window.__amSamples), from = samples[0][1], to = samples.at(-1)[1];
    const t0 = samples[samples.findIndex(s => s[1] !== from) - 1][0], quarter = t0 + (samples.find(s => s[1] === to)[0] - t0) / 4;
    const at = samples.reduce((a, s) => Math.abs(s[0] - quarter) < Math.abs(a[0] - quarter) ? s : a), done = (from - at[1]) / (from - to);
    assert.ok(from - to > 50 && done > .3, `the scroll back only decelerates (${Math.round(done * 100)}% done a quarter of the way)`);
    assert.equal(await heading().evaluate(h => Math.round(h.nextElementSibling.getBoundingClientRect().top - h.getBoundingClientRect().bottom)), 4);
    assert.ok(await page.evaluate(() => !document.querySelector('#am-sidebar .am-heading-spacer') && !document.querySelector('#am-sidebar .am-navigation').classList.contains('am-masked')), 'back in the list');
    await page.waitForFunction(() => document.activeElement?.classList?.contains('am-list-more'));
    assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('am-list-more')), 'focus stays on Show All');
    assert.equal(await page.locator('#am-sidebar .am-nav-less').isVisible(), false);
    await page.setViewportSize({ width: 1440, height: 900 });
    // Rows open their playlist, folders the library's folder view; the open one is selected.
    await page.click(rows + '[data-uri="spotify:playlist:1"]');
    assert.equal(await page.evaluate(() => Spicetify.Platform.History.location.pathname), '/playlist/1');
    assert.ok(await page.locator(rows + '[data-uri="spotify:playlist:1"].am-selected').count());
    await page.click(rows + '[data-uri="spotify:folder:ruh"]');
    await page.waitForFunction(() => document.querySelectorAll('.am-library-card').length === 2);
    assert.ok(await page.locator(rows + '[data-uri="spotify:folder:ruh"].am-selected').count());
    assert.equal(await page.locator('#am-sidebar .am-selected').count(), 1);
    // The playing playlist gets a speaker.
    await page.evaluate(() => { Spicetify.Player.data.context.uri = 'spotify:playlist:2'; window.__firePlayer('songchange'); });
    assert.equal(await page.$eval(rows + '[data-uri="spotify:playlist:2"]', e => e.classList.contains('am-playing') && getComputedStyle(e, '::after').width), '14px');
    await page.evaluate(() => { Spicetify.Player.data.context.uri = 'spotify:album:0'; window.__firePlayer('songchange'); });
    // A refresh that reorders waits while the pointer is on the list, then moves the same row (its artwork stays
    // loaded) instead of rebuilding it.
    const moveBefore = (uri, before) => page.evaluate(([u, b]) => { const l = window.__mockLibrary, [item] = l.splice(l.findIndex(x => x.uri === u), 1); l.splice(l.findIndex(x => x.uri === b), 0, item); window.__libraryUpdate(); }, [uri, before]);
    const third = () => page.evaluate(() => document.querySelectorAll('#am-sidebar .am-list-row .am-list-name')[2]?.textContent);
    await page.$eval(rows + '[data-uri="spotify:playlist:4"]', b => { b.__kept = true; });
    await page.hover(rows + '[data-uri="spotify:playlist:1"]');
    await moveBefore('spotify:playlist:4', 'spotify:playlist:1');
    await page.waitForTimeout(900);
    assert.equal(await third(), 'Koşu', 'nothing moves under the pointer');
    await page.mouse.move(900, 450);
    await page.waitForFunction(() => document.querySelectorAll('#am-sidebar .am-list-row .am-list-name')[2]?.textContent === 'Gece Sürüşü');
    assert.ok(await page.$eval(rows + '[data-uri="spotify:playlist:4"]', b => b.__kept === true), 'the row was moved, not rebuilt');
    await moveBefore('spotify:playlist:4', 'spotify:playlist:5');
    await page.waitForFunction(() => document.querySelectorAll('#am-sidebar .am-list-row .am-list-name')[2]?.textContent === 'Koşu');
    // Spotify moves a playlist you play to the top of Recents within ~0.15s, with no library event; the sidebar
    // follows within a second.
    const started = await page.evaluate(() => {
      const l = window.__mockLibrary, [item] = l.splice(l.findIndex(x => x.uri === 'spotify:playlist:3'), 1); l.splice(l.findIndex(x => !x.pinned && ['playlist', 'folder'].includes(x.type)), 0, item);
      Spicetify.Player.data.context.uri = 'spotify:playlist:3'; window.__firePlayer('songchange'); return performance.now();
    });
    await page.waitForFunction(() => document.querySelectorAll('#am-sidebar .am-list-row .am-list-name')[2]?.textContent === 'Yol Şarkıları');
    assert.ok(await page.evaluate(t => performance.now() - t, started) < 900, 'the sidebar follows within a second');
    await page.evaluate(() => { Spicetify.Player.data.context.uri = 'spotify:album:0'; window.__firePlayer('songchange'); });
    await moveBefore('spotify:playlist:3', 'spotify:playlist:4');
    await page.waitForFunction(() => document.querySelectorAll('#am-sidebar .am-list-row .am-list-name')[2]?.textContent === 'Koşu');
    // When Spotify is slower to reorder, the sidebar keeps looking until the playlist leads.
    await page.evaluate(() => {
      Spicetify.Player.data.context.uri = 'spotify:playlist:5'; window.__firePlayer('songchange');
      setTimeout(() => { const l = window.__mockLibrary, [item] = l.splice(l.findIndex(x => x.uri === 'spotify:playlist:5'), 1); l.splice(l.findIndex(x => !x.pinned && ['playlist', 'folder'].includes(x.type)), 0, item); }, 2500);
    });
    await page.waitForTimeout(2000);
    assert.equal(await third(), 'Koşu', 'not yet reordered by Spotify');
    await page.waitForFunction(() => document.querySelectorAll('#am-sidebar .am-list-row .am-list-name')[2]?.textContent === 'Ders Çalışma', null, { timeout: 8000 });
    await page.evaluate(() => { Spicetify.Player.data.context.uri = 'spotify:album:0'; window.__firePlayer('songchange'); });
    await moveBefore('spotify:playlist:5', 'spotify:playlist:6');
    await page.waitForFunction(() => document.querySelectorAll('#am-sidebar .am-list-row .am-list-name')[2]?.textContent === 'Koşu');
    // mcloud → Recent playlists picks how many show under the pinned ones; with none, Show All still lists them.
    const recent = n => page.evaluate(n => window.__menus[0].items.find(i => i.name === 'Son listeler: ' + n).onClick(), n);
    await recent(3);
    assert.equal(await page.locator(rows).count(), 5);
    await recent('Yok');
    assert.deepEqual(await names(), ['Ruh Hali', 'Sabah Kahvesi']);
    assert.ok(await page.locator('#am-sidebar .am-list-more').isVisible());
    assert.deepEqual(await page.evaluate(() => window.__menus[0].items.filter(i => i.name.startsWith('Son listeler')).map(i => i.checked)), [true, false, false, false, false]);
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('mcloud:settings'))).recent, 0);
    await recent(5);
    assert.equal(await page.locator(rows).count(), 7);
    await page.click('#am-sidebar .am-nav-row:has-text("Ana Sayfa")');
  });

  await check('new playlist and folder from the Playlists heading, named in place', async () => {
    await page.click('#am-sidebar .am-nav-add');
    assert.deepEqual(await page.locator('#am-popover .am-popover-item').allTextContents(), ['Yeni Çalma Listesi', 'Yeni Klasör']);
    await page.click('#am-popover .am-popover-item >> nth=0');
    const input = '#am-sidebar .am-list-new input';
    assert.equal(await page.evaluate(sel => document.activeElement === document.querySelector(sel) && document.activeElement.value, input), 'Yeni Çalma Listesi');
    await shot('sidebar-new');
    // Escape cancels.
    await page.keyboard.press('Escape');
    assert.equal(await page.locator(input).count(), 0);
    assert.equal(await page.evaluate(() => window.__created?.length || 0), 0);
    // Enter creates it at the top and opens it; the sidebar lists it under the pinned items.
    await page.click('#am-sidebar .am-nav-add');
    await page.click('#am-popover .am-popover-item >> nth=0');
    await page.keyboard.type('Gece Yarısı');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => Spicetify.Platform.History.location.pathname === '/playlist/new1');
    assert.deepEqual(await page.evaluate(() => window.__created[0]), ['playlist', 'Gece Yarısı', { before: 'start' }]);
    await page.waitForFunction(() => document.querySelectorAll('#am-sidebar .am-list-row .am-list-name')[2]?.textContent === 'Gece Yarısı');
    assert.ok(await page.locator('#am-sidebar .am-list-row[data-uri="spotify:playlist:new1"].am-selected').count());
    // A folder keeps its default name when the field is left untouched, and the page stays where it was.
    await page.click('#am-sidebar .am-nav-add');
    await page.click('#am-popover .am-popover-item >> nth=1');
    await page.click('#am-player');
    await page.waitForFunction(() => window.__created.length === 2);
    assert.deepEqual(await page.evaluate(() => window.__created[1]), ['folder', 'Yeni Klasör', { before: 'start' }]);
    assert.equal(await page.evaluate(() => Spicetify.Platform.History.location.pathname), '/playlist/new1');
    await page.click('#am-sidebar .am-nav-row:has-text("Ana Sayfa")');
  });

  await check('track numbers: a row in Spotify\'s Columns menu and a switch under mcloud hide them', async () => {
    // Spotify's track list (classes and the grid variable as in 1.2.x) and its "Change visible columns" menu, which
    // mounts a moment after the click.
    await page.evaluate(() => {
      const art = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#c33764"/></svg>');
      const row = (n, img) => `<div class="main-trackList-trackListRow main-trackList-trackListRowGrid" role="row"><div class="main-trackList-rowSectionIndex" role="gridcell"><div class="main-trackList-rowMarker"><span>${n}</span><button class="main-trackList-rowImagePlayButton" aria-label="Çal"></button></div></div><div class="main-trackList-rowSectionStart" role="gridcell">${img ? `<img class="main-trackList-rowImage" alt="" src="${art}">` : ''}<div class="main-trackList-rowTitle">Şarkı ${n}</div></div><div role="gridcell">3:20</div></div>`;
      document.querySelector('[data-testid="playlist-page"]').insertAdjacentHTML('beforeend', `<div class="mock-numbers">
        <style>.mock-numbers .main-trackList-trackListRowGrid{display:grid;gap:16px;padding:0 16px;height:56px;position:relative;grid-template-columns:var(--grid-template-columns)}.mock-numbers .main-trackList-rowSectionIndex{justify-self:end;display:flex;align-items:center;position:relative}.mock-numbers .main-trackList-rowMarker{width:16px;min-width:16px;height:16px;position:relative}.mock-numbers .main-trackList-rowImagePlayButton{position:absolute;inset:0;opacity:0}.mock-numbers .main-trackList-rowSectionStart{display:flex;align-items:center;gap:12px}.mock-numbers .main-trackList-rowImage{width:40px;height:40px}</style>
        <div class="main-trackList-trackList main-trackList-indexable" style="--grid-template-columns:[index] var(--index-column-width,16px) [first] 4fr [last] 1fr">
          <div class="main-trackList-trackListHeader"><div class="main-trackList-trackListHeaderRow main-trackList-trackListRowGrid" role="row"><div class="main-trackList-rowSectionIndex" role="columnheader"><div>#</div></div><div class="main-trackList-rowSectionStart" role="columnheader"><button>Başlık</button></div><div role="columnheader">Süre</div></div><button class="mock-columns" aria-label="Görünür sütunları değiştir">▾</button></div>
          ${row(1, true)}${row(2, false)}
        </div></div>`);
      document.querySelector('.mock-columns').addEventListener('click', () => setTimeout(() => document.body.insertAdjacentHTML('beforeend', `<div data-tippy-root class="mock-menu" style="position:fixed;top:120px;right:40px;z-index:100;background:#282828"><div id="context-menu"><ul role="menu"><li role="presentation"><span>Sütunlar</span></li><li role="presentation" class="mock-li"><button class="mock-item" role="menuitemcheckbox" aria-checked="true" aria-label="Albüm" data-column="ALBUM"><div class="mock-label"><span class="encore-internal-color-text-bright-accent">Albüm</span></div><div class="mock-box"><div class="mock-box-inner"><div class="mock-check" data-encore-id="formCheckbox"><input type="checkbox" checked><label class="mock-mark"><span class="mock-dot"></span></label></div></div></div></button></li></ul></div></div>`), 50));
    });
    const layout = () => page.evaluate(() => {
      const [image, plain] = document.querySelectorAll('.mock-numbers .main-trackList-trackListRow'), left = e => Math.round(e.getBoundingClientRect().left - image.getBoundingClientRect().left);
      const marker = image.querySelector('.main-trackList-rowMarker').getBoundingClientRect(), img = image.querySelector('img').getBoundingClientRect();
      return { index: getComputedStyle(image).gridTemplateColumns.split(' ')[1], title: left(plain.querySelector('.main-trackList-rowSectionStart')), hash: getComputedStyle(document.querySelector('.mock-numbers .main-trackList-trackListHeaderRow .main-trackList-rowSectionIndex')).visibility, plainIndex: getComputedStyle(plain.querySelector('.main-trackList-rowSectionIndex')).visibility, onArt: Math.round(marker.left - img.left) === 0 && Math.round(marker.width) === Math.round(img.width) };
    });
    assert.deepEqual(await layout(), { index: '16px', title: 48, hash: 'visible', plainIndex: 'visible', onArt: false });
    // The menu's new row comes first, as the column does, and starts checked.
    await page.click('.mock-columns');
    await page.waitForSelector('.am-column-number');
    // Spotify's menu: the glass on its root, never on the list (a submenu inside the list would be clipped).
    assert.deepEqual(await page.evaluate(() => { const ul = document.querySelector('[data-tippy-root] ul[role="menu"]'), root = ul.closest('[data-tippy-root]');
      return [/^\d+$/.test(root.dataset.amGlass), 'amGlassList' in ul.dataset, getComputedStyle(ul).backdropFilter, getComputedStyle(root, '::before').backdropFilter.startsWith('url(')]; }), [true, true, 'none', true]);
    assert.deepEqual(await page.$$eval('#context-menu li', l => l.map(e => e.textContent)), ['Sütunlar', 'Parça numarası', 'Albüm']);
    assert.equal(await page.getAttribute('.am-column-number button', 'aria-checked'), 'true');
    await page.click('.am-column-number button');
    assert.equal(await page.getAttribute('.am-column-number button', 'aria-checked'), 'false');
    assert.ok(await page.evaluate(() => document.body.classList.contains('am-no-numbers')));
    // The index column folds away, titles take its place and the play button sits on the artwork.
    assert.deepEqual(await layout(), { index: '0px', title: 16, hash: 'hidden', plainIndex: 'hidden', onArt: true });
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('mcloud:settings'))).numbers, false);
    // The mcloud switch follows, and turns them back on.
    const numbers = () => page.evaluate(() => window.__menus[0].items.find(i => i.name === 'Parça numaraları'));
    assert.equal((await numbers()).checked, false);
    await page.evaluate(() => window.__menus[0].items.find(i => i.name === 'Parça numaraları').onClick());
    assert.equal((await numbers()).checked, true);
    assert.equal((await layout()).index, '16px');
    await page.evaluate(() => document.querySelectorAll('.mock-numbers, .mock-menu').forEach(e => e.remove()));
  });

  await check('volume wheel', async () => {
    await page.hover('.am-volume-wrap');
    await page.mouse.wheel(0, 100);
    await page.waitForFunction(() => window.__mockState.volume === 0.53);
    await page.mouse.move(10, 10);
  });

  await check('volume capsule: hover opens it, the speaker mutes and restores', async () => {
    const open = () => page.evaluate(() => document.getElementById('am-player').classList.contains('am-volume-open'));
    await page.waitForFunction(() => !document.getElementById('am-player').classList.contains('am-volume-open'));
    await page.hover('.am-volume-button');
    await page.waitForFunction(() => document.getElementById('am-player').classList.contains('am-volume-open'));
    // The capsule's clip-path also clips clicks, so let it finish growing.
    await page.waitForFunction(() => !document.querySelector('.am-volume-capsule').getAnimations().length);
    const box = await page.locator('.am-volume').boundingBox();
    await page.mouse.click(box.x + box.width * 0.8, box.y + box.height / 2);
    await page.waitForFunction(() => Math.abs(window.__mockState.volume - 0.8) < 0.06);
    const level = await page.evaluate(() => window.__mockState.volume);
    await page.click('.am-volume-button');
    await page.waitForFunction(() => window.__mockState.volume === 0);
    assert.equal(await page.locator('.am-volume-button path[opacity]').count(), 1);
    await page.click('.am-volume-button');
    await page.waitForFunction(l => window.__mockState.volume === l, level);
    assert.ok(await open());
    await page.mouse.move(10, 10);
    await page.waitForFunction(() => !document.getElementById('am-player').classList.contains('am-volume-open'));
  });

  await check('player width follows the window up to 700px', async () => {
    const width = () => page.evaluate(() => document.getElementById('am-player').offsetWidth);
    assert.equal(await width(), 700);
    await page.setViewportSize({ width: 900, height: 900 });
    assert.ok(await width() < 700);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  await check('toolbar glass: shapes under the controls, lit on hover, grown on press', async () => {
    // In #main (Spotify's isolated root), after .Root: in <body> it covered the toolbar's icons.
    const info = await page.evaluate(() => ({ host: document.getElementById('am-toolbar-glass')?.parentElement?.id, shapes: document.querySelectorAll('#am-toolbar-glass .am-tglass').length,
      layers: document.querySelectorAll('#am-toolbar-glass .am-tglass-layer:not(.am-tglass-lite)').length, lite: [...document.querySelectorAll('#am-toolbar-glass .am-tglass-lite')].map(l => getComputedStyle(l).display).join(), rims: document.querySelectorAll('#am-toolbar-glass .am-tglass-rim').length, on: document.body.classList.contains('am-tglass-on') }));
    // The lite layer (Balanced mode on the Spicy page) stays hidden elsewhere.
    assert.deepEqual(info, { host: 'main', shapes: 2, layers: 3, lite: 'none', rims: 2, on: true });
    // One set of layers and one hairline for every shape: each filter merges the shapes' map pieces, clipped to them.
    const pane = await page.evaluate(() => { const l = document.querySelector('#am-toolbar-glass > .am-tglass-pane > .am-tglass-layer'), id = l.style.backdropFilter.match(/#([\w-]+)/)[1];
      return { members: new Set([...document.getElementById(id).querySelectorAll('feImage[href]')].map(i => i.dataset.member)).size, pills: (l.style.clipPath.match(/M/g) || []).length, line: !!document.querySelector('#am-toolbar-glass > .am-tglass-pane-rim') }; });
    assert.deepEqual(pane, { members: 2, pills: 2, line: true });
    const back = await page.$('#global-nav-bar .am-toolbar-leading button'), r = await back.boundingBox();
    // Placed on resize and settings changes, a frame after the layout moves (the previous check resized the window).
    await page.waitForFunction(x => Math.round(document.querySelector('#am-toolbar-glass .am-tglass').getBoundingClientRect().left) === x, Math.round(r.x));
    const shape = await page.evaluate(() => { const g = document.querySelector('#am-toolbar-glass .am-tglass').getBoundingClientRect(); return [g.left, g.top, g.height]; });
    assert.deepEqual(shape, [Math.round(r.x), Math.round(r.y), 36]);
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await page.waitForFunction(() => Number(document.querySelector('#am-toolbar-glass .am-tglass-light').style.getPropertyValue('--am-tg-light')) > .05);
    // A press stretches the maps drawn at rest instead of drawing them again: same images, larger boxes.
    const map = () => page.evaluate(() => { const l = document.querySelector('#am-toolbar-glass > .am-tglass-pane > .am-tglass-layer'), i = document.getElementById(l.style.backdropFilter.match(/#([\w-]+)/)[1]).querySelector('feImage[data-member="0"][data-part="l"]'); return [i.getAttribute('href'), +i.getAttribute('height')]; });
    const restMap = await map();
    await page.mouse.down(); await page.waitForTimeout(300);
    const pressedMap = await map();
    assert.equal(pressedMap[0], restMap[0]); assert.ok(pressedMap[1] > restMap[1]);
    assert.ok(Number(await page.evaluate(() => document.querySelector('#am-toolbar-glass .am-tglass').style.getPropertyValue('--am-tg-scale'))) > 1.02);
    await page.mouse.move(5, 600); await page.mouse.up(); await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => document.querySelector('#am-toolbar-glass .am-tglass').style.getPropertyValue('--am-tg-scale')), '1.0000');
  });

  await check('liquid glass map follows the player size', async () => {
    // The player's glass is toolbarLens (state 'player'): three backdrop-filter layers in a face 12pt larger than the
    // player's border box (the page past its edge; 724x78 from its 698x52 padding box), each map drawn as its two ends
    // at device resolution and one column stretched between them (the face's size in all); the player itself filters
    // nothing. The bend layer is the glass's own box, so its maps start 12pt before it (-12 to 712).
    const map = () => page.evaluate(async () => {
      const face = document.querySelector('#am-player > .am-player-face'), id = getComputedStyle(face.querySelector('.am-tglass-layer')).backdropFilter.match(/#([\w-]+)/)[1];
      const part = p => document.getElementById(id).querySelector(`feImage[data-part="${p}"]`), [l, m, r] = ['l', 'm', 'r'].map(part), shift = document.getElementById(id).querySelector('feDisplacementMap'), n = a => Number(m.getAttribute(a));
      const span = [l.getAttribute('x'), +r.getAttribute('x') + +r.getAttribute('width')].join('-'), joined = Math.abs(+l.getAttribute('x') + +l.getAttribute('width') - n('x')) < 1e-6 && Math.abs(n('x') + n('width') - r.getAttribute('x')) < 1e-6;
      return { size: span + 'x' + l.getAttribute('height'), joined, column: await new Promise(res => { const i = new Image(); i.onload = () => res(i.width); i.src = m.getAttribute('href'); }), href: l.getAttribute('href'), layers: face.querySelectorAll('.am-tglass-layer:not(.am-tglass-lite)').length, x: shift.getAttribute('xChannelSelector'), y: shift.getAttribute('yChannelSelector') };
    });
    await page.waitForFunction(() => document.querySelector('#am-player > .am-player-face .am-tglass-layer'));
    // The player's own bend filter (the toolbar's shapes have theirs too).
    await page.evaluate(() => { window.__playerBend = () => document.getElementById(getComputedStyle(document.querySelector('#am-player > .am-player-face .am-tglass-layer')).backdropFilter.match(/#([\w-]+)/)[1]).querySelector('feImage[data-part="l"]'); window.__playerExtent = () => { const r = __playerBend().parentNode.querySelector('feImage[data-part="r"]'); return String(+r.getAttribute('x') + +r.getAttribute('width')); }; });
    await page.waitForFunction(() => __playerBend()?.getAttribute('href') && __playerExtent() === '712');
    const first = await map();
    // x shift in R (with G equal to it) and y shift in B: P3 colour conversion mixes green into red, never blue.
    assert.deepEqual([first.size, first.joined, first.column, first.layers, first.x, first.y], ['-12-712x78', true, 1, 3, 'R', 'B']);
    assert.ok(first.href.startsWith('data:image/png'));
    assert.deepEqual(await page.evaluate(() => [getComputedStyle(document.getElementById('am-player')).backdropFilter, !!document.querySelector('#am-player > .am-tglass-rim')]), ['none', true]);
    // A content-box change must not redraw the map.
    await page.evaluate(() => { __playerBend().setAttribute('href', 'data:image/png;base64,kept'); document.getElementById('am-player').style.paddingLeft = '17px'; });
    await page.waitForTimeout(100);
    assert.equal((await map()).href, 'data:image/png;base64,kept');
    await page.setViewportSize({ width: 900, height: 900 });
    await page.waitForFunction(() => __playerExtent() === String(document.getElementById('am-player').offsetWidth + 12));
    assert.notEqual((await map()).href, 'data:image/png;base64,kept');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => { document.getElementById('am-player').style.paddingLeft = ''; });
    await page.waitForFunction(() => __playerExtent() === '712');
  });

  await check('artist page', async () => {
    await page.evaluate(() => Spicetify.Platform.History.push('/artist/mock'));
    await page.waitForSelector('body.am-artist-open .am-artist-name');
    assert.equal(await page.textContent('.am-artist-name'), 'Sena Şener');
    // The wide header (artistUnion.headerImage.data) fills W×W/2 right of the sidebar (W = window minus sidebar) at the
    // smallest size still sharp there, with five blurred copies (3-20pt at W=1042, scaling with W) that line up with it and run on under
    // the first shelf; the play triangle sits 1.5px right in its 72px circle, as in Apple Music.
    const hero = await page.evaluate(() => {
      const media = document.querySelector('.am-hero-media').getBoundingClientRect();
      const imgs = [...document.querySelectorAll('.am-hero-media .am-hero-image:not(.am-hero-haze)')], [sharp] = imgs, s = sharp.getBoundingClientRect();
      return { w: innerWidth - media.left, photoH: s.height, mediaH: media.height,
        src: (() => { const [big, small] = window.__mockArtist.headerImage.data.sources, need = media.width * 1.17 * devicePixelRatio; return imgs.every(i => i.src === (small.maxWidth >= need ? small : big).url); })(), blurs: imgs.map(i => parseFloat(/blur\(([\d.]+)px/.exec(getComputedStyle(i).filter)?.[1] ?? '0')), haze: [...document.querySelectorAll('.am-hero-haze')].map(i => [getComputedStyle(i).filter, getComputedStyle(i).opacity]),
        aligned: imgs.slice(1).every(i => { const r = i.getBoundingClientRect(); return Math.abs(r.top - s.top) < 1 && Math.abs(r.height - s.height) < 1; }) };
    });
    assert.ok(hero.src && hero.aligned, JSON.stringify(hero));
    assert.ok(Math.abs(hero.photoH - hero.w / 2) < 1 && Math.abs(hero.mediaH - hero.w * .646) < 1, JSON.stringify(hero));
    assert.deepEqual(hero.blurs.map(b => Math.round(b / hero.w * 1042)), [0, 3, 6, 10, 15, 20]);
    // Scrolling softens the photo with copies blurred once and faded in, not an animated blur radius.
    assert.deepEqual(hero.haze, [['blur(5px)', '0'], ['blur(14px)', '0']]);
    // ⓘ, play and follow are symmetric under the name, as in Apple Music.
    const buttons = await page.evaluate(() => { const [i, p, f] = ['.am-hero-info', '.am-hero-play', '.am-hero-follow'].map(s => document.querySelector(s).getBoundingClientRect()); const y = r => Math.round(r.top + r.height / 2);
      return { sizes: [i.width, p.width, f.width], centred: y(i) === y(p) && y(p) === y(f), gaps: [Math.round(p.left - i.right), Math.round(f.left - p.right)], font: parseFloat(getComputedStyle(document.querySelector('.am-artist-name')).fontSize) }; });
    assert.deepEqual(buttons, { sizes: [48, 72, 48], centred: true, gaps: [24, 24], font: 40 });
    assert.ok(await page.evaluate(() => { const c = s => { const r = document.querySelector(s).getBoundingClientRect(); return r.left + r.width / 2; }; return Math.abs((c('.am-hero-play') - c('.am-hero-info')) - (c('.am-hero-follow') - c('.am-hero-play'))) < 1 && Math.abs(c('.am-hero-play') - c('.am-artist-name')) < 1; }));
    // ⓘ opens the About sheet measured on Apple Music's: 704px card 52px from the top, photo copies aligned and blurred
    // in steps, facts, city chips and the bio; Escape closes it and focus returns to ⓘ, a click on the dim closes it too.
    await page.click('.am-hero-info');
    await page.waitForSelector('#am-artist-info .am-info-card');
    const sheet = await page.evaluate(() => {
      const card = document.querySelector('.am-info-card').getBoundingClientRect(), imgs = [...document.querySelectorAll('.am-info-media .am-info-photo')], s = imgs[0].getBoundingClientRect();
      return { w: card.width, top: card.top, vw: innerWidth, role: document.querySelector('.am-info-card').getAttribute('role'), focus: document.activeElement?.classList.contains('am-info-close'),
        name: document.querySelector('.am-info-name').textContent, labels: [...document.querySelectorAll('.am-info-label')].map(l => l.textContent), chips: document.querySelectorAll('.am-info-chip').length,
        bio: document.querySelector('.am-info-bio')?.textContent, aligned: imgs.slice(1).every(i => { const r = i.getBoundingClientRect(); return Math.abs(r.top - s.top) < 1 && Math.abs(r.height - s.height) < 1; }),
        photo: Math.round(s.width) === Math.round(card.width) && Math.round(s.height) === Math.round(card.width), blurs: imgs.map(i => Math.round(parseFloat(/blur\(([\d.]+)px/.exec(getComputedStyle(i).filter)?.[1] ?? '0') / card.width * 704)) };
    });
    assert.deepEqual([sheet.w, sheet.top, sheet.role, sheet.focus, sheet.name, sheet.chips, sheet.aligned, sheet.photo], [Math.min(704, sheet.vw - 32), 52, 'dialog', true, 'Sena Şener', 3, true, true], JSON.stringify(sheet));
    assert.deepEqual(sheet.labels, ['Aylık dinleyici', 'Takipçi', 'En çok dinlendiği şehirler']);
    assert.equal(sheet.bio, 'Sena Şener, İstanbul doğumlu şarkıcı ve söz yazarı.');
    assert.deepEqual(sheet.blurs, [0, 3, 6, 10, 16, 24, 32, 5, 9, 18, 36]);
    // Scrolling, as Apple's: the photo drifts up at 0.4x; from 0.257W it blurs (copies in turn) and fades into the
    // card's colour, half way at 0.399W.
    assert.deepEqual(await page.evaluate(async () => {
      const scroll = document.querySelector('.am-info-scroll'), w = document.querySelector('.am-info-card').offsetWidth, filler = document.createElement('div');
      filler.style.height = '900px'; document.querySelector('.am-info-body').append(filler);
      const at = async y => { scroll.scrollTop = y; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const q = s => getComputedStyle(document.querySelector(s));
        return [Math.round(new DOMMatrix(q('.am-info-stage').transform).m42 / y * 100) / 100, Math.round(q('.am-info-media').opacity * 100) / 100, [1, 2, 3, 4].map(k => Math.round(q('.am-info-haze-' + k).opacity * 100) / 100)]; };
      const steps = [await at(Math.round(w * .2)), await at(Math.round(w * .399))]; filler.remove(); scroll.scrollTop = 0; return steps;
    }), [[-0.4, 1, [0, 0, 0, 0]], [-0.4, 0.5, [1, 1, 1, 0]]]);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('am-artist-info') && document.activeElement?.classList.contains('am-hero-info'));
    await page.click('.am-hero-info'); await page.waitForSelector('#am-artist-info');
    await page.mouse.click(8, 300);
    await page.waitForFunction(() => !document.getElementById('am-artist-info'));
    assert.ok(await page.evaluate(() => document.querySelector('.am-hero-media').getBoundingClientRect().bottom > document.querySelector('.am-artist-body').getBoundingClientRect().top + 40));
    assert.equal(await page.evaluate(() => { const b = document.querySelector('.am-hero-play').getBoundingClientRect(), t = document.querySelector('.am-hero-play path').getBoundingClientRect(); return Math.round((t.left + t.width / 2 - b.left - b.width / 2) * 10) / 10; }), 1.5);
    await page.waitForFunction(() => document.body.classList.contains('am-tinted'));
    // Over the artist's colour the sidebar is Apple's dark material and the edge glow is off.
    assert.deepEqual(await page.evaluate(() => [getComputedStyle(document.getElementById('am-sidebar-glow')).display, getComputedStyle(document.getElementById('am-sidebar')).backgroundImage]), ['none', 'none']);
    assert.equal(await page.locator('.am-song').count(), 9);
    assert.ok(await page.locator('.am-shelf-artists .am-card').count() === 5);
    // Following answers at once: the star fills and a toast names the artist; a second click unfollows.
    await page.click('.am-hero-follow');
    assert.deepEqual(await page.evaluate(() => { const f = document.querySelector('.am-hero-follow'); return [f.classList.contains('am-active'), f.getAttribute('aria-pressed')]; }), [true, 'true']);
    await page.waitForFunction(() => (window.__libraryAdds || []).includes('spotify:artist:mock'));
    await page.waitForFunction(() => document.querySelector('.am-toasts > .am-toast-show:last-child')?.textContent === 'Sena Şener takip ediliyor.');
    await page.click('.am-hero-follow');
    await page.waitForFunction(() => (window.__libraryRemoves || []).includes('spotify:artist:mock'));
    assert.equal(await page.textContent('.am-toasts > :last-child'), 'Sena Şener takipten çıkarıldı.');
    assert.equal(await page.getAttribute('.am-hero-follow', 'aria-pressed'), 'false');
    // Back and share + more float on the toolbar glass, in the artist view's own layer, one shape each on their rects.
    assert.deepEqual(await page.evaluate(() => { const g = [...document.querySelectorAll('#am-artist .am-tglass-root .am-tglass')].map(e => e.getBoundingClientRect()), b = document.querySelector('.am-artist-back').getBoundingClientRect();
      return [document.getElementById('am-artist').classList.contains('am-tglass-on'), g.length, Math.round(g[0].left) === Math.round(b.left), g[1].height]; }), [true, 2, true, 36]);
    // Share copies the link and says so above the player (Spotify's own toasts stay under the artist view).
    await page.click('#am-artist .am-artist-actions button[aria-label="Paylaş"]');
    await page.waitForFunction(() => /^Bağlantı kopyala/.test(document.querySelector('.am-toasts > .am-toast-show:last-child')?.textContent));
    // It is Liquid Glass with a lens of its own, drawn at the toast's size.
    assert.match(await page.evaluate(() => getComputedStyle(document.querySelector('.am-toast')).backdropFilter), /url\(.*#am-glass-toast/);
    await page.waitForFunction(() => { const t = document.querySelector('.am-toasts > :last-child'), id = 'am-glass-toast' + (+t.dataset.slot ? '-' + t.dataset.slot : ''); return document.querySelector(`#${id} feImage`).getAttribute('width') === String(t.offsetWidth); });
    // Right-click on song row opens context menu
    await page.click('.am-song >> nth=0', { button: 'right' });
    assert.ok(await page.locator('#am-popover').isVisible());
    assert.deepEqual(await page.locator('#am-popover .am-popover-item').allTextContents(), ['Çalma Listesine Ekle', 'Çal', 'Sıraya Ekle', 'Katkıda Bulunanları Görüntüle', 'Albüme Git', 'Şarkı Bağlantısını Kopyala']);
    await page.keyboard.press('Escape');
    assert.ok(await page.locator('#am-popover').isHidden());
    await page.click('.am-artist-back');
    await page.waitForFunction(() => !document.body.classList.contains('am-artist-open') && !document.body.classList.contains('am-tinted'));
  });
  await shot('artist');

  await check('profiles: Apple Music\'s header (#59)', async () => {
    // Spotify's profile markup (section > div > entity-header with user-image; the action bar in wrappers after it).
    assert.deepEqual(await page.evaluate(() => { const host = document.querySelector('.am-native-main'), sec = document.createElement('section');
      sec.innerHTML = '<div><div data-testid="entity-header"><div style="background-color: rgb(176, 8, 16)"></div><div class="main-entityHeader-contentWrapper"><div class="main-entityHeader-imageContainer"><div data-testid="user-image"></div></div><div class="main-entityHeader-headerText"><span class="encore-text-body-small">Profile</span><span><h1>Leo</h1></span><div><span>48 Followers</span></div></div></div></div>'
        + '<div><div><div data-testid="action-bar"><div data-testid="action-bar-row"><button data-encore-id="buttonSecondary">Follow</button><button data-encore-id="buttonTertiary">…</button></div></div></div></div></div>';
      host.append(sec); const cs = s => getComputedStyle(sec.querySelector(s));
      const out = [cs('[data-testid="entity-header"] > [style]').display, cs('.main-entityHeader-headerText > span').display, cs('h1').fontSize, cs('[data-encore-id="buttonTertiary"]').borderRadius, cs('[data-encore-id="buttonSecondary"]').backgroundColor === getComputedStyle(document.body).getPropertyValue('--am-accent').trim().replace(/^#(..)(..)(..)$/, (m, r, g, b) => `rgb(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)})`)];
      sec.remove(); return out; }), ['none', 'none', '28px', '50%', true]);
  });

  await check('View Credits opens Spotify\'s dialog; Go to Artist Radio opens the radio playlist (#59)', async () => {
    // Credits: the action Spotify's own track menu dispatches to its store, for the song the menu is about.
    await page.click('.am-more');
    await page.click('#am-popover .am-popover-item:has-text("Katkıda Bulunanları Görüntüle")');
    assert.deepEqual(await page.evaluate(() => window.__dispatched?.at(-1)), { type: 'SHOW_TRACK_CREDITS', isOpen: true, trackUri: 'spotify:track:1' });
    // Spotify's dialogs are <dialog> elements in .Root; the card (the dialog's only child, as in Credits, or the dialog
    // itself when it holds a header and a body, as Keyboard Shortcuts does) is a frosted sheet, and only the card.
    assert.deepEqual(await page.evaluate(() => { const sheet = n => { const cs = getComputedStyle(n); return cs.borderRadius === '16px' && /blur\(40px\)/.test(cs.backdropFilter); };
      const open = (...parts) => { const d = document.createElement('dialog'); d.append(...parts.map(t => Object.assign(document.createElement('div'), { textContent: t }))); document.querySelector('.Root').append(d); d.showModal(); return d; };
      const one = open('Credits'), out = [sheet(one), sheet(one.firstChild), getComputedStyle(one, '::backdrop').backgroundColor]; one.close(); one.remove();
      const two = open('Keyboard Shortcuts', 'Basic'); out.push(sheet(two), sheet(two.firstChild)); two.close(); two.remove(); return out; }), [false, true, 'rgba(0, 0, 0, 0.35)', true, false]);
    // Spotify's older react-modal windows (Playlist permissions) take the same sheet and dim.
    assert.deepEqual(await page.evaluate(() => { const portal = document.createElement('div'); portal.className = 'ReactModalPortal';
      portal.innerHTML = '<div style="position:fixed;inset:0;background-color:rgba(0,0,0,.7)"><div role="dialog"><div data-testid="playlist-permissions-modal">Shared with</div></div></div>'; document.body.append(portal);
      const card = getComputedStyle(portal.querySelector('[data-testid]')), out = [card.borderRadius, /blur\(40px\)/.test(card.backdropFilter), getComputedStyle(portal.firstElementChild).backgroundColor]; portal.remove(); return out; }), ['16px', true, 'rgba(0, 0, 0, 0.35)']);
    // Credits' Encore list rows: a grey caption over one rounded group, a hairline between rows.
    assert.deepEqual(await page.evaluate(() => { const d = document.createElement('dialog'), card = document.createElement('div'), sec = document.createElement('div');
      sec.innerHTML = '<span data-encore-id="text">Artist</span><div data-encore-id="listRow">A<button data-encore-id="buttonSecondary">Follow</button></div><div data-encore-id="listRow">B</div>'; card.append(sec); d.append(card); document.querySelector('.Root').append(d); d.showModal();
      const [cap, a, b] = sec.children, cs = n => getComputedStyle(n), out = [cs(cap).textTransform, cs(a).borderTopLeftRadius, cs(a).borderBottomLeftRadius, cs(b).borderTopLeftRadius, cs(b).borderBottomLeftRadius, /linear-gradient/.test(cs(b).backgroundImage), cs(a.querySelector('button')).animationDelay];
      d.close(); d.remove(); return out; }), ['uppercase', '10px', '0px', '0px', '10px', true, '0.18s']);
    await page.evaluate(() => Spicetify.Platform.History.push('/artist/mock'));
    await page.waitForSelector('body.am-artist-open .am-song');
    await page.click('.am-song >> nth=1', { button: 'right' });
    await page.click('#am-popover .am-popover-item:has-text("Katkıda Bulunanları Görüntüle")');
    assert.equal(await page.evaluate(() => window.__dispatched.at(-1).trackUri), 'spotify:track:t1');
    // Radio: Spotify's server names a playlist made from the artist; the theme opens it.
    await page.click('.am-artist-name', { button: 'right' });
    await page.waitForSelector('#am-popover .am-popover-item:has-text("Bu Sanatçıyı Çalma")');
    assert.deepEqual(await page.locator('#am-popover .am-popover-item').allTextContents(), ['Sanatçıyı Çal', 'Sanatçı Bağlantısını Kopyala', 'Bu Sanatçıyı Çalma', 'Sanatçı Radyosuna Git']);
    await page.click('#am-popover .am-popover-item:has-text("Sanatçı Radyosuna Git")');
    await page.waitForFunction(() => Spicetify.Platform.History.location.pathname === '/playlist/radio');
    assert.match(await page.evaluate(() => window.__cosmos.at(-1)), /\/seed_to_playlist\/spotify:artist:mock\?/);
    await page.evaluate(() => Spicetify.Platform.History.push('/'));
    await page.waitForFunction(() => !document.body.classList.contains('am-artist-open'));
  });

  await check('locale-prefixed artist links and portrait-only artists', async () => {
    await page.evaluate(() => { window.__savedHeader = window.__mockArtist.headerImage; window.__mockArtist.headerImage = null; Spicetify.Platform.History.push('/intl-tr/artist/plain'); });
    await page.waitForSelector('body.am-artist-open .am-hero-avatar .am-hero-portrait');
    assert.equal(await page.locator('.am-hero-image').count(), 0);
    await page.evaluate(() => { window.__mockArtist.headerImage = window.__savedHeader; Spicetify.Platform.History.push('/'); });
    await page.waitForFunction(() => !document.body.classList.contains('am-artist-open'));
  });

  await check('going back, the artist page stays up until Spotify\'s page has settled', async () => {
    await page.evaluate(() => Spicetify.Platform.History.push('/artist/mock'));
    await page.waitForSelector('body.am-artist-open .am-artist-name');
    // Spotify's own page renders under ours; React replaces it ~120ms after the route changes, then fills rows.
    assert.deepEqual(await page.evaluate(async () => {
      const host = document.querySelector('.main-view-container__scroll-node-child > main'), under = host.firstElementChild, next = document.createElement('section');
      const wait = ms => new Promise(r => setTimeout(r, ms)), open = () => document.body.classList.contains('am-artist-open'), steps = [];
      Spicetify.Platform.History.push('/'); steps.push(open());
      await wait(120); steps.push(open()); under.replaceWith(next);
      await wait(25); steps.push(open()); next.append(document.createElement('div'));
      await wait(25); steps.push(open());
      await wait(100); steps.push(open()); next.replaceWith(under);
      return steps;
    }), [true, true, true, true, false]);
  });

  await check('page and artist view run under the glass sidebar', async () => {
    await page.evaluate(() => Spicetify.Platform.History.push('/artist/mock'));
    await page.waitForSelector('body.am-artist-open .am-artist-name');
    const layout = await page.evaluate(() => {
      const side = document.getElementById('am-sidebar').getBoundingClientRect().width, view = document.getElementById('am-artist');
      return { side, main: document.querySelector('.am-native-main').getBoundingClientRect().x, pad: parseFloat(getComputedStyle(document.querySelector('.main-view-container__scroll-node-child')).paddingLeft),
        header: document.querySelector('[data-testid="playlist-page"] > [style*="background-color"]').getBoundingClientRect().x, artist: view.getBoundingClientRect().x, gutter: view.offsetWidth - view.clientWidth,
        blur: getComputedStyle(document.getElementById('am-sidebar')).backdropFilter };
    });
    assert.deepEqual([layout.main, Math.round(layout.pad), layout.header, layout.artist, layout.gutter], [0, Math.round(layout.side), 0, 0, 0]);
    // ...and under the toolbar: the main view starts at the window's top and its scroll viewport keeps the toolbar's height clear.
    // Scrollers nested in a page (playlist action bars) keep their own padding.
    const top = await page.evaluate(() => [document.querySelector('.am-native-main').getBoundingClientRect().y, ...[...document.querySelectorAll('[data-overlayscrollbars-viewport]')].map(v => parseFloat(getComputedStyle(v).paddingTop))]);
    assert.deepEqual(top, [0, 56, 0]);
    // Image headers live outside the scroll viewport; they grow by the toolbar's row so they still end with the header.
    const image = await page.evaluate(() => { const r = document.querySelector('.before-scroll-node > :has(> [data-testid="background-image"])').getBoundingClientRect(); return [r.y, r.height]; });
    assert.deepEqual(image, [0, 256]);
    assert.match(layout.blur, /blur/);
  });

  await check('artist page: wheel scrolls the page, Shift+wheel scrolls rows, overlay scrollbar, buttons clear of the drag strip', async () => {
    const index = await page.evaluate(() => [...document.querySelectorAll('#am-artist .am-shelf-track')].findIndex(t => t.scrollWidth > t.clientWidth + 1));
    assert.ok(index >= 0);
    const row = page.locator('#am-artist .am-shelf-track').nth(index);
    const rowLeft = () => page.evaluate(i => document.querySelectorAll('#am-artist .am-shelf-track')[i].scrollLeft, index);
    const pageTop = () => page.evaluate(() => document.getElementById('am-artist').scrollTop);
    // A plain wheel over a row scrolls the page, as in any browser...
    await row.hover();
    const top = await pageTop();
    await page.mouse.wheel(0, 200);
    await page.waitForFunction(t => document.getElementById('am-artist').scrollTop > t && document.querySelector('.am-scroll-artist').style.opacity === '1', top);
    assert.equal(await rowLeft(), 0);
    // ...and Shift+wheel scrolls the row sideways (the browser's own behaviour). macOS turns Shift+wheel into a
    // horizontal wheel before Chromium sees it, so a synthetic Shift+deltaY does nothing there; send what it sends.
    await row.hover();
    if (process.platform === 'darwin') await page.mouse.wheel(300, 0);
    else { await page.keyboard.down('Shift'); await page.mouse.wheel(0, 300); await page.keyboard.up('Shift'); }
    await page.waitForFunction(i => document.querySelectorAll('#am-artist .am-shelf-track')[i].scrollLeft > 0, index);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.am-artist-actions')).getPropertyValue('-webkit-app-region') || getComputedStyle(document.querySelector('.am-artist-actions')).appRegion), 'no-drag');
    await page.evaluate(() => { document.getElementById('am-artist').scrollTop = 0; });
  });

  await check('artist page falls back to Spotify on errors', async () => {
    await page.evaluate(() => { Spicetify.GraphQL.Request = async () => ({ errors: [{ message: 'boom' }] }); Spicetify.Platform.History.push('/artist/broken'); });
    await page.waitForFunction(() => !document.body.classList.contains('am-artist-open'));
    errors.splice(0, errors.length, ...errors.filter(e => !e.includes('using Spotify page')));
  });

  await check('library filter and sort', async () => {
    await page.click('text=Albümler');
    await page.waitForSelector('.am-library-card');
    assert.equal(await page.locator('.am-library-card').count(), 20);
    // Album cards name the artist, which Spotify sends in artists[] (albums have no owner).
    assert.equal(await page.textContent('.am-library-card .am-library-sub'), 'Sanatçı 0');
    await page.fill('.am-library-filter', 'rain');
    await page.waitForFunction(() => document.querySelectorAll('.am-library-card').length === 1);
    await page.fill('.am-library-filter', '');
    // Spotify's live search results open under the toolbar, over the library rather than under it.
    await page.fill('#global-nav-bar input', 'sena');
    const results = await page.evaluate(() => { const r = document.getElementById('search-dropdown').getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.id; });
    assert.equal(results, 'search-dropdown');
    await page.fill('#global-nav-bar input', '');
    await page.mouse.click(700, 500);
    assert.equal(await page.evaluate(() => [!!document.getElementById('search-dropdown'), getComputedStyle(document.getElementById('main')).zIndex].join()), 'false,0');
    await page.selectOption('.am-library-sort', 'name');
    await page.waitForFunction(() => document.querySelector('.am-library-name')?.textContent === 'After Hours');
    // Right-click on library card opens context menu
    await page.click('.am-library-card >> nth=0', { button: 'right' });
    assert.ok(await page.locator('#am-popover').isVisible());
    // Spotify's own menu offers removal for a saved album (#59).
    await page.waitForSelector('#am-popover .am-popover-item:has-text("Kitaplıktan Çıkar")');
    assert.deepEqual(await page.locator('#am-popover .am-popover-item').allTextContents(), ['Çal', 'Sıraya Ekle', 'Aç', 'Bağlantıyı Kopyala', 'Kitaplıktan Çıkar']);
    await page.click('#am-popover .am-popover-item:has-text("Kitaplıktan Çıkar")');
    assert.equal(await page.evaluate(() => window.__libraryRemoves.at(-1)), await page.evaluate(() => document.querySelector('.am-library-card').dataset.uri));
    assert.ok(await page.locator('#am-popover').isHidden());
  });

  await check('every row of our menus has its icon, in Apple Music\'s icon column', async () => {
    await page.click('.am-more');
    await page.waitForTimeout(150); // the opening animation scales the menu
    // The icon centred in a 14px column where text starts (10px in), the label 22px from there.
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#am-popover .am-popover-item')].map(item => {
      const icon = item.querySelector('.am-menu-icon'), range = document.createRange(); range.selectNodeContents(item.lastChild);
      const left = item.getBoundingClientRect().left;
      return icon && [icon.getBoundingClientRect().left - left, icon.getBoundingClientRect().width, range.getBoundingClientRect().left - left].map(Math.round).join(); }).filter(Boolean).every(v => v === '11,12,32')), true);
    await page.keyboard.press('Escape');
  });

  await check('menus open at once; rows that need the library arrive after (#59)', async () => {
    // Spotify slow to answer: the menu is up within the right-click, its library rows join when they come.
    assert.deepEqual(await page.evaluate(() => { window.__apiDelay = 400; const row = document.querySelector('#am-sidebar .am-list-row[title="Yol Şarkıları"]'), b = row.getBoundingClientRect();
      row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: b.left + 20, clientY: b.top + 5 }));
      const items = [...document.querySelectorAll('#am-popover .am-popover-item')].map(i => i.textContent); return [!document.getElementById('am-popover').hidden, items.includes('Çal'), items.includes('Sil')]; }), [true, true, false]);
    await page.waitForSelector('#am-popover .am-popover-item:has-text("Sil")');
    await page.evaluate(() => { window.__apiDelay = 0; });
    await page.keyboard.press('Escape');
    // A folder opens titled with its name, as Spotify's folder page is.
    await page.click('#am-sidebar .am-list-row[title="Ruh Hali"]');
    await page.waitForFunction(() => document.querySelector('.am-library-title')?.textContent === 'Ruh Hali');
    await page.evaluate(() => Spicetify.Platform.History.push('/'));
    await page.waitForFunction(() => !document.body.classList.contains('am-library-open'));
    // A folder has a menu too.
    await page.click('#am-sidebar .am-list-row[title="Ruh Hali"]', { button: 'right' });
    assert.deepEqual(await page.locator('#am-popover .am-popover-item').allTextContents(), ['Klasörü Aç', 'Yeni Çalma Listesi']);
    await page.keyboard.press('Escape');
  });

  await check('library actions on playlists and the playing track (#59)', async () => {
    // Your own playlist: on or off your profile, and delete confirmed in a submenu.
    const row = name => `#am-sidebar .am-list-row[title="${name}"]`;
    await page.click(row('Sabah Kahvesi'), { button: 'right' });
    await page.waitForSelector('#am-popover .am-popover-item:has-text("Sil")');
    const items = await page.locator('#am-popover .am-popover-item').allTextContents();
    assert.ok(['Ayrıntıları Düzenle', 'Gizli Yap', 'Sil'].every(t => items.includes(t)) && items.some(t => /^Profil(den Kaldır|e Ekle)$/.test(t)), items.join());
    // Edit details: a small sheet, saved through PlaylistAPI.updateDetails.
    await page.click('#am-popover .am-popover-item:has-text("Ayrıntıları Düzenle")');
    await page.fill('#am-edit-details .am-edit-name', 'Sabah Kahvesi 2');
    await page.click('#am-edit-details .am-edit-save');
    await page.waitForSelector('#am-edit-details', { state: 'detached' });
    assert.equal(await page.evaluate(() => window.__details?.at(-1)?.name), 'Sabah Kahvesi 2');
    await page.click(row('Sabah Kahvesi'), { button: 'right' });
    await page.waitForSelector('#am-popover .am-popover-item:has-text("Sil")');
    await page.hover('#am-popover .am-popover-item:has-text("Sil")');
    await page.click('#am-popover-sub .am-popover-item:has-text("Silinsin")');
    const uri = await page.getAttribute(row('Sabah Kahvesi'), 'data-uri');
    assert.deepEqual(await page.evaluate(() => window.__rootlistRemoves), [uri]);
    // A playlist you follow is only removed from the library.
    await page.evaluate(uri => { window.__followed = [uri]; }, await page.getAttribute(row('Koşu'), 'data-uri'));
    await page.click(row('Koşu'), { button: 'right' });
    await page.waitForSelector('#am-popover .am-popover-item:has-text("Kitaplıktan Çıkar")');
    assert.ok(!(await page.locator('#am-popover .am-popover-item').allTextContents()).includes('Sil'));
    await page.keyboard.press('Escape');
    // The playing track from your own playlist: "Remove from this Playlist" names its row by uid.
    await page.evaluate(uri => { const d = Spicetify.Player.data; window.__ctx = d.context; d.context = { uri }; d.item.uid = 'u1'; }, uri);
    await page.click('.am-more');
    await page.click('#am-popover .am-popover-item:has-text("Bu Listeden Çıkar")');
    assert.deepEqual(await page.evaluate(() => window.__playlistRemoves), [{ uri, items: [{ uri: 'spotify:track:1', uid: 'u1' }] }]);
    await page.evaluate(() => { Spicetify.Player.data.context = window.__ctx; delete Spicetify.Player.data.item.uid; });
  });
  await check('drag and drop onto the sidebar, with Spotify\'s drag data (#59)', async () => {
    // A drag as Spotify's pages start one; edge: 'top' drops on a row's top edge, else its middle.
    const drop = (sel, data, edge) => page.evaluate(([sel, data, edge]) => { const row = [...document.querySelectorAll(sel)].find(n => n.offsetParent), b = row.getBoundingClientRect(), dt = new DataTransfer();
      for (const [k, v] of Object.entries(data)) dt.setData(k, v);
      const opts = { bubbles: true, cancelable: true, dataTransfer: dt, clientX: b.left + 20, clientY: edge === 'top' ? b.top + 2 : b.top + b.height / 2 }, over = new DragEvent('dragover', opts);
      row.dispatchEvent(over); const seen = [over.defaultPrevented, ['am-drop-into', 'am-drop-before', 'am-drop-after'].find(c => row.classList.contains(c)) || '']; row.dispatchEvent(new DragEvent('drop', opts)); return seen; }, [sel, data, edge]);
    const track = { 'text/uri-list': 'https://open.spotify.com/track/9', 'text/x-spotify-tracks': 'spotify:track:9' };
    await drop('#am-sidebar .am-list-row[title="Odak"]', track);   // the first dragover loads the playlists you can add to
    await page.waitForTimeout(100);
    assert.deepEqual(await drop('#am-sidebar .am-list-row[title="Odak"]', track), [true, 'am-drop-into']);
    await page.waitForFunction(() => window.__playlistAdds?.some(a => a.playlistUri === 'spotify:playlist:2' && a.uris.join() === 'spotify:track:9'));
    // A drag without Spotify's data is left alone; an album onto Albums saves it; a playlist onto a pinned row's top
    // edge is pinned above it.
    assert.deepEqual(await drop('#am-sidebar .am-list-row[title="Odak"]', { 'text/plain': 'hello' }), [false, '']);
    const albums = await page.evaluate(() => [...document.querySelectorAll('#am-sidebar .am-nav-row')].findIndex(n => n.textContent === 'Albümler'));
    assert.deepEqual(await page.evaluate(i => { const row = document.querySelectorAll('#am-sidebar .am-nav-row')[i], b = row.getBoundingClientRect(), dt = new DataTransfer(); dt.setData('text/x-spotify-albums', 'spotify:album:7');
      const opts = { bubbles: true, cancelable: true, dataTransfer: dt, clientX: b.left + 20, clientY: b.top + b.height / 2 }, over = new DragEvent('dragover', opts); row.dispatchEvent(over); row.dispatchEvent(new DragEvent('drop', opts)); return over.defaultPrevented; }, albums), true);
    await page.waitForFunction(() => window.__libraryAdds?.includes('spotify:album:7'));
    // The pointer stays over the sidebar after a drop, where rows otherwise hold still; your own move shows at once.
    await page.hover('#am-sidebar .am-list-row[title="Koşu"]');
    assert.deepEqual(await drop('#am-sidebar .am-list-row[title="Sabah Kahvesi"]', { 'text/x-spotify-playlists': 'spotify:playlist:2' }, 'top'), [true, 'am-drop-before']);
    await page.waitForFunction(() => JSON.stringify(window.__pins?.at(-1)) === JSON.stringify(['spotify:playlist:2', { before: { uri: 'spotify:playlist:0' } }]));
    // Spotify tells of a pin only through update_pin. Then the library is put back.
    await page.waitForFunction(() => [...document.querySelectorAll('#am-sidebar .am-list-row')].filter(r => r.querySelector('.am-list-pin')).map(r => r.title).join().includes('Odak,Sabah Kahvesi'));
    await page.evaluate(() => { const l = window.__mockLibrary, [item] = l.splice(l.findIndex(i => i.uri === 'spotify:playlist:2'), 1); item.pinned = false; l.splice(l.findIndex(i => i.uri === 'spotify:playlist:1') + 1, 0, item); window.__libraryUpdate(); });
    await page.mouse.move(0, 0);
    await page.waitForFunction(() => !document.querySelector('#am-sidebar .am-list-row[title="Odak"] .am-list-pin'));
    // A playlist onto the middle of a folder goes into it, at its top.
    assert.deepEqual(await drop('#am-sidebar .am-list-row[title="Ruh Hali"]', { 'text/x-spotify-playlists': 'spotify:playlist:2' }), [true, 'am-drop-into']);
    await page.waitForFunction(() => JSON.stringify(window.__rootlistMoves?.at(-1)) === JSON.stringify(['spotify:playlist:2', { after: { uri: 'spotify:folder:ruh' } }]));
    assert.equal(await page.locator('#am-sidebar .am-drop-into, #am-sidebar .am-drop-before').count(), 0);
    // The sidebar's rows start drags Spotify's pages understand.
    assert.equal(await page.evaluate(() => { const row = document.querySelector('#am-sidebar .am-list-row[title="Odak"]'), dt = new DataTransfer(); row.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt })); return row.draggable && dt.getData('text/x-spotify-playlists'); }), 'spotify:playlist:2');
  });
  await check('Spotify\'s menus in the theme\'s measure, their icons in Apple Music\'s column (#59)', async () => {
    // Spotify's rows: [icon | label], and a submenu row [icon + label | chevron].
    const shown = () => page.evaluate(() => [...document.querySelectorAll('#mock-tip svg')].map(s => s.getBoundingClientRect().width > 0));
    await page.evaluate(() => { const tip = document.createElement('div'); tip.id = 'mock-tip'; tip.setAttribute('data-tippy-root', '');
      const icon = '<svg width="16" height="16"><rect width="16" height="16"/></svg>';
      // Spotify's rows are flex rows.
      tip.innerHTML = `<style>#mock-tip :is(button,[role="menuitem"]) { display: flex; align-items: center; border: 0; font: inherit }</style><ul role="menu"><li><button role="menuitem"><div>${icon}</div><div><span>Add to queue</span></div></button></li><div></div><li><div role="menuitem"><div><div role="search"><input placeholder="Find a playlist"><div><span>${icon}</span></div></div></div></div></li><li><button role="menuitem" aria-expanded="false"><div><span>${icon}</span>Share</div><div>${icon}</div></button></li><li><button role="link" disabled><div>${icon}</div><div><span>Report</span></div><div>${icon}</div></button></li><li><button role="menuitem"><span>${icon}Experimental features</span></button></li><li><button><div>${icon}</div><div>Home config</div></button></li><li><button role="menuitem"><div><span>Profile</span></div></button></li><li><button role="menuitem" id="mock-update"><div data-encore-id="listRow"><div class="e-legacy-list-row__header-side"><img width="56" height="56" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></div><div class="e-legacy-list-row__header"><div class="e-legacy-list-row__column"><p>New show near you</p></div><div class="e-legacy-list-row__slot"><div></div></div></div></div></button></li></ul>`;
      document.body.append(tip); });
    await page.waitForFunction(() => document.querySelector('#mock-tip [role="menuitem"][data-am-iconed]'));
    // The search icon is part of its field: it stays, at 12px.
    // Report, a role="link" row: its leading icon goes too, its "opens outside" mark stays, in the same measure.
    // Your Updates rows keep their picture at its size; the unread dot takes the accent.
    assert.deepEqual(await page.evaluate(() => { const row = document.getElementById('mock-update'), img = row.querySelector('img'), dot = row.querySelector('[class*="list-row__slot"] > div');
      return [getComputedStyle(img.parentElement).display !== 'none' && img.getBoundingClientRect().width, getComputedStyle(dot).backgroundColor === getComputedStyle(document.body).getPropertyValue('--am-accent').trim().replace(/^#(..)(..)(..)$/, (m, r, g, b) => `rgb(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)})`)]; }), [56, true]);
    // Every leading icon shows (Spicetify's rows hold the icon and the label in one part); a submenu's chevron gives way
    // to the theme's ›.
    assert.deepEqual(await shown(), [true, true, true, false, true, true, true, true]);
    // Spicetify's own rows are bare buttons: same measure.
    assert.equal(await page.evaluate(() => getComputedStyle([...document.querySelectorAll('#mock-tip li > button')].find(b => b.textContent === 'Home config')).padding), '3px 10px');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#mock-tip [role="link"]')).padding), '3px 10px');
    // "Find a playlist" as a macOS search field.
    assert.deepEqual(await page.evaluate(() => { const i = getComputedStyle(document.querySelector('#mock-tip [role="search"] input')); return [i.height, i.borderRadius, i.fontSize]; }), ['24px', '7px', '13px']);
    // A submenu row (aria-expanded) ends in the theme's thin ›, not Spotify's triangle.
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#mock-tip [aria-expanded] > :last-child'), '::after').content), '"›"');
    // In the theme's menu measure: 13px labels on 21px rows, separators as the theme's.
    assert.deepEqual(await page.evaluate(() => { const item = document.querySelector('#mock-tip [role="menuitem"]'), sep = document.querySelector('#mock-tip ul > div');
      return [getComputedStyle(item).padding, getComputedStyle(item.querySelector('span')).fontSize, getComputedStyle(sep).height, getComputedStyle(sep).marginLeft]; }), ['3px 10px', '13px', '1px', '11px']);
    // As in Apple Music's menus: icons at 12px in a 14px column where a plain row's text starts, the label 22px from
    // there; a row without an icon is not indented.
    assert.deepEqual(await page.evaluate(() => { const slot = document.querySelector('#mock-tip [data-am-icon]'), at = sel => [...document.querySelectorAll('#mock-tip span')].find(n => n.textContent === sel).getBoundingClientRect().left;
      return [getComputedStyle(slot).width, slot.querySelector('svg').getBoundingClientRect().width, Math.round(at('Add to queue') - at('Profile'))]; }), ['14px', 12, 22]);
    // A submenu opening down from its row (anchored by its top) rises by the list's padding, so its first row is level
    // with the parent row; one anchored by its bottom (pushed up to fit) stays.
    assert.deepEqual(await page.evaluate(() => ['inset: 0px auto auto 0px', 'inset: auto auto 0px 0px'].map(inset => { const sub = document.createElement('div'); sub.setAttribute('data-tippy-root', ''); sub.style.cssText = 'position: absolute; ' + inset;
      document.querySelector('#mock-tip ul').append(sub); const m = getComputedStyle(sub).marginTop; sub.remove(); return m; })), ['-5px', '0px']);
    await page.evaluate(() => document.getElementById('mock-tip').remove());
  });

  await check('a scrolling menu list feathers out at its edge (#59)', async () => {
    await page.evaluate(() => { const tip = document.createElement('div'); tip.id = 'mock-scroll-tip'; tip.setAttribute('data-tippy-root', '');
      tip.innerHTML = '<ul role="menu" style="display:block;max-height:100px;overflow-y:auto;margin:0;padding:0">' + Array.from({ length: 12 }, (_, i) => `<li><button role="menuitem"><div><span>List ${i}</span></div></button></li>`).join('') + '</ul>';
      document.body.append(tip); });
    // The rows over the bottom 20px fade out to the edge; the top ones stay whole until the list scrolls.
    await page.waitForFunction(() => [...document.querySelectorAll('#mock-scroll-tip [role="menuitem"]')].some(b => b.style.getPropertyValue('--am-mask')));
    assert.deepEqual(await page.evaluate(() => { const rows = [...document.querySelectorAll('#mock-scroll-tip [role="menuitem"]')], cut = rows.find(b => b.style.getPropertyValue('--am-mask'));
      return [rows[0].style.getPropertyValue('--am-mask'), /linear-gradient/.test(getComputedStyle(cut).maskImage || getComputedStyle(cut).webkitMaskImage)]; }), ['', true]);
    await page.evaluate(() => { const ul = document.querySelector('#mock-scroll-tip ul'); ul.scrollTop = 40; });
    // Scrolled, the top edge feathers too.
    await page.waitForFunction(() => [...document.querySelectorAll('#mock-scroll-tip [role="menuitem"]')].some(b => b.style.getPropertyValue('--am-mask').startsWith('linear-gradient(transparent')));
    await page.evaluate(() => document.getElementById('mock-scroll-tip').remove());
    // Spotify counts a submenu list's height in its own rows (40px, a 32px search); in the theme's rows it ends at the
    // last one: a search, Create, a separator and three folders.
    assert.deepEqual(await page.evaluate(() => { const tip = document.createElement('div'); tip.id = 'mock-folder-tip'; tip.setAttribute('data-tippy-root', '');
      tip.innerHTML = '<style>.mock-section{height:calc(var(--context-menu-submenu-length) * var(--context-menu-submenu-item-height,40px) + var(--context-menu-submenu-item-height,40px) + var(--context-menu-submenu-filter-height,32px) + var(--context-menu-submenu-divider-count,0) * var(--context-menu-submenu-divider-height,0px))}</style>'
        + '<ul role="menu" style="display:block;margin:0;padding:0;list-style:none"><div class="mock-section" style="--context-menu-submenu-length:3;--context-menu-submenu-divider-count:1">'
        + '<li><div role="menuitem"><div><div role="search"><input></div></div></div></li><li><button role="menuitem" style="display:flex;border:0;font:inherit"><span>Create folder</span></button></li><div></div>'
        + ['a', 'b', 'c'].map(n => `<li><button role="menuitem" style="display:flex;border:0;font:inherit"><span>${n}</span></button></li>`).join('') + '</div></ul>';
      document.body.append(tip); const section = tip.querySelector('.mock-section'), last = section.lastElementChild;
      const height = section.getBoundingClientRect().height, content = last.getBoundingClientRect().bottom - section.getBoundingClientRect().top; tip.remove();
      return [height < 140, Math.abs(height - content) <= 6]; }), [true, true], 'Spotify\'s count would be 192px (the preview\'s font is a little taller than the client\'s)');
  });

  await check('a Spotify menu that opens inside a sheet gets the theme\'s menu (#59)', async () => {
    // Shared with: the Listener ▾ menu (Leave playlist) is a [data-tippy-root] inside the react-modal's dialog.
    await page.evaluate(() => { const portal = document.createElement('div'); portal.className = 'ReactModalPortal'; portal.id = 'mock-sheet-menu';
      portal.innerHTML = '<div><div role="dialog" tabindex="-1"><div data-testid="playlist-permissions-modal"><button>Listener</button><div class="mock-slot"></div></div></div></div>'; document.body.append(portal);
      portal.querySelector('[role="dialog"]').focus(); });
    await page.waitForTimeout(50);
    await page.evaluate(() => { const tip = document.createElement('div'); tip.setAttribute('data-tippy-root', '');
      tip.innerHTML = '<div><ul role="menu"><li><button role="menuitemradio" style="padding:8px 8px 8px 12px"><div><svg width="16" height="16"></svg></div><div><span>Leave playlist</span></div></button></li></ul></div>';
      document.querySelector('#mock-sheet-menu .mock-slot').append(tip); });
    await page.waitForFunction(() => document.querySelector('#mock-sheet-menu [data-tippy-root]')?.dataset.amGlass !== undefined);
    assert.deepEqual(await page.evaluate(() => { const row = document.querySelector('#mock-sheet-menu [role="menuitemradio"]'), style = getComputedStyle(row);
      return [style.paddingTop, style.paddingLeft, Math.round(row.querySelector('svg').getBoundingClientRect().width)]; }), ['3px', '10px', 12]);
    await page.evaluate(() => document.getElementById('mock-sheet-menu').remove());
  });

  await check('Spotify\'s snackbars come up as the theme\'s glass toast, with their button (#59)', async () => {
    await page.evaluate(() => { const c = document.createElement('div'); c.className = 'notistack-SnackbarContainer';
      c.innerHTML = '<div class="notistack-Snackbar"><div role="alert"><div><span data-encore-id="text">Removed from Your Library.</span><button>Undo</button></div></div></div>';
      c.querySelector('button').onclick = () => { window.__undo = true; }; c.firstChild.__reactFiber$mock = { memoizedProps: {}, return: { memoizedProps: { open: true, id: 'undo' } } };
      document.querySelector('.mock-snackbar-host').append(c); });
    await page.waitForFunction(() => document.querySelector('.am-toasts > .am-toast-show:last-child')?.firstChild?.textContent === 'Removed from Your Library.');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.notistack-SnackbarContainer')).visibility), 'hidden');
    await page.click('.am-toasts > :last-child .am-toast-action');
    assert.ok(await page.evaluate(() => window.__undo));
    assert.deepEqual(await page.evaluate(() => window.__closedSnacks), ['undo'], 'one with a button closes with our toast, after its click');
    await page.evaluate(() => document.querySelector('.notistack-SnackbarContainer').remove());
    // Two at once stack: the newest at the bottom, the other above it, apart.
    await page.evaluate(() => { const c = document.createElement('div'); c.className = 'notistack-SnackbarContainer'; document.querySelector('.mock-snackbar-host').append(c);
      for (const m of ['Added to queue', 'Added to Your Library.']) { const s = document.createElement('div'); s.className = 'notistack-Snackbar'; s.innerHTML = `<div role="alert"><span data-encore-id="text">${m}</span></div>`; s.__reactFiber$mock = { memoizedProps: { open: true, id: m } }; c.append(s); } });
    await page.waitForFunction(() => document.querySelectorAll('.am-toasts > .am-toast-show').length >= 2);
    // Closed at once, so Spotify's provider (preventDuplicate) shows the next one with the same text right away.
    assert.deepEqual(await page.evaluate(() => window.__closedSnacks.slice(1)), ['Added to queue', 'Added to Your Library.']);
    await page.waitForTimeout(350);
    assert.ok(await page.evaluate(() => { const [a, b] = [...document.querySelectorAll('.am-toasts > .am-toast-show')].slice(-2), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return a.textContent === 'Added to queue' && b.textContent === 'Added to Your Library.' && ra.bottom <= rb.top; }), 'the newest sits under the older one, without overlap');
    await page.evaluate(() => document.querySelector('.notistack-SnackbarContainer').remove());
  });
  await shot('library');

  await check('the toolbar Home leaves a library view (#59)', async () => {
    // Library views are /?am-library=…; Spotify's Home does nothing where the path is already '/'.
    await page.click('text=Albümler');
    await page.waitForSelector('body.am-library-open');
    // A stand-in for Spotify's Home in the toolbar's centre group, for this check only (the toolbar glass counts shapes).
    await page.evaluate(() => { const b = document.createElement('button'); b.className = 'mock-home'; b.textContent = 'H'; b.onclick = () => { if (Spicetify.Platform.History.location.pathname !== '/') Spicetify.Platform.History.push('/'); }; document.querySelector('#global-nav-bar .am-toolbar-center').prepend(b); });
    await page.click('#global-nav-bar .mock-home');
    await page.waitForFunction(() => !document.body.classList.contains('am-library-open'));
    assert.equal(await page.evaluate(() => Spicetify.Platform.History.location.search), '');
    await page.evaluate(() => document.querySelector('#global-nav-bar .mock-home').remove());
    await page.click('text=Albümler');
    await page.waitForSelector('body.am-library-open .am-library-card');
  });

  await check('a sheet over the library opens without a grey fade', async () => {
    // Spotify fades .Root's background; #main is lifted over the library while a sheet is open.
    await page.click('#am-sidebar [aria-label="Arkadaş etkinliği"]');
    await page.waitForFunction(() => document.body.classList.contains('am-panel-open'));
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.Root')).backgroundColor), 'rgba(0, 0, 0, 0)');
    // #main is lifted over the library while a sheet is open; the library must still take clicks.
    assert.equal(await page.evaluate(() => { const card = document.querySelector('.am-library-card'), b = card.getBoundingClientRect(); return card.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)); }), true, 'library cards are covered while a sheet is open');
    await page.click('#am-sidebar [aria-label="Arkadaş etkinliği"]');
    await page.waitForFunction(() => !document.body.classList.contains('am-panel-open'));
  });

  await check('back to the library: its last contents at once, refreshed behind them', async () => {
    // Albums is open: leave for one of Spotify's pages and come back. No "Loading your library…": the cards are there
    // in the same task, and LibraryAPI is asked again in the background.
    assert.deepEqual(await page.evaluate(async () => {
      const api = Spicetify.Platform.LibraryAPI, get = api.getContents; let calls = 0; api.getContents = (...a) => { calls++; return get.apply(api, a); };
      Spicetify.Platform.History.push('/playlist/mock');
      await new Promise(r => setTimeout(r, 800));
      Spicetify.Platform.History.push({ pathname: '/', search: '?am-library=albums' });
      const now = [document.querySelectorAll('.am-library-card').length, document.querySelector('.am-library-status').textContent];
      await new Promise(r => setTimeout(r, 100)); api.getContents = get;
      return [...now, calls > 0];
    }), [20, '20 öğe', true]);
  });

  await check('settings menu', async () => {
    const names = await page.evaluate(() => window.__menus[0].items.map(i => i.name));
    assert.equal(names[0], 'Oynatıcıda albüm kapağı');
    await page.evaluate(() => window.__menus[0].items.find(i => i.name === 'Renk: Mavi').onClick());
    assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue('--am-accent')), '#0a84ff');
    await page.evaluate(() => window.__menus[0].items[0].onClick());
    assert.ok(await page.evaluate(() => document.body.classList.contains('am-no-artwork')));
    const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('mcloud:settings')));
    assert.deepEqual([saved.accent, saved.artwork, saved.sort], ['blue', false, 'name']);
  });

  await check('glass modes: balanced runs the lite glass on the Spicy page only, full keeps the layers, eco is solid', async () => {
    // player/toolbar: the glass layers that run (null when the glass is not built); rims: hairline filters that run.
    const state = () => page.evaluate(() => {
      const shown = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none';
      const layers = sel => { const host = document.querySelector(sel); return host ? [...host.querySelectorAll('.am-tglass-layer')].filter(shown).map(l => l.classList[1].slice(10)).join() : null; };
      return { mode: ['am-balanced', 'am-solid'].filter(c => document.body.classList.contains(c)).join() || 'full', player: layers('#am-player .am-player-face'), toolbar: layers('#am-toolbar-glass > .am-tglass-pane'),
        rims: [...document.querySelectorAll('#am-player > .am-tglass-rim, #am-toolbar-glass > .am-tglass-pane-rim')].filter(e => shown(e) && getComputedStyle(e).backdropFilter !== 'none').length,
        sidebar: /blur/.test(getComputedStyle(document.getElementById('am-sidebar')).backdropFilter), glow: shown(document.getElementById('am-sidebar-glow')) };
    });
    const pick = name => page.evaluate(n => window.__menus[0].items.find(i => i.name === n).onClick(), name);
    const glass = { player: 'bend,mid,tone', toolbar: 'bend,mid,tone', rims: 2, sidebar: true, glow: true };
    assert.deepEqual(await state(), { mode: 'am-balanced', ...glass });
    await page.evaluate(() => Spicetify.Platform.History.push('/SpicyLyrics'));
    await page.waitForFunction(() => document.body.classList.contains('am-spicy-route'));
    assert.deepEqual(await state(), { mode: 'am-balanced', player: 'lite', toolbar: 'lite', rims: 0, sidebar: false, glow: false });
    // The lite filter: one displacement, read from the same maps as the bend.
    assert.deepEqual(await page.evaluate(() => { const id = getComputedStyle(document.querySelector('#am-player .am-tglass-lite')).backdropFilter.match(/#([\w-]+)/)[1], f = document.getElementById(id);
      return [f.querySelectorAll('feDisplacementMap').length, f.querySelectorAll('feGaussianBlur').length, !!f.querySelector('feImage[data-map="map"]').getAttribute('href')]; }), [1, 0, true]);
    // With the Liquid Glass player off, the toolbar's own buttons blur the page; Balanced turns that off here too.
    const blurs = () => page.evaluate(() => [...document.querySelectorAll('#global-nav-bar :is(button,input), #am-player, #am-sidebar')].filter(e => getComputedStyle(e).backdropFilter !== 'none').length);
    await pick('Liquid Glass oynatıcı');
    await page.waitForFunction(() => !document.body.classList.contains('am-tglass-on'));
    assert.equal(await blurs(), 0);
    await pick('Liquid Glass oynatıcı');
    await page.waitForFunction(() => document.body.classList.contains('am-tglass-on'));
    await pick('Cam efekti: Tam');
    assert.deepEqual(await state(), { mode: 'full', ...glass });
    await pick('Cam efekti: Eko');
    await page.waitForFunction(() => !document.getElementById('am-toolbar-glass'));
    assert.deepEqual(await state(), { mode: 'am-solid', player: null, toolbar: null, rims: 0, sidebar: false, glow: false });
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('mcloud:settings'))).glass, 'eco');
    await pick('Cam efekti: Dengeli');
    await page.evaluate(() => Spicetify.Platform.History.push('/'));
    await page.waitForSelector('#am-toolbar-glass > .am-tglass-pane');
    assert.deepEqual(await state(), { mode: 'am-balanced', ...glass });
    // Reduced transparency in the OS keeps Eco: the menu checks Eco and says why another pick changes nothing.
    const checks = () => page.evaluate(() => window.__menus[0].items.filter(i => i.name.startsWith('Cam efekti: ')).map(i => i.checked));
    assert.deepEqual(await checks(), [false, true, false]);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
    await page.waitForFunction(() => document.body.classList.contains('am-solid'));
    assert.deepEqual(await checks(), [false, false, true]);
    await pick('Cam efekti: Tam');
    assert.match(await page.textContent('.am-toasts > :last-child'), /saydamlık/);
    assert.deepEqual(await checks(), [false, false, true]);
    await pick('Cam efekti: Dengeli');
    await cdp.send('Emulation.setEmulatedMedia', { features: [] });
    await page.waitForFunction(() => !document.body.classList.contains('am-solid'));
    assert.deepEqual(await checks(), [false, true, false]);
    await cdp.detach();
  });

  await check('album page: artwork, title column and play controls laid out like Apple Music', async () => {
    await page.evaluate(() => Spicetify.Platform.History.push('/album/0'));
    // The shape of Spotify's album page: header, then the action bar inside an OverlayScrollbars host. Spotify's
    // .contentSpacing padding and button resets are inlined.
    await page.evaluate(() => {
      document.querySelector('.mock-page').hidden = true;
      document.querySelector('main').insertAdjacentHTML('beforeend', `<header class="main-topBar-container" style="position:sticky;top:0;height:64px;z-index:2"><div class="main-topBar-topbarContentWrapper"><div class="main-topBar-topbarContent">Blonde</div></div></header>
        <section data-testid="album-page" id="mock-album"><div data-testid="entity-header" style="height:340px"><div style="--background-base:#335"></div>
          <div class="main-entityHeader-contentWrapper contentSpacing" style="display:flex;height:300px;padding-inline:var(--content-spacing)"><div></div>
            <button class="main-entityHeader-imageContainer" style="width:232px;height:232px;position:relative"><img src="${Spicetify.Player.data.item.images[0].url}"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='502' height='192'/%3E#lens-flare" alt="" style="position:absolute;top:0;left:50%;width:80%"></button>
            <div class="main-entityHeader-headerText" style="display:flex;flex-direction:column"><span class="encore-text-body-small">Album</span><span><span class="main-entityHeader-title"><h1 style="font-size:6rem;white-space:nowrap">Blonde</h1></span></span>
              <div><div class="main-entityHeader-creatorWrapper"><figure></figure><span><a data-testid="creator-link">Frank Ocean</a></span></div><span>•</span><span>2016</span></div></div></div></div>
          <div style="--background-base:#335"></div>
          <div><div style="overflow:hidden"><style>#mock-album button{padding:0;border:0;background:none;color:inherit}</style><div class="main-actionBar-ActionBar contentSpacing" data-testid="action-bar" style="padding:32px"><div data-testid="action-bar-row" style="display:flex;gap:32px">
            <div role="div"><button data-encore-id="buttonPrimary" aria-label="Play"><span style="width:56px;height:56px;display:flex"><svg viewBox="0 0 16 16"><path d="M3 2l11 6-11 6z"/></svg></span></button></div>
            <div data-testid="action-bar-row-actions"><button data-encore-id="buttonTertiary" class="e-1-button-tertiary--condensed-all" aria-label="Shuffle"><svg viewBox="0 0 16 16"></svg></button><button data-encore-id="buttonTertiary" aria-label="Download"><svg viewBox="0 0 16 16"></svg></button></div>
            <button data-encore-id="buttonTertiary" aria-label="More"><svg viewBox="0 0 16 16"></svg></button><div data-testid="action-bar-row-trailing"></div></div></div></div></div>
          <div class="contentSpacing" data-testid="playlist-toolbar"><div><div style="margin-right:-60px"><div><button data-encore-id="buttonPrimary"><span>Add<span class="e-1-button__icon-wrapper"><svg viewBox="0 0 16 16"></svg></span></span></button><button data-encore-id="buttonPrimary" aria-label="Mix"><span>Mix<span class="e-1-button__icon-wrapper"><svg viewBox="0 0 16 16"></svg></span></span></button></div></div></div></div></section>`);
    });
    const box = sel => page.locator(sel).boundingBox();
    const art = await box('#mock-album .main-entityHeader-imageContainer'), row = await box('#mock-album [data-testid="action-bar-row"]');
    const title = await box('#mock-album h1'), play = await box('#mock-album [data-testid="action-bar-row"] button[data-encore-id="buttonPrimary"]');
    const shuffle = await box('#mock-album [aria-label="Shuffle"]');
    assert.ok(Math.abs(art.width - art.height) < 1, 'artwork stays square');
    // Mix's lens flare shares the artwork's container; stretched to the artwork it was a hard-edged beam.
    const flare = await page.$eval('#mock-album img[src*="lens-flare"]', e => [e.getBoundingClientRect().width, getComputedStyle(e).objectFit]);
    assert.ok(Math.abs(flare[0] - .8 * art.width) < 1 && flare[1] !== 'cover', 'Mix\'s lens flare keeps its own size');
    assert.ok(Math.abs(row.y + row.height - (art.y + art.height)) <= 1, 'controls line up with the artwork bottom');
    assert.ok(row.x >= art.x + art.width && title.x >= art.x + art.width, 'title and controls sit beside the artwork');
    assert.ok(shuffle.x < play.x, 'shuffle leads the play button');
    assert.ok(play.width > 90 && play.height <= 40, 'play is a pill');
    // Spotify's editing row sits in a capsule at the header's top right instead of its own row.
    const tools = await box('#mock-album [data-testid="playlist-toolbar"] > div > div > div'), header = await box('#mock-album [data-testid="entity-header"]');
    assert.ok(Math.abs(tools.y - art.y) <= 4 && header.x + header.width - (tools.x + tools.width) < 60, 'editing buttons sit at the top right');
    assert.ok((await box('#mock-album [data-testid="playlist-toolbar"] button >> nth=0')).height <= 36, 'editing buttons are icons');
    const label = () => page.evaluate(() => getComputedStyle(document.querySelector('#mock-album [data-testid="action-bar-row"] button[data-encore-id="buttonPrimary"] > span'), '::after').content);
    assert.equal(await label(), '"Duraklat"');
    const pill = () => page.$eval('#mock-album [data-testid="action-bar-row"] button[data-encore-id="buttonPrimary"] > span', e => [e.getBoundingClientRect().width, e.scrollWidth <= e.clientWidth]);
    const playingPill = await pill();
    await page.evaluate(() => { window.__mockState.playing = false; Spicetify.Platform.History.push('/album/0'); });
    assert.equal(await label(), '"Çal"');
    assert.deepEqual(await pill(), playingPill, 'the pill keeps its width when the label changes');
    assert.ok(playingPill[1], '"Duraklat" fits the pill');
    await page.waitForFunction(() => document.body.classList.contains('am-entity-top'));
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.main-topBar-topbarContentWrapper')).visibility), 'hidden');
    // A slow page renders its controls after the 600ms check; the title bar must stay hidden at its top.
    assert.ok(await page.evaluate(async () => {
      const row = document.querySelector('#mock-album [data-testid="action-bar-row"]'), host = row.parentElement;
      row.remove(); Spicetify.Platform.History.push('/album/0');
      await new Promise(r => setTimeout(r, 700)); host.append(row);
      return document.body.classList.contains('am-entity-top');
    }), 'a slow page keeps the title bar hidden');
    await shot('album');
    await page.evaluate(() => { window.__mockState.playing = true; document.querySelector('.main-topBar-container').remove(); document.getElementById('mock-album').remove(); document.querySelector('.mock-page').hidden = false; });
  });

  await check('artwork viewer covers the sidebar and player and grows from its centre', async () => {
    // Spotify's "View album artwork" modal: react-modal's portal with an absolute backdrop and no z-index (styles inlined).
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', `<div class="ReactModalPortal" id="mock-artwork"><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#000b">
      <div role="dialog" aria-modal="true" style="position:relative;transform:translateY(25%) scale(.6)"><div style="--image-aspect-ratio:1"><div role="img" style="width:400px;height:400px;background:#888"></div></div></div></div></div>`));
    const covers = await page.evaluate(() => ['#am-sidebar', '#am-player'].map(s => { const b = document.querySelector(s).getBoundingClientRect(); return document.getElementById('mock-artwork').contains(document.elementFromPoint(b.x + 20, b.y + b.height / 2)); }));
    assert.deepEqual(covers, [true, true], 'the backdrop is above the sidebar and the player');
    const dialog = await page.$eval('#mock-artwork [role="dialog"]', e => [getComputedStyle(e).transform, getComputedStyle(e).animationName]);
    assert.deepEqual(dialog, ['none', 'am-artwork-in']);
    await page.evaluate(() => document.getElementById('mock-artwork').remove());
  });

  await check('no :has() in user.css tests inline style', async () => {
    // Spicy Lyrics writes inline styles every frame. With `style` inside a :has() argument each write re-matched the
    // writer's ancestors up to <html>, ~1700 elements restyled per frame instead of a few (issue #53).
    const css = fs.readFileSync(path.join(here, '..', 'user.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const args = [...css.matchAll(/:has\(/g)].map(m => { let depth = 0, i = m.index + 4; do { depth += css[i] === '(' ? 1 : css[i] === ')' ? -1 : 0; i++; } while (depth && i < css.length); return css.slice(m.index, i); });
    assert.ok(args.length > 0);
    assert.deepEqual(args.filter(a => /\[style\b/.test(a)), []);
  });

  await check('watch feed sits between the sidebar and the player', async () => {
    // Spotify's Explore overlay: a dimmed layer over .Root that centres the feed, sized from the window (styles inlined).
    const box = await page.evaluate(() => {
      document.querySelector('.Root').insertAdjacentHTML('beforeend', `<div id="mock-feed" style="position:absolute;left:0;top:0;width:100%;height:100%;box-sizing:border-box;display:flex;justify-content:center;align-items:center;background:#000000e6;z-index:6">
        <div data-testid="watch-feed-view" style="--aspect-ratio:16 / 10;position:relative;width:min(85%,min(1680px,85vh * (var(--aspect-ratio))));max-width:1680px;aspect-ratio:var(--aspect-ratio)"></div></div>`);
      const r = el => document.querySelector(el).getBoundingClientRect();
      return { feed: r('[data-testid="watch-feed-view"]').toJSON(), layer: r('#mock-feed').toJSON(), side: r('#am-sidebar').right, player: r('#am-player').top };
    });
    assert.ok(box.feed.left >= box.side, 'the feed clears the sidebar');
    assert.ok(box.feed.bottom <= box.player, 'the feed clears the player');
    assert.ok(box.feed.width > 300, 'the feed keeps a usable size');
    assert.equal(box.layer.left, 0, 'the dimmed layer still covers the window');
    await shot('watch-feed');
    await page.evaluate(() => document.getElementById('mock-feed').remove());
  });

  await check('toolbar glass at 125%: shared, its shapes and hairlines on device pixels', async () => {
    // The shared glass draws each shape's maps on the device pixels of its own box, so on a fractional scale the shapes
    // (and the hairlines, the glass grown by 2 device px) are placed on them.
    const scaled = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.25 }), scaledErrors = [];
    scaled.on('pageerror', e => scaledErrors.push(e.message));
    try {
      await scaled.goto(pathToFileURL(path.join(here, 'preview.html')).href);
      await scaled.waitForSelector('body.am-ready #am-toolbar-glass > .am-tglass-pane > .am-tglass-layer');
      await scaled.waitForFunction(() => document.querySelector('#am-toolbar-glass > .am-tglass-pane').style.width);
      const info = await scaled.evaluate(() => { const off = v => Math.abs(v * 1.25 - Math.round(v * 1.25)), boxes = [...document.querySelectorAll('#am-toolbar-glass .am-tglass, #am-toolbar-glass .am-tglass-rim, #am-toolbar-glass > .am-tglass-pane')].map(e => e.getBoundingClientRect());
        return { panes: document.querySelectorAll('#am-toolbar-glass > .am-tglass-pane').length, grow: document.querySelector('#am-toolbar-glass .am-tglass-rim').dataset.grow, aligned: boxes.every(r => [r.left, r.top, r.width, r.height].every(v => off(v) < .05)) }; });
      assert.deepEqual(info, { panes: 1, grow: '1.6', aligned: true });
      assert.deepEqual(scaledErrors, []);
    } finally { await scaled.close(); }
  });

  await check('Spicy Lyrics view controls clear the toolbar and the player', async () => {
    // Spicy's page in Spotify's scroll viewport, with the rules from its default.css that place the controls.
    await page.evaluate(() => {
      document.querySelector('.main-view-container__scroll-node > [data-overlayscrollbars-viewport]').insertAdjacentHTML('beforeend', `<style id="mock-spicy-css">#SpicyLyricsPage{position:absolute;inset:0}
        #SpicyLyricsPage:not(.Fullscreen) .ViewControls{position:absolute;width:100%;height:44px;display:flex;justify-content:center;z-index:101}
        #SpicyLyricsPage.ViewControlsPosition_Top:not(.Fullscreen) .ViewControls{top:24px}#SpicyLyricsPage.ViewControlsPosition_Bottom:not(.Fullscreen) .ViewControls{bottom:24px}
        .NowBar{position:absolute;left:0;top:0;bottom:0;width:294px}.NowBar .CenteredView{height:100%}.NowBar .Header{display:flex;flex-direction:column;justify-content:flex-end;box-sizing:border-box;height:100%;padding-bottom:15px}.NowBar .Metadata{height:29px}</style>
        <div id="SpicyLyricsPage" class="ViewControlsPosition_Top"><div class="ContentBox"><div class="NowBar LeftSide Active"><div class="CenteredView"><div class="Header"><div class="Metadata">Şarkı</div></div></div></div><div class="ViewControls"><button class="ViewControl">×</button></div></div></div>`);
      Spicetify.Platform.History.push('/SpicyLyrics');
    });
    await page.waitForFunction(() => document.body.classList.contains('am-spicy-route'));
    const rect = sel => page.$eval(sel, e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
    const toolbar = await page.$eval('#global-nav-bar .am-toolbar-leading', e => e.getBoundingClientRect().bottom);
    assert.ok((await rect('#SpicyLyricsPage .ViewControls')).top >= toolbar, 'top controls sit below the toolbar');
    await page.evaluate(() => { document.getElementById('SpicyLyricsPage').className = 'ViewControlsPosition_Bottom'; });
    assert.ok((await rect('#SpicyLyricsPage .ViewControls')).bottom <= (await rect('#am-player')).top, 'bottom controls sit above the player');
    // The NowBar stacks the cover and title at the page's bottom edge; the title stays above the player.
    assert.ok((await rect('#SpicyLyricsPage .NowBar .Metadata')).bottom <= (await rect('#am-player')).top, 'the NowBar title sits above the player');
    await page.evaluate(() => { document.getElementById('SpicyLyricsPage').remove(); document.getElementById('mock-spicy-css').remove(); Spicetify.Platform.History.push('/'); });
  });

  await check('English when Spotify is not in Turkish; the menu switches the language and reloads', async () => {
    const english = await browser.newPage({ viewport: { width: 1440, height: 900 } }), englishErrors = [];
    english.on('pageerror', e => englishErrors.push(e.message));
    try {
      await english.goto(pathToFileURL(path.join(here, 'preview.html')).href + '?locale=en');
      await english.waitForSelector('body.am-ready #am-sidebar');
      assert.deepEqual((await english.locator('#am-sidebar .am-nav-row').allTextContents()).slice(0, 2), ['Search', 'Home']);
      assert.equal(await english.getAttribute('#am-player .am-play', 'aria-label'), 'Pause');
      assert.equal(await english.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--am-t-play')), '"Play"');
      const names = await english.evaluate(() => window.__menus[0].items.map(i => i.name));
      assert.deepEqual([names[0], ...names.slice(-3)], ['Artwork in player', 'Language: Automatic', 'Language: English', 'Language: Türkçe']);
      await Promise.all([english.waitForEvent('load'), english.evaluate(() => window.__menus[0].items.find(i => i.name === 'Language: Türkçe').onClick())]);
      await english.waitForSelector('body.am-ready #am-sidebar');
      assert.equal(await english.textContent('#am-sidebar .am-nav-row >> nth=1'), 'Ana Sayfa');
      assert.equal(JSON.parse(await english.evaluate(() => localStorage.getItem('mcloud:settings'))).lang, 'tr');
      assert.deepEqual(englishErrors, []);
    } finally { await english.close(); }
  });

  await check('no runtime errors', async () => assert.deepEqual(errors, []));
} finally {
  await browser.close();
}
