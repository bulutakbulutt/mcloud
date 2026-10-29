// Smoke test: runs theme.js + user.css against dev/preview.html in Chromium.
// It catches runtime errors and broken wiring, not Spotify DOM drift.
//
//   npm i --no-save playwright && npx playwright install chromium
//   node dev/smoke.mjs [screenshot-dir]
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
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
    assert.equal(await page.locator('#am-sidebar .am-nav-row').count(), 8);
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

  await check('star toggles Liked Songs', async () => {
    await page.click('.am-star');
    await page.waitForFunction(() => window.__mockState.liked && document.querySelector('.am-star').classList.contains('am-active'));
  });

  await check('track menu and profile corner', async () => {
    await page.click('.am-more');
    assert.deepEqual(await page.locator('#am-popover .am-popover-item').allTextContents(), ['Albüme Git', 'Sanatçıya Git', 'Şarkı Bağlantısını Kopyala']);
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
    // The edge glow reaches past the sidebar (so the artwork beside it bleeds in) and sits just under it.
    const glow = await page.evaluate(() => { const g = document.getElementById('am-sidebar-glow'), s = getComputedStyle(g); return [g.offsetWidth - document.getElementById('am-sidebar').offsetWidth, /blur/.test(s.backdropFilter), Number(s.zIndex) < Number(getComputedStyle(document.getElementById('am-sidebar')).zIndex)]; });
    assert.deepEqual(glow, [140, true, true]);
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

  await check('liquid glass map follows the player size', async () => {
    const map = () => page.evaluate(() => {
      const image = document.querySelector('#am-glass feImage'), shift = document.querySelector('#am-glass feDisplacementMap');
      return { size: image.getAttribute('width') + 'x' + image.getAttribute('height'), href: image.getAttribute('href'), scale: Number(shift.getAttribute('scale')) };
    });
    await page.waitForFunction(() => document.querySelector('#am-glass feImage').getAttribute('width') === '700');
    const first = await map();
    assert.equal(first.size, '700x54');
    assert.ok(first.href.startsWith('data:image/png') && first.scale === 32.2);
    assert.match(await page.evaluate(() => getComputedStyle(document.getElementById('am-player')).backdropFilter), /url\(.*#am-glass/);
    // x shift in R (with G equal to it) and y shift in B: P3 colour conversion mixes green into red, never blue.
    // Fitted to macOS's own (focused) glass: a slight blur, a darken halo, and a tone by luminance.
    assert.deepEqual(await page.evaluate(() => { const d = document.querySelector('#am-glass feDisplacementMap'); return [d.getAttribute('xChannelSelector'), d.getAttribute('yChannelSelector'), document.querySelectorAll('#am-glass feImage').length, [...document.querySelectorAll('#am-glass feGaussianBlur')].map(b => b.getAttribute('stdDeviation'))]; }), ['R', 'B', 3, ['0.4', '13.5']]);
    // A content-box change fires the ResizeObserver but must not redraw the map.
    await page.evaluate(() => { document.querySelector('#am-glass feImage').setAttribute('href', 'data:image/png;base64,kept'); document.getElementById('am-player').style.paddingLeft = '17px'; });
    await page.waitForTimeout(100);
    assert.equal((await map()).href, 'data:image/png;base64,kept');
    await page.setViewportSize({ width: 900, height: 900 });
    await page.waitForFunction(() => document.querySelector('#am-glass feImage').getAttribute('width') === String(document.getElementById('am-player').offsetWidth));
    assert.notEqual((await map()).href, 'data:image/png;base64,kept');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => { document.getElementById('am-player').style.paddingLeft = ''; });
    await page.waitForFunction(() => document.querySelector('#am-glass feImage').getAttribute('width') === '700');
  });

  await check('artist page', async () => {
    await page.evaluate(() => Spicetify.Platform.History.push('/artist/mock'));
    await page.waitForSelector('body.am-artist-open .am-artist-name');
    assert.equal(await page.textContent('.am-artist-name'), 'Sena Şener');
    await page.waitForFunction(() => document.body.classList.contains('am-tinted'));
    // Over the artist's colour the sidebar is Apple's dark material and the edge glow is off.
    assert.deepEqual(await page.evaluate(() => [getComputedStyle(document.getElementById('am-sidebar-glow')).display, getComputedStyle(document.getElementById('am-sidebar')).backgroundImage]), ['none', 'none']);
    assert.equal(await page.locator('.am-song').count(), 9);
    assert.ok(await page.locator('.am-shelf-artists .am-card').count() === 5);
    await page.click('.am-hero-follow');
    await page.waitForFunction(() => (window.__libraryAdds || []).includes('spotify:artist:mock'));
    // Share copies the link and says so above the player (Spotify's own toasts stay under the artist view).
    await page.click('#am-artist .am-artist-actions button[aria-label="Paylaş"]');
    await page.waitForFunction(() => document.querySelector('.am-toast').classList.contains('am-toast-show'));
    assert.match(await page.textContent('.am-toast'), /^Bağlantı kopyala/);
    // It is Liquid Glass with a lens of its own, drawn at the toast's size.
    assert.match(await page.evaluate(() => getComputedStyle(document.querySelector('.am-toast')).backdropFilter), /url\(.*#am-glass-toast/);
    await page.waitForFunction(() => document.querySelector('#am-glass-toast feImage').getAttribute('width') === String(document.querySelector('.am-toast').offsetWidth));
    await page.click('.am-artist-back');
    await page.waitForFunction(() => !document.body.classList.contains('am-artist-open') && !document.body.classList.contains('am-tinted'));
  });
  await shot('artist');

  await check('locale-prefixed artist links and portrait-only artists', async () => {
    await page.evaluate(() => { window.__savedHeader = window.__mockArtist.visuals.headerImage; window.__mockArtist.visuals.headerImage = null; Spicetify.Platform.History.push('/intl-tr/artist/plain'); });
    await page.waitForSelector('body.am-artist-open .am-hero-avatar .am-hero-portrait');
    assert.equal(await page.locator('.am-hero-image').count(), 0);
    await page.evaluate(() => { window.__mockArtist.visuals.headerImage = window.__savedHeader; Spicetify.Platform.History.push('/'); });
    await page.waitForFunction(() => !document.body.classList.contains('am-artist-open'));
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
    await page.fill('.am-library-filter', 'rain');
    await page.waitForFunction(() => document.querySelectorAll('.am-library-card').length === 1);
    await page.fill('.am-library-filter', '');
    await page.selectOption('.am-library-sort', 'name');
    await page.waitForFunction(() => document.querySelector('.am-library-name')?.textContent === 'After Hours');
  });
  await shot('library');

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

  await check('album page: artwork, title column and play controls laid out like Apple Music', async () => {
    await page.evaluate(() => Spicetify.Platform.History.push('/album/0'));
    // The shape of Spotify's album page: header, then the action bar inside an OverlayScrollbars host. Spotify's
    // .contentSpacing padding and button resets are inlined.
    await page.evaluate(() => {
      document.querySelector('.mock-page').hidden = true;
      document.querySelector('main').insertAdjacentHTML('beforeend', `<header class="main-topBar-container" style="position:sticky;top:0;height:64px;z-index:2"><div class="main-topBar-topbarContentWrapper"><div class="main-topBar-topbarContent">Blonde</div></div></header>
        <section data-testid="album-page" id="mock-album"><div data-testid="entity-header" style="height:340px"><div style="--background-base:#335"></div>
          <div class="main-entityHeader-contentWrapper contentSpacing" style="display:flex;height:300px;padding-inline:var(--content-spacing)"><div></div>
            <button class="main-entityHeader-imageContainer" style="width:232px;height:232px"><img src="${Spicetify.Player.data.item.images[0].url}"></button>
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

  await check('no runtime errors', async () => assert.deepEqual(errors, []));
} finally {
  await browser.close();
}
