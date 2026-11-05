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
// The settings window (#am-settings), as the profile menu's mcloud entry opens it: pick finds a setting's row on whichever
// tab holds it and picks an option by its label (a toggle flips), then closes the window; state reads what the row shows.
const settingsOf = p => {
  const find = key => {
    if (!document.getElementById('am-settings')) window.__menuItems.find(i => ['mcloud Ayarları', 'mcloud Settings'].includes(i.name)).onClick();
    const row = () => document.querySelector(`#am-settings .am-settings-row[data-key="${key}"]`);
    for (let i = 0; !row() && i < document.querySelectorAll('#am-settings .am-settings-tab').length; i++) document.querySelectorAll('#am-settings .am-settings-tab')[i].click();
    return row().querySelector('.am-settings-control');
  };
  return {
    pick: (key, option, keep) => p.evaluate(([find, key, option, keep]) => {
      const c = eval(find)(key);
      if (c.matches('[data-am-popup]')) { c.click(); [...document.querySelectorAll('#am-popover .am-popover-item')].find(b => b.textContent === option).click(); }
      else if (c.matches('[role="switch"]')) c.click();
      else [...c.children].find(b => (b.textContent || b.getAttribute('aria-label')) === option).click();
      if (!keep) document.querySelector('#am-settings .am-settings-close')?.click();
    }, [find.toString(), key, option, keep]),
    state: key => p.evaluate(([find, key]) => {
      const c = eval(find)(key), on = c.querySelector('[aria-checked="true"]');
      return c.matches('[data-am-popup]') ? c.textContent : c.matches('[role="switch"]') ? c.getAttribute('aria-checked') === 'true' : on && (on.textContent || on.getAttribute('aria-label'));
    }, [find.toString(), key]),
    close: () => p.evaluate(() => document.querySelector('#am-settings .am-settings-close')?.click()),
  };
};
const settingsWindow = settingsOf(page);

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

  await check('player right-click and song links follow playerMenu and lcdLinks (issue #85)', async () => {
    const items = () => page.locator('#am-popover .am-popover-item').allTextContents();
    const right = async sel => { await page.click(sel, { button: 'right' }); return page.evaluate(() => !document.getElementById('am-popover').hidden); };
    const where = () => page.evaluate(() => Spicetify.Platform.History.location.pathname), before = await where();
    const links = '.am-track-subtitle .am-marquee-inner > span:first-child .am-lcd-link';
    // Spotify (the default): the menu opens over the song only; each name is a link, the title opens the album.
    assert.equal(await right('#am-player .am-transport .am-dim'), false, 'spotify: shuffle');
    assert.equal(await right('.am-track-art'), true, 'spotify: artwork');
    await page.keyboard.press('Escape');
    assert.equal(await right('.am-track-subtitle'), true, 'spotify: subtitle');
    await page.keyboard.press('Escape');
    assert.deepEqual(await page.locator(links).evaluateAll(n => n.map(l => l.textContent + ' ' + l.dataset.uri)), ['Frank Ocean spotify:artist:0', 'Blonde spotify:album:0']);
    await page.click(links + ' >> nth=0');
    assert.equal(await where(), '/artist/0');
    await page.click('.am-track-title');
    assert.equal(await where(), '/album/0');
    assert.equal(await page.evaluate(() => document.getElementById('am-popover').hidden), true, 'links open no menu');
    // Apple Music: the song's menu anywhere on the player; the title and the subtitle ask where to go.
    await settingsWindow.pick('playerMenu', 'Oynatıcının her yerinde (Apple Music)');
    await settingsWindow.pick('lcdLinks', 'Gidilecek yeri sorar (Apple Music)');
    assert.equal(await right('#am-player .am-transport .am-dim'), true, 'apple: shuffle');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.am-track-subtitle .am-lcd-link').count(), 0);
    for (const line of ['.am-track-title', '.am-track-subtitle']) {
      await page.click(line);
      assert.deepEqual(await items(), ['Albüme Git', 'Sanatçıya Git'], line);
      await page.keyboard.press('Escape');
    }
    await settingsWindow.pick('lcdLinks', 'Bağlantı olur (Spotify)');
    await settingsWindow.pick('playerMenu', 'Yalnızca şarkının üstünde (Spotify)');
    await page.evaluate(path => Spicetify.Platform.History.push(path), before);
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
    // Spotify's panel holder is solid; left alone it hides the sheet's glass.
    // No dark band under the header on glass: the rows fade out under it instead.
    assert.deepEqual(await page.evaluate(() => [getComputedStyle(document.querySelector('[data-testid="mock-panel-header"]')).boxShadow, getComputedStyle(document.querySelector('[data-testid="mock-panel-list"] [data-overlayscrollbars-viewport]')).maskImage.startsWith('linear-gradient')]), ['none', true]);
    // The scrollbar starts below the fade, and the feed's empty first item takes no room.
    assert.deepEqual(await page.evaluate(() => { const list = document.querySelector('[data-testid="mock-panel-list"]'); return [Math.round(list.querySelector('.os-scrollbar').getBoundingClientRect().top - list.getBoundingClientRect().top), getComputedStyle(list.querySelector('li')).display]; }), [16, 'none']);
    // The list starts under the header, so its top padding is the fade and not a gap below the tabs.
    assert.equal(await page.evaluate(() => Math.round(document.querySelector('[data-testid="mock-panel-list"]').getBoundingClientRect().top - document.querySelector('[data-testid="mock-panel-header"]').getBoundingClientRect().bottom)), -16);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.am-native-panel-open [data-am-fill]')].map(e => getComputedStyle(e).backgroundColor).filter(c => c !== 'rgba(0, 0, 0, 0)')), [], 'panel holder paints over the glass');
    // Apple's panel: 64% #2f2f2f over the page, on a layer behind the feed (on the sheet, every hovered row re-ran the
    // blur), flat artwork, a hairline between rows (not above the first) in either list shape, no grey on hover.
    assert.deepEqual(await page.evaluate(() => {
      const row = '<li role="row"><div data-encore-id="listRow" class="mock-hover-row"><div class="e-10860-legacy-list-row__header-side"><div style="box-shadow:0 4px 60px #0008"><img alt=""></div></div></div></li>';
      const ul = document.querySelector('[data-testid="mock-panel-list"] ul');
      ul.insertAdjacentHTML('beforeend', row + row);
      ul.insertAdjacentHTML('afterend', `<ul role="treegrid" id="mock-queue"><div><div>${row}</div></div><div><div>${row}</div></div></ul><style id="mock-hover">.mock-hover-row::after{content:"";background:#f2f2f2}</style>`);
      const rows = ul.querySelectorAll('li[role="row"]'), queue = document.querySelectorAll('#mock-queue li[role="row"]'), line = getComputedStyle(rows[1], '::before');
      const sheet = document.querySelector('.am-native-panel-open'), glass = getComputedStyle(sheet, '::before');
      const out = [getComputedStyle(sheet).backgroundColor, getComputedStyle(sheet).backdropFilter, glass.backgroundColor, glass.backdropFilter, getComputedStyle(rows[0].querySelector('img').parentElement).boxShadow, getComputedStyle(rows[0], '::before').content, line.height, line.backgroundColor, getComputedStyle(queue[0], '::before').content, getComputedStyle(queue[1], '::before').height];
      rows.forEach(r => r.remove()); return out;
    }), ['rgba(0, 0, 0, 0)', 'none', 'color(srgb 0.184314 0.184314 0.184314 / 0.64)', 'blur(20px) saturate(1.6)', 'none', 'none', '1px', 'rgba(255, 255, 255, 0.1)', 'none', '1px']);
    await page.hover('#mock-queue li');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#mock-queue .mock-hover-row'), '::after').backgroundColor), 'rgba(0, 0, 0, 0)', 'grey under the pointer');
    await page.evaluate(() => document.querySelectorAll('#mock-queue,#mock-hover').forEach(e => e.remove()));
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

  await check('the right sidebar keeps its binding when Spotify replaces it', async () => {
    // Spotify can mount the right sidebar again; unbound, its Now Playing view showed beside the page.
    await page.evaluate(() => { const old = document.querySelector('.right'), fresh = document.createElement('div'); fresh.className = 'right'; fresh.innerHTML = `<div>${npv}</div>`; old.replaceWith(fresh); });
    await page.waitForFunction(() => document.querySelector('.right').classList.contains('am-native-right'));
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.right')).display), 'none', 'Now Playing view shows');
    // swapPanel rebuilds the class as React does; the sheet keeps its classes open and closed.
    await page.click('#am-player button[aria-label="Çalma sırası"]');
    await page.waitForFunction(() => document.querySelector('.am-native-right').classList.contains('am-native-panel-open'));
    await page.click('.am-native-right aside button[aria-label="Kapat"]');
    await page.waitForFunction(() => !document.body.classList.contains('am-panel-open'));
    assert.equal(await page.evaluate(() => [document.querySelector('.right').classList.contains('am-native-right'), getComputedStyle(document.querySelector('.right')).display].join()), 'true,none', 'Now Playing view shows after closing');
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
      return [getComputedStyle(p).backdropFilter, i.length, i.every(e => e.getAttribute('href')?.startsWith('data:image/png')), Math.round(+br.getAttribute('x') + +br.getAttribute('width')), Math.round(+br.getAttribute('y') + +br.getAttribute('height')), p.offsetWidth, p.offsetHeight, p.dataset.amGlass]; });
    // Its slot is whichever free one already holds pieces of its corner size (they differ between menu heights).
    const [filter, pieces, mapped, right, bottom, width, height, slot] = await menuGlass();
    assert.deepEqual([filter, pieces, mapped, right, bottom], [`url("#am-menu-glass-${slot}")`, 8, true, width, height]);
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
    // Settings → Recent playlists picks how many show under the pinned ones; with none, Show All still lists them.
    const recent = n => settingsWindow.pick('recent', String(n));
    await recent(3);
    assert.equal(await page.locator(rows).count(), 5);
    await recent('Yok');
    assert.deepEqual(await names(), ['Ruh Hali', 'Sabah Kahvesi']);
    assert.ok(await page.locator('#am-sidebar .am-list-more').isVisible());
    assert.equal(await settingsWindow.state('recent'), 'Yok');
    await settingsWindow.close();
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
    await page.click('#am-player', { position: { x: 12, y: 12 } }); // the bar's edge: the centre is a song link
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
    // The settings window's switch follows, and turns them back on.
    assert.equal(await settingsWindow.state('numbers'), false);
    await settingsWindow.pick('numbers', null, true);
    assert.equal(await settingsWindow.state('numbers'), true);
    await settingsWindow.close();
    assert.equal((await layout()).index, '16px');
    await page.evaluate(() => document.querySelectorAll('.mock-numbers, .mock-menu').forEach(e => e.remove()));
  });

  // A setting changed the way a user does: the mcloud submenu where it is one, else the settings window (#76).
  const flip = async (key, names, option) => {
    const viaMenu = await page.evaluate(names => { const item = window.__menus.flatMap(m => m.items).find(i => names.includes(i.name)); item?.onClick(); return !!item; }, [names].flat());
    if (!viaMenu) await settingsWindow.pick(key, option);
  };
  const saved = key => page.evaluate(key => JSON.parse(localStorage.getItem('mcloud:settings'))[key], key);
  const playlistNumbers = ['Parça numaraları', 'Çalma listelerinde parça numaraları'], albumNumbers = 'Albümlerde parça numaraları';

  await check('track numbers: albums and playlists switch apart (#72)', async () => {
    const hidden = () => page.evaluate(() => document.body.classList.contains('am-no-numbers'));
    // Playlists off, albums on: the class follows the page.
    await flip('numbers', playlistNumbers);
    await page.evaluate(() => Spicetify.Platform.History.push('/playlist/mock'));
    assert.equal(await hidden(), true);
    await page.evaluate(() => Spicetify.Platform.History.push('/album/0'));
    assert.equal(await hidden(), false);
    await flip('numbersAlbum', albumNumbers);
    assert.equal(await hidden(), true);
    assert.equal(await saved('numbersAlbum'), false);
    await flip('numbersAlbum', albumNumbers);
    await flip('numbers', playlistNumbers);
    await page.evaluate(() => Spicetify.Platform.History.push('/'));
    assert.equal(await hidden(), false);
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

  // The card tools' look, compared between the artist page and the library (#86): one set of rules for both.
  const toolLook = button => { const c = getComputedStyle(button); return ['width', 'height', 'borderTopWidth', 'paddingTop', 'borderRadius', 'backgroundColor', 'backdropFilter', 'color', 'bottom'].map(k => c[k]).join(' | '); };
  // While the buttons fade in, nothing above them may sit below opacity 1: that ancestor would become their backdrop root
  // and their blur would show only once the fade ends (the flicker).
  const toolRoots = button => { const out = []; for (let e = button.parentElement; e && e !== document.body; e = e.parentElement) if (getComputedStyle(e).opacity !== '1') out.push(e.className || e.id); return out; };
  let artistToolLook = null;
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
    // Hovering a release shows Apple's play and "…" over its artwork (#86); play plays it, the card still opens it.
    const card = page.locator('#am-artist .am-card:has(.am-card-tools) >> nth=0');
    assert.equal(await card.locator('.am-tool-play').evaluate(e => getComputedStyle(e).opacity), '0');
    await card.hover();
    assert.deepEqual(await card.locator('.am-tool-play').evaluate(toolRoots), []);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#am-artist .am-card:hover .am-tool-play')).opacity === '1');
    artistToolLook = await card.locator('.am-tool-play').evaluate(toolLook);
    await card.locator('.am-tool-play').click();
    assert.equal(await page.evaluate(() => window.__playedUri), await card.getAttribute('data-uri'));
    assert.ok(await page.evaluate(() => document.body.classList.contains('am-artist-open')));
    await card.locator('.am-tool-more').click();
    assert.equal(await page.locator('#am-popover .am-popover-item >> nth=0').textContent(), 'Çal');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.am-shelf-artists .am-card-tools').count(), 0);
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
    const top = await page.evaluate(() => [document.querySelector('.am-native-main').getBoundingClientRect().y, ...[...document.querySelectorAll('[data-overlayscrollbars-viewport]')].filter(v => !v.closest('.right')).map(v => parseFloat(getComputedStyle(v).paddingTop))]);
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
    const results = await page.evaluate(() => { const r = document.getElementById('search-dropdown').getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('#search-dropdown')?.id; });
    assert.equal(results, 'search-dropdown');
    await page.fill('#global-nav-bar input', '');
    await page.mouse.click(700, 500);
    assert.equal(await page.evaluate(() => [!!document.getElementById('search-dropdown'), getComputedStyle(document.getElementById('main')).zIndex].join()), 'false,0');
    await page.click('.am-library-sort');
    await page.click('#am-popover [role="menuitemradio"]:has-text("Ada göre (A–Z)")');
    assert.equal(await page.textContent('.am-library-sort'), 'Ada göre (A–Z)');
    await page.waitForFunction(() => document.querySelector('.am-library-name')?.textContent === 'After Hours');
    // Album cards are two targets (#111): the cover and title open the album, the artist line opens the artist.
    const albumCard = '.am-library-card[data-uri="spotify:album:0"]';
    await page.click(albumCard + ' .am-library-card-open');
    await page.waitForFunction(() => Spicetify.Platform.History.location.pathname === '/album/0');
    await page.evaluate(() => Spicetify.Platform.History.push({ pathname: '/', search: '?am-library=albums' }));
    await page.waitForSelector(albumCard);
    await page.click(albumCard + ' .am-library-sub');
    await page.waitForFunction(() => Spicetify.Platform.History.location.pathname === '/artist/a0');
    // Any other subtitle is part of the card's own target.
    await page.evaluate(() => Spicetify.Platform.History.push({ pathname: '/', search: '?am-library=playlists' }));
    await page.waitForSelector('#am-library span.am-library-sub');
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('#am-library span.am-library-sub')].every(s => s.closest('.am-library-card-open'))), true);
    await page.evaluate(() => Spicetify.Platform.History.push({ pathname: '/', search: '?am-library=albums' }));
    await page.waitForSelector(albumCard);
    // A drag takes the cover as its ghost and fades the card's hover tools meanwhile.
    assert.deepEqual(await page.evaluate(sel => {
      const card = document.querySelector(sel), art = card.querySelector('.am-library-art'), dt = new DataTransfer();
      let ghost = null; dt.setDragImage = (el, x, y) => { ghost = [el.className, x > 0 && y > 0]; };
      art.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
      const out = [ghost, document.getElementById('am-library').classList.contains('am-dragging'), getComputedStyle(card.parentElement.querySelector('.am-card-tools button')).opacity];
      card.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
      out.push(document.getElementById('am-library').classList.contains('am-dragging'));
      return out;
    }, albumCard), [['am-library-art', true], true, '0', false]);
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

  await check('sidebar lists yours or Spotify\'s playlists, picked on the heading (#108)', async () => {
    const heading = '#am-sidebar .am-nav-heading:has(.am-nav-add)', rowCount = await page.locator('#am-sidebar .am-list-row').count();
    await page.click(heading, { button: 'right', position: { x: 10, y: 5 } });
    assert.deepEqual(await page.locator('#am-popover .am-popover-item').allTextContents(), ['Yeni Çalma Listesi', 'Yeni Klasör', 'Tümü', 'Senin Listelerin', 'Spotify’ın Listeleri']);
    assert.equal(await page.textContent('#am-popover [aria-checked="true"]'), 'Tümü');
    await page.click('#am-popover .am-popover-item:has-text("Spotify’ın Listeleri")');
    // Spotify's own By Spotify filter, so the recent ones are the most recent of that kind; the heading names it. The
    // pinned folder stays: Hüzünlü in it is Spotify's.
    await page.waitForFunction(() => [...document.querySelectorAll('#am-sidebar .am-list-row .am-list-name')].map(n => n.textContent).join() === 'Ruh Hali,Haftalık Keşif');
    assert.equal(await page.evaluate(h => document.querySelector(h).firstChild.nodeValue, heading), 'Listeler · Spotify');
    assert.ok(await page.evaluate(() => window.__libraryFilters.includes('2,103')));
    assert.equal(await settingsWindow.state('sideLists'), 'Spotify’ın Listeleri');
    await shot('sidebar-lists-spotify');
    await settingsWindow.pick('sideLists', 'Tümü');
    await page.waitForFunction(n => document.querySelectorAll('#am-sidebar .am-list-row').length === n, rowCount);
    assert.equal(await page.evaluate(h => document.querySelector(h).firstChild.nodeValue, heading), 'Listeler');
  });

  await check('All Playlists filters by who made a playlist, in Music\'s menu or as pills (#108)', async () => {
    await page.evaluate(() => Spicetify.Platform.History.push({ pathname: '/', search: '?am-library=playlists' }));
    await page.waitForSelector('.am-library-menu');
    const all = await page.locator('.am-library-card').count();
    const names = () => page.locator('.am-library-card .am-library-name').allTextContents();
    const showing = list => page.waitForFunction(list => JSON.stringify([...document.querySelectorAll('.am-library-card .am-library-name')].map(n => n.textContent).sort()) === JSON.stringify(list.slice().sort()), list);
    const menu = () => page.locator('#am-popover .am-popover-item').allTextContents();
    // Music's All Playlists menu: the filter, then Sort Options; nobody here made a Mixed playlist inside a folder.
    await page.click('.am-library-menu');
    assert.deepEqual(await menu(), ['Tüm Listeler', 'Senin Listelerin', 'Spotify’ın Listeleri', 'Mix’li Listeler', 'Başkalarının Listeleri', 'Sıralama']);
    assert.equal(await page.getAttribute('#am-popover [aria-checked="true"]', 'role'), 'menuitemradio');
    // A filter lists the playlists inside folders (Hüzünlü is Spotify's, in Ruh Hali) and hides the folders.
    await page.click('#am-popover .am-popover-item:has-text("Spotify’ın Listeleri")');
    await showing(['Haftalık Keşif', 'Hüzünlü']);
    assert.match(await page.textContent('.am-library-status'), /^2 \/ \d+ öğe$/);
    assert.ok(await page.$eval('.am-library-menu', b => b.classList.contains('am-filtered')));
    await page.click('.am-library-menu');
    await page.click('#am-popover .am-popover-item:has-text("Mix’li Listeler")');
    await showing(['Yol Şarkıları']);
    await page.click('.am-library-menu');
    await page.click('#am-popover .am-popover-item:has-text("Başkalarının Listeleri")');
    await showing(['90\'lar Türkçe Pop']);
    await page.click('.am-library-menu');
    await page.click('#am-popover .am-popover-item:has-text("Senin Listelerin")');
    await page.waitForFunction(() => document.querySelector('.am-library-name') && ![...document.querySelectorAll('.am-library-name')].some(n => n.textContent === 'Haftalık Keşif'));
    const own = await names();
    assert.ok(own.includes('Neşeli') && own.includes('Beğenilen Şarkılar') && own.includes('Sabah Kahvesi') && !own.includes('Ruh Hali') && !own.includes('90\'lar Türkçe Pop'), own.join());
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('mcloud:settings'))).listFilter, 'own');
    // Sort Options is a submenu with Music's four orders and the direction, each ticked when current.
    await page.click('.am-library-menu');
    await page.hover('#am-popover .am-popover-item:has-text("Sıralama")');
    await page.waitForSelector('#am-popover-sub:not([hidden])');
    assert.deepEqual(await page.locator('#am-popover-sub .am-popover-item').allTextContents(), ['Başlık', 'Son Eklenenler', 'Son Çalınanlar', 'Çalma Listesi Türü', 'Artan', 'Azalan']);
    assert.deepEqual(await page.locator('#am-popover-sub [aria-checked="true"]').allTextContents(), ['Son Çalınanlar', 'Artan']);
    await page.click('#am-popover-sub .am-popover-item:has-text("Başlık")');
    await page.waitForFunction(() => document.querySelector('.am-library-name')?.textContent === 'Akustik Akşamlar');
    await page.click('.am-library-menu');
    await page.hover('#am-popover .am-popover-item:has-text("Sıralama")');
    await page.click('#am-popover-sub .am-popover-item:has-text("Azalan")');
    await page.waitForFunction(() => document.querySelector('.am-library-name')?.textContent === 'Yol Şarkıları');
    await shot('playlists-filter-menu');
    // Spotify's pills instead: the filter under the search field, the sort alone in the menu.
    await settingsWindow.pick('listFilters', 'Düğme olarak (Spotify)');
    await page.waitForSelector('.am-library-pills');
    assert.deepEqual(await page.locator('.am-library-pill').allTextContents(), ['Tümü', 'Senin Listelerin', 'Spotify’ın Listeleri', 'Mix’li Listeler', 'Başkalarının Listeleri']);
    assert.equal(await page.textContent('.am-library-pill[aria-pressed="true"]'), 'Senin Listelerin');
    await page.click('.am-library-pill:has-text("Başkalarının Listeleri")');
    await showing(['90\'lar Türkçe Pop']);
    await page.click('.am-library-menu');
    assert.deepEqual(await menu(), ['Başlık', 'Son Eklenenler', 'Son Çalınanlar', 'Çalma Listesi Türü', 'Artan', 'Azalan']);
    await page.keyboard.press('Escape');
    await shot('playlists-filter-pills');
    await page.click('.am-library-pill:has-text("Tümü")');
    await page.waitForFunction(n => document.querySelectorAll('.am-library-card').length === n, all);
    assert.ok((await names()).includes('Ruh Hali'), 'all playlists keep the folders');
    await settingsWindow.pick('listFilters', 'Menüde (Apple Music)');
    for (const option of ['Son Çalınanlar', 'Artan']) {
      await page.click('.am-library-menu');
      await page.hover('#am-popover .am-popover-item:has-text("Sıralama")');
      await page.click(`#am-popover-sub .am-popover-item:has-text("${option}")`);
    }
    assert.deepEqual(await page.evaluate(() => ['listFilter', 'listSort', 'listDesc'].map(k => JSON.parse(localStorage.getItem('mcloud:settings') || '{}')[k])), ['all', 'played', false]);
  });

  await check('library cards get the artist page\'s hover tools (#86)', async () => {
    const open = async kind => { await page.evaluate(k => Spicetify.Platform.History.push({ pathname: '/', search: '?am-library=' + k }), kind); await page.waitForSelector('.am-library-item'); };
    await open('playlists');
    const item = uri => page.locator(`.am-library-item:has(.am-library-card[data-uri="${uri}"])`);
    // A playlist: tools hidden until hover, the art dims, play (bottom left) and "…" (bottom right) sit on the art.
    const list = item('spotify:playlist:1');
    assert.equal(await list.locator('.am-tool-play').evaluate(e => getComputedStyle(e).opacity), '0');
    await list.hover();
    assert.deepEqual(await list.locator('.am-tool-play').evaluate(toolRoots), []);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.am-library-item:hover .am-tool-play')).opacity === '1');
    // The same buttons as the artist page's: size, no UA border or padding, glass, colour, place.
    assert.equal(await list.locator('.am-tool-play').evaluate(toolLook), artistToolLook);
    assert.equal(await list.locator('.am-tool-more').evaluate(toolLook), artistToolLook);
    const look = await list.evaluate(e => {
      const art = e.querySelector('.am-library-art').getBoundingClientRect(), p = e.querySelector('.am-tool-play').getBoundingClientRect(), m = e.querySelector('.am-tool-more').getBoundingClientRect();
      return { filter: getComputedStyle(e.querySelector('.am-library-art')).filter, left: p.left - art.left, right: art.right - m.right, bottom: art.bottom - p.bottom, nested: !!e.querySelector('.am-library-card .am-card-tools') };
    });
    assert.equal(look.filter, 'brightness(0.92)');
    assert.deepEqual([look.left, look.right, look.bottom, look.nested], [8, 8, 8, false]);
    // Play starts the playlist; "…" opens the menu a right click opens.
    await list.locator('.am-tool-play').click();
    assert.equal(await page.evaluate(() => window.__playedUri), 'spotify:playlist:1');
    assert.ok(await page.locator('#am-popover').isHidden());
    await list.locator('.am-tool-more').click();
    await page.waitForSelector('#am-popover .am-popover-item');
    const more = await page.locator('#am-popover .am-popover-item').allTextContents();
    assert.ok(more.slice(0, 4).join() === ['Çal', 'Sıraya Ekle', 'Aç', 'Bağlantıyı Kopyala'].join() && more.includes('Çalma listesi sil') === false);
    await page.keyboard.press('Escape');
    await item('spotify:playlist:2').click({ button: 'right', position: { x: 20, y: 20 } });
    await page.waitForSelector('#am-popover .am-popover-item');
    assert.deepEqual((await page.locator('#am-popover .am-popover-item').allTextContents()).slice(0, 4), more.slice(0, 4));
    await page.keyboard.press('Escape');
    // A folder has "…" only (Open Folder, New Playlist); Liked Songs plays like a playlist.
    const folder = item('spotify:folder:ruh');
    await folder.hover();
    assert.equal(await folder.locator('.am-tool-play').count(), 0);
    await folder.locator('.am-tool-more').click();
    await page.waitForSelector('#am-popover .am-popover-item');
    assert.equal((await page.locator('#am-popover .am-popover-item').allTextContents())[0], 'Klasörü Aç');
    await page.keyboard.press('Escape');
    assert.equal(await item('spotify:collection:tracks').locator('.am-tool-play').count(), 1);
    // Keyboard focus shows them too.
    await item('spotify:playlist:3').locator('.am-library-card-open').focus();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.am-library-item:focus-within .am-tool-play')).opacity === '1');
    // Round artist cards get none, as on the artist page.
    await open('artists');
    assert.equal(await page.locator('.am-library-item .am-card-tools').count(), 0);
    assert.equal(await page.locator('.am-library-item').count(), 6);
  });

  await check('search results as macOS 27 Music\'s suggestions', async () => {
    await page.fill('#global-nav-bar input', 'sena');
    const look = await page.evaluate(() => {
      const box = document.querySelector('#search-dropdown > :first-child'), input = document.querySelector('#global-nav-bar input');
      const rows = [...box.querySelectorAll('[role="row"]')], css = (e, p, pseudo) => getComputedStyle(e, pseudo)[p];
      const sub = rows[2].querySelector('[data-encore-id="listRowSubtitle"] > [class*="line-clamp"]');
      const typed = rows[0].querySelector('[class*="color-text-subdued"]');
      return {
        // 1pt under the field's 3pt ring, the glass's blur and Apple's colour steps (#am-search-glass).
        gap: Math.round(box.getBoundingClientRect().top - input.getBoundingClientRect().bottom), radius: css(box, 'borderRadius'),
        glass: css(box, 'backdropFilter'), tone: !!document.querySelector('#am-search-glass feColorMatrix'),
        hint: css(box.querySelector('[data-overlayscrollbars-viewport] > div'), 'display'),
        heights: rows.map(r => r.offsetHeight).join(), gaps: rows.map(r => css(r, 'marginTop')).join(),
        line: [css(rows[2], 'content', '::before'), css(rows[2], 'top', '::before'), css(rows[1], 'content', '::before')].join(),
        art: rows.slice(2).map(r => { const a = r.querySelector('img').parentElement; return a.offsetWidth + '/' + css(a, 'borderRadius'); }).join(),
        typed: [css(typed, 'color'), css(typed.firstElementChild, 'color'), css(typed.firstElementChild, 'fontWeight'), css(rows[1].querySelector('[class*="color-text-subdued"]'), 'color')].join(),
        dot: [css(sub, 'fontSize'), css(sub.lastElementChild, 'content', '::before'), css(sub.querySelector('svg'), 'display')].join(),
        // Spotify's play button over the artwork and the row's buttons wait for the pointer (or the selection).
        rest: [css(rows[2].querySelector('[id$="-play"]'), 'opacity'), css(rows[2].querySelector('[class*="list-row__slot"]'), 'visibility')].join(),
      };
    });
    assert.deepEqual(look, {
      gap: 4, radius: '13px', glass: 'blur(21px) url("#am-search-glass")', tone: true, hint: 'none',
      heights: '24,24,52,52,52', gaps: '0px,0px,11px,11px,11px', line: '"",-6px,none',
      art: '46/5px,46/50%,46/5px', typed: 'rgba(255, 255, 255, 0.55),rgba(255, 255, 255, 0.85),400,rgba(255, 255, 255, 0.85)',
      dot: '0px,"\u00a0·\u00a0",none', rest: '0,hidden',
    });
    // The selection is the accent, 5pt in from the sides; the field shows Apple's focus ring.
    await page.hover('#search-dropdown [role="row"] >> nth=3');
    assert.deepEqual(await page.evaluate(() => { const r = document.querySelectorAll('#search-dropdown [role="row"]')[3], a = getComputedStyle(r, '::after');
      return [a.backgroundColor, a.left, a.right, getComputedStyle(r.querySelector('[data-encore-id="listRowTitle"]')).color, getComputedStyle(document.querySelector('#global-nav-bar input')).boxShadow.includes('0px 0px 0px 3px')]; }),
      ['rgb(250, 45, 72)', '5px', '5px', 'rgb(255, 255, 255)', true]);
    // Hovered, the play button covers the artwork (a click there plays the result, as without the theme) and the
    // row's buttons show.
    await page.waitForTimeout(200);
    assert.deepEqual(await page.evaluate(() => { const r = document.querySelectorAll('#search-dropdown [role="row"]')[3], img = r.querySelector('img').getBoundingClientRect(), play = r.querySelector('[id$="-play"]');
      return [getComputedStyle(play).opacity, !!document.elementFromPoint(img.x + img.width / 2, img.y + img.height / 2).closest('[id$="-play"] button'), Math.round(play.getBoundingClientRect().width), getComputedStyle(r.querySelector('[class*="list-row__slot"]')).visibility]; }),
      ['1', true, 46, 'visible']);
    await shot('search-results');
    await page.mouse.click(700, 500);
    await page.waitForFunction(() => !document.getElementById('search-dropdown'));
    // Spotify's loading list (six grey placeholders) takes the same glass and Apple's rows: three queries, then results.
    await page.evaluate(() => mockSearchLoading());
    assert.deepEqual(await page.evaluate(() => {
      const box = document.querySelector('#search-suggestions-loading-dropdown > :first-child'), rows = [...box.querySelectorAll('[data-encore-id="listRow"]')];
      const pic = r => { const p = r.querySelector('[class*="header-side-flex"] > *'), c = getComputedStyle(p); return p.offsetWidth + '/' + c.borderRadius; };
      return [getComputedStyle(box).backdropFilter, getComputedStyle(box).borderRadius, rows.map(r => r.offsetHeight).join(), rows.map(r => getComputedStyle(r).marginTop).join(),
        pic(rows[0]), pic(rows[3]), getComputedStyle(rows[3], '::before').content, rows.map(r => r.querySelectorAll('[data-encore-id="text"]')).map(b => [...b].filter(e => e.offsetHeight).length).join()];
    }), ['blur(21px) url("#am-search-glass")', '13px', '24,24,24,52,52,52', '0px,0px,0px,11px,11px,11px', '12/50%', '46/5px', '""', '1,1,1,2,2,2']);
    // Over the library, as the results are (the library is still open from the check before).
    assert.equal(await page.evaluate(() => { const r = document.querySelector('#search-suggestions-loading-dropdown > :first-child').getBoundingClientRect(); return [document.body.classList.contains('am-library-open'), document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('#search-suggestions-loading-dropdown')?.id].join(); }), 'true,search-suggestions-loading-dropdown');
    await shot('search-loading');
    await page.mouse.click(700, 500);
    await page.waitForFunction(() => !document.getElementById('search-suggestions-loading-dropdown'));
    // With the queue sheet open the popover still comes first: its rows' buttons ran under the sheet and could not be seen.
    await page.click('#am-player button[aria-label="Çalma sırası"]');
    await page.waitForFunction(() => document.querySelector('.am-native-right').classList.contains('am-native-panel-open'));
    await page.fill('#global-nav-bar input', 'sena');
    await page.hover('#search-dropdown [role="row"] >> nth=3');
    // The preview's popover is narrower than the client's, so the sheet is drawn over it to test the stacking.
    assert.deepEqual(await page.evaluate(() => { const nav = document.getElementById('global-nav-bar'), sheet = document.querySelector('.am-native-right'), b = document.querySelectorAll('#search-dropdown [role="row"]')[3].querySelector('[class*="list-row__slot"] button').getBoundingClientRect();
      sheet.style.setProperty('left', Math.round(b.left - 40) + 'px', 'important'); const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); sheet.style.removeProperty('left');
      return [+getComputedStyle(nav).zIndex > +getComputedStyle(sheet).zIndex, !!hit?.closest('#search-dropdown [class*="list-row__slot"] button')]; }), [true, true]);
    await page.mouse.click(700, 500);
    await page.waitForFunction(() => !document.getElementById('search-dropdown'));
    await page.click('#am-player button[aria-label="Çalma sırası"]');
    await page.waitForFunction(() => !document.body.classList.contains('am-panel-open'));
  });

  await check('Spotify\'s tooltips in the menus\' glass', async () => {
    // Spotify's markup (1.3.6): a popper root on <body>, a box, and the text in #hover-or-focus-tooltip.
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<div data-tippy-root id="mock-tip" style="position:absolute;top:100px;left:100px;z-index:9999"><div><div class="mock-tip-box" style="background:rgb(30,30,30);padding:4px 8px;border-radius:4px"><span id="hover-or-focus-tooltip" role="tooltip">Geri git</span></div></div></div>'));
    assert.deepEqual(await page.evaluate(() => { const box = document.querySelector('#mock-tip .mock-tip-box'), cs = getComputedStyle(box); return [cs.borderRadius, getComputedStyle(box.firstElementChild).fontSize, cs.padding, cs.backgroundColor !== 'rgb(30, 30, 30)']; }), ['8px', '12px', '4px 9px', true]);
    // In Eco a plain fill.
    assert.deepEqual(await page.evaluate(() => { document.body.classList.add('am-solid'); const cs = getComputedStyle(document.querySelector('#mock-tip .mock-tip-box')), r = [cs.backgroundColor, cs.backdropFilter]; document.body.classList.remove('am-solid'); return r; }), ['rgb(44, 44, 46)', 'none']);
    await page.evaluate(() => document.getElementById('mock-tip').remove());
  });

  await check('a menu\'s glass keeps its loaded map pieces when it opens again', async () => {
    // An feImage given its href again paints nothing until it reloads: a new menu showed a sharp square for a frame.
    // A two-row menu (a folder's) moves to a slot already holding its smaller corners, and back.
    await page.evaluate(() => { window.__hrefSets = 0; const mo = new MutationObserver(r => { window.__hrefSets += r.filter(m => m.attributeName === 'href').length; });
      for (const f of document.querySelectorAll('[id^="am-menu-glass-"]')) mo.observe(f, { attributes: true, subtree: true }); });
    const slots = [];
    for (let n = 0; n < 2; n++) {
      await page.click('.am-more'); await page.waitForTimeout(100); slots.push(await page.getAttribute('#am-popover', 'data-am-glass')); await page.keyboard.press('Escape');
      await page.click('#am-sidebar .am-list-row[title="Ruh Hali"]', { button: 'right' }); await page.waitForTimeout(100); slots.push(await page.getAttribute('#am-popover', 'data-am-glass')); await page.keyboard.press('Escape');
    }
    assert.equal(await page.evaluate(() => window.__hrefSets), 0);
    assert.ok(slots[0] !== slots[1] && slots[0] === slots[2] && slots[1] === slots[3], slots.join());
    // Small menus read clearer, as Liquid Glass does on small things: the two-row menu's glass blurs 1.5px, the track menu's 6.8.
    assert.deepEqual(await page.evaluate(([a, b]) => [a, b].map(n => document.querySelector(`#am-menu-glass-${n} feGaussianBlur`).getAttribute('stdDeviation')), [slots[0], slots[1]]), ['6.8', '1.5']);
    // Spotify puts a closed submenu back when it opens again, still marked with a slot another menu took meanwhile:
    // it gets a slot of its own again.
    assert.ok(await page.evaluate(async () => { const frame = () => new Promise(r => requestAnimationFrame(r)), make = () => { const tip = document.createElement('div'); tip.setAttribute('data-tippy-root', ''); tip.innerHTML = '<ul role="menu"><li><button role="menuitem"><span>Row</span></button></li></ul>'; return tip; };
      const a = make(); document.body.append(a); await frame(); const was = a.dataset.amGlass; a.remove(); await frame();
      const b = make(); document.body.append(b); await frame(); document.body.append(a); await frame();
      const own = a.dataset.amGlass !== b.dataset.amGlass && b.dataset.amGlass === was; a.remove(); b.remove(); return own; }));
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
    // Liked Songs rows take the theme's star for Spotify's purple tile, filled when the row removes the song.
    assert.deepEqual(await page.evaluate(async () => {
      const rows = ['Remove from Liked Songs', 'Add to Liked Songs'].map(label => { const li = document.createElement('li');
        li.innerHTML = `<button role="menuitem"><div><img src="https://misc.scdn.co/liked-songs/liked-songs-64.jpg" width="16" height="16"></div><div><span>${label}</span></div></button>`; document.querySelector('#mock-tip ul').append(li); return li; });
      await new Promise(r => requestAnimationFrame(r));
      const out = rows.map(li => { const slot = li.querySelector('[data-am-liked]'), before = getComputedStyle(slot, '::before'), mask = before.maskImage || before.webkitMaskImage;
        return [slot.dataset.amLiked, getComputedStyle(slot.querySelector('img')).display, mask.includes("fill='black'")]; });
      // The first menu after a launch says Add until the song's state arrives: the star follows the text.
      rows[1].querySelector('span').textContent = 'Remove from Liked Songs'; await new Promise(r => setTimeout(r));
      out.push(rows[1].querySelector('[data-am-liked]').dataset.amLiked);
      rows.forEach(li => li.remove()); return out; }), [['on', 'none', true], ['off', 'none', false], 'on']);
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
    // It does not look selected there: its filled house is drawn as Spotify's outline one.
    await page.evaluate(() => { document.querySelector('#global-nav-bar .mock-home').innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M0 0h24v24H0z"/></svg>'; });
    assert.deepEqual(await page.evaluate(() => { const b = document.querySelector('#global-nav-bar .mock-home'); return [getComputedStyle(b.querySelector('svg')).webkitMaskImage.includes('svg'), getComputedStyle(b.querySelector('path')).opacity]; }), [true, '0']);
    await page.click('#global-nav-bar .mock-home');
    await page.waitForFunction(() => !document.body.classList.contains('am-library-open'));
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#global-nav-bar .mock-home svg')).webkitMaskImage), 'none', 'Home stays outlined at home');
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

  await check('settings window: the profile menu\'s mcloud opens Apple Music\'s Settings window, drawn from the definitions', async () => {
    // The profile menu holds one "mcloud Settings" entry; the old submenu is only the fallback.
    assert.deepEqual(await page.evaluate(() => [window.__menuItems.map(i => i.name), window.__menus.length]), [['mcloud Ayarları'], 0]);
    await page.evaluate(() => window.__menuItems.find(i => i.name === 'mcloud Ayarları').onClick());
    await page.waitForSelector('#am-settings .am-settings-box[role="dialog"]');
    const tabs = () => page.locator('#am-settings .am-settings-tab').allTextContents();
    assert.deepEqual(await tabs(), ['Genel', 'Görünüm', 'Oynatıcı', 'Kenar Çubuğu', 'Albümler ve Listeler', 'Şimdi Çalan', 'Ana Sayfa']);
    // It reopens on the last tab (Albums & Playlists, from the track numbers check), as macOS does; the title names it.
    assert.equal(await page.textContent('#am-settings .am-settings-title'), 'Albümler ve Listeler');
    // A form: labels right-aligned with a colon, toggles as checkboxes. Real clicks from here on.
    await page.click('#am-settings .am-settings-tab:has-text("Oynatıcı")');
    assert.deepEqual(await page.locator('#am-settings .am-settings-label').allTextContents(), ['Oynatıcıda albüm kapağı', 'Liquid Glass oynatıcı', 'Sağ tık menüsü', 'Şarkı adı ve sanatçı', 'Oynatıcı düğmeleri']);
    assert.deepEqual(await page.evaluate(() => { const l = getComputedStyle(document.querySelector('#am-settings [data-key="artwork"] .am-settings-label')); return [l.textAlign, getComputedStyle(document.querySelector('#am-settings [data-key="artwork"] .am-settings-label'), '::after').content]; }), ['right', '":"']);
    await page.click('#am-settings [data-key="artwork"] .am-settings-switch');
    assert.ok(await page.evaluate(() => document.body.classList.contains('am-no-artwork')));
    assert.equal(await page.getAttribute('#am-settings [data-key="artwork"] .am-settings-switch', 'aria-checked'), 'false');
    // Apple's dark Settings colours, neutral: the window, a lighter toolbar band, the selected tab on a tile in the accent.
    assert.deepEqual(await page.evaluate(() => {
      const box = document.querySelector('#am-settings .am-settings-box'), tab = document.querySelector('#am-settings .am-settings-tab.am-selected');
      return [getComputedStyle(box).backdropFilter.split('(')[0], getComputedStyle(tab).color === getComputedStyle(document.documentElement).getPropertyValue('--am-accent').trim().replace(/^#(..)(..)(..)$/, (_, r, g, b) => `rgb(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)})`)];
    }), ['blur', true]);
    await shot('settings-window');
    await page.click('#am-settings .am-settings-tab:has-text("Görünüm")');
    await page.click('#am-settings [data-key="accent"] [aria-label="Mavi"]');
    assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue('--am-accent')), '#0a84ff');
    // Arrow keys move between tabs.
    await page.focus('#am-settings .am-settings-tab.am-selected');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.textContent('#am-settings .am-settings-title'), 'Oynatıcı');
    // Not modal: no dimming, the page stays usable, and the title bar moves the window.
    assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('am-settings')).pointerEvents), 'none');
    await page.evaluate(() => document.querySelector('#am-settings .am-settings-box').getAnimations().forEach(a => a.finish()));
    const box = await page.locator('#am-settings .am-settings-box').boundingBox();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + 14);await page.mouse.down();await page.mouse.move(box.x + box.width / 2 + 160, box.y + 64);await page.mouse.up();
    const moved = await page.locator('#am-settings .am-settings-box').boundingBox();
    assert.deepEqual([Math.round(moved.x - box.x), Math.round(moved.y - box.y)], [100, 50]);
    // OK closes; Escape closes; ⌘⌥, opens and closes it.
    await page.click('#am-settings .am-settings-ok');
    assert.equal(await page.locator('#am-settings').count(), 0);
    await page.keyboard.press('Meta+Alt+Comma');
    assert.equal(await page.locator('#am-settings').count(), 1);
    await page.focus('#am-settings .am-settings-tab.am-selected');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#am-settings').count(), 0);
    await page.keyboard.press('Meta+Alt+Comma');
    await page.keyboard.press('Meta+Alt+Comma');
    assert.equal(await page.locator('#am-settings').count(), 0);
    const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('mcloud:settings')));
    assert.deepEqual([saved.accent, saved.artwork, saved.sort], ['blue', false, 'name']);
  });

  await check('settings pop-up buttons: the theme\'s menu, the chosen row over the button, keys as macOS (#102)', async () => {
    await page.evaluate(() => window.__menuItems.find(i => i.name === 'mcloud Ayarları').onClick());
    await page.click('#am-settings .am-settings-tab:has-text("Oynatıcı")');
    const button = '#am-settings [data-key="playerMenu"] .am-settings-control';
    assert.deepEqual(await page.evaluate(b => { const c = document.querySelector(b); return [c.tagName, c.getAttribute('aria-haspopup'), c.textContent]; }, button), ['BUTTON', 'menu', 'Yalnızca şarkının üstünde (Spotify)']);
    const menu = () => page.evaluate(b => {
      const pop = document.getElementById('am-popover'), c = document.querySelector(b), on = pop.querySelector('[aria-checked="true"]');
      if (pop.hidden) return null;
      const r = c.getBoundingClientRect(), o = on.getBoundingClientRect();
      return { items: [...pop.querySelectorAll('[role="menuitemradio"]')].map(i => i.textContent), checked: on.textContent, focused: document.activeElement === on, above: +getComputedStyle(pop).zIndex > +getComputedStyle(document.getElementById('am-settings')).zIndex, centred: Math.abs((o.top + o.bottom) / 2 - (r.top + r.bottom) / 2) <= 1, expanded: c.getAttribute('aria-expanded') };
    }, button);
    await page.click(button);
    assert.deepEqual(await menu(), { items: ['Oynatıcının her yerinde (Apple Music)', 'Yalnızca şarkının üstünde (Spotify)'], checked: 'Yalnızca şarkının üstünde (Spotify)', focused: true, above: true, centred: true, expanded: 'true' });
    // Arrow keys move and Enter picks: the menu closes, focus returns to the button, which shows the choice.
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    assert.equal(await menu(), null);
    assert.deepEqual(await page.evaluate(b => [document.activeElement === document.querySelector(b), document.querySelector(b).textContent, JSON.parse(localStorage.getItem('mcloud:settings')).playerMenu], button), [true, 'Oynatıcının her yerinde (Apple Music)', 'apple']);
    // ArrowDown opens it from the keyboard; Escape closes it back to the button.
    await page.keyboard.press('ArrowDown');
    assert.equal((await menu())?.checked, 'Oynatıcının her yerinde (Apple Music)');
    await page.keyboard.press('Escape');
    assert.equal(await menu(), null);
    assert.equal(await page.evaluate(b => document.activeElement === document.querySelector(b), button), true);
    await settingsWindow.pick('playerMenu', 'Yalnızca şarkının üstünde (Spotify)');
  });

  await check('player transport: laid out as Music\'s mini player (centres 23, 51, 83, 115, 143pt; play 36pt)', async () => {
    const boxes = await page.evaluate(() => { const p = document.querySelector('#am-player').getBoundingClientRect();
      return [...document.querySelectorAll('#am-player .am-transport button')].map(b => { const r = b.getBoundingClientRect(); return [r.x - p.x + r.width / 2, r.width]; }); });
    assert.deepEqual(boxes, [[23, 28], [51, 28], [83, 36], [115, 28], [143, 28]]);
  });
  await check('appearance: light swaps the colour tokens, the accent and the glass tone; system follows the OS (#74)', async () => {
    // In the settings window (#76): Appearance tab, a segmented control.
    const pick = async name => {
      if (!await page.locator('#am-settings').count()) await page.evaluate(() => window.__menuItems.find(i => i.name === 'mcloud Ayarları').onClick());
      await page.click('#am-settings .am-settings-tab:has-text("Görünüm")');
      await page.click(`#am-settings [data-key="appearance"] .am-settings-option:has-text("${name.replace('Görünüm: ', '')}")`);
    };
    const state = () => page.evaluate(() => ({
      light: document.body.classList.contains('am-light') && document.documentElement.classList.contains('am-light'),
      bg: getComputedStyle(document.body).backgroundColor, row: getComputedStyle(document.querySelector('#am-sidebar .am-nav-row')).color,
      ink: getComputedStyle(document.querySelector('.am-nav-heading')).color, accent: document.documentElement.style.getPropertyValue('--am-accent'),
      steps: document.querySelectorAll('filter [data-am-scheme]').length, scheme: getComputedStyle(document.documentElement).colorScheme,
      spice: getComputedStyle(document.body).getPropertyValue('--spice-main').trim(),
    }));
    const dark = await state();
    assert.deepEqual([dark.light, dark.bg, dark.row, dark.ink, dark.accent, dark.steps, dark.scheme], [false, 'rgb(31, 31, 31)', 'rgba(255, 255, 255, 0.847)', 'rgba(255, 255, 255, 0.36)', '#0a84ff', 0, 'dark']);
    await pick('Görünüm: Açık');
    const light = await state();
    assert.deepEqual([light.light, light.bg, light.row, light.ink, light.accent, light.scheme, light.spice], [true, 'rgb(255, 255, 255)', 'rgb(29, 29, 31)', 'rgba(0, 0, 0, 0.36)', '#0088ff', 'light', '#fff']);
    // Every glass filter (toast, menus, player and toolbar tone layers) carries the light tone step.
    assert.ok(light.steps >= 9, 'glass filters take the light tone: ' + light.steps);
    // Menus take their own light tone (their filter's tone primitives are swapped, not mapped).
    assert.equal(await page.evaluate(() => document.querySelectorAll('filter[id^="am-menu-glass-"]:not([data-am-tone="light"])').length), 0);
    assert.notEqual(await page.$eval('#am-search-glass feColorMatrix', e => e.getAttribute('values')), await page.$eval('#am-search-glass feColorMatrix', e => e.dataset.amDark));
    // The glass hairlines take Music's light line (b8): their own table, and a line along the top and bottom too.
    const rims = () => page.evaluate(() => [...document.querySelectorAll('[data-am-rim] > *')].map(f => f.getAttribute('tableValues') === f.dataset.amDark));
    const lightRims = await rims();
    assert.ok(lightRims.length >= 3 && lightRims.every(dark => !dark), 'hairlines take the light table: ' + lightRims);
    // The search field's magnifier and placeholder: Music's light grey, half black.
    assert.deepEqual(await page.evaluate(() => [getComputedStyle(document.querySelector('#global-nav-bar form[role="search"] > :first-child svg')).fill, getComputedStyle(document.querySelector('#global-nav-bar input'), '::placeholder').color]), ['rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.5)']);
    shots && await page.screenshot({ path: path.join(shots, 'light-home.png') });
    // The artist page keeps its dark artist colours in light mode, as Music does; the submenu holds only the appearance.
    assert.ok(await page.evaluate(() => document.body.classList.contains('am-artist-stays-dark')));
    assert.deepEqual(await page.locator('#am-settings [data-key="appearance"] .am-settings-option').allTextContents(), ['Koyu', 'Açık', 'Sistem']);
    // System: follows prefers-color-scheme as it changes.
    await page.emulateMedia({ colorScheme: 'dark' });
    await pick('Görünüm: Sistem');
    assert.equal((await state()).light, false);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForFunction(() => document.body.classList.contains('am-light'));
    await page.emulateMedia({ colorScheme: null });
    await pick('Görünüm: Koyu');
    const back = await state();
    assert.deepEqual([back.light, back.bg, back.accent, back.steps], [false, 'rgb(31, 31, 31)', '#0a84ff', 0]);
    assert.ok((await rims()).every(dark => dark), 'hairlines back on the dark table');
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('mcloud:settings'))).appearance, 'dark');
    await page.click('#am-settings .am-settings-ok');
  });

  await check('player buttons: the Player tab picks which show, on a small bar that follows; play, title and scrubber stay', async () => {
    await page.evaluate(() => window.__menuItems.find(i => i.name === 'mcloud Ayarları').onClick());
    await page.click('#am-settings .am-settings-tab:has-text("Oynatıcı")');
    const chips = () => page.locator('#am-settings .am-pb-chip').allTextContents();
    // Every tagged button, in the player's order, by its short name; locked ones (play, the LCD) have no chip.
    assert.deepEqual(await chips(), ['Karıştır', 'Önceki', 'Sonraki', 'Yinele', 'Beğen', 'Diğer', 'Sözler', 'Şimdi Çalan', 'Cihazlar', 'Çalma sırası', 'Ses']);
    const preview = () => page.evaluate(() => [...document.querySelectorAll('#am-settings .am-pb-icon')].map(i => i.classList.contains('am-pb-off') ? 0 : 1).join(''));
    assert.equal(await preview(), '111111111111');
    const shown = sel => page.evaluate(s => getComputedStyle(document.querySelector(s)).display !== 'none', sel);
    await page.click('#am-settings .am-pb-chip:has-text("Karıştır")');
    await page.click('#am-settings .am-pb-chip:has-text("Cihazlar")');
    assert.equal(await preview(), '011111111011');
    assert.deepEqual([await shown('#am-player [data-am-button="shuffle"]'), await shown('#am-player [data-am-button="connect"]'), await shown('#am-player .am-play')], [false, false, true]);
    assert.equal(await page.getAttribute('#am-settings .am-pb-chip[data-id="shuffle"]', 'aria-checked'), 'false');
    // The rule is on the node, not the player: a button moved elsewhere (Now Playing's pane) stays hidden there.
    assert.equal(await page.evaluate(() => { const b = document.querySelector('#am-player [data-am-button="shuffle"]').cloneNode(true); document.body.append(b); const d = getComputedStyle(b).display; b.remove(); return d; }), 'none');
    assert.deepEqual(JSON.parse(await page.evaluate(() => localStorage.getItem('mcloud:settings'))).playerHidden, ['shuffle', 'connect']);
    await shot('settings-player-buttons');
    // A button its feature hides (say, the lyrics button until Spicy Lyrics loads) leaves the list when any setting changes, and comes back.
    await page.evaluate(() => { document.querySelector('#am-player [data-am-button="lyrics"]').hidden = true; });
    await page.click('#am-settings .am-pb-chip:has-text("Karıştır")');
    assert.ok(!(await chips()).includes('Sözler'));
    await page.evaluate(() => { document.querySelector('#am-player [data-am-button="lyrics"]').hidden = false; });
    await page.click('#am-settings .am-pb-chip:has-text("Karıştır")');
    assert.ok((await chips()).includes('Sözler'));
    await page.click('#am-settings .am-pb-chip:has-text("Karıştır")');
    await page.click('#am-settings .am-pb-chip:has-text("Cihazlar")');
    assert.equal(await preview(), '111111111111');
    assert.ok(await shown('#am-player [data-am-button="shuffle"]'));
    await page.click('#am-settings .am-settings-close');
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
    const pick = (key, option) => settingsWindow.pick(key, option);
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
    await pick('liquid');
    await page.waitForFunction(() => !document.body.classList.contains('am-tglass-on'));
    assert.equal(await blurs(), 0);
    await pick('liquid');
    await page.waitForFunction(() => document.body.classList.contains('am-tglass-on'));
    await pick('glass', 'Tam');
    assert.deepEqual(await state(), { mode: 'full', ...glass });
    await pick('glass', 'Eko');
    // Eco keeps the toolbar's circles and capsules, as solid faces: no lens, no filter anywhere in them.
    await page.waitForFunction(() => document.querySelectorAll('#am-toolbar-glass > .am-tglass-solid').length >= 2);
    assert.deepEqual(await state(), { mode: 'am-solid', player: null, toolbar: null, rims: 0, sidebar: false, glow: false });
    assert.deepEqual(await page.evaluate(() => [document.body.classList.contains('am-tglass-on'), [...document.querySelectorAll('#am-toolbar-glass *')].filter(e => getComputedStyle(e).backdropFilter !== 'none' || getComputedStyle(e).filter !== 'none').length,
      getComputedStyle(document.querySelector('#global-nav-bar .am-toolbar-leading button')).width]), [true, 0, '36px']);
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('mcloud:settings'))).glass, 'eco');
    await pick('glass', 'Dengeli');
    await page.evaluate(() => Spicetify.Platform.History.push('/'));
    await page.waitForSelector('#am-toolbar-glass > .am-tglass-pane');
    assert.deepEqual(await state(), { mode: 'am-balanced', ...glass });
    // Reduced transparency in the OS keeps Eco: the window shows Eco and says why another pick changes nothing.
    const checks = async () => { const v = await settingsWindow.state('glass'); await settingsWindow.close(); return v; };
    assert.equal(await checks(), 'Dengeli');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
    await page.waitForFunction(() => document.body.classList.contains('am-solid'));
    assert.equal(await checks(), 'Eko');
    await pick('glass', 'Tam');
    assert.match(await page.textContent('.am-toasts > :last-child'), /saydamlık/);
    assert.equal(await checks(), 'Eko');
    await pick('glass', 'Dengeli');
    await cdp.send('Emulation.setEmulatedMedia', { features: [] });
    await page.waitForFunction(() => !document.body.classList.contains('am-solid'));
    assert.equal(await checks(), 'Dengeli');
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

  await check('album pages: clean track list, artwork colour, heading and text rendering (#72)', async () => {
    // Spotify 1.3's album rows: title, badges (explicit, music video), then the artist links; a Plays column.
    await page.evaluate(() => { Spicetify.GraphQL.Request = window.__graphqlRequest; });
    const albumPage = id => page.evaluate(id => {
      document.querySelector('.mock-page').hidden = true; document.getElementById('mock-album72')?.remove();
      const row = (n, title, artists) => `<div role="row" aria-rowindex="${n + 1}"><div class="main-trackList-trackListRow main-trackList-trackListRowGrid" role="presentation"><div class="main-trackList-rowSectionIndex" role="gridcell"><div class="main-trackList-rowMarker" style="position:relative;height:16px"><span style="position:absolute;top:-4px;line-height:20px">${n}</span></div></div><div class="main-trackList-rowSectionStart" role="gridcell"><div class="main-trackList-rowMainContent"><div class="main-trackList-rowTitle">${title}</div><span class="mock-badges"><span data-encore-id="tagIcon">E</span><span class="mock-video">Music video</span></span><span class="mock-artists"><span>${artists.map(([a, name]) => `<a href="/artist/${a}">${name}</a>`).join(', ')}</span></span></div></div><div class="main-trackList-rowSectionVariable" role="gridcell"><div>1,000</div></div><div class="main-trackList-rowSectionEnd" role="gridcell"><button aria-checked="${n === 1}" class="mock-like"><svg></svg></button><div class="main-trackList-rowDuration">3:50</div></div></div></div>`;
      document.querySelector('main').insertAdjacentHTML('beforeend', `<section data-testid="album-page" id="mock-album72" style="position:relative">
        <div data-testid="entity-header"><div class="main-entityHeader-contentWrapper"><div class="main-entityHeader-imageContainer"></div><div class="main-entityHeader-headerText"><span class="encore-text-body-small">Album</span><h1 style="font-size:6rem;letter-spacing:-.04em">Blonde</h1><div><div class="main-entityHeader-creatorWrapper"><a href="/artist/frank">Frank Ocean</a></div><span>•</span><span class="mock-year">2016</span><span class="mock-dot">•</span><div class="mock-count"><span>3 songs</span><span>,</span><span><span>12 min</span></span></div></div></div></div></div>
        <style>#mock-album72 .main-trackList-trackListRowGrid{display:grid;grid-template-columns:var(--grid-template-columns);height:56px}#mock-album72 .main-trackList-rowMainContent{display:grid;grid-template-areas:"title title title" "badges prefix subtitle"}#mock-album72 .mock-badges{grid-area:badges;display:flex;justify-content:center}#mock-album72 .mock-artists{grid-area:subtitle}</style>
        <style>#mock-album72 .main-trackList-trackListHeader{height:36px;margin:0 calc(var(--content-spacing) * -1) calc(var(--content-spacing) - 8px)}</style>
        <div class="main-trackList-trackListContainer"><div class="main-trackList-trackList main-trackList-indexable" style="--grid-template-columns:[index] 16px [first] 4fr [var1] 2fr [last] 1fr">
          <div class="main-trackList-trackListHeader"><div class="main-trackList-trackListHeaderRow" role="row">Title</div></div>
          ${row(1, 'Solo', [['frank', 'Frank Ocean']])}${row(2, 'Guest', [['frank', 'Frank Ocean'], ['guest', 'André 3000']])}${row(3, 'Pair', [['jay', 'JAY-Z'], ['kanye', 'Kanye West']])}</div></div><div><div><p class="mock-date">August 20, 2016</p><div><p>© 2016 Boys Don't Cry</p></div></div></div></section>`);
      Spicetify.Platform.History.push('/album/' + id);
    }, id);
    const shown = () => page.$$eval('#mock-album72 .mock-artists', l => l.map(e => getComputedStyle(e).display !== 'none'));
    const tint = option => flip('albumTint', 'Albüm ve çalma listesi rengi: ' + option, option);
    // Spicetify 2.46.2 can skip its webpack bindings on a cold start: GraphQL keeps only Definitions, and Request (a getter
    // for Platform.GraphQLLoader) never comes. An album opened before the loader is there waits for it, then uses it.
    await page.evaluate(() => { Spicetify.GraphQL = { Definitions: Spicetify.GraphQL.Definitions }; window.__graphqlLoader = Spicetify.Platform.GraphQLLoader; delete Spicetify.Platform.GraphQLLoader; });
    await albumPage(1);
    await page.waitForTimeout(700);
    assert.equal(await page.$eval('#am-album-style', e => e.textContent), '', 'no rule without a GraphQL client');
    await page.evaluate(() => { Spicetify.Platform.GraphQLLoader = window.__graphqlLoader; });
    await page.waitForFunction(() => document.getElementById('am-album-style')?.textContent.includes('kanye'), null, { timeout: 3000 });
    assert.deepEqual(await shown(), [true, true, false]);
    await page.evaluate(() => { Spicetify.GraphQL.Request = window.__graphqlRequest; });
    await albumPage(0);
    await page.waitForFunction(() => document.getElementById('am-album-style')?.textContent.includes('frank'));
    // Only Frank Ocean's own track loses its artist line; the play count column goes and the grid closes up.
    assert.deepEqual(await shown(), [false, true, true]);
    // #93: without its artist line a row's number is centred on its title, not lifted as Spotify lifts it for a title
    // on the top line; an album's lines start under the titles.
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#mock-album72 .main-trackList-rowMarker')].map(m => { const s = m.firstElementChild.getBoundingClientRect(), r = m.getBoundingClientRect(); return Math.round(s.top + s.height / 2 - r.top - r.height / 2); })), [0, -2, -2]);
    assert.equal(await page.$eval('#mock-album72 .main-trackList-trackListRow', e => getComputedStyle(e, '::after').left), '48px');
    // #97: the length moves from the header to the end of the list, under the release date, in Music's words.
    await page.waitForFunction(() => document.body.classList.contains('am-list-info'));
    assert.deepEqual(await page.evaluate(() => { const p = document.getElementById('mock-album72'), d = e => getComputedStyle(p.querySelector(e)).display;
      return [getComputedStyle(document.documentElement).getPropertyValue('--am-list-info'), d('.mock-count'), d('.mock-dot'), d('.mock-year'), getComputedStyle(p.querySelector('.mock-date'), '::after').content]; }),
      ['"3 şarkı, 1 saat, 2 dakika"', 'none', 'none', 'block', '"3 şarkı, 1 saat, 2 dakika"']);
    // #97: a song's like button is Music's favourite star, outlined until it is liked, then filled.
    assert.deepEqual(await page.$$eval('#mock-album72 .mock-like', l => l.map(b => [/fill='none'/.test(getComputedStyle(b.querySelector('svg')).webkitMaskImage), /fill='%23000'/.test(getComputedStyle(b.querySelector('svg')).webkitMaskImage)])), [[false, true], [true, false], [true, false]]);
    // Spotify spaces the column header from the first row by the page padding minus 8px; the first row follows it directly, as in Apple Music.
    assert.equal(await page.evaluate(() => { const h = document.querySelector('#mock-album72 .main-trackList-trackListHeader'), r = document.querySelector('#mock-album72 .main-trackList-trackListRow'); return Math.round(r.getBoundingClientRect().top - h.getBoundingClientRect().bottom); }), 0);
    // The column header can be switched off (B6): it leaves the flow, the first row takes its place, and it comes back.
    const headerBox = () => page.evaluate(() => { const h = document.querySelector('#mock-album72 .main-trackList-trackListHeader'), r = document.querySelector('#mock-album72 .main-trackList-trackListRow'), l = document.querySelector('#mock-album72 .main-trackList-trackList'); return [getComputedStyle(h).display, Math.round(r.getBoundingClientRect().top - l.getBoundingClientRect().top)]; });
    const [, rowTop] = await headerBox();
    await flip('tracklistHeader', ['Parça listesi sütun başlığı']);
    assert.equal(await saved('tracklistHeader'), false);
    assert.deepEqual(await headerBox(), ['none', 0]);
    assert.ok(rowTop >= 36);
    await flip('tracklistHeader', ['Parça listesi sütun başlığı']);
    assert.deepEqual(await headerBox(), ['block', rowTop]);
    assert.equal(await page.$eval('#mock-album72 .main-trackList-rowSectionVariable', e => getComputedStyle(e).display), 'none');
    assert.equal(await page.$eval('#mock-album72 .main-trackList-trackListRow', e => getComputedStyle(e).gridTemplateColumns.match(/[\d.]+px/g).length), 3);
    assert.deepEqual(await page.$eval('#mock-album72 .mock-badges', e => [getComputedStyle(e).gridArea, getComputedStyle(e).justifyContent, getComputedStyle(e.lastElementChild).display]), ['badges', 'flex-start', 'none']);
    // A two-artist album: a track by both is the album's own.
    await albumPage(1);
    await page.waitForFunction(() => document.getElementById('am-album-style')?.textContent.includes('kanye'));
    assert.deepEqual(await shown(), [true, true, false]);
    // Switched off, Spotify's rows come back as they were.
    await flip('albumClean', 'Sade albüm listesi');
    assert.deepEqual(await shown(), [true, true, true]);
    assert.equal(await saved('albumClean'), false);
    await flip('albumClean', 'Sade albüm listesi');
    // Artwork colour: off by default; subtle washes the page top, full also colours the window.
    assert.equal(await page.evaluate(() => document.body.classList.contains('am-album-tint-off') && !document.body.classList.contains('am-album-tinted')), true);
    await tint('Hafif');
    await page.waitForFunction(() => document.body.classList.contains('am-album-tinted'));
    const hue = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--am-album-tint'));
    assert.match(hue, /^hsl\(4\d /, 'the gold cover gives a gold hue');
    assert.notEqual(await page.$eval('#mock-album72', e => getComputedStyle(e, '::before').backgroundImage), 'none');
    const mainBg = () => page.evaluate(() => getComputedStyle(document.querySelector('.am-native-main')).backgroundColor);
    const plain = await mainBg();
    await tint('Tam');
    assert.notEqual(await mainBg(), plain, 'full colours the window');
    // Leaving the album drops the colour; numbers and colour do not leak to other pages.
    await page.evaluate(() => Spicetify.Platform.History.push('/'));
    await page.waitForFunction(() => !document.body.classList.contains('am-album-tinted'));
    // A playlist takes its cover's colour too (#97), from the cover in its metadata.
    await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 8; const x = c.getContext('2d'); x.fillStyle = '#2050e0'; x.fillRect(0, 0, 8, 8);
      window.__mockPlaylistMeta = { 'spotify:playlist:mock97': { images: [{ url: c.toDataURL(), label: 'standard' }] } };
      document.querySelector('main').insertAdjacentHTML('beforeend', `<section data-testid="playlist-page" id="mock-pl97"><div data-testid="entity-header"><div class="main-entityHeader-imageContainer"><img src="${c.toDataURL()}"></div></div></section>`);
      Spicetify.Platform.History.push('/playlist/mock97'); });
    await page.waitForFunction(() => document.body.classList.contains('am-album-tinted'));
    assert.match(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--am-album-tint')), /^hsl\(22\d /, 'the blue cover gives a blue hue');
    await page.evaluate(() => { document.getElementById('mock-pl97').remove(); delete window.__mockPlaylistMeta; Spicetify.Platform.History.push('/'); });
    await page.waitForFunction(() => !document.body.classList.contains('am-album-tinted'));
    await tint('Kapalı');
    // Text is drawn as Music draws it: the system's smoothing, no negative tracking (Spotify's or the theme's).
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#am-sidebar .am-nav-row, #mock-album72 h1')].slice(-2).map(e => [getComputedStyle(e).webkitFontSmoothing, getComputedStyle(e).letterSpacing])), [['auto', 'normal'], ['auto', 'normal']]);
    // The heading at Music's sizes: title 26pt bold, artist 26pt, the year line semibold.
    assert.deepEqual(await page.evaluate(() => { const style = s => getComputedStyle(document.querySelector('#mock-album72 ' + s)); return [style('h1').fontSize, style('h1').fontWeight, style('h1').letterSpacing, style('.main-entityHeader-creatorWrapper').fontSize, style('.mock-year').fontWeight]; }), ['26px', '700', 'normal', '26px', '600']);
    await page.evaluate(() => { document.getElementById('mock-album72').remove(); document.querySelector('.mock-page').hidden = false; });
  });

  await check('album and playlist pages: Music\'s artwork, description, list line, save star and colour (#97)', async () => {
    await page.evaluate(() => { Spicetify.GraphQL.Request = window.__graphqlRequest; });
    // Spotify 1.3's page: header (artwork, title, description on playlists, the creator line with the count), the action
    // bar (shuffle, Save, Download: both with aria-checked), the track list, and an album's date and ℗ lines after it.
    const mount = (kind, id) => page.evaluate(([kind, id]) => {
      document.querySelector('.mock-page').hidden = true; document.getElementById('mock-97')?.remove();
      const svg = '<svg viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M1 1h22v22z"/></svg>';
      document.querySelector('main').insertAdjacentHTML('beforeend', `<section data-testid="${kind}-page" id="mock-97" style="position:relative"><style>#mock-97 button{padding:0;border:0;background:none;color:inherit}</style>
        <div data-testid="entity-header"><div class="main-entityHeader-contentWrapper contentSpacing" style="display:flex"><div></div><div class="main-entityHeader-imageContainer" style="width:232px;height:232px"></div>
          <div class="main-entityHeader-headerText" style="display:flex;flex-direction:column"><span class="encore-text-body-small">Playlist</span><span><span class="main-entityHeader-title" data-testid="entityTitle"><h1>Mock</h1></span></span>
            ${kind === 'playlist' ? '<div><span><div class="playlist-playlist-playlistDescription">chill beats, lofi vibes</div></span></div>' : ''}
            <div><div class="main-entityHeader-creatorWrapper"><span><a>Frank Ocean</a></span></div><span class="mock-dot">•</span><span class="mock-year">2016</span><span class="mock-dot2">•</span><div class="mock-count"><span>3 songs</span><span>, </span><span>1 hr 2 min</span></div></div></div></div></div>
        <div><div style="overflow:hidden"><div data-testid="action-bar" class="contentSpacing"><div data-testid="action-bar-row" style="display:flex">
          <div><button data-encore-id="buttonPrimary" aria-label="Play"><span>${svg}</span></button></div>
          <div data-testid="action-bar-row-actions"><button data-encore-id="buttonTertiary" class="e-1-button-tertiary--condensed-all" aria-label="Shuffle"><span>${svg}</span></button><button data-encore-id="buttonTertiary" class="mock-save" aria-label="Save to Your Library" aria-checked="false"><span>${svg}</span></button><button data-encore-id="buttonTertiary" class="mock-download" aria-label="Download" aria-checked="false"><span>${svg}</span></button></div></div></div></div></div>
        <div class="contentSpacing"><div class="main-trackList-trackListContainer"><div class="main-trackList-trackList" role="grid"><div role="row"><div class="main-trackList-trackListRow"><button class="mock-like" aria-label="Add to Liked Songs" aria-checked="false">${svg}</button><button class="mock-liked" aria-label="Add to playlist" aria-checked="true">${svg}</button></div></div></div></div>
          ${kind === 'album' ? '<div><div><p class="mock-date">August 20, 2016</p><div><p>℗ 2016 Boys Don\'t Cry</p></div></div></div>' : ''}</div></section>`);
      Spicetify.Platform.History.push(`/${kind}/${id}`);
    }, [kind, id]);
    const css = (sel, prop, pseudo) => page.$eval('#mock-97 ' + sel, (e, [prop, pseudo]) => getComputedStyle(e, pseudo)[prop], [prop, pseudo]);
    const info = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--am-list-info'));
    await mount('album', 0);
    await page.waitForFunction(() => document.body.classList.contains('am-list-info'));
    // Music's line under the list, between the release date and ℗; the header keeps the year and drops the count.
    assert.equal(await info(), '"3 şarkı, 1 saat, 2 dakika"');
    assert.equal(await css('.mock-date', 'content', '::after'), '"3 şarkı, 1 saat, 2 dakika"');
    assert.deepEqual([await css('.mock-count', 'display'), await css('.mock-dot2', 'display'), await css('.mock-year', 'display') !== 'none'], ['none', 'none', true]);
    // Music's artwork is 270pt at every window width.
    assert.equal(await css('.main-entityHeader-imageContainer', 'width'), '270px');
    // Save is a star, outlined until saved, in the accent like shuffle; Download keeps its glyph. Rows: the liked one is filled.
    const accent = await css('.e-1-button-tertiary--condensed-all', 'color');
    const mask = sel => css(sel + ' svg', 'maskImage');
    assert.match(await mask('.mock-save'), /fill='none'/);
    assert.equal(await mask('.mock-download'), 'none');
    assert.equal(await css('.mock-save svg path', 'display'), 'none');
    assert.equal(await css('.mock-save', 'color'), accent);
    await page.$eval('#mock-97 .mock-save', e => { e.setAttribute('aria-checked', 'true'); e.setAttribute('aria-label', 'Remove from Your Library'); });
    assert.match(await mask('.mock-save'), /fill='%23000'/);
    assert.match(await mask('.mock-like'), /fill='none'/);
    assert.match(await mask('.mock-liked'), /fill='%23000'/);
    assert.equal(await css('.mock-liked', 'color'), accent);
    // A playlist: the description sits under the creator line, just above the play controls; the line counts items.
    await page.evaluate(() => { window.__mockPlaylistMeta = { 'spotify:playlist:p97': { totalLength: 12, duration: { milliseconds: 2712000 }, images: [{ url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#c8a040"/></svg>'), label: 'standard' }] } }; });
    await mount('playlist', 'p97');
    await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--am-list-info').includes('öğe'));
    assert.equal(await info(), '"12 öğe, 45 dakika"');
    assert.equal(await css('.main-trackList-trackListContainer', 'content', '::after'), '"12 öğe, 45 dakika"');
    const box = sel => page.locator('#mock-97 ' + sel).boundingBox();
    const [desc, creator, row] = [await box('.playlist-playlist-playlistDescription'), await box('.main-entityHeader-creatorWrapper'), await box('[data-testid="action-bar-row"]')];
    assert.ok(desc.y > creator.y + creator.height, 'the description follows the creator line');
    assert.ok(desc.y + desc.height <= row.y && row.y - (desc.y + desc.height) < 40, 'the description sits just above the play controls');
    // Album and playlist colour (albumTint): off by default; full colours the page and takes shuffle and the star with it.
    assert.equal(await page.evaluate(() => document.body.classList.contains('am-album-tinted')), false);
    const shuffleBg = await css('.e-1-button-tertiary--condensed-all', 'backgroundColor');
    await flip('albumTint', 'Albüm ve çalma listesi rengi: Tam', 'Tam');
    await page.waitForFunction(() => document.body.classList.contains('am-album-tinted') && document.body.classList.contains('am-album-tint-full'));
    assert.match(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--am-album-tint')), /^hsl\(4\d /, 'the gold cover gives a gold hue');
    assert.notEqual(await css('.e-1-button-tertiary--condensed-all', 'backgroundColor'), shuffleBg, 'shuffle takes the colour');
    assert.notEqual(await css('.mock-save', 'color'), accent, 'the star takes the colour');
    assert.equal(await saved('albumTint'), 'full');
    // Other pages have no colour level.
    await page.evaluate(() => Spicetify.Platform.History.push('/'));
    await page.waitForFunction(() => document.body.classList.contains('am-album-tint-off') && !document.body.classList.contains('am-album-tinted'));
    await flip('albumTint', 'Albüm ve çalma listesi rengi: Kapalı', 'Kapalı');
    await page.evaluate(() => { document.getElementById('mock-97').remove(); delete window.__mockPlaylistMeta; document.querySelector('.mock-page').hidden = false; Spicetify.Platform.History.push('/'); });
    await page.waitForFunction(() => !document.body.classList.contains('am-list-info'));
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

  await check('song preview: an Apple sheet, its background from settings, the sidebar closes it (#75)', async () => {
    // Spotify 1.3's watch feed, reduced to the structure user.css relies on: info column (feed title, song, artist,
    // cover + progress, artist row), canvas column, button column (mute/close, actions, previous/next).
    const cover = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#c33"/></svg>');
    await page.evaluate(cover => {
      document.querySelector('.Root').insertAdjacentHTML('beforeend', `<div id="mock-feed" role="presentation" style="position:absolute;left:0;top:0;width:100%;height:100%;box-sizing:border-box;display:flex;justify-content:center;align-items:center;background:#000000e6;z-index:6">
        <div data-testid="watch-feed-view" style="--aspect-ratio:16 / 10;position:relative;display:flex;flex-direction:column;container-type:inline-size;width:min(85%,min(1680px,85vh * (var(--aspect-ratio))));aspect-ratio:var(--aspect-ratio);background-color:rgb(40,60,90)">
          <div style="display:flex;flex:1;position:relative">
            <div style="display:flex;flex-direction:column;flex-basis:50%"><div><span data-testid="watch-feed-title">Midnight Sun</span></div>
              <div><div><span><a href="/track/1">Midnight Sun</a></span></div><div><div><a href="/artist/1"><span>Zara Larsson</span></a></div></div>
                <div><div><img src="${cover}"></div><div role="progressbar" data-testid="watch-feed-progress-bar"><div style="inline-size:20%"></div></div></div></div>
              <div><div><a href="/artist/1">Zara Larsson</a><button class="mock-secondary">Follow</button></div><div><button class="e-10860-legacy-chip"><span>pop</span></button></div></div></div>
            <div style="display:flex;flex-basis:50%"><div style="position:absolute;top:0;width:41%;height:100%"><div><img src="${cover}"></div></div></div>
            <div style="display:flex;flex-direction:column;width:128px"><div><div><button aria-label="Unmute">m</button></div><button data-testid="watch-feed-close-button" aria-label="Close" onclick="document.getElementById('mock-feed').remove()">x</button></div>
              <div style="display:flex;flex-direction:column"><button aria-label="More">…</button><button aria-label="Add to queue">+</button></div>
              <div style="display:flex;flex-direction:column"><button data-testid="watch-feed-next-button" aria-label="Next"><span>Next</span></button></div></div>
          </div></div></div>`);
    }, cover);
    await page.waitForFunction(() => document.body.classList.contains('am-preview-open'));
    const look = await page.evaluate(() => {
      const view = document.querySelector('[data-testid="watch-feed-view"]'), cs = (e, p) => getComputedStyle(e, p);
      const close = document.querySelector('[data-testid="watch-feed-close-button"]'), pill = view.querySelector(':scope > div > div:first-child > div:first-child');
      return { marked: document.getElementById('mock-feed').hasAttribute('data-am-preview'), classes: ['am-pv-artwork'].map(c => document.body.classList.contains(c)),
        art: document.documentElement.style.getPropertyValue('--am-preview-art'), grid: cs(view.firstElementChild).display, pill: cs(pill).gridArea.split(' ')[0],
        close: [cs(close).width, cs(close).borderRadius], radius: cs(view).borderTopLeftRadius, dim: cs(document.getElementById('am-sidebar'), '::after').content,
        frost: cs(close).backdropFilter };
    });
    assert.ok(look.marked, 'the overlay is marked');
    assert.deepEqual(look.classes, [true], 'blurred artwork by default');
    assert.match(look.art, /^url\("data:image\/svg/, 'the cover feeds the artwork material');
    assert.deepEqual([look.grid, look.pill, look.close, look.radius], ['grid', 'pill', ['40px', '50%'], '26px']);
    assert.notEqual(look.dim, 'none', 'the sidebar dims with the page');
    assert.match(look.frost, /^(blur\(12px\) saturate\(1\.4\)|none)$/, 'frosted buttons (plain in Eco)');
    await shot('song-preview');
    // Settings: the window lists the backgrounds; Glass switches to the sheets' frosted glass and is saved.
    await settingsWindow.pick('previewMaterial', 'Cam');
    assert.deepEqual(await page.evaluate(() => [document.body.classList.contains('am-pv-glass'), document.body.classList.contains('am-pv-artwork'), getComputedStyle(document.querySelector('[data-testid="watch-feed-view"]'), '::before').content, JSON.parse(localStorage.getItem('mcloud:settings')).previewMaterial]), [true, false, 'none', 'glass']);
    await settingsWindow.pick('previewMaterial', 'Bulanık kapak');
    // A click on the dimmed sidebar closes it, as one on Spotify's backdrop does.
    await page.click('#am-sidebar', { position: { x: 100, y: 400 } });
    await page.waitForFunction(() => !document.getElementById('mock-feed') && !document.body.classList.contains('am-preview-open'));
    assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue('--am-preview-art')), '');
  });

  await check('Browse all tiles: Apple\'s Browse Categories (#75)', async () => {
    await page.evaluate(() => {
      const tile = (name, color) => `<div role="listitem" style="padding:12px"><a href="/genre/${name}" style="display:block;position:relative"><div style="background-color: ${color};position:relative;overflow:hidden;border-radius:8px;padding-bottom:56.25%"><img src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=" style="position:absolute;bottom:0;right:0;width:45%;transform:rotate(25deg)"><span style="position:absolute;padding:16px;font-size:24px"><span>${name}</span></span></div></a></div>`;
      document.querySelector('main').insertAdjacentHTML('afterbegin', `<section id="mock-browse" data-shelf="shelf"><div><h2>Browse all</h2></div><div class="main-gridContainer-gridContainer" style="--min-column-width:254px;display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--min-column-width),1fr))">${tile('Music', 'rgb(220, 20, 140)')}${tile('Pop', 'rgb(70, 130, 180)')}</div></section>`);
      Spicetify.Platform.History.push('/search');
    });
    await page.waitForFunction(() => document.body.classList.contains('am-search-open'));
    const look = () => page.evaluate(() => {
      const t = document.querySelector('#mock-browse a > div'), s = getComputedStyle(t.querySelector('span')), img = getComputedStyle(t.querySelector('img')), grid = getComputedStyle(document.querySelector('#mock-browse .main-gridContainer-gridContainer'));
      const item = t.closest('[role="listitem"]').getBoundingClientRect(), label = t.querySelector('span > span').getBoundingClientRect(), box = t.getBoundingClientRect();
      return { label: [s.fontSize, s.fontWeight, Math.round(box.bottom - label.bottom), Math.round(label.left - box.left)], img: img.visibility, duo: t.hasAttribute('data-am-duo') && getComputedStyle(t, '::before').backgroundImage.slice(0, 10), gap: grid.columnGap, pad: getComputedStyle(t.closest('[role="listitem"]')).paddingTop, h2: getComputedStyle(document.querySelector('#mock-browse h2')).fontSize, width: Math.round(item.width) };
    });
    // The whole picture becomes a duotone in the tile's colour, drawn once into a blob.
    await page.waitForFunction(() => document.querySelector('#mock-browse a > div')?.hasAttribute('data-am-duo'));
    const apple = await look();
    assert.deepEqual(apple.label.slice(0, 2), ['13px', '700'], 'the name is 13pt bold');
    assert.ok(apple.label[2] >= 11 && apple.label[2] <= 14 && apple.label[3] === 12, 'at the bottom left, 12pt in: ' + apple.label);
    assert.deepEqual([apple.img, apple.duo], ['hidden', 'url("blob:'], 'Spotify\'s tilted cover gives way to the duotone');
    // A white picture is the tile's colour (made as vivid as Apple's: 220,20,140 becomes 222,0,140), as a photo's whites
    // are in Apple's tiles.
    const pixel = await page.evaluate(async () => {
      const url = getComputedStyle(document.querySelector('#mock-browse a > div')).getPropertyValue('--am-duo').match(/blob:[^"]+/)[0];
      const bitmap = await createImageBitmap(await (await fetch(url)).blob()), canvas = new OffscreenCanvas(1, 1), context = canvas.getContext('2d');
      context.drawImage(bitmap, 0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
    });
    assert.deepEqual(pixel, [222, 0, 140]);
    assert.deepEqual([apple.gap, apple.pad, apple.h2], ['16px', '0px', '15px']);
    assert.ok(apple.width < 254, 'smaller tiles than Spotify\'s');
    // Only on Search: elsewhere Spotify's tiles keep their own look.
    await page.evaluate(() => Spicetify.Platform.History.push('/'));
    await page.waitForFunction(() => !document.body.classList.contains('am-search-open'));
    const off = await look();
    assert.deepEqual([off.label.slice(0, 2), off.duo], [['24px', '400'], false], 'Spotify\'s tiles off Search, the duotone released');
    await page.evaluate(() => document.getElementById('mock-browse').remove());
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

  await check('Now Playing sidebar: off, beside the player, sidebar only; Spotify lyrics, Canvas and Apple motion artwork', async () => {
    // In the settings window, on its Now Playing tab.
    const pick = (key, value) => settingsOf(page).pick(key, value);
    const rect = sel => page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }; }, sel);
    const requests = [];
    const onRequest = r => { if (/canvaz|m8tec|mvod/.test(r.url())) requests.push(r.url()); };
    page.on('request', onRequest);
    // Apple's motion artwork: m8tec's index, then the HLS master (an H.264 and an HEVC variant), then the variant's map.
    await page.route(/artwork\.m8tec\.top/, r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ url: 'https://mvod.itunes.apple.com/a/master.m3u8', url_tall: null }) }));
    await page.route(/mvod\.itunes\.apple\.com\/a\/master\.m3u8/, r => r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body: [
      '#EXTM3U', '#EXT-X-STREAM-INF:BANDWIDTH=900,CODECS="hvc1.2.20000000.L123.B0",RESOLUTION=768x768', 'hevc/768.m3u8',
      '#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=500,BANDWIDTH=600,CODECS="avc1.64001f",RESOLUTION=486x486', 'v/486.m3u8',
      '#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=900,BANDWIDTH=1000,CODECS="avc1.64001f",RESOLUTION=768x768', 'v/768.m3u8',
      '#EXT-X-STREAM-INF:BANDWIDTH=4000,CODECS="avc1.640020",RESOLUTION=1080x1080', 'v/1080.m3u8'].join('\n') }));
    await page.route(/mvod\.itunes\.apple\.com\/a\/v\/\d+\.m3u8/, r => r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' },
      body: '#EXTM3U\n#EXT-X-MAP:URI="clip-.mp4",BYTERANGE="898@0"\n#EXTINF:4,\n#EXT-X-BYTERANGE:5000@898\nclip-.mp4\n#EXT-X-ENDLIST' }));
    await page.route(/\.mp4$/, r => r.fulfill({ status: 200, contentType: 'video/mp4', body: 'not a video' }));
    try {
      // Off by default: no pane, nothing requested, the lyrics button as before. The Now Playing button is always in the
      // player. The player's optional buttons are named for the settings window's button picker.
      assert.ok(await page.evaluate(() => document.getElementById('am-nowplaying').hidden && !document.body.classList.contains('am-np-open')));
      assert.equal(await page.getAttribute('#am-lyrics-toggle', 'aria-label'), 'Spicy Lyrics sözlerini aç / kapat');
      assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#am-player [data-am-button]')].map(b => b.dataset.amButton).sort()),
        ['connect', 'love', 'lyrics', 'more', 'next', 'nowplaying', 'popup-lyrics', 'previous', 'queue', 'repeat', 'shuffle', 'volume']);
      assert.deepEqual(await page.evaluate(() => { const b = document.querySelector('#am-player .am-np-toggle'); return [b.hidden, b.getAttribute('aria-pressed'), b.title, b.dataset.amLabel]; }), [false, 'false', 'Şimdi Çalan\'ı göster', 'Şimdi Çalan']);
      assert.ok(await page.isVisible('#am-player .am-np-toggle'), 'the Now Playing button is always in the player');

      // The button turns the pane on (beside the player): a glass card that floats over the page like the queue sheet (same
      // inset, radius and shadow), so the page and the player keep their width. Spotify's lyrics under the cover.
      await page.evaluate(() => { window.__mockState.progress = 83000; });
      // Shown at once; saved after the frame that shows it.
      await page.click('#am-player .am-np-toggle');
      assert.ok(await page.isVisible('#am-nowplaying'));
      // It slides in; the geometry below is where it comes to rest.
      await page.waitForFunction(() => !document.querySelector('#am-nowplaying').getAnimations().length);
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('mcloud:settings')).nowPlaying === 'beside');
      // Out of the box: Spicy Lyrics' colours and lyrics (the cover's colours and Spotify's lyrics while Spicy's card is missing).
      assert.deepEqual(await page.evaluate(() => ['am-np-spicybg', 'am-np-artbg', 'am-np-spicy'].map(c => document.body.classList.contains(c))), [true, true, false]);
      const pane = await rect('#am-nowplaying');
      assert.ok(pane.right === 1424 && pane.top === 76 && pane.bottom === 900 - 96 && pane.width >= 300, JSON.stringify(pane));
      assert.deepEqual(await page.evaluate(() => { const c = getComputedStyle(document.getElementById('am-nowplaying')); return [c.borderRadius, c.boxShadow.includes('0px 18px 50px')]; }), ['18px', true]);
      assert.ok((await rect('.am-native-main')).right > 1430, 'the page runs under the card');
      assert.ok((await rect('#am-player')).bottom < pane.bottom + 96 && (await rect('#am-player')).top > pane.bottom, 'the player stays below the card');
      assert.equal(await page.textContent('#am-nowplaying .am-np-title .am-marquee-inner > span'), 'Nights');
      assert.ok(await page.isVisible('#am-player .am-transport'), 'the floating player keeps its controls');
      assert.equal(await page.locator('#am-nowplaying .am-transport').count(), 0, 'no second set of transport controls');
      assert.equal(await page.locator('#am-nowplaying .am-np-lyrics-toggle').count(), 0, 'no lyrics button in the pane');
      await page.waitForSelector('#am-nowplaying .am-np-line.am-current');
      assert.equal(await page.textContent('#am-nowplaying .am-np-line.am-current'), 'No, you can\'t make everybody equal');
      assert.ok(await page.evaluate(() => window.__cosmos.some(u => u.includes('spclient.wg.spotify.com/color-lyrics/v2/track/1?'))));
      // A line plays from where it is clicked.
      await page.click('#am-nowplaying .am-np-line >> nth=3');
      assert.equal(await page.evaluate(() => window.__mockState.progress), 90000);
      // The button turns it off again; the lyrics button is untouched.
      assert.deepEqual(await page.evaluate(() => { const b = document.querySelector('#am-player .am-np-toggle'); return [b.getAttribute('aria-pressed'), b.title]; }), ['true', 'Şimdi Çalan\'ı gizle']);
      await page.click('#am-player .am-np-toggle');
      // It slides out, then goes.
      await page.waitForFunction(() => document.getElementById('am-nowplaying').hidden && !document.body.classList.contains('am-np-open'));
      assert.equal(await page.getAttribute('#am-player .am-np-toggle', 'aria-pressed'), 'false');
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('mcloud:settings')).nowPlaying === 'off');
      assert.equal(await page.getAttribute('#am-lyrics-toggle', 'aria-label'), 'Spicy Lyrics sözlerini aç / kapat');
      await page.click('#am-player .am-np-toggle');
      assert.ok(await page.isVisible('#am-nowplaying'));

      // Full screen without Spicy Lyrics: the pane fills the window, artwork left and lyrics right, the floating player
      // over it; lyrics kept for full screen only show there. Esc or the button again brings the card back as it was.
      await pick('npLyricsPlace', 'Yalnızca tam ekranda');
      assert.ok(!(await page.isVisible('#am-nowplaying .am-np-lyrics')) && await page.isVisible('#am-nowplaying .am-np-art'));
      assert.equal(await page.getAttribute('#am-nowplaying .am-np-fullscreen', 'title'), 'Tam ekran sözler');
      await page.evaluate(() => { window.__mockState.progress = 125000; });
      await page.click('#am-nowplaying .am-np-fullscreen');
      const full = await rect('#am-nowplaying');
      assert.ok(full.left === 0 && full.top === 0 && full.right === 1440 && full.bottom === 900, JSON.stringify(full));
      await page.waitForSelector('#am-nowplaying .am-np-line.am-current');
      assert.equal(await page.textContent('#am-nowplaying .am-np-line.am-current'), 'Every day patches the night up');
      assert.ok((await rect('#am-nowplaying .am-np-lyrics')).left > (await rect('#am-nowplaying .am-np-art')).right, 'lyrics right of the artwork');
      assert.ok(await page.evaluate(() => { const box = document.querySelector('#am-nowplaying .am-np-lyrics'), line = box.querySelector('.am-current'); return line.offsetTop >= box.scrollTop && line.offsetTop < box.scrollTop + box.clientHeight; }));
      assert.ok(await page.evaluate(() => { const r = document.querySelector('#am-player .am-play').getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('#am-player'); }), 'the player stays on top');
      assert.deepEqual([await page.getAttribute('#am-nowplaying .am-np-fullscreen', 'aria-pressed'), await page.getAttribute('#am-nowplaying .am-np-fullscreen', 'title')], ['true', 'Tam ekrandan çık']);
      await page.keyboard.press('Escape');
      assert.ok(!(await page.evaluate(() => document.body.classList.contains('am-np-full'))) && !(await page.isVisible('#am-nowplaying .am-np-lyrics')));
      assert.deepEqual(await rect('#am-nowplaying'), pane);
      await page.click('#am-nowplaying .am-np-fullscreen');
      await page.click('#am-nowplaying .am-np-fullscreen');
      assert.ok(!(await page.evaluate(() => document.body.classList.contains('am-np-full'))));
      await pick('npLyricsPlace', 'Kapağın altında');

      // Plain (Apple Music's lyrics pane): opaque, no artwork or header, only the lyrics; paused every line is grey, playing
      // the line being sung is bright; the pane's buttons show on hover.
      await pick('npBg', 'Sade (Apple)');
      await page.waitForSelector('#am-nowplaying .am-np-line.am-current');
      const plain = () => page.evaluate(() => { const np = document.getElementById('am-nowplaying'), shown = s => !!np.querySelector(s)?.getClientRects().length;
        return { bg: getComputedStyle(np).backgroundColor, art: shown('.am-np-art'), meta: shown('.am-np-meta'), lyrics: shown('.am-np-lyrics'), current: getComputedStyle(np.querySelector('.am-np-line.am-current')).opacity, other: getComputedStyle(np.querySelector('.am-np-line:not(.am-current)')).opacity }; });
      await page.evaluate(() => { window.__mockState.playing = false; window.__firePlayer('onplaypause'); });
      await page.waitForFunction(() => !document.getElementById('am-nowplaying').classList.contains('am-np-playing'));
      // The line fades over .35s; wait for it to settle (slow CI runners) rather than a fixed time.
      await page.waitForFunction(() => getComputedStyle(document.querySelector('#am-nowplaying .am-np-line.am-current')).opacity === '0.42');
      assert.deepEqual(await plain(), { bg: 'rgb(44, 44, 44)', art: false, meta: false, lyrics: true, current: '0.42', other: '0.42' });
      await page.evaluate(() => { window.__mockState.playing = true; window.__firePlayer('onplaypause'); });
      await page.waitForFunction(() => getComputedStyle(document.querySelector('#am-nowplaying .am-np-line.am-current')).opacity === '1');
      await pick('npBg', 'Kapak renkleri');

      // With Spicy Lyrics, beside the player, the full-screen button opens Spicy's page (its own button, clicked) in either
      // layout; while that page is open the pane steps aside, so the lyrics never show twice, and it comes back as it was
      // when the page closes. The player's lyrics button keeps opening that page.
      await page.evaluate(() => { const H = Spicetify.Platform.History, b = document.createElement('button'); b.id = 'SpicyLyrics_PageButton';
        b.onclick = () => { window.__spicyClicks = (window.__spicyClicks || 0) + 1; H.push(H.location.pathname === '/SpicyLyrics' ? '/' : '/SpicyLyrics'); }; document.body.append(b); });
      const route = () => page.evaluate(() => Spicetify.Platform.History.location.pathname);
      const paneShown = () => page.evaluate(() => !document.getElementById('am-nowplaying').hidden && document.body.classList.contains('am-np-open'));
      for (const layout of ['Cam kart', 'Kenara yapışık']) {
        await pick('npLayout', layout);
        const before = await rect('#am-nowplaying');
        await page.waitForFunction(() => document.querySelector('#am-nowplaying .am-np-fullscreen').title === 'Spicy Lyrics\'te aç');
        await page.click('#am-nowplaying .am-np-fullscreen');
        await page.waitForFunction(() => document.getElementById('am-nowplaying').hidden);
        assert.deepEqual([await route(), await paneShown(), await page.evaluate(() => document.body.classList.contains('am-np-full'))], ['/SpicyLyrics', false, false], layout);
        await page.click('#am-lyrics-toggle');
        assert.equal(await route(), '/');
        await page.waitForFunction(() => !document.getElementById('am-nowplaying').hidden && !document.querySelector('#am-nowplaying').getAnimations().length);
        assert.deepEqual(await rect('#am-nowplaying'), before, 'the pane comes back as it was: ' + layout);
      }
      assert.equal(await page.evaluate(() => window.__spicyClicks), 4);
      await pick('npLayout', 'Cam kart');

      // Spicy Lyrics as the lyrics source: Spicy's card lives in Spotify's own Now Playing view (the right column), so the
      // pane steps aside and that column takes its place and shape, the card expanded by its own button and its header
      // hidden. Without the card (the queue took the column) the pane comes back; back on Spotify the card shrinks again.
      // The mock keeps outgoing panels mounted; Spotify unmounts them, so only the current view stays here.
      const addCard = () => page.evaluate(() => { document.getElementById('SpicyLyricsNPVCard')?.remove(); const aside = [...document.querySelectorAll('.am-native-right aside[data-testid="mock-npv"]')].pop();
        document.querySelectorAll('.am-native-right aside').forEach(a => { if (a !== aside) a.parentElement.remove(); });
        aside.insertAdjacentHTML('beforeend', '<div id="SpicyLyricsNPVCard" class="Collapsed"><div class="CardHeader"><span>Lyrics</span><button id="NPVCardMaximize"></button></div><div class="CardBody"><div id="SpicyLyricsPage" class="CardMode" style="position:absolute;inset:0"></div></div></div>');
        // Spicy's "Animated Background": a canvas over the whole view.
        aside.insertAdjacentHTML('afterbegin', '<canvas class="spicy-dynamic-bg" style="position:absolute;inset:0;width:100%;height:100%;z-index:-1"></canvas>');
        // Expanded, Spicy hides the view's other sections (here the cover).
        aside.querySelector('#NPVCardMaximize').onclick = e => { window.__expandClicks = (window.__expandClicks || 0) + 1; const c = e.target.closest('#SpicyLyricsNPVCard'); c.classList.remove('Collapsed'); c.classList.toggle('Expanded'); aside.querySelector('img').hidden = c.classList.contains('Expanded'); }; });
      const paneRect = await rect('#am-nowplaying');
      await addCard();
      await pick('npLyricsSource', 'Spicy Lyrics');
      await page.waitForFunction(() => document.body.classList.contains('am-np-spicy'));
      const spicyState = () => page.evaluate(() => { const c = document.getElementById('SpicyLyricsNPVCard'), col = document.querySelector('.am-native-right'), r = col.getBoundingClientRect();
        return { pane: !document.getElementById('am-nowplaying').hidden, card: c?.className, header: !!c?.querySelector('.CardHeader').getClientRects().length,
          page: c && Math.round(c.querySelector('#SpicyLyricsPage').getBoundingClientRect().left - r.left), radius: getComputedStyle(col).borderTopLeftRadius,
          col: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width } }; });
      // Under the artwork: the column takes the pane's place and draws the background; the pane, cleared and cut where its
      // lyrics start, keeps its artwork and title on top.
      let state = await spicyState();
      const lyricsTop = (await rect('#am-nowplaying .am-np-lyrics')).top;
      assert.deepEqual([state.pane, state.card, state.header, state.page], [true, 'Expanded', false, 0]);
      // The cut is measured by a ResizeObserver, a frame after the switch.
      await page.waitForFunction(top => Math.abs(document.getElementById('SpicyLyricsNPVCard').getBoundingClientRect().top - top) <= 1, lyricsTop);
      const asideTop = await page.evaluate(() => document.getElementById('SpicyLyricsNPVCard').getBoundingClientRect().top);
      assert.deepEqual([state.col, Math.abs(asideTop - lyricsTop) <= 1], [paneRect, true], 'one background in the pane\'s place; Spicy\'s view starts where the lyrics did');
      const topAt = (x, y) => page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e?.closest('.am-native-right') ? 'column' : e?.closest('#am-nowplaying') ? 'pane' : e?.tagName; }, [x, y]);
      const art = await rect('#am-nowplaying .am-np-cover');
      assert.deepEqual([await topAt(art.left + 20, art.top + 20), await topAt(state.col.left + state.col.width / 2, lyricsTop + 40)], ['pane', 'column']);
      // Spicy Lyrics' colours (the default background): Spicy's own moving background fills the whole sidebar, behind the
      // artwork too; with another background it is hidden.
      const spicyBg = () => page.evaluate(() => { const c = [...document.querySelectorAll('.am-native-right aside > .spicy-dynamic-bg')].pop(), r = c.getBoundingClientRect(); return c.getClientRects().length ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width } : null; });
      assert.equal(await spicyBg(), null, 'hidden with the artwork colours');
      await pick('npBg', 'Spicy Lyrics');
      assert.deepEqual(await spicyBg(), paneRect, 'Spicy\'s colours fill the sidebar');
      assert.ok(await page.evaluate(() => document.body.classList.contains('am-np-artbg')), 'the cover\'s colours stay under them');
      await pick('npBg', 'Kapak renkleri');
      // Plain: the column is the whole sidebar.
      await pick('npBg', 'Sade (Apple)');
      await page.waitForFunction(() => document.getElementById('am-nowplaying').hidden);
      state = await spicyState();
      assert.deepEqual([state.pane, state.radius, state.col], [false, '18px', paneRect]);
      assert.ok(await page.evaluate(() => { const c = document.querySelector('.am-native-right'), r = c.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.am-native-right') === c; }), 'Spicy\'s column is on top');
      await pick('npLayout', 'Kenara yapışık');
      state = await spicyState();
      assert.deepEqual([state.col.top, state.col.right, state.radius], [0, await page.evaluate(() => innerWidth), '0px'], 'docked: full height at the edge, square corners');
      assert.ok(await page.evaluate(() => [...document.querySelectorAll('.am-native-right [data-am-np-fill]')].every(n => getComputedStyle(n).borderTopLeftRadius === '0px')), 'no rounded corner inside the column');
      await pick('npLayout', 'Cam kart');
      await page.evaluate(() => document.querySelector('[data-testid="control-button-queue"]').click());
      const lastPanel = () => [...document.querySelectorAll('.right aside')].pop();
      await page.waitForFunction(`(${lastPanel})().getAttribute('aria-label') === 'Sıraya Ekle' && !document.getElementById('am-nowplaying').hidden && !document.body.classList.contains('am-np-spicy')`);
      await page.evaluate(`(${lastPanel})().querySelector('button[aria-label="Kapat"]').click()`);
      await page.waitForFunction(`(${lastPanel})().dataset.testid === 'mock-npv'`);
      await addCard();
      await page.waitForFunction(() => document.body.classList.contains('am-np-spicy') && document.getElementById('am-nowplaying').hidden);
      await page.waitForFunction(() => document.getElementById('SpicyLyricsNPVCard').classList.contains('Expanded'));
      await pick('npLyricsSource', 'Spotify');
      state = await spicyState();
      assert.deepEqual([state.pane, state.card, await page.evaluate(() => document.body.classList.contains('am-np-spicy'))], [true, '', false], 'back on Spotify\'s lyrics');
      assert.equal(await page.evaluate(() => window.__expandClicks), 3);
      await page.evaluate(() => document.getElementById('SpicyLyricsNPVCard').remove());
      await pick('npBg', 'Kapak renkleri');
      await page.evaluate(() => document.getElementById('SpicyLyrics_PageButton').remove());
      // The × turns the pane off, and so does the player's "…" menu.
      await page.click('#am-nowplaying .am-np-close');
      await page.waitForFunction(() => document.getElementById('am-nowplaying').hidden && !document.body.classList.contains('am-np-open'));
      await page.click('#am-player .am-np-toggle');
      await page.click('#am-player .am-more');
      await page.click('#am-popover .am-popover-item:has-text("Şimdi Çalan\'ı Gizle")');
      await page.waitForFunction(() => document.getElementById('am-nowplaying').hidden);
      await page.click('#am-player .am-np-toggle');
      assert.ok(await page.isVisible('#am-nowplaying'));

      // Sidebar only: the floating player goes, its own controls move into the pane and still work.
      await pick('nowPlaying', 'Yalnızca panel');
      assert.ok(!(await page.isVisible('#am-player')));
      assert.equal(await page.locator('#am-nowplaying .am-np-controls .am-transport').count(), 1);
      assert.equal(await page.locator('#am-nowplaying .am-np-controls .am-scrub .am-seek').count(), 1);
      assert.equal(await page.locator('#am-nowplaying .am-np-actions [aria-label="Çalma sırası"]').count(), 1);
      assert.ok(await page.isVisible('#am-nowplaying .am-time-elapsed'), 'the times show without hovering');
      const playing = await page.evaluate(() => window.__mockState.playing);
      await page.click('#am-nowplaying .am-transport .am-play');
      assert.equal(await page.evaluate(() => window.__mockState.playing), !playing);
      await page.click('#am-nowplaying .am-transport .am-play');
      await pick('npLayout', 'Kenara yapışık');
      const docked = await rect('#am-nowplaying');
      assert.ok(docked.top === 0 && docked.right === 1440, JSON.stringify(docked));

      // Spotify Canvas: Spotify's Chromium cannot decode the clip (H.264), so the pane shows the frames of the clip Spotify's own
      // (hidden) Now Playing view plays, through captureStream(), and requests nothing itself.
      await page.evaluate(() => {
        const c = document.createElement('canvas'); c.width = 90; c.height = 160; const x = c.getContext('2d');
        window.__canvasTimer = setInterval(() => { x.fillStyle = `hsl(${Date.now() / 10 % 360} 70% 50%)`; x.fillRect(0, 0, 90, 160); }, 50);
        const v = document.createElement('video'); v.id = 'mock-canvas'; v.muted = true; v.srcObject = c.captureStream(20); v.play().catch(() => {});
        document.querySelector('[data-testid="mock-npv"]').append(v); window.__mockState.playing = true;
      });
      await pick('npArt', 'Spotify Canvas');
      // The frames are shared (srcObject); the clip shows once it plays, which headless Chrome may delay.
      await page.waitForFunction(() => document.querySelector('#am-nowplaying .am-np-bleed').srcObject instanceof MediaStream && document.getElementById('am-nowplaying').classList.contains('am-np-bleed-canvas'), null, { timeout: 10000 });
      assert.ok(!requests.some(u => u.includes('canvaz')), requests.join());
      // A track without Canvas: the still cover.
      await page.evaluate(() => { delete Spicetify.Player.data.item.metadata['canvas.url']; });
      await page.evaluate(() => window.__firePlayer('songchange'));
      await page.waitForFunction(() => !document.querySelector('#am-nowplaying .am-np-bleed').srcObject);
      await page.evaluate(() => { Spicetify.Player.data.item.metadata['canvas.url'] = 'https://canvaz.scdn.co/upload/mock/video/nights.cnvs.mp4'; clearInterval(window.__canvasTimer); document.getElementById('mock-canvas').remove(); });

      // Apple's motion artwork is H.264 (or HEVC): offered only where the browser plays it (Spotify's Chromium does not).
      const h264 = await page.evaluate(() => !!document.createElement('video').canPlayType('video/mp4; codecs="avc1.64001f"'));
      const appleItems = await page.evaluate(() => {
        if (!document.getElementById('am-settings')) window.__menuItems.find(i => i.name === 'mcloud Ayarları').onClick();
        [...document.querySelectorAll('#am-settings .am-settings-tab')].find(t => t.textContent === 'Şimdi Çalan').click();
        const c = document.querySelector('#am-settings [data-key="npArt"] .am-settings-control'); c.click();
        const n = [...document.querySelectorAll('#am-popover .am-popover-item')].filter(o => o.textContent.includes('Apple Music')).length;
        c.click(); document.querySelector('#am-settings .am-settings-close').click(); return n;
      });
      assert.equal(appleItems, h264 ? 2 : 0);
      if (h264) {
        // Tagged lookup, the H.264 variant nearest the pane, the variant's MP4.
        await pick('npArt', 'Apple Music (kare)');
        await page.waitForFunction(() => JSON.parse(localStorage.getItem('mcloud:motion') || '{}')['spotify:album:0']?.url);
        const lookup = new URL(requests.find(u => u.includes('m8tec')));
        assert.deepEqual([lookup.searchParams.get('artist'), lookup.searchParams.get('album')], ['Frank Ocean', 'Blonde']);
        assert.match(lookup.searchParams.get('client'), /^mcloud-spicetify\/\d/);
        assert.ok(!requests.some(u => u.includes('hevc')), 'HEVC variants are skipped');
        for (let i = 0; i < 50 && !requests.some(u => u.endsWith('/a/v/clip-.mp4')); i++) await page.waitForTimeout(100);
        assert.ok(requests.some(u => u.endsWith('/a/v/clip-.mp4')), requests.join());
        await page.waitForFunction(() => !document.querySelector('#am-nowplaying .am-np-motion').getAttribute('src'));
      }
    } finally {
      page.off('request', onRequest);
      await page.unrouteAll({ behavior: 'ignoreErrors' });
      // The rows below the first show only while the pane is on; a failure above may have left it off.
      for (const [key, value] of [['nowPlaying', 'Oynatıcının yanında'], ['npArt', 'Kapalı (sabit kapak)'], ['npLayout', 'Cam kart'], ['nowPlaying', 'Kapalı']]) await pick(key, value).catch(() => {});
    }
    // Back off: the controls are home in the floating player, the pane is gone.
    assert.ok(await page.isVisible('#am-player .am-transport'));
    assert.equal(await page.locator('#am-player .am-player-track > .am-scrub .am-seek').count(), 1);
    assert.equal(await page.locator('#am-player .am-player-extras > .am-volume-wrap:last-child').count(), 1);
    await page.waitForFunction(() => document.getElementById('am-nowplaying').hidden && !document.body.classList.contains('am-np-only'), null, { timeout: 3000 }).catch(() => {});
    assert.ok(await page.evaluate(() => document.getElementById('am-nowplaying').hidden && !document.body.classList.contains('am-np-only')));
    assert.equal(await page.getAttribute('#am-lyrics-toggle', 'aria-label'), 'Spicy Lyrics sözlerini aç / kapat', 'off again: the lyrics button drives Spicy Lyrics');
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
      assert.deepEqual(await english.evaluate(() => window.__menuItems.map(i => i.name)), ['mcloud Settings']);
      const englishSettings = settingsOf(english);
      assert.equal(await englishSettings.state('lang'), 'Automatic');
      assert.deepEqual(await english.locator('#am-settings .am-settings-tab').allTextContents(), ['General', 'Appearance', 'Player', 'Sidebar', 'Albums & Playlists', 'Now Playing', 'Home']);
      await Promise.all([english.waitForEvent('load'), englishSettings.pick('lang', 'Türkçe', true)]);
      await english.waitForSelector('body.am-ready #am-sidebar');
      assert.equal(await english.textContent('#am-sidebar .am-nav-row >> nth=1'), 'Ana Sayfa');
      assert.equal(JSON.parse(await english.evaluate(() => localStorage.getItem('mcloud:settings'))).lang, 'tr');
      assert.deepEqual(englishErrors, []);
    } finally { await english.close(); }
  });

  await check('Spicetify without its webpack bindings (2.46.2 cold start): the player, CosmosAsync and Spotify labels still work', async () => {
    const bare = await browser.newPage({ viewport: { width: 1440, height: 900 } }), bareErrors = [];
    bare.on('pageerror', e => bareErrors.push(e.message));
    try {
      await bare.goto(pathToFileURL(path.join(here, 'preview.html')).href + '?spicetify=nobindings');
      await bare.waitForSelector('body.am-ready #am-sidebar');
      // The theme gives Spicetify the two getters its bindings add; Spicetify's own loops then set Player.data and CosmosAsync.
      assert.deepEqual(await bare.evaluate(() => window.__amSpicetifyRepairs), ['Player.origin', 'GraphQL.Request']);
      assert.equal(await bare.evaluate(() => Spicetify.Player.origin === Spicetify.Platform.PlayerAPI && Spicetify.GraphQL.Request === Spicetify.Platform.GraphQLLoader), true);
      await bare.waitForFunction(() => Spicetify.Player.data?.item && Spicetify.CosmosAsync?.get);
      await bare.waitForFunction(() => document.querySelector('#am-player')?.textContent.includes('Nights'));
      // Language from Platform.Session, Spotify's labels from Platform.Translations (Spicetify.Locale's own dictionary).
      assert.equal(await bare.textContent('#am-sidebar .am-nav-row >> nth=1'), 'Ana Sayfa');
      assert.match(await bare.$eval('#am-star-style', e => e.textContent), /Kitaplığına Kaydet/);
      assert.deepEqual(bareErrors, []);
    } finally { await bare.close(); }
  });

  await check('Marketplace installs move to GitHub Pages, and a stamped theme.js loads its own commit\'s CSS', async () => {
    // A local copy (the preview) has no Marketplace and no stamp: nothing is written or fetched.
    assert.deepEqual(await page.evaluate(async () => [await __amPages.migration, await __amPages.css]), ['not-active', 'unstamped']);
    const sha = 'a'.repeat(40), REPO = 'mcloudHQ/mcloud', OLD_REPO = 'bulutakbulutt/mcloud', PAGES = 'https://mcloudhq.github.io/mcloud/';
    const source = fs.readFileSync(path.join(here, '..', 'theme.js'), 'utf8');
    const stamped = source.replace("const BUILD = 'dev'", `const BUILD = '${sha}'`);
    assert.notEqual(stamped, source, 'theme.js keeps the BUILD the Pages deploy stamps');
    const ctx = await browser.newContext(), fetched = [];
    try {
      const mp = await ctx.newPage();
      await mp.route('https://xpui.app.spotify.com/**', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' }));
      await mp.route('https://cdn.jsdelivr.net/**', r => { fetched.push(r.request().url()); r.fulfill({ contentType: 'text/css', headers: { 'access-control-allow-origin': '*' }, body: '/* AppleMusicMac at the commit */' }); });
      let pagesUp = false;
      await mp.route('https://mcloudhq.github.io/**', r => r.fulfill({ status: pagesUp ? 200 : 404, headers: { 'access-control-allow-origin': '*' }, body: '' }));
      // What Marketplace 1.0.12 keeps for an install from the old manifest (Dexie db, IDB version 20, store "settings"),
      // made before the repo moved to mcloudHQ, and the CSS it injected: Pages' other build.
      const key = `marketplace:installed:${OLD_REPO}/user.css`, old = `https://cdn.jsdelivr.net/gh/${OLD_REPO}@main/theme.js`;
      const record = { manifest: { name: 'mcloud', usercss: 'user.css', include: [old] }, type: 'theme', user: 'bulutakbulutt', repo: 'mcloud', branch: 'main',
        cssURL: `https://raw.githubusercontent.com/${OLD_REPO}/main/user.css`, include: [old], schemes: { Dark: { text: 'ffffff' } }, activeScheme: 'Dark' };
      const start = async css => {
        await mp.goto('https://xpui.app.spotify.com/index.html');
        await mp.evaluate(css => { const s = document.body.appendChild(document.createElement('style')); s.className = 'marketplaceCSS marketplaceUserCSS'; s.textContent = css; }, css);
        await mp.addScriptTag({ content: stamped });
        return mp.evaluate(async () => ({ migration: await __amPages.migration, css: await __amPages.css, style: document.querySelector('style.marketplaceUserCSS').textContent }));
      };
      await mp.goto('https://xpui.app.spotify.com/index.html');
      await mp.evaluate(rows => new Promise((res, rej) => {
        const q = indexedDB.open('spicetify-marketplace', 20);
        q.onupgradeneeded = () => q.result.createObjectStore('settings', { keyPath: 'key' });
        q.onerror = () => rej(q.error);
        q.onsuccess = () => { const db = q.result, tx = db.transaction('settings', 'readwrite'); for (const r of rows) tx.objectStore('settings').put(r); tx.oncomplete = () => { db.close(); res(); }; };
      }), [{ key: 'marketplace:theme-installed', value: key }, { key, value: JSON.stringify(record) }]);
      // Pages not live yet (the owner has not enabled it): the install keeps its URLs.
      const early = await start('/* AppleMusicMac 2.8 */');
      assert.deepEqual([early.migration, early.css], ['pages-down', 'replaced']);
      pagesUp = true; fetched.length = 0;
      const first = await start(`/* mcloud build ${'b'.repeat(40)} */\n/* AppleMusicMac 2.8 */`);
      assert.equal(first.migration, 'migrated');
      assert.equal(first.css, 'replaced');
      assert.equal(first.style, `/* mcloud build ${sha} */\n/* AppleMusicMac at the commit */`);
      assert.deepEqual(fetched, [`https://cdn.jsdelivr.net/gh/${REPO}@${sha}/user.css`]);
      const stored = JSON.parse(await mp.evaluate(key => new Promise(res => { indexedDB.open('spicetify-marketplace').onsuccess = e => {
        e.target.result.transaction('settings').objectStore('settings').get(key).onsuccess = g => res(g.target.result.value); }; }), key));
      assert.deepEqual([stored.cssURL, stored.include, stored.manifest.include, stored.manifest.usercss, stored.activeScheme],
        [PAGES + 'user.css', [PAGES + 'theme.js'], [PAGES + 'theme.js'], 'user.css', 'Dark']);
      // Next start: nothing left to migrate. A CSS with no stamp (from jsDelivr) is replaced too.
      const second = await start('/* AppleMusicMac 2.8 */');
      assert.equal(second.migration, 'unchanged');
      assert.equal(second.css, 'replaced');
      assert.equal(fetched.length, 2);
      const third = await start(`/* mcloud build ${sha} */\n/* AppleMusicMac 2.8 */`);
      assert.deepEqual([third.migration, third.css, fetched.length], ['unchanged', 'match', 2]);
      // An install made after the move (Marketplace's owner casing): theme.js already from Pages, the CSS from
      // jsDelivr, which moves too.
      const newKey = 'marketplace:installed:mcloudHQ/mcloud/user.css', pagesJs = PAGES + 'theme.js';
      const newRecord = { ...record, user: 'mcloudHQ', manifest: { ...record.manifest, include: [pagesJs] }, include: [pagesJs], cssURL: `https://cdn.jsdelivr.net/gh/${REPO}@main/user.css` };
      await mp.evaluate(rows => new Promise(res => { indexedDB.open('spicetify-marketplace').onsuccess = e => { const db = e.target.result, tx = db.transaction('settings', 'readwrite');
        for (const r of rows) tx.objectStore('settings').put(r); tx.oncomplete = () => { db.close(); res(); }; }; }), [{ key: 'marketplace:theme-installed', value: newKey }, { key: newKey, value: JSON.stringify(newRecord) }]);
      assert.equal((await start(`/* mcloud build ${sha} */\n/* AppleMusicMac 2.8 */`)).migration, 'migrated');
      const moved = JSON.parse(await mp.evaluate(key => new Promise(res => { indexedDB.open('spicetify-marketplace').onsuccess = e => {
        e.target.result.transaction('settings').objectStore('settings').get(key).onsuccess = g => res(g.target.result.value); }; }), newKey));
      assert.deepEqual([moved.cssURL, moved.include], [PAGES + 'user.css', [pagesJs]]);
    } finally { await ctx.close(); }
  });

  await check('settings fallback: the mcloud submenu, drawn from the same definitions, when the window cannot open', async () => {
    const other = await browser.newPage({ viewport: { width: 1440, height: 900 } }), otherErrors = [];
    other.on('pageerror', e => otherErrors.push(e.message));
    try {
      // A Spicetify whose menu items cannot register: the submenu, as before the window.
      await other.goto(pathToFileURL(path.join(here, 'preview.html')).href + '?menu=submenu');
      await other.waitForSelector('body.am-ready #am-sidebar');
      const names = () => other.evaluate(() => window.__menus[0]?.items.map(i => i.name));
      const list = await names();
      // Every definition but the window's own, in tab order (General first); a choice gives a row per option.
      assert.equal(list[0], 'Dil: Otomatik');
      assert.ok(['Dil: Türkçe', 'Renk: Spotify Yeşili', 'Oynatıcıda albüm kapağı', 'Düğme: Karıştır', 'Son listeler: 20', 'Çalma listelerinde parça numaraları'].every(n => list.includes(n)));
      assert.ok(list.includes('Renk: Mavi') && list.includes('Cam efekti: Eko') && list.includes('Son listeler: Yok'));
      await other.evaluate(() => window.__menus[0].items.find(i => i.name === 'Liquid Glass oynatıcı').onClick());
      assert.ok(await other.evaluate(() => !document.body.classList.contains('am-liquid') && window.__menus[0].items.find(i => i.name === 'Liquid Glass oynatıcı').checked === false));
      await other.evaluate(() => window.__menus[0].items.find(i => i.name === 'Liquid Glass oynatıcı').onClick());
      // Saved values of settings this build does not define are kept when it saves.
      await other.evaluate(() => localStorage.setItem('mcloud:settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('mcloud:settings')), futureKey: 'kept' })));
      // A window that fails to open: the entry gives way to the submenu, and a toast says where the settings went.
      await other.goto(pathToFileURL(path.join(here, 'preview.html')).href);
      await other.waitForSelector('body.am-ready #am-sidebar');
      await other.evaluate(() => { const append = document.body.append; document.body.append = () => { throw new Error('test'); }; try { window.__menuItems.find(i => i.name === 'mcloud Ayarları').onClick(); } finally { document.body.append = append; } });
      assert.deepEqual(await other.evaluate(() => [window.__menuItems.length, window.__menus.length, document.getElementById('am-settings')]), [0, 1, null]);
      assert.match(await other.textContent('.am-toasts > :last-child'), /mcloud/);
      const artwork = await other.evaluate(() => JSON.parse(localStorage.getItem('mcloud:settings')).artwork);
      await other.evaluate(() => window.__menus[0].items.find(i => i.name === 'Oynatıcıda albüm kapağı').onClick());
      assert.deepEqual(await other.evaluate(() => { const s = JSON.parse(localStorage.getItem('mcloud:settings')); return [s.futureKey, s.artwork]; }), ['kept', !artwork]);
      assert.deepEqual(otherErrors, []);
    } finally { await other.close(); }
  });

  await check('stored settings: a twice-encoded value is read through, digit keys from a spread string are dropped', async () => {
    const other = await browser.newPage({ viewport: { width: 1440, height: 900 } }), otherErrors = [];
    other.on('pageerror', e => otherErrors.push(e.message));
    const before = await page.evaluate(() => localStorage.getItem('mcloud:settings'));
    const stored = () => other.evaluate(() => JSON.parse(localStorage.getItem('mcloud:settings')));
    const load = async value => {
      await other.evaluate(v => localStorage.setItem('mcloud:settings', v), value);
      await other.reload(); await other.waitForSelector('body.am-ready #am-sidebar');
      await other.evaluate(() => window.__menuItems.find(i => i.name === 'mcloud Ayarları').onClick());
      await other.click('#am-settings .am-settings-tab:has-text("Oynatıcı")');
      await other.click('#am-settings [data-key="artwork"] .am-settings-switch');
      await other.click('#am-settings .am-settings-ok');
    };
    try {
      await other.goto(pathToFileURL(path.join(here, 'preview.html')).href);
      await other.waitForSelector('body.am-ready #am-sidebar');
      // Twice encoded: read through, and saved back as a plain object.
      await load(JSON.stringify(JSON.stringify({ accent: 'green', recent: 3, artwork: true, futureKey: 'kept' })));
      assert.equal(await other.evaluate(() => document.documentElement.style.getPropertyValue('--am-accent')), '#30d158');
      let s = await stored();
      assert.deepEqual([typeof s, s.accent, s.recent, s.artwork, s.futureKey], ['object', 'green', 3, false, 'kept']);
      // A string spread into the object: its digit keys go, the real ones stay.
      const junk = Object.assign({ accent: 'teal', artwork: true }, { ...'{"appearance":"light"}' });
      await load(JSON.stringify(junk));
      s = await stored();
      assert.deepEqual([Object.keys(s).filter(k => /^\d+$/.test(k)).length, s.accent, s.artwork], [0, 'teal', false]);
      // Anything but an object reads as nothing saved.
      await load('[1,2]');
      assert.equal(Array.isArray(await stored()), false);
      assert.deepEqual(otherErrors, []);
    } finally { await other.evaluate(v => localStorage.setItem('mcloud:settings', v), before); await other.close(); }
  });

  await check('Home: Apple cards with "…", mix covers redrawn from the photo their image names', async () => {
    // A 1x1 PNG for Spotify's image CDNs, which send CORS headers as these do.
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');
    for (const host of ['https://pickasso.spotifycdn.com/**', 'https://i.scdn.co/**'])
      await page.route(host, r => r.fulfill({ contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: png }));
    await page.evaluate(() => { Spicetify.GraphQL.Request = window.__graphqlRequest; });
    await page.evaluate(() => {
      const card = (name, src) => `<div data-encore-id="card" role="listitem" style="position:relative"><div class="card__on-click" style="position:absolute;inset:0" onclick="window.__cardOpened=true"></div><div style="pointer-events:none"><div class="mock-art" style="position:relative;padding-bottom:100%"><div><img style="position:absolute;inset:0;width:100%;height:100%" src="${src}"></div><div style="position:absolute;left:8px;bottom:8px;pointer-events:auto"><div><button data-encore-id="buttonPrimary"><span></span></button></div></div></div></div><a><p data-encore-id="cardTitle" style="height:0"><span><span>${name}</span></span></p></a></div>`;
      const pick = 'https://pickasso.spotifycdn.com/image/ab67c0de0000deef/dt/v1/img/';
      const s = document.createElement('section');s.id = 'mock-home';s.dataset.testid = 'component-shelf';s.style.width = '600px';
      s.innerHTML = '<div style="display:flex">' + card('Daily Mix 2', pick + 'daily/2/ab6761610000e5eb97f323784adb2a66291c0cd4/en') + card('Chill Mix', pick + 'topic/chill/0ECwFtbIWEVNwjlrfc6xoL/en')
        + card('Ginkgo Radio', pick + 'radio/track/1Czqh6tbb9gqCQpSkXsqDT/en') + card('Rebel', 'https://i.scdn.co/image/ab67616d00001e02cff4bd68d5d0dd9a0a748045') + '</div>';
      document.querySelector('.am-native-main main').prepend(s);
    });
    await page.waitForFunction(() => document.querySelectorAll('#mock-home .am-mix-ready').length === 3);
    const covers = () => page.evaluate(() => [...document.querySelectorAll('#mock-home .mock-art')].map(b => [b.dataset.amMix || '', b.dataset.amMixStyle || '', b.classList.contains('am-mix-ready')]));
    assert.deepEqual(await covers(), [['Daily Mix 2', 'band', true], ['Chill Mix', 'band', true], ['Ginkgo Radio', 'station', true], ['', '', false]]);
    // A Daily Mix names its photo in the URL; the others are looked up once, by artist and by track.
    assert.match(await page.evaluate(() => document.querySelector('#mock-home .am-mix').style.getPropertyValue('--am-mix-photo')), /i\.scdn\.co\/image\/ab6761610000e5eb97f3/);
    assert.deepEqual(await page.evaluate(() => window.__mixRequests), ['spotify:artist:0ECwFtbIWEVNwjlrfc6xoL', 'spotify:track:1Czqh6tbb9gqCQpSkXsqDT']);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mcloud:mix-covers')).length), 3);
    // The hidden title shows under a redrawn cover, the image under it is hidden, and the band is drawn.
    assert.deepEqual(await page.evaluate(() => { const b = document.querySelector('#mock-home .am-mix'), t = b.closest('[data-encore-id="card"]').querySelector('[data-encore-id="cardTitle"]');
      return [t.offsetHeight > 0, getComputedStyle(b.querySelector('img')).opacity, getComputedStyle(b, '::after').content]; }), [true, '0', '"Daily Mix 2"']);
    await settingsWindow.pick('mixCovers', 'Renk geçişi (kişisel mix)');
    assert.deepEqual((await covers()).map(c => c[1]), ['gradient', 'gradient', 'gradient', '']);
    await settingsWindow.pick('mixCovers', 'Spotify');
    assert.deepEqual(await page.evaluate(() => document.querySelectorAll('#mock-home .am-mix').length), 0);
    await settingsWindow.pick('mixCovers', 'Apple Music gibi');
    await page.waitForFunction(() => document.querySelectorAll('#mock-home .am-mix-ready').length === 3);
    // "…" comes on the first hover and opens Spotify's card menu (a contextmenu on the card).
    assert.ok(await page.evaluate(() => document.body.classList.contains('am-home-apple')));
    // The pointer lands on the card's click layer over the artwork, as in Spotify.
    const art = await page.locator('#mock-home [data-encore-id="card"]:nth-child(4) img').boundingBox();
    await page.mouse.move(art.x + art.width / 2, art.y + art.height / 2);
    await page.evaluate(() => document.querySelector('#mock-home [data-encore-id="card"]:nth-child(4)').addEventListener('contextmenu', e => { window.__cardMenu = e.clientX > 0; e.preventDefault(); }));
    // A real click at the button: Spotify's card layer sits under it and must not get it.
    const more = await page.locator('#mock-home [data-encore-id="card"]:nth-child(4) .am-card-more').boundingBox();
    await page.mouse.click(more.x + more.width / 2, more.y + more.height / 2);
    assert.deepEqual(await page.evaluate(() => [window.__cardMenu, !!window.__cardOpened]), [true, false], '"…" opens the card menu, not the item');
    // A mix seen before is drawn as its image is added, before it loads; a carousel's arrows become frosted buttons.
    assert.deepEqual(await page.evaluate(async () => {
      const src = document.querySelector('#mock-home .am-mix-ready img').getAttribute('src');
      const s = document.createElement('section');s.id = 'mock-home-again';
      s.innerHTML = `<div data-encore-id="card"><div class="mock-art2"><div><img alt="" src="${src}"></div></div><div data-encore-id="cardTitle">Daily Mix 2</div></div>`
        + '<div class="mock-chevrons"><div aria-hidden="true"><svg data-encore-id="icon"></svg></div><div aria-hidden="true"><svg data-encore-id="icon"></svg></div></div>';
      document.querySelector('.am-native-main main').prepend(s);
      await Promise.resolve();
      const before = s.querySelector('.mock-art2').classList.contains('am-mix-ready');
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const arrows = [...s.querySelectorAll('.mock-chevrons > div')], st = getComputedStyle(arrows[0]);
      const out = [before, arrows.every(a => a.classList.contains('am-chevron')), st.getPropertyValue('--chevrons-button-color').trim(), st.getPropertyValue('--chevrons-button-backdrop-filter').trim()];
      s.remove();return out;
    }), [true, true, 'transparent', 'blur(21px) url(#am-search-glass)']);
    // Where Spicetify's css-map names the card (macOS), its image box is main-cardImage-imageWrapper, not the image's
    // parent inside it: the box keeps the corners and the hairline that replace Spotify's drop shadow (#109).
    assert.deepEqual(await page.evaluate(() => {
      const s = document.createElement('section');s.id = 'mock-home-named';
      s.innerHTML = '<div class="main-card-cardContainer" data-encore-id="card"><div class="main-card-imageContainer"><div class="main-cardImage-imageWrapper"><div><img alt="" class="main-cardImage-image"></div></div></div></div>';
      document.querySelector('.am-native-main main').prepend(s);
      const box = s.querySelector('.main-cardImage-imageWrapper'), inner = box.firstElementChild, out = [getComputedStyle(box).borderRadius, /inset/.test(getComputedStyle(box).boxShadow), getComputedStyle(inner).borderRadius, getComputedStyle(inner).boxShadow];
      s.remove();return out;
    }), ['8px', true, '0px', 'none']);
    await settingsWindow.pick('homeShortcuts');
    assert.ok(await page.evaluate(() => document.body.classList.contains('am-home-no-shortcuts')));
    await settingsWindow.pick('homeShortcuts');
    await settingsWindow.pick('homeStyle', 'Spotify');
    assert.ok(await page.evaluate(() => !document.body.classList.contains('am-home-apple')));
    await settingsWindow.pick('homeStyle', 'Apple Music');
    await page.evaluate(() => document.getElementById('mock-home').remove());
  });

  // Spotify 1.3.6.19xx (Windows) renders track lists, cards and Browse all with hashed CSS-module class names; the
  // theme tags them by role so its rules still match (#109).
  await check('a track list, a shelf and Browse all without Spotify\'s readable class names get them back (#109)', async () => {
    await page.evaluate(() => {
      const host = document.querySelector('.am-native-main');
      const section = document.createElement('section');
      section.dataset.testid = 'album-page';
      section.id = 'mock-hashed';
      section.innerHTML = `<div role="grid" style="--grid-template-columns:[index] 16px [first] 1fr [var1] 1fr [last] 1fr">
        <div role="presentation" style="top:64px"><div role="row" aria-rowindex="1">
          <div role="columnheader" aria-colindex="1"><div>#</div></div>
          <div role="columnheader" aria-colindex="2"><div>Title</div></div>
          <div role="columnheader" aria-colindex="3"><div>Plays</div></div>
          <div role="columnheader" aria-colindex="4"><div>Duration</div></div></div></div>
        <div role="presentation"><div role="presentation" style="transform:translateY(0)"><div role="row" aria-rowindex="2"><div role="presentation">
          <div role="gridcell" aria-colindex="1"><div><span>1</span></div></div>
          <div role="gridcell" aria-colindex="2"><div><div data-encore-id="text">Song</div><span><span data-encore-id="tagIcon">E</span></span><span><a href="/artist/0">Artist</a></span></div></div>
          <div role="gridcell" aria-colindex="3"><div data-encore-id="text">1,000</div></div>
          <div role="gridcell" aria-colindex="4"><button>…</button><div data-encore-id="text">3:12</div></div>
        </div></div></div></div></div>
        <section class="Shelf" style="display:none"><div role="list"><div role="listitem"><a href="/genre/0"><div></div></a></div></div><div data-encore-id="card"></div></section>`;
      host.append(section);
    });
    await page.waitForFunction(() => document.querySelector('#mock-hashed .main-trackList-trackListRow'));
    await page.waitForFunction(() => document.querySelector('#mock-hashed .main-gridContainer-gridContainer'));
    assert.deepEqual(await page.evaluate(() => {
      const section = document.querySelector('#mock-hashed');
      const row = section.querySelector('[aria-rowindex="2"]');
      const header = section.querySelector('[aria-rowindex="1"]');
      const cells = (r) => [...r.querySelectorAll('[role="gridcell"],[role="columnheader"]')].map(c => ['main-trackList-rowSectionIndex', 'main-trackList-rowSectionStart', 'main-trackList-rowSectionVariable', 'main-trackList-rowSectionEnd'].find(n => c.classList.contains(n)));
      return [
        section.querySelector('[role="grid"]').classList.contains('main-trackList-trackList'),
        section.querySelector('[role="grid"]').classList.contains('main-trackList-indexable'),
        header.classList.contains('main-trackList-trackListHeaderRow'),
        header.parentElement.classList.contains('main-trackList-trackListHeader'),
        cells(row),
        row.querySelector('[role="gridcell"] > div').classList.contains('main-trackList-rowMarker'),
        row.querySelector('.main-trackList-rowMainContent') !== null,
        row.querySelector('[data-encore-id="text"]').classList.contains('main-trackList-rowDuration') || row.querySelector('.main-trackList-rowDuration') !== null,
        section.querySelector('[role="list"]').classList.contains('main-gridContainer-gridContainer'),
        section.querySelector('.Shelf').hasAttribute('data-shelf'),
      ];
    }), [true, true, true, true, ['main-trackList-rowSectionIndex', 'main-trackList-rowSectionStart', 'main-trackList-rowSectionVariable', 'main-trackList-rowSectionEnd'], true, true, true, true, true]);
    // An album's clean list hides the Plays column, on the hashed DOM too.
    assert.equal(await page.evaluate(() => { const row = document.querySelector('#mock-hashed [aria-rowindex="2"]'); return getComputedStyle(row.querySelector('.main-trackList-rowSectionVariable')).display; }), 'none');
    // The names go on the row's real grid, the cells' parent: the separator is placed against it, the rules' ">" reach
    // the cells; a header is no track row; a card is no shelf.
    assert.deepEqual(await page.evaluate(() => {
      const row = document.querySelector('#mock-hashed [aria-rowindex="2"]'), box = row.firstElementChild, header = document.querySelector('#mock-hashed [aria-rowindex="1"]');
      return [row.classList.contains('main-trackList-trackListRow'), box.classList.contains('main-trackList-trackListRow'), getComputedStyle(box).position, getComputedStyle(box, '::after').left, header.classList.contains('main-trackList-trackListRow'), document.querySelector('#mock-hashed [data-encore-id="card"]').hasAttribute('data-shelf')];
    }), [false, true, 'relative', '48px', false, false]);
    // A row's artwork lands after the row and needs no name: with it, the numbers-off rules reach the index cell.
    assert.equal(await page.evaluate(() => {
      const img = document.createElement('img'); img.alt = ''; document.querySelector('#mock-hashed [aria-rowindex="2"] .main-trackList-rowSectionStart').prepend(img);
      const had = document.body.classList.contains('am-no-numbers');document.body.classList.add('am-no-numbers');
      const position = getComputedStyle(document.querySelector('#mock-hashed [aria-rowindex="2"] .main-trackList-rowSectionIndex')).position;
      document.body.classList.toggle('am-no-numbers', had);return position;
    }), 'static');
    // Selecting a row rewrites its class, as React does; the names come back.
    await page.evaluate(() => { const row = document.querySelector('#mock-hashed [aria-rowindex="2"]'); row.firstElementChild.className = 'hashed-selected'; row.setAttribute('aria-selected', 'true'); });
    await page.waitForFunction(() => document.querySelector('#mock-hashed [aria-rowindex="2"] > .main-trackList-trackListRow'));
    await page.evaluate(() => document.querySelector('#mock-hashed').remove());
    // An older build carries the names on the inner row already: nothing changes there, role="row" least of all.
    assert.deepEqual(await page.evaluate(async () => {
      const section = document.createElement('section');section.id = 'mock-older';
      section.innerHTML = `<div class="main-trackList-trackList main-trackList-indexable" role="grid">
        <div class="main-trackList-trackListHeader" role="presentation"><div class="main-trackList-trackListHeaderRow main-trackList-trackListRowGrid" role="row"><div class="main-trackList-rowSectionIndex" role="columnheader">#</div><div class="main-trackList-rowSectionStart" role="columnheader">Title</div></div></div>
        <div role="presentation"><div role="row" id="mock-older-row"><div class="main-trackList-trackListRow main-trackList-trackListRowGrid" role="presentation"><div class="main-trackList-rowSectionIndex" role="gridcell">1</div><div class="main-trackList-rowSectionStart" role="gridcell"><div class="main-trackList-rowMainContent">Song</div></div></div></div></div></div>`;
      document.querySelector('.am-native-main').append(section);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const out = [document.getElementById('mock-older-row').className, section.querySelector('.main-trackList-trackListHeaderRow').classList.contains('main-trackList-trackListRow')];
      section.remove();return out;
    }), ['', false]);
  });

  await check('Now Playing slides in and out, the page column easing with it (#110)', async () => {
    const toggle = () => page.evaluate(() => {
      document.querySelector('#am-player [data-am-button="nowplaying"]').click();
      const pane = document.querySelector('#am-nowplaying');
      return { hidden: pane.hidden, anims: pane.getAnimations().map(a => Math.round(a.effect.getTiming().duration)), easing: pane.getAnimations()[0]?.effect.getTiming().easing, cls: document.body.classList.contains('am-np-anim') };
    });
    const column = () => page.evaluate(() => getComputedStyle(document.querySelector('.am-layout')).gridTemplateColumns.split(' ').pop());
    assert.equal(await page.evaluate(() => document.querySelector('#am-nowplaying').hidden), true);
    // Opening: the pane slides in, the page's right column eases open.
    const opening = await toggle();
    assert.deepEqual([opening.hidden, opening.anims, opening.cls], [false, [240], true], 'the pane animates in');
    assert.equal(opening.easing, 'cubic-bezier(0.32, 0.72, 0, 1)');
    await page.waitForFunction(() => !document.body.classList.contains('am-np-anim'));
    await settingsWindow.pick('npLayout', 'Kenara yapışık');
    assert.notEqual(await column(), '0px', 'the page keeps a right column while the pane is open');
    // Closing: the pane stays mounted while it slides out, then goes; the column eases back to nothing.
    const closing = await toggle();
    assert.deepEqual([closing.hidden, closing.anims], [false, [240]], 'the pane animates out');
    await page.waitForFunction(() => document.querySelector('#am-nowplaying').hidden && getComputedStyle(document.querySelector('.am-layout')).gridTemplateColumns.split(' ').pop() === '0px');
    // Reduced motion switches at once, with no animation (after the closing slide's class has gone, 320ms).
    await page.waitForFunction(() => !document.body.classList.contains('am-np-anim'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const still = await toggle();
    assert.deepEqual([still.hidden, still.anims, still.cls], [false, [], false], 'no animation with reduced motion');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await settingsWindow.pick('npLayout', 'Cam kart');
    await page.evaluate(() => document.querySelector('#am-player [data-am-button="nowplaying"]').click());
    await page.waitForFunction(() => document.querySelector('#am-nowplaying').hidden);
  });

  await check('no runtime errors', async () => assert.deepEqual(errors, []));
} finally {
  await browser.close();
}
