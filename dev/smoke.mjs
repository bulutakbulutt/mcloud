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
    await page.waitForFunction(() => document.body.classList.contains('am-panel-open') && document.querySelector('.am-native-right').classList.contains('am-native-panel-open'));
    const box = await page.locator('.am-native-right').boundingBox();
    assert.ok(box.width > 200 && box.height > 200);
    assert.equal(await page.getAttribute(friends, 'aria-pressed'), 'true');
    await page.click(friends);
    await page.waitForFunction(() => !document.body.classList.contains('am-panel-open'));
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
    await page.waitForFunction(() => window.__mockState.volume === 0.55);
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
    assert.ok(first.href.startsWith('data:image/png') && first.scale > 10 && first.scale < 30);
    assert.match(await page.evaluate(() => getComputedStyle(document.getElementById('am-player')).backdropFilter), /url\(.*#am-glass/);
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

  await check('no runtime errors', async () => assert.deepEqual(errors, []));
} finally {
  await browser.close();
}
