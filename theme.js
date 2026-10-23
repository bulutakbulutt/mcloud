/* AppleMusicMac 2.6. Local theme UI; no remote scripts or credentials. */
(async () => {
  if (window.__appleMusicMac) return;
  window.__appleMusicMac = true;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 240 && !window.Spicetify?.Platform?.History; i++) await wait(250);
  const S = window.Spicetify;
  if (!S?.Platform?.History) return;
  const H = S.Platform.History;
  const icons = {
    search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
    home:'<path d="m3 10 9-8 9 8v11h-7v-7h-4v7H3z"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 5v7H6"/>',
    artist:'<path d="m5 20 8-12M9 4l11 7M3 22l4-1 11-14a3 3 0 0 0-5-4L3 18z"/>',
    album:'<rect x="4" y="5" width="16" height="17" rx="2"/><path d="M6 2h12"/>',
    music:'<path d="M10 17V5l10-3v12M10 7l10-3"/><ellipse cx="7" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="15" rx="3" ry="2"/>',
    store:'<rect x="4" y="6" width="16" height="16" rx="2"/><path d="M8 6V4a4 4 0 0 1 8 0v2"/>',
    grid:'<path d="M3 3h4v4H3zM10 3h4v4h-4zM17 3h4v4h-4zM3 10h4v4H3zM10 10h4v4h-4zM17 10h4v4h-4zM3 17h4v4H3zM10 17h4v4h-4zM17 17h4v4h-4z"/>',
    play:'<path d="m7 3 15 9-15 9z" fill="currentColor" stroke="none"/>',
    pause:'<path d="M7 3h4v18H7zM15 3h4v18h-4z" fill="currentColor" stroke="none"/>',
    next:'<path d="m3 5 10 7L3 19zm10 0 10 7-10 7z" fill="currentColor" stroke="none"/>',
    back:'<path d="m21 5-10 7 10 7zm-10 0L1 12l10 7z" fill="currentColor" stroke="none"/>',
    shuffle:'<path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 4-3 5-6m3-3c1-2 3-3 5-3h2m-4-4 4 4-4 4"/>',
    repeat:'<path d="M4 10V7a2 2 0 0 1 2-2h14l-4-4M20 14v3a2 2 0 0 1-2 2H4l4 4M20 5l-4 4M4 19l4-4"/>',
    lyrics:'<rect x="3" y="3" width="18" height="15" rx="3"/><path d="m8 18 1 4 5-4M8 8h2v4H8M14 8h2v4h-2"/>',
    queue:'<path d="M8 5h14M8 12h14M8 19h14"/><circle cx="3" cy="5" r=".8"/><circle cx="3" cy="12" r=".8"/><circle cx="3" cy="19" r=".8"/>',
    volume:'<path d="M3 9h4l5-5v16l-5-5H3zM16 7a8 8 0 0 1 0 10M19 3a13 13 0 0 1 0 18"/>',
    fullscreen:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
    chevron:'<path d="m9 4 8 8-8 8"/>'
  };
  const svg = name => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.music}</svg>`;
  function el(tag, cls, text) { const e = document.createElement(tag); e.className = cls; if (text) e.textContent = text; return e; }
  function button(label, icon, fn, cls = '') {
    const b = el('button', cls); b.type = 'button'; b.setAttribute('aria-label', label); b.title = label;
    b.innerHTML = svg(icon); b.addEventListener('click', fn); return b;
  }
  let main, root, nativeNav, currentMode = 'native';
  function bindLayout() {
    root = document.querySelector('.Root');
    if (!root) return false;
    // Bind only the outer layout panes. Overlay grids can span the same named
    // areas, so classifying every descendant incorrectly hides page content.
    main = root.querySelector('.am-native-main,.BPRPH_jrStQIw2m2qfDl');
    if (!main) {
      for (const n of root.querySelectorAll('div')) {
        if (getComputedStyle(n).containerName.split(' ').includes('main-view-grid-area')) { main=n; break; }
      }
    }
    if (!main) return false;
    main.classList.add('am-native-main');
    const layout = main.parentElement;
    layout.classList.add('am-layout');
    const bindings = {'left-sidebar':'am-native-sidebar','right-sidebar':'am-native-right','now-playing-bar':'am-native-player'};
    for (const n of layout.children) {
      if (n === main) continue;
      const area = getComputedStyle(n).gridArea.split('/')[0].trim();
      if (bindings[area]) n.classList.add(bindings[area]);
    }
    nativeNav = document.getElementById('global-nav-bar');
    nativeNav?.classList.add('am-native-global');
    return true;
  }
  for (let i = 0; i < 120 && !bindLayout(); i++) await wait(250);
  if (!main) return;
  const sidebar = el('aside', '', ''); sidebar.id = 'am-sidebar'; sidebar.setAttribute('aria-label', 'Ana gezinme');
  const drag = el('div', 'am-drag'); sidebar.append(drag);
  const nav = el('nav', 'am-navigation'); sidebar.append(nav);
  const navItems = [];
  function go(path) { currentMode = 'native'; document.body.classList.remove('am-library-open'); clearLibrary(); ++libraryRequest; H.push(path); updateNav(); }
  function row(label, icon, fn, key) {
    const b = button(label, icon, fn, 'am-nav-row'); b.append(el('span', '', label));
    nav.append(b); navItems.push({ b, key });
  }
  function heading(text) { nav.append(el('div', 'am-nav-heading', text)); }
  row('Ara', 'search', () => { go('/search'); document.body.classList.add('am-search-open'); setTimeout(() => document.getElementById('global-nav-bar')?.querySelector('input')?.focus(), 150); }, '/search');
  row('Ana Sayfa', 'home', () => go('/'), '/');
  heading('Arşiv');
  row('Son Eklenen', 'clock', () => openLibrary('recent'), '/collection');
  row('Sanatçılar', 'artist', () => openLibrary('artists'), '/collection/artists');
  row('Albümler', 'album', () => openLibrary('albums'), '/collection/albums');
  row('Parçalar', 'music', () => go('/collection/tracks'), '/collection/tracks');
  heading('Mağaza');
  row('Göz At', 'store', () => go('/search'), 'browse');
  heading('Listeler');
  row('Tüm Listeler', 'grid', () => openLibrary('playlists'), '/collection/playlists');
  document.body.append(sidebar);
  function updateNav() {
    const path = H.location.pathname;
    for (const { b, key } of navItems) {
      const selected = currentMode === 'library' ? key === libraryKeys[libraryKind] : path === key;
      b.classList.toggle('am-selected', selected);
      if(selected) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
    }
  }
  const libraryView = el('section', ''); libraryView.id='am-library'; libraryView.setAttribute('aria-label','Arşiv');document.body.append(libraryView);
  let libraryKind='', libraryRequest=0;
  // Keep decoded artwork limited to the viewport and a short scroll buffer.
  const artworkObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
    for(const {target:img,isIntersecting} of entries){
      if(isIntersecting&&!document.hidden){if(!img.hasAttribute('src'))img.src=img.dataset.src;}
      else if(img.hasAttribute('src'))img.removeAttribute('src');
    }
  },{root:libraryView,rootMargin:'400px 0px'}):null;
  function observeArtwork(img) {
    if(document.hidden)return;
    if(artworkObserver)artworkObserver.observe(img);else img.src=img.dataset.src;
  }
  function releaseArtwork() {
    artworkObserver?.disconnect();
    for(const img of libraryView.querySelectorAll('img[data-src]'))img.removeAttribute('src');
  }
  function clearLibrary() { releaseArtwork();if(libraryView.hasChildNodes())libraryView.replaceChildren(); libraryView.scrollTop=0; }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)releaseArtwork();
    else if(currentMode==='library')for(const img of libraryView.querySelectorAll('img[data-src]'))observeArtwork(img);
  });
  // One shared listener avoids retaining a render batch through every card closure.
  libraryView.addEventListener('click',event=>{
    const card=event.target.closest?.('.am-library-card');
    if(!card||!libraryView.contains(card))return;
    const {uri,kind,folder}=card.dataset;
    if(folder==='true')openLibrary(kind,uri);
    else go('/'+uri.split(':').slice(1).join('/'));
  });
  libraryView.addEventListener('error',event=>{
    const img=event.target;
    if(img.tagName!=='IMG')return;
    const art=img.parentElement;
    if(!art?.classList.contains('am-library-art'))return;
    // Clearing src during eviction is intentional, not a broken cover.
    if(!img.hasAttribute('src'))return;
    artworkObserver?.unobserve(img);
    const kind=art.dataset.icon;
    img.remove();art.innerHTML=svg(kind);
  },true);
  const libraryLabels={recent:'Son Eklenen',artists:'Sanatçılar',albums:'Albümler',playlists:'Tüm Listeler'};
  const libraryKeys={recent:'/collection',artists:'/collection/artists',albums:'/collection/albums',playlists:'/collection/playlists'};
  function openLibrary(kind, folder='') {
    H.push({pathname:'/',search:'?am-library='+kind+(folder?'&am-folder='+encodeURIComponent(folder):'')});
  }
  function libraryImage(item) {
    let source=item.images?.[0]?.url || item.images?.items?.[0]?.url || item.image?.sources?.[0]?.url || '';
    if(source.startsWith('spotify:image:')) source='https://i.scdn.co/image/'+source.slice(14);
    if(source.startsWith('spotify:mosaic:')) source='https://mosaic.scdn.co/300/'+source.slice(15).replaceAll(':','');
    return /^(https:|spotify:)/.test(source)?source:'';
  }
  // Keep only the fields rendered by this theme; release them when the page closes.
  async function loadLibrary(folder, request, kind) {
    const items=[];
    for(let offset=0;offset<10000;offset+=200) {
      if(request!==libraryRequest) return [];
      const result=await S.Platform.LibraryAPI.getContents({offset,limit:200,filters:[],...(folder?{folderUri:folder}:{})});
      if(request!==libraryRequest) return [];
      for(const item of result.items||[]) {
        if(!item?.uri||item.canView===false) continue;
        if(kind==='artists'&&item.type!=='artist'||kind==='albums'&&item.type!=='album')continue;
        if(kind==='playlists'&&!['playlist','folder','liked-songs','your-episodes'].includes(item.type)&&item.uri!=='spotify:collection:tracks')continue;
        items.push({uri:item.uri,type:item.type,name:item.name,imageUrl:libraryImage(item),
          subtitle:item.owner?.displayName||item.owner?.name||({artist:'Sanatçı',album:'Albüm',playlist:'Çalma listesi',folder:'Klasör'}[item.type]||'')});
      }
      if(!result.items?.length||offset+result.items.length>=result.totalLength||result.items.length<200) break;
    }
    return items;
  }
  async function renderLibrary(kind,folder='') {
    const request=++libraryRequest;
    libraryKind=kind;currentMode='library';
    document.body.classList.add('am-ready','am-library-open');document.body.classList.remove('am-search-open');updateNav();
    clearLibrary();
    libraryView.replaceChildren(el('h1','am-library-title',libraryLabels[kind]));
    const status=el('p','am-library-status','Kitaplığın yükleniyor…');libraryView.append(status);
    try {
      let items=await loadLibrary(folder,request,kind);if(request!==libraryRequest)return;
      status.textContent=items.length?items.length+' öğe':'Bu bölümde kayıtlı öğe yok.';
      const grid=el('div','am-library-grid');libraryView.append(grid);
      let rendered=0;
      const more=el('button','am-library-retry','Daha fazla göster');
      function appendBatch() {
        if(request!==libraryRequest) return;
        const fragment=document.createDocumentFragment();
        const end=Math.min(rendered+60,items.length);
        const artwork=[];
        for(;rendered<end;rendered++){
        const item=items[rendered];
        const b=el('button','am-library-card');b.type='button';b.setAttribute('aria-label',item.name||'Adsız');
        b.dataset.uri=item.uri;b.dataset.kind=kind;b.dataset.folder=String(item.type==='folder');
        const art=el('span','am-library-art');
        art.dataset.icon=item.type==='artist'?'artist':item.type==='album'?'album':'music';
        const src=item.imageUrl;
        if(src){const img=el('img','');img.dataset.src=src;img.alt='';img.decoding='async';art.append(img);artwork.push(img);}else art.innerHTML=svg(item.type==='artist'?'artist':item.type==='album'?'album':'music');
        if(item.type==='artist')art.classList.add('am-artist-art');
        b.append(art,el('span','am-library-name',item.name||'Adsız'),el('span','am-library-sub',item.subtitle));
        fragment.append(b);
        }
        grid.append(fragment);
        for(const img of artwork)observeArtwork(img);
        if(rendered>=items.length) more.remove();
      }
      more.onclick=appendBatch;libraryView.append(more);appendBatch();
    }catch(e){if(request!==libraryRequest)return;status.textContent='Kitaplık yüklenemedi. Yeniden dene.';const retry=el('button','am-library-retry','Yeniden dene');retry.onclick=()=>renderLibrary(kind,folder);libraryView.append(retry);console.warn('[AppleMusicMac] Library view',e);}
  }
  const player=el('section','','');player.id='am-player';player.setAttribute('aria-label','Oynatıcı');
  const controls=el('div','am-transport');player.append(controls);
  const safe = fn => () => { try { const result=fn();result?.catch?.(()=>S.showNotification('Bu işlem şu anda kullanılamıyor.')); } catch { S.showNotification('Oynatıcı henüz hazır değil.'); } };
  const shuffle=button('Karıştır','shuffle',safe(()=>S.Player.toggleShuffle()));
  const back=button('Önceki parça','back',safe(()=>S.Player.back()));
  const play=button('Çal','play',safe(()=>S.Player.togglePlay()),'am-play');
  const next=button('Sonraki parça','next',safe(()=>S.Player.next()));
  const repeat=button('Yinele','repeat',safe(()=>S.Player.toggleRepeat()));controls.append(shuffle,back,play,next,repeat);
  const track=el('div','am-player-track');player.append(track);
  const logo=el('span','am-apple','');track.append(logo);
  const info=el('button','am-track-info');info.type='button';info.title='Çalan parçayı aç';
  const title=el('span','am-track-title'),artist=el('span','am-track-artist');info.append(title,artist);track.append(info);
  info.onclick=()=>{const uri=S.Player.data?.item?.uri;if(uri)go('/'+uri.split(':').slice(1).join('/'));};
  const extras=el('div','am-player-extras');player.append(extras);
  const lyricsButton=button('Spicy Lyrics sözlerini aç / kapat','lyrics',toggleSpicyLyrics);
  lyricsButton.id='am-lyrics-toggle';
  const fullscreenButton=button('Spicy Lyrics tam ekran','fullscreen',toggleSpicyFullscreen);
  fullscreenButton.id='am-fullscreen-toggle';
  extras.append(lyricsButton,button('Çalma sırası','queue',()=>{
    const native=root.querySelector('[data-testid="control-button-queue"]');
    if(native){document.body.classList.toggle('am-queue-open');native.click();}
    else S.showNotification('Çalma sırası bu Spotify sürümünde kullanılamıyor.');
  }),fullscreenButton);
  const volumeWrap=el('div','am-volume-wrap');
  const volume=el('input','am-volume');volume.type='range';volume.min='0';volume.max='1';volume.step='.01';volume.setAttribute('aria-label','Ses seviyesi');
  volume.addEventListener('input',safe(()=>S.Player.setVolume(Number(volume.value))));
  volumeWrap.append(button('Sesi kapat / aç','volume',safe(()=>S.Player.setVolume(S.Player.getVolume()>0?0:.5))),volume);extras.append(volumeWrap);
  const seek=el('input','am-seek');seek.type='range';seek.min='0';seek.max='1000';seek.value='0';seek.setAttribute('aria-label','Çalma konumu');
  seek.addEventListener('input',()=>{const d=S.Player.getDuration();if(d)S.Player.seek(Math.round(Number(seek.value)/1000*d));});player.append(seek);document.body.append(player);
  let boundToolbar=null, toolbarChildren=[];
  function bindToolbar() {
    const toolbar=document.getElementById('global-nav-bar');
    if(!toolbar)return;
    if(boundToolbar===toolbar&&toolbarChildren.length===toolbar.children.length&&toolbarChildren.every((n,i)=>n===toolbar.children[i]))return;
    boundToolbar=toolbar;toolbarChildren=[...toolbar.children];
    nativeNav=toolbar;toolbar.classList.add('am-native-global');
    const groups=[...toolbar.children].filter(n=>n.tagName==='DIV');
    groups[0]?.classList.add('am-toolbar-leading');
    groups[1]?.classList.add('am-toolbar-center');
    groups[2]?.classList.add('am-toolbar-trailing');

  }
  function spicyPage() { return document.getElementById('SpicyLyricsPage'); }
  function runSpicyControl(id) {
    const native=document.getElementById(id);
    if(!native){S.showNotification('Spicy Lyrics henüz hazır değil. Eklenti yüklendiğinde tekrar dene.');return;}
    // Invoke the installed extension's real controls, including its settings,
    // route history, pending page mount and fullscreen lifecycle.
    native.click();
  }
  function toggleSpicyLyrics() { runSpicyControl('SpicyLyrics_PageButton'); }
  function toggleSpicyFullscreen() { runSpicyControl('SpicyLyrics_FullscreenButton'); }
  let friendPane=null;
  function syncNativePanels() {
    const feed=document.querySelector('.fkgR9mQfUbjSxQi0FXd4')
      ||document.querySelector('[data-testid^="buddy-feed-"]')?.parentElement;
    document.body.classList.toggle('am-friends-open',!!feed);
    if(!feed){friendPane?.classList.remove('am-native-panel-open');friendPane=null;return;}
    feed.classList.add('am-friends-sheet');
    if(friendPane?.contains(feed)){for(let n=feed;n&&n!==friendPane;n=n.parentElement)n.classList.add('am-friends-fill');return;}
    friendPane?.classList.remove('am-native-panel-open');
    friendPane=feed.closest('.am-native-sidebar,.am-native-right');
    if(!friendPane){
      // New Spotify versions can portal this panel into a zero-width overlay
      // rather than a grid pane. Size that host, without moving React nodes.
      for(let n=feed.parentElement;n&&n!==root&&n!==document.body;n=n.parentElement){
        const style=getComputedStyle(n);
        if(n!==main&&n!==main.parentElement&&(style.display==='none'||n.getBoundingClientRect().width<2))friendPane=n;
      }
    }
    friendPane ||= feed.parentElement;
    friendPane?.classList.add('am-native-panel-open');
    for(let n=feed;n&&n!==friendPane;n=n.parentElement)n.classList.add('am-friends-fill');
  }
  let observedSpicyPage=null;
  const spicyObserver=new MutationObserver(syncSpicyControls);
  function setAttributeIfChanged(node,name,value) { if(node.getAttribute(name)!==value)node.setAttribute(name,value); }
  function syncSpicyControls() {
    const page=spicyPage();
    if(page!==observedSpicyPage){spicyObserver.disconnect();observedSpicyPage=page;if(page)spicyObserver.observe(page,{attributes:true,attributeFilter:['class']});}
    const fullscreen=!!page?.classList.contains('Fullscreen');
    document.body.classList.toggle('am-spicy-fullscreen',fullscreen);
    const lyricsOpen=H.location.pathname==='/SpicyLyrics';
    const available=!!document.getElementById('SpicyLyrics_PageButton');
    lyricsButton.classList.toggle('am-active',lyricsOpen);
    setAttributeIfChanged(lyricsButton,'aria-pressed',String(lyricsOpen));
    setAttributeIfChanged(lyricsButton,'title',available?(lyricsOpen?'Spicy Lyrics sözlerini kapat':'Spicy Lyrics sözlerini aç'):'Spicy Lyrics yükleniyor…');
    fullscreenButton.classList.toggle('am-active',fullscreen);
    setAttributeIfChanged(fullscreenButton,'aria-pressed',String(fullscreen));
    setAttributeIfChanged(fullscreenButton,'title',fullscreen?'Spicy Lyrics tam ekrandan çık':'Spicy Lyrics tam ekran');
  }
  let previousTrack='',previousPlaying=null;
  function syncPlayer() {
    if(document.hidden||!S.Player.origin?._state) return;
    const playing=S.Player.isPlaying();
    if(playing!==previousPlaying){previousPlaying=playing;play.innerHTML=svg(playing?'pause':'play');play.setAttribute('aria-label',playing?'Duraklat':'Çal');play.title=playing?'Duraklat':'Çal';}
    shuffle.classList.toggle('am-active',!!S.Player.getShuffle());repeat.classList.toggle('am-active',!!S.Player.getRepeat());
    setAttributeIfChanged(shuffle,'aria-pressed',String(!!S.Player.getShuffle()));setAttributeIfChanged(repeat,'aria-pressed',String(!!S.Player.getRepeat()));
    const level=String(S.Player.getVolume());if(volume.value!==level)volume.value=level;
    if(player.matches(':hover,:focus-within')&&document.activeElement!==seek){const position=String(Math.round((S.Player.getProgressPercent()||0)*1000));if(seek.value!==position)seek.value=position;}
    const item=S.Player.data?.item,meta=item?.metadata||{};
    const trackTitle=item?.name||meta.title||'',trackArtist=meta.artist_name||item?.artists?.map(a=>a.name).join(', ')||'';
    const key=[item?.uri,trackTitle,trackArtist].join('\n');
    if(key!==previousTrack){previousTrack=key;title.textContent=trackTitle;artist.textContent=trackArtist;track.classList.toggle('am-has-track',!!trackTitle);}
  }
  S.Player.addEventListener('songchange',syncPlayer);S.Player.addEventListener('onplaypause',syncPlayer);
  player.addEventListener('pointerenter',syncPlayer);
  player.addEventListener('focusin',syncPlayer);
  let playerTimer=null;
  function resumeUpdates(){clearInterval(playerTimer);playerTimer=null;if(!document.hidden){syncPlayer();syncSpicyControls();playerTimer=setInterval(syncPlayer,1000);}}
  document.addEventListener('visibilitychange',resumeUpdates);resumeUpdates();
  H.listen(() => {
    syncSpicyControls();
    document.body.classList.add('am-ready');
    document.body.classList.remove('am-account-open');
    const query=new URLSearchParams(H.location.search);
    const kind=query.get('am-library');
    if(libraryLabels[kind]){renderLibrary(kind,query.get('am-folder')||'');return;}
    currentMode='native';++libraryRequest;clearLibrary();document.body.classList.remove('am-library-open');
    document.body.classList.toggle('am-search-open',H.location.pathname.startsWith('/search'));updateNav();
  });
  // Ignore feed cards, lyrics text and player progress mutations. Only host
  // replacements and extension/panel controls need a theme reconciliation.
  const relevantHosts='#global-nav-bar,#SpicyLyricsPage,#SpicyLyrics_PageButton,#SpicyLyrics_FullscreenButton,.fkgR9mQfUbjSxQi0FXd4,[data-testid^="buddy-feed-"]';
  let reconciliation=null;
  function scheduleReconcile(records) {
    if(document.hidden||reconciliation!==null)return;
    const relevant=!main.isConnected||!nativeNav?.isConnected||records.some(record=>{
      if(record.target===nativeNav)return true;
      // Lyrics line churn cannot replace the outer hosts watched here.
      if(observedSpicyPage?.contains(record.target))return false;
      for(const nodes of [record.addedNodes,record.removedNodes]) {
        for(const node of nodes)if(node.nodeType===1&&(node.matches(relevantHosts)||node.querySelector(relevantHosts)))return true;
      }
      return false;
    });
    if(!relevant)return;
    reconciliation=setTimeout(()=>{reconciliation=null;if(!main.isConnected)bindLayout();bindToolbar();syncNativePanels();syncSpicyControls();},150);
  }
  const observer=new MutationObserver(scheduleReconcile);
  if(!document.hidden)observer.observe(root,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){observer.disconnect();clearTimeout(reconciliation);reconciliation=null;}
    else {if(!main.isConnected)bindLayout();bindToolbar();syncNativePanels();syncSpicyControls();observer.observe(root,{childList:true,subtree:true});}
  });
  document.body.classList.add('am-ready');bindToolbar();go('/');
})();
