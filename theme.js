/* AppleMusicMac 2.7. Local theme UI; no remote scripts or credentials. */
(async () => {
  if (window.__appleMusicMac) return;
  window.__appleMusicMac = true;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 240 && !window.Spicetify?.Platform?.History; i++) await wait(250);
  const S = window.Spicetify;
  if (!S?.Platform?.History) return;
  const H = S.Platform.History;
  // Links inside Spotify's pages carry a locale prefix (/intl-tr/artist/…); routes are matched without it.
  const routePath = () => (H.location.pathname || '/').replace(/^\/intl-[a-z]{2}(?:-[a-z0-9]+)?(?=\/|$)/i, '') || '/';
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
    volume:'<path d="M3 9h4l5-5v16l-5-5H3z" fill="currentColor"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10M20.5 4.5a10.6 10.6 0 0 1 0 15"/>',
    volume2:'<path d="M3 9h4l5-5v16l-5-5H3z" fill="currentColor"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10"/>',
    volume1:'<path d="M3 9h4l5-5v16l-5-5H3z" fill="currentColor"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5"/>',
    volumeMuted:'<mask id="am-mute-cut"><rect width="24" height="24" fill="white"/><path d="M2.5 20.5l14-16" stroke="black" stroke-width="4.5"/></mask><path d="M3 9h4l5-5v16l-5-5H3z" fill="currentColor" mask="url(#am-mute-cut)"/><path d="M2.5 20.5l14-16"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10" opacity=".35"/>',
    fullscreen:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
    chevron:'<path d="m9 4 8 8-8 8"/>',
    star:'<path d="m12 3.2 2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17.1 6.6 20l1-6.1-4.4-4.3 6.1-.8z"/>',
    more:'<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
    expand:'<path d="M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5"/>',
    left:'<path d="m15 4-8 8 8 8"/>',
    share:'<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M6 11H5v10h14V11h-1"/>',
    plus:'<path d="M12 5v14M5 12h14"/>'
  };
  const svg = name => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.music}</svg>`;
  function el(tag, cls, text) { const e = document.createElement(tag); e.className = cls; if (text) e.textContent = text; return e; }
  function button(label, icon, fn, cls = '') {
    const b = el('button', cls); b.type = 'button'; b.setAttribute('aria-label', label); b.title = label;
    b.innerHTML = svg(icon); b.addEventListener('click', fn); return b;
  }
  // Preferences are per Spotify profile on this computer; nothing leaves the client.
  const accents={red:['Kırmızı','#fa2d48','#fa4662'],pink:['Pembe','#ff375f','#ff5c7c'],orange:['Turuncu','#ff9f0a','#ffb340'],yellow:['Sarı','#ffd60a','#ffe04d'],green:['Yeşil','#30d158','#5ade7a'],teal:['Turkuaz','#40c8e0','#6dd6ea'],blue:['Mavi','#0a84ff','#409cff'],purple:['Mor','#bf5af2','#cf7ff5'],spotify:['Spotify Yeşili','#1ed760','#3be477']};
  const settings={accent:'red',artwork:true,liquid:true,sort:'library',sidebar:0};
  try{const saved=JSON.parse(localStorage.getItem('mcloud:settings')||'{}');for(const key in settings)if(typeof saved[key]===typeof settings[key])settings[key]=saved[key];}catch{}
  if(!accents[settings.accent])settings.accent='red';
  function saveSettings(){try{localStorage.setItem('mcloud:settings',JSON.stringify(settings));}catch{}}
  function applySettings(){
    const [,accent,focus]=accents[settings.accent];
    document.documentElement.style.setProperty('--am-accent',accent);
    document.documentElement.style.setProperty('--am-accent-focus',focus);
    document.body.classList.toggle('am-no-artwork',!settings.artwork);
    document.body.classList.toggle('am-liquid',settings.liquid);
    // 0 keeps the proportional default width from user.css.
    if(settings.sidebar>0)document.documentElement.style.setProperty('--am-side','min('+settings.sidebar+'px,40vw)');
    else document.documentElement.style.removeProperty('--am-side');
  }
  applySettings();
  const accentListeners=[];
  function setAccent(key){settings.accent=key;saveSettings();applySettings();accentListeners.forEach(fn=>fn());}
  function spotifyImage(source='') {
    if(source.startsWith('spotify:image:')) source='https://i.scdn.co/image/'+source.slice(14);
    if(source.startsWith('spotify:mosaic:')) source='https://mosaic.scdn.co/300/'+source.slice(15).replaceAll(':','');
    return /^(https:|spotify:|data:image\/)/.test(source)?source:'';
  }
  const formatTime=ms=>{const s=Math.max(0,Math.floor(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
  // Windows draws its caption buttons over the top-right corner of the window.
  document.body.classList.toggle('am-windows',/Windows/.test(navigator.userAgent));
  let main, root, nativeNav, currentMode = 'native';
  // A mouse wheel over a horizontal row scrolls the row, as a trackpad swipe does in Apple Music;
  // at either end of the row the page scrolls on.
  const wheelHosts=new WeakSet();
  function wheelRows(event) {
    if(event.ctrlKey||event.shiftKey||Math.abs(event.deltaX)>=Math.abs(event.deltaY))return;
    for(let node=event.target;node&&node!==event.currentTarget;node=node.parentElement){
      const wide=node.scrollWidth>node.clientWidth+1,tall=node.scrollHeight>node.clientHeight+40;
      if(!wide&&!tall)continue;
      const style=getComputedStyle(node);
      // The first real vertical scroller up the tree is the page itself: let it scroll. (Rows may
      // overflow a few pixels vertically from hover effects, hence the 40px margin.)
      if(tall&&/(auto|scroll)/.test(style.overflowY))return;
      if(!wide||!/(auto|scroll)/.test(style.overflowX))continue;
      const delta=event.deltaMode===1?event.deltaY*40:event.deltaY;
      if(delta<0?node.scrollLeft<=0:node.scrollLeft>=node.scrollWidth-node.clientWidth-1)return;
      event.preventDefault();node.scrollBy({left:delta,behavior:'smooth'});return;
    }
  }
  function wheelHost(node){if(node&&!wheelHosts.has(node)){wheelHosts.add(node);node.addEventListener('wheel',wheelRows,{passive:false});}}
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
    main.classList.add('am-native-main');wheelHost(main);
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
  // As in Apple Music, the sidebar's right edge resizes it; double-click resets.
  const resizer=el('div','am-sidebar-resizer');resizer.tabIndex=0;
  resizer.setAttribute('role','separator');resizer.setAttribute('aria-orientation','vertical');resizer.setAttribute('aria-label','Kenar çubuğu genişliği');
  sidebar.append(resizer);
  const clampSidebar=width=>Math.round(Math.min(360,innerWidth*.4,Math.max(170,width)));
  function setSidebarWidth(width,save){settings.sidebar=width&&clampSidebar(width);applySettings();if(save)saveSettings();}
  resizer.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;event.preventDefault();resizer.setPointerCapture(event.pointerId);document.body.classList.add('am-resizing');
    const stop=new AbortController(),end=()=>{stop.abort();document.body.classList.remove('am-resizing');saveSettings();};
    resizer.addEventListener('pointermove',move=>setSidebarWidth(move.clientX,false),{signal:stop.signal});
    resizer.addEventListener('pointerup',end,{signal:stop.signal});resizer.addEventListener('pointercancel',end,{signal:stop.signal});
  });
  resizer.addEventListener('dblclick',()=>setSidebarWidth(0,true));
  resizer.addEventListener('keydown',event=>{
    const step={ArrowLeft:-10,ArrowRight:10}[event.key];if(!step)return;
    event.preventDefault();setSidebarWidth(sidebar.offsetWidth+step,true);
  });
  // Apple Music keeps the account in the sidebar's bottom-left corner.
  const profile=el('button','am-profile');profile.type='button';profile.hidden=true;profile.setAttribute('aria-haspopup','menu');
  const avatar=el('span','am-avatar'),profileName=el('span','am-profile-name');profile.append(avatar,profileName);sidebar.append(profile);
  (async()=>{
    try{
      const user=await S.Platform.UserAPI?.getUser?.();const name=user?.displayName||user?.username||'';if(!name)return;
      profileName.textContent=name;avatar.textContent=name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toLocaleUpperCase('tr');
      const image=spotifyImage(user.images?.[0]?.url||user.avatar?.sources?.[0]?.url||'');
      if(image){const img=el('img','');img.alt='';img.decoding='async';img.onerror=()=>img.remove();img.src=image;avatar.append(img);}
      profile.onclick=()=>togglePopover(profile,()=>[
        ...(user.username?[{label:'Profil',action:()=>go('/user/'+encodeURIComponent(user.username))}]:[]),
        {label:'Ayarlar',action:()=>go('/preferences')},
        '-',{swatches:true},
      ]);
      profile.hidden=false;
    }catch(e){console.warn('[AppleMusicMac] Profile',e);}
  })();
  function updateNav() {
    const path = routePath();
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
    return spotifyImage(item.images?.[0]?.url || item.images?.items?.[0]?.url || item.image?.sources?.[0]?.url || '');
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
      const all=await loadLibrary(folder,request,kind);if(request!==libraryRequest)return;
      let items=all;
      status.textContent=all.length?all.length+' öğe':'Bu bölümde kayıtlı öğe yok.';
      const tools=el('div','am-library-tools');
      const filter=el('input','am-library-filter');filter.type='search';filter.placeholder='Filtrele';filter.setAttribute('aria-label','Kitaplığı filtrele');
      const sort=el('select','am-library-sort');sort.setAttribute('aria-label','Sıralama');
      for(const [value,label] of [['library','Kitaplık sırası'],['name','Ada göre (A–Z)']]){const option=el('option','',label);option.value=value;sort.append(option);}
      sort.value=settings.sort==='name'?'name':'library';
      tools.append(filter,sort);if(all.length)status.before(tools);
      const grid=el('div','am-library-grid');libraryView.append(grid);
      let rendered=0;
      const more=el('button','am-library-retry','Daha fazla göster');
      function showItems() {
        const query=filter.value.trim().toLocaleLowerCase('tr');
        items=query?all.filter(item=>(item.name||'').toLocaleLowerCase('tr').includes(query)):all.slice();
        if(sort.value==='name')items.sort((a,b)=>(a.name||'').localeCompare(b.name||'','tr',{sensitivity:'base'}));
        status.textContent=query?(items.length?items.length+' / '+all.length+' öğe':'Eşleşen öğe yok.'):all.length+' öğe';
        releaseArtwork();grid.replaceChildren();rendered=0;libraryView.append(more);appendBatch();
      }
      let filterTimer=null;
      filter.addEventListener('input',()=>{clearTimeout(filterTimer);filterTimer=setTimeout(()=>{if(request===libraryRequest)showItems();},120);});
      sort.addEventListener('change',()=>{settings.sort=sort.value;saveSettings();showItems();});
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
      more.onclick=appendBatch;libraryView.append(more);if(sort.value==='name')showItems();else appendBatch();
    }catch(e){if(request!==libraryRequest)return;status.textContent='Kitaplık yüklenemedi. Yeniden dene.';const retry=el('button','am-library-retry','Yeniden dene');retry.onclick=()=>renderLibrary(kind,folder);libraryView.append(retry);console.warn('[AppleMusicMac] Library view',e);}
  }
  const player=el('section','','');player.id='am-player';player.setAttribute('aria-label','Oynatıcı');
  const controls=el('div','am-transport');player.append(controls);
  const safe = fn => () => { try { const result=fn();result?.catch?.(()=>S.showNotification('Bu işlem şu anda kullanılamıyor.')); } catch { S.showNotification('Oynatıcı henüz hazır değil.'); } };
  const shuffle=button('Karıştır','shuffle',safe(()=>S.Player.toggleShuffle()),'am-dim');
  const back=button('Önceki parça','back',safe(()=>S.Player.back()));
  const play=button('Çal','play',safe(()=>S.Player.togglePlay()),'am-play');
  const next=button('Sonraki parça','next',safe(()=>S.Player.next()));
  const repeat=button('Yinele','repeat',safe(()=>S.Player.toggleRepeat()),'am-dim');controls.append(shuffle,back,play,next,repeat);
  // The centre "LCD" follows Apple Music: artwork, title, a marquee subtitle
  // and a hairline scrubber that is always clickable and thickens on hover.
  const track=el('div','am-player-track');player.append(track);
  const logo=el('span','am-apple','');track.append(logo);
  const lcd=el('div','am-lcd');track.append(lcd);
  const fullscreenButton=el('button','am-track-art');fullscreenButton.type='button';fullscreenButton.id='am-fullscreen-toggle';
  fullscreenButton.setAttribute('aria-label','Tam ekran');fullscreenButton.title='Tam ekran';
  const cover=el('img','');cover.alt='';cover.decoding='async';cover.hidden=true;
  cover.addEventListener('error',()=>{cover.hidden=true;});
  cover.addEventListener('load',()=>{cover.hidden=false;});
  const expand=el('span','am-art-expand');expand.innerHTML=svg('expand');
  fullscreenButton.append(cover,expand);fullscreenButton.addEventListener('click',toggleFullscreen);
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  function marquee(cls) {
    const root=el('div','am-marquee '+cls),inner=el('span','am-marquee-inner'),first=el('span',''),copy=el('span','');
    copy.setAttribute('aria-hidden','true');inner.append(first,copy);root.append(inner);
    // Scroll only text that overflows, at a constant reading speed. It moves in whole device pixels:
    // every frame in between would re-run the player's glass filter for no visible change.
    function fit() {
      root.classList.remove('am-marquee-on');
      const overflow=first.offsetWidth>root.clientWidth+1&&!reducedMotion.matches;
      root.classList.toggle('am-marquee-on',overflow);
      if(overflow){root.style.setProperty('--am-marquee-duration',((first.offsetWidth+48)/28).toFixed(1)+'s');root.style.setProperty('--am-marquee-steps',String(Math.max(1,Math.round((first.offsetWidth+48)*(window.devicePixelRatio||1)))));}
    }
    if(typeof ResizeObserver==='function')new ResizeObserver(fit).observe(root);
    return {root,set(text){if(first.textContent===text)return;first.textContent=copy.textContent=text;root.title=text;fit();}};
  }
  const text=el('div','am-lcd-text'),titleRow=el('div','am-title-row');
  const title=marquee('am-track-title'),subtitle=marquee('am-track-subtitle');
  const star=button('Beğenilen Şarkılar\'a ekle','star',safe(()=>{S.Player.toggleHeart();setTimeout(syncPlayer,300);}),'am-star');
  title.root.addEventListener('click',()=>{const item=S.Player.data?.item;const uri=item?.album?.uri||item?.metadata?.album_uri||item?.uri;if(uri)go('/'+uri.split(':').slice(1).join('/'));});
  // As in Apple Music, the artist — album line asks where to go.
  subtitle.root.setAttribute('role','button');subtitle.root.tabIndex=0;subtitle.root.setAttribute('aria-haspopup','menu');
  subtitle.root.addEventListener('click',()=>togglePopover(subtitle.root,subtitleMenu));
  subtitle.root.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();togglePopover(subtitle.root,subtitleMenu);}});
  titleRow.append(title.root,star);text.append(titleRow,subtitle.root);
  const more=button('Diğer seçenekler','more',()=>togglePopover(more,trackMenu),'am-more');
  lcd.append(fullscreenButton,text,more);
  const scrub=el('div','am-scrub');
  const elapsed=el('span','am-time am-time-elapsed'),remaining=el('span','am-time am-time-remaining');
  const bar=el('span','am-bar'),barFill=el('span','am-bar-fill');bar.append(barFill);
  const seek=el('input','am-seek');seek.type='range';seek.min='0';seek.max='1000';seek.value='0';seek.setAttribute('aria-label','Çalma konumu');
  scrub.append(elapsed,remaining,bar,seek);track.append(scrub);
  let dragging=false,shownFraction=-1;
  function setScrubbing(on){track.classList.toggle('am-scrubbing',on);if(on)renderProgress(dragging?Number(seek.value)/1000:S.Player.getProgressPercent?.()||0,true);}
  seek.addEventListener('pointerenter',()=>setScrubbing(true));
  // Mouse users leave scrub mode with the pointer; keyboard focus keeps it open.
  const keyboardFocus=()=>seek.matches(':focus-visible');
  seek.addEventListener('pointerleave',()=>{if(!dragging&&!keyboardFocus())setScrubbing(false);});
  seek.addEventListener('pointerdown',()=>{dragging=true;setScrubbing(true);});
  seek.addEventListener('input',()=>{dragging=true;renderProgress(Number(seek.value)/1000,true);});
  seek.addEventListener('change',()=>{
    dragging=false;const d=S.Player.getDuration?.();
    if(d)safe(()=>S.Player.seek(Math.round(Number(seek.value)/1000*d)))();
    if(!seek.matches(':hover')&&!keyboardFocus())setScrubbing(false);
  });
  window.addEventListener('pointerup',()=>{if(!dragging)return;dragging=false;if(!seek.matches(':hover'))setScrubbing(false);});
  seek.addEventListener('focus',()=>{if(keyboardFocus())setScrubbing(true);});
  seek.addEventListener('blur',()=>{if(!seek.matches(':hover'))setScrubbing(false);});
  // Digits roll like SwiftUI's numericText transition; a length change just swaps.
  function rollText(node,value,down) {
    const old=node.dataset.value??'';if(old===value)return;node.dataset.value=value;
    if(old.length!==value.length||reducedMotion.matches||!track.classList.contains('am-scrubbing')){
      node.replaceChildren(...[...value].map(c=>{const slot=el('span','am-digit');slot.append(el('span','',c));return slot;}));return;
    }
    [...value].forEach((c,i)=>{
      const slot=node.children[i],current=slot.lastElementChild;if(current.textContent===c)return;
      slot.querySelectorAll('.am-digit-out').forEach(n=>n.remove());
      current.className='am-digit-out'+(down?' am-down':'');slot.append(el('span','am-digit-in'+(down?' am-down':''),c));
      setTimeout(()=>current.remove(),400);
    });
  }
  function renderProgress(fraction,jump) {
    fraction=Math.min(1,Math.max(0,fraction||0));
    // Ease between the 1 s player ticks; jump on seeks, drags and track changes.
    const smooth=!jump&&previousPlaying&&!reducedMotion.matches&&Math.abs(fraction-shownFraction)<.02;
    // Step once per device pixel the bar actually moves (a few per second) instead of every frame,
    // since each frame behind the Liquid Glass player re-runs its filter.
    const steps=smooth?Math.max(1,Math.round(Math.abs(fraction-shownFraction)*bar.offsetWidth*(window.devicePixelRatio||1))):0;
    barFill.style.transition=smooth?'transform 1s steps('+steps+')':'none';
    if(Math.abs(fraction-shownFraction)>.0001){barFill.style.transform='scaleX('+fraction.toFixed(4)+')';shownFraction=fraction;}
    if(!dragging){const position=String(Math.round(fraction*1000));if(seek.value!==position)seek.value=position;}
    if(track.classList.contains('am-scrubbing')){
      const duration=S.Player.getDuration?.()||0,position=fraction*duration;
      rollText(elapsed,duration?formatTime(position):'',false);rollText(remaining,duration?'−'+formatTime(duration-position):'',true);
    }
  }
  const extras=el('div','am-player-extras');player.append(extras);
  const lyricsButton=button('Spicy Lyrics sözlerini aç / kapat','lyrics',toggleSpicyLyrics);
  lyricsButton.id='am-lyrics-toggle';
  extras.append(lyricsButton,button('Çalma sırası','queue',()=>{
    const native=root.querySelector('[data-testid="control-button-queue"]');
    if(native){document.body.classList.toggle('am-queue-open');native.click();}
    else S.showNotification('Çalma sırası bu Spotify sürümünde kullanılamıyor.');
  }));
  // Volume follows Apple Music: resting on the speaker opens a capsule with a thick level bar over the
  // lyrics and queue buttons; the speaker mutes and brings back the previous level.
  const volumeWrap=el('div','am-volume-wrap'),volumeCapsule=el('div','am-volume-capsule');
  const volume=el('input','am-volume');volume.type='range';volume.min='0';volume.max='1';volume.step='.01';volume.setAttribute('aria-label','Ses seviyesi');
  let unmutedVolume=.5,volumeIcon='volume',volumeTimer=0;
  const volumeButton=button('Sesi kapat / aç','volume',safe(()=>setVolume(S.Player.getVolume()>0?0:unmutedVolume)),'am-volume-button');
  function renderVolume(level) {
    volume.style.setProperty('--am-level',(level*100).toFixed(1)+'%');
    const icon=level<=0?'volumeMuted':level<.34?'volume1':level<.67?'volume2':'volume';
    if(icon!==volumeIcon){volumeIcon=icon;volumeButton.innerHTML=svg(icon);}
  }
  function setVolume(level) {
    level=Math.round(Math.min(1,Math.max(0,level))*100)/100;if(level>0)unmutedVolume=level;
    S.Player.setVolume(level);volume.value=String(level);renderVolume(level);
  }
  function openVolume(open,delay){clearTimeout(volumeTimer);volumeTimer=setTimeout(()=>player.classList.toggle('am-volume-open',open),delay);}
  volume.addEventListener('input',safe(()=>setVolume(Number(volume.value))));
  volumeWrap.addEventListener('pointerenter',()=>openVolume(true,player.classList.contains('am-volume-open')?0:500));
  // Range inputs count as :focus-visible even after a click, so keyboard focus is told apart by hover instead.
  volumeWrap.addEventListener('pointerleave',()=>openVolume(false,400));
  volumeWrap.addEventListener('focusin',()=>{if(!volumeWrap.matches(':hover'))openVolume(true,0);});
  volumeWrap.addEventListener('focusout',event=>{if(!volumeWrap.contains(event.relatedTarget)&&!volumeWrap.matches(':hover'))openVolume(false,0);});
  volumeCapsule.append(volume);volumeWrap.append(volumeCapsule,volumeButton);extras.append(volumeWrap);
  try{renderVolume(S.Player.getVolume());volume.value=String(S.Player.getVolume());}catch{}
  // Scrolling over the volume control opens it and nudges the level in 5% steps.
  volumeWrap.addEventListener('wheel',event=>{
    if(!event.deltaY)return;event.preventDefault();openVolume(true,0);
    try{setVolume(S.Player.getVolume()-Math.sign(event.deltaY)*.05);}catch{}
  },{passive:false});
  document.body.append(player);
  // Liquid Glass: an SVG lens refracts the page along the player's rim, as on macOS 26.
  // The outer 14px act as a convex edge: each pixel shows the page up to 4.4px further in, easing to 0
  // where the glass turns flat. The mapping never folds back, so the edge magnifies what is under it.
  // (Apple's 2x glass mirrors the outer ~7px instead; on 1x screens that fold broke cards and round
  // avatars into slivers and swirls.) A 0.7px blur smooths Chromium's per-pixel sampling and softens text
  // behind the glass, and a curve brings white down to about half, so the player's white text stays
  // readable over bright artwork and busy pages, as in Apple Music. Blue holds the 1px rim light, which brightens the
  // refracted page rather than painting white: full at the top, about half at the bottom, faint on the sides.
  const glass=document.createElementNS('http://www.w3.org/2000/svg','svg');
  glass.setAttribute('aria-hidden','true');glass.setAttribute('width','0');glass.setAttribute('height','0');glass.style.position='absolute';
  const curve='tableValues=".02 .2 .36 .47 .54"',highlights=`<feFuncR type="table" ${curve}/><feFuncG type="table" ${curve}/><feFuncB type="table" ${curve}/>`;
  glass.innerHTML='<filter id="am-glass" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feImage result="map" preserveAspectRatio="none"/><feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation=".7" edgeMode="duplicate"/><feComponentTransfer result="glass">'+highlights+'</feComponentTransfer><feColorMatrix in="map" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0" result="rim"/><feComponentTransfer in="glass"><feFuncR type="linear" slope="1.6" intercept=".1"/><feFuncG type="linear" slope="1.6" intercept=".1"/><feFuncB type="linear" slope="1.6" intercept=".1"/></feComponentTransfer><feComposite in2="rim" operator="in"/><feComposite in2="glass" operator="over"/></filter>';
  document.body.append(glass);
  const glassMap=glass.querySelector('feImage'),glassShift=glass.querySelector('feDisplacementMap'),bezel=14;let glassSize='';
  // Shift 4.4·(1-x)³: its slope at the edge (-3·4.4/14 ≈ -0.94) stays above -1, which is what keeps it from folding.
  const bezelShift=edge=>4.4*Math.pow(1-Math.min(1,Math.max(0,edge)/bezel),3);
  function drawGlassMap() {
    // Drawn at CSS size and redrawn only on resize. A device-resolution map looks the same once Chromium
    // filters it bilinearly, but makes every backdrop frame rescale it, which costs ~25% while scrolling.
    const w=player.offsetWidth,h=player.offsetHeight;if(!w||!h||glassSize===w+'x'+h)return;glassSize=w+'x'+h;
    const r=h/2,max=bezelShift(0),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const context=canvas.getContext('2d'),image=context.createImageData(w,h),data=image.data;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      // The vector to the pill's centre line is the bezel's inward normal; red/green hold its x/y shift.
      const dx=Math.min(w-r,Math.max(r,x+.5))-(x+.5),dy=r-(y+.5),length=Math.hypot(dx,dy)||1,edge=r-length;
      const t=edge<bezel?bezelShift(edge)/max/length:0,light=.2+.8*Math.max(0,dy/length)+.35*Math.max(0,-dy/length),i=(y*w+x)*4;
      data[i]=Math.round(128+127*t*dx);data[i+1]=Math.round(128+127*t*dy);data[i+2]=Math.round(255*light*Math.min(1,Math.max(0,(1.1-edge)/.6)));data[i+3]=255;
    }
    context.putImageData(image,0,0);
    glassMap.setAttribute('href',canvas.toDataURL());glassMap.setAttribute('width',w);glassMap.setAttribute('height',h);
    glassShift.setAttribute('scale',(2*max).toFixed(2));
  }
  if(typeof ResizeObserver==='function')new ResizeObserver(drawGlassMap).observe(player);drawGlassMap();
  // One shared popover serves the "…" track menu and the profile menu.
  const popover=el('div','am-popover');popover.id='am-popover';popover.setAttribute('role','menu');popover.hidden=true;document.body.append(popover);
  let popoverAnchor=null;
  function closePopover(){if(popover.hidden)return;popover.hidden=true;popover.replaceChildren();popoverAnchor?.setAttribute('aria-expanded','false');popoverAnchor=null;}
  function togglePopover(anchor,build) {
    if(popoverAnchor===anchor){closePopover();return;}
    closePopover();
    const entries=build();if(!entries.length)return;
    for(const entry of entries){
      if(entry==='-'){popover.append(el('div','am-popover-separator'));continue;}
      if(entry.swatches){
        const row=el('div','am-popover-swatches');
        for(const [key,[label,color]] of Object.entries(accents)){
          const swatch=el('button','am-swatch');swatch.type='button';swatch.title=label;swatch.setAttribute('aria-label','Vurgu rengi: '+label);
          swatch.style.background=color;swatch.classList.toggle('am-selected',settings.accent===key);
          swatch.onclick=()=>{setAccent(key);row.querySelectorAll('.am-swatch').forEach(n=>n.classList.toggle('am-selected',n===swatch));};
          row.append(swatch);
        }
        popover.append(row);continue;
      }
      const item=el('button','am-popover-item',entry.label);item.type='button';item.setAttribute('role','menuitem');
      item.onclick=()=>{closePopover();entry.action();};popover.append(item);
    }
    popoverAnchor=anchor;anchor.setAttribute('aria-expanded','true');popover.hidden=false;
    const rect=anchor.getBoundingClientRect(),width=popover.offsetWidth;
    const left=anchor===more?rect.left+rect.width/2-width/2:rect.left;
    popover.style.left=Math.round(Math.min(innerWidth-width-8,Math.max(8,left)))+'px';
    // Open upwards from the player and profile, downwards from controls near the top.
    const below=rect.top<innerHeight/2;
    popover.style.top=below?Math.round(rect.bottom+8)+'px':'';
    popover.style.bottom=below?'':Math.round(innerHeight-rect.top+10)+'px';
    popover.querySelector('button')?.focus({preventScroll:true});
  }
  document.addEventListener('pointerdown',event=>{if(!popover.hidden&&!popover.contains(event.target)&&!popoverAnchor?.contains(event.target))closePopover();},true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!popover.hidden){const anchor=popoverAnchor;closePopover();anchor?.focus();}});
  const openUri=uri=>{if(uri)go('/'+uri.split(':').slice(1).join('/'));};
  function trackMenu() {
    const item=S.Player.data?.item,meta=item?.metadata||{};if(!item?.uri)return [];
    const albumUri=item.album?.uri||meta.album_uri,artistUri=item.artists?.[0]?.uri||meta.artist_uri;
    return [
      ...(albumUri?[{label:'Albüme Git',action:()=>openUri(albumUri)}]:[]),
      ...(artistUri?[{label:'Sanatçıya Git',action:()=>openUri(artistUri)}]:[]),
      {label:'Şarkı Bağlantısını Kopyala',action:async()=>{
        const link='https://open.spotify.com/'+item.uri.split(':').slice(1).join('/');
        try{if(S.Platform.ClipboardAPI?.copy)await S.Platform.ClipboardAPI.copy(link);else await navigator.clipboard.writeText(link);S.showNotification('Bağlantı kopyalandı.');}
        catch{S.showNotification('Bağlantı kopyalanamadı.');}
      }},
    ];
  }
  function subtitleMenu() {
    const item=S.Player.data?.item,meta=item?.metadata||{};if(!item?.uri)return [];
    const albumUri=item.album?.uri||meta.album_uri,artists=(item.artists||[]).filter(artist=>artist?.uri);
    if(!artists.length&&meta.artist_uri)artists.push({uri:meta.artist_uri,name:meta.artist_name||''});
    return [
      ...artists.map(artist=>({label:artists.length>1?'Sanatçıya Git: '+artist.name:'Sanatçıya Git',action:()=>openUri(artist.uri)})),
      ...(albumUri?[{label:'Albüme Git',action:()=>openUri(albumUri)}]:[]),
    ];
  }
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
  // Artwork opens Spicy Lyrics' fullscreen view, or Spotify's own when it is absent.
  function toggleFullscreen() {
    if(document.getElementById('SpicyLyrics_FullscreenButton')){runSpicyControl('SpicyLyrics_FullscreenButton');return;}
    const native=document.querySelector('[data-testid="fullscreen-mode-button"]');
    if(native)native.click();else S.showNotification('Tam ekran bu Spotify sürümünde kullanılamıyor.');
  }
  let friendPane=null;
  function syncNativePanels() {
    // Spotify 1.3 opens Friend Activity in the right panel as an <aside> labelled like its toolbar button
    // (data-restore-focus-key="buddy_feed"); the panel otherwise holds the hidden Now Playing view.
    const label=document.querySelector('[data-restore-focus-key="buddy_feed"]')?.getAttribute('aria-label');
    const feed=(label&&document.querySelector(`.am-native-right aside[aria-label="${CSS.escape(label)}"]`))
      ||document.querySelector('.fkgR9mQfUbjSxQi0FXd4')
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
    const lyricsOpen=routePath()==='/SpicyLyrics';
    const available=!!document.getElementById('SpicyLyrics_PageButton');
    lyricsButton.classList.toggle('am-active',lyricsOpen);
    setAttributeIfChanged(lyricsButton,'aria-pressed',String(lyricsOpen));
    setAttributeIfChanged(lyricsButton,'title',available?(lyricsOpen?'Spicy Lyrics sözlerini kapat':'Spicy Lyrics sözlerini aç'):'Spicy Lyrics yükleniyor…');
    fullscreenButton.classList.toggle('am-active',fullscreen);
    setAttributeIfChanged(fullscreenButton,'aria-pressed',String(fullscreen));
    setAttributeIfChanged(fullscreenButton,'title',fullscreen?'Tam ekrandan çık':'Tam ekran');
  }
  let previousTrack='',previousPlaying=null;
  function syncPlayer() {
    if(document.hidden||!S.Player.origin?._state) return;
    const playing=S.Player.isPlaying();
    if(playing!==previousPlaying){previousPlaying=playing;play.innerHTML=svg(playing?'pause':'play');play.setAttribute('aria-label',playing?'Duraklat':'Çal');play.title=playing?'Duraklat':'Çal';}
    shuffle.classList.toggle('am-active',!!S.Player.getShuffle());repeat.classList.toggle('am-active',!!S.Player.getRepeat());
    setAttributeIfChanged(shuffle,'aria-pressed',String(!!S.Player.getShuffle()));setAttributeIfChanged(repeat,'aria-pressed',String(!!S.Player.getRepeat()));
    const level=S.Player.getVolume();if(volume.value!==String(level)){volume.value=String(level);renderVolume(level);if(level>0)unmutedVolume=level;}
    if(!dragging)renderProgress(S.Player.getProgressPercent()||0,false);
    const liked=!!S.Player.getHeart?.();
    star.classList.toggle('am-active',liked);setAttributeIfChanged(star,'aria-pressed',String(liked));
    setAttributeIfChanged(star,'title',liked?'Beğenilen Şarkılar\'dan çıkar':'Beğenilen Şarkılar\'a ekle');
    const item=S.Player.data?.item,meta=item?.metadata||{};
    const trackTitle=item?.name||meta.title||'',trackArtist=meta.artist_name||item?.artists?.map(a=>a.name).join(', ')||'';
    const album=item?.album?.name||meta.album_title||'';
    const key=[item?.uri,trackTitle,trackArtist,album].join('\n');
    if(key!==previousTrack){
      const changed=previousTrack!=='';previousTrack=key;closePopover();
      title.set(trackTitle);subtitle.set([trackArtist,album].filter(Boolean).join(' — '));
      track.classList.toggle('am-has-track',!!trackTitle);
      const images=item?.images?.length?item.images:item?.album?.images||[];
      const art=spotifyImage((images.find(i=>i.label==='small')||images.find(i=>i.label==='standard')||images[0])?.url||meta.image_small_url||meta.image_url||'');
      if(!art){cover.hidden=true;cover.removeAttribute('src');}else if(cover.getAttribute('src')!==art)cover.src=art;
      renderProgress(S.Player.getProgressPercent()||0,true);
      if(changed&&!reducedMotion.matches){lcd.classList.remove('am-swap');void lcd.offsetWidth;lcd.classList.add('am-swap');}
    }
  }
  S.Player.addEventListener('songchange',syncPlayer);S.Player.addEventListener('onplaypause',syncPlayer);
  player.addEventListener('pointerenter',syncPlayer);
  player.addEventListener('focusin',syncPlayer);
  let playerTimer=null;
  function resumeUpdates(){clearInterval(playerTimer);playerTimer=null;if(!document.hidden){syncPlayer();syncSpicyControls();playerTimer=setInterval(syncPlayer,1000);}}
  document.addEventListener('visibilitychange',resumeUpdates);resumeUpdates();
  // Artist pages are redrawn after Apple Music from Spotify's own artist query.
  // Any missing API or failed request falls back to Spotify's native page.
  const artistView=el('section','');artistView.id='am-artist';artistView.setAttribute('aria-label','Sanatçı');document.body.append(artistView);
  // Windows draws a classic scrollbar that takes a column of the page and cuts the artwork short; this thin
  // overlay thumb, as on macOS, shows while scrolling or hovered and can be dragged.
  function overlayScrollbar(view,cls) {
    const thumb=el('div','am-scroll-thumb '+cls);document.body.append(thumb);
    let hideTimer=0,drag=null;
    function place(show) {
      const range=view.scrollHeight-view.clientHeight,box=view.getBoundingClientRect();
      if(range<=1||!box.height){thumb.style.opacity='0';return;}
      const height=Math.max(36,box.height*view.clientHeight/view.scrollHeight);
      thumb.style.height=height+'px';thumb.style.transform='translateY('+(box.top+(box.height-height)*view.scrollTop/range).toFixed(1)+'px)';
      if(!show)return;
      thumb.style.opacity='1';clearTimeout(hideTimer);
      hideTimer=setTimeout(()=>{if(!drag&&!thumb.matches(':hover'))thumb.style.opacity='0';},900);
    }
    view.addEventListener('scroll',()=>place(true),{passive:true});
    thumb.addEventListener('pointerenter',()=>place(true));
    thumb.addEventListener('pointerleave',()=>place(true));
    thumb.addEventListener('pointerdown',event=>{event.preventDefault();drag={y:event.clientY,top:view.scrollTop};thumb.setPointerCapture(event.pointerId);thumb.classList.add('am-dragging');});
    thumb.addEventListener('pointermove',event=>{
      if(!drag)return;
      const track=view.clientHeight-thumb.offsetHeight;
      view.scrollTop=drag.top+(event.clientY-drag.y)*(view.scrollHeight-view.clientHeight)/Math.max(1,track);
    });
    const stop=()=>{if(!drag)return;drag=null;thumb.classList.remove('am-dragging');place(true);};
    thumb.addEventListener('pointerup',stop);thumb.addEventListener('pointercancel',stop);
  }
  overlayScrollbar(artistView,'am-scroll-artist');overlayScrollbar(libraryView,'am-scroll-library');
  wheelHost(artistView);wheelHost(libraryView);
  const nativeArtists=new Set();
  let artistRequest=0,artistScroll=0;
  function hexToHsl(hex) {
    const m=/^#?([0-9a-f]{6})$/i.exec(hex||'');if(!m)return null;
    const n=parseInt(m[1],16),r=(n>>16)/255,g=(n>>8&255)/255,b=(n&255)/255,max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2;
    if(max===min)return [0,0,l];
    const d=max-min,s=l>.5?d/(2-max-min):d/(max+min);
    const h=max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4;
    return [h*60,s,l];
  }
  // Like Apple Music, the whole window takes the artist's colour: bright at the top, deep below.
  function setTint(hex) {
    const hsl=hexToHsl(hex),style=document.documentElement.style;
    if(!hsl){document.body.classList.remove('am-tinted');return;}
    // A grey photo keeps a grey page; raising its saturation would turn hue 0 into red.
    const [h,s]=hsl,sat=Math.round((s<.1?s:Math.min(.85,Math.max(.35,s)))*100),hue=Math.round(h);
    style.setProperty('--am-tint-top',`hsl(${hue} ${sat}% 38%)`);
    style.setProperty('--am-tint-bg',`hsl(${hue} ${Math.round(sat*.8)}% 14%)`);
    style.setProperty('--am-tint-text',`hsl(${hue} ${Math.min(100,sat+10)}% 78%)`);
    document.body.classList.add('am-tinted');
  }
  // Apple Music takes the page colour from the artwork. Spotify's extracted colour is often off (grey
  // photos come back reddish), so the artwork is sampled: the most colourful hue family wins, and an
  // image with little colour gives its plain average. i.scdn.co allows CORS, so the canvas stays readable.
  function artworkColor(url) {
    return new Promise(resolve=>{
      if(!url)return resolve(null);
      const img=new Image();img.crossOrigin='anonymous';img.decoding='async';
      img.onerror=()=>resolve(null);
      img.onload=()=>{try{
        const size=32,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
        const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(img,0,0,size,size);
        const data=context.getImageData(0,0,size,size).data,bins=Array.from({length:12},()=>[0,0,0,0]),total=[0,0,0];
        for(let i=0;i<data.length;i+=4){
          const r=data[i],g=data[i+1],b=data[i+2],max=Math.max(r,g,b),chroma=max-Math.min(r,g,b);
          total[0]+=r;total[1]+=g;total[2]+=b;
          if(chroma<24||max<40)continue;
          const hue=max===r?((g-b)/chroma+6)%6:max===g?(b-r)/chroma+2:(r-g)/chroma+4,bin=bins[Math.floor(hue*2)%12];
          bin[0]+=r*chroma;bin[1]+=g*chroma;bin[2]+=b*chroma;bin[3]+=chroma;
        }
        const count=data.length/4,best=bins.reduce((a,b)=>b[3]>a[3]?b:a);
        const rgb=best[3]>count*12?best.slice(0,3).map(v=>v/best[3]):total.map(v=>v/count);
        resolve('#'+rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join(''));
      }catch{resolve(null);}};
      img.src=url;
    });
  }
  const smallImage=visual=>spotifyImage([...(visual?.sources||[])].sort((a,b)=>(a.width||0)-(b.width||0))[0]?.url||'');
  function closeArtist() {
    if(!document.body.classList.contains('am-artist-open')&&!artistView.hasChildNodes())return;
    ++artistRequest;document.body.classList.remove('am-artist-open','am-tinted');
    artistView.replaceChildren();artistView.scrollTop=0;
  }
  const artistImage=(visual,big)=>{const sources=[...(visual?.sources||[])].sort((a,b)=>(a.width||0)-(b.width||0));return spotifyImage((big?sources.at(-1):sources.find(s=>(s.width||0)>=300)||sources.at(-1))?.url||'');};
  const releaseDate=date=>{
    if(!date?.year)return '';
    if(!date.month||!date.day)return String(date.year);
    try{return new Intl.DateTimeFormat('tr',{day:'numeric',month:'short',year:'numeric'}).format(new Date(date.year,date.month-1,date.day));}catch{return String(date.year);}
  };
  const releaseLabel={SINGLE:'Single',EP:'EP',COMPILATION:'Derleme'};
  function lazyImage(src,cls) {
    const img=el('img',cls||'');img.alt='';img.loading='lazy';img.decoding='async';
    if(src){img.src=src;img.addEventListener('error',()=>img.remove(),{once:true});}
    return img;
  }
  function artistShelf(title,items,render,{link,cls}={}) {
    if(!items.length)return null;
    const shelf=el('section','am-shelf'+(cls?' '+cls:''));
    const head=el(link?'button':'h2','am-shelf-title',title);
    if(link){head.type='button';head.insertAdjacentHTML('beforeend',svg('chevron'));head.addEventListener('click',()=>go(link));}
    const track=el('div','am-shelf-track');
    for(const item of items){const node=render(item);if(node)track.append(node);}
    const prev=button('Geri kaydır','left',()=>track.scrollBy({left:-track.clientWidth*.85,behavior:'smooth'}),'am-shelf-arrow am-prev');
    const next=button('İleri kaydır','chevron',()=>track.scrollBy({left:track.clientWidth*.85,behavior:'smooth'}),'am-shelf-arrow am-next');
    const edges=()=>{prev.hidden=track.scrollLeft<4;next.hidden=track.scrollLeft+track.clientWidth>=track.scrollWidth-4;};
    track.addEventListener('scroll',edges,{passive:true});requestAnimationFrame(edges);
    shelf.append(head,track,prev,next);return shelf;
  }
  function releaseCard(release,{subtitle,round}={}) {
    if(!release?.uri)return null;
    const card=el('button','am-card'+(round?' am-card-round':''));card.type='button';card.title=release.name||'';
    const art=el('span','am-card-art');art.append(lazyImage(artistImage(release.coverArt||release.visuals?.avatarImage||release.images?.items?.[0])));
    card.append(art,el('span','am-card-name',release.name||release.profile?.name||''));
    if(subtitle)card.append(el('span','am-card-sub',subtitle));
    card.addEventListener('click',()=>openUri(release.uri));
    return card;
  }
  async function toggleSaved(uri,saved) {
    const api=S.Platform.LibraryAPI;
    if(saved)await api.remove({uris:[uri]});else await api.add({uris:[uri]});
    return !saved;
  }
  function playArtist(uri,trackUri) {
    try{
      if(trackUri&&S.Platform.PlayerAPI?.play)return S.Platform.PlayerAPI.play({uri},{featureIdentifier:'artist'},{skipTo:{uri:trackUri}});
      return S.Player.playUri(trackUri||uri);
    }catch{S.showNotification('Çalma başlatılamadı.');}
  }
  async function renderArtist(id) {
    const request=++artistRequest,uri='spotify:artist:'+id;
    currentMode='artist';++libraryRequest;clearLibrary();
    document.body.classList.remove('am-library-open','am-search-open','am-tinted');document.body.classList.add('am-artist-open');updateNav();
    artistView.replaceChildren(el('p','am-artist-loading','Yükleniyor…'));artistView.scrollTop=0;
    let artist;
    try{
      const response=await S.GraphQL.Request(S.GraphQL.Definitions.queryArtistOverview,{uri,locale:S.Locale?.getLocale?.()||'',includePrerelease:true});
      artist=response?.data?.artistUnion;
      if(!artist?.profile?.name)throw new Error(response?.errors?.[0]?.message||'No artist data');
    }catch(e){
      if(request!==artistRequest)return;
      console.warn('[AppleMusicMac] Artist view, using Spotify page',e);
      nativeArtists.add(id);closeArtist();currentMode='native';return;
    }
    if(request!==artistRequest)return;
    const visuals=artist.visuals||{},discography=artist.discography||{},related=artist.relatedContent||{};
    // Artists without a wide header image get Apple Music's round portrait instead of a stretched avatar.
    const avatarOnly=!visuals.headerImage?.sources?.length;
    const spotifyColor=visuals.headerImage?.extractedColors?.colorRaw?.hex||visuals.avatarImage?.extractedColors?.colorRaw?.hex;
    const fallbackTint=setTimeout(()=>{if(request===artistRequest)setTint(spotifyColor);},600);
    artworkColor(smallImage(visuals.headerImage||visuals.avatarImage)).then(hex=>{if(request!==artistRequest||!hex)return;clearTimeout(fallbackTint);setTint(hex);});
    const page=document.createDocumentFragment();
    // Floating controls, as in Apple Music: back on the left, share and more on the right.
    const back=button('Geri','left',()=>H.goBack?.(),'am-artist-back');
    const shareLink='https://open.spotify.com/artist/'+id;
    const copyLink=async()=>{try{if(S.Platform.ClipboardAPI?.copy)await S.Platform.ClipboardAPI.copy(shareLink);else await navigator.clipboard.writeText(shareLink);S.showNotification('Bağlantı kopyalandı.');}catch{S.showNotification('Bağlantı kopyalanamadı.');}};
    const actions=el('div','am-artist-actions');
    const moreButton=button('Diğer seçenekler','more',()=>togglePopover(moreButton,()=>[
      {label:'Bağlantıyı Kopyala',action:copyLink},
      {label:'Spotify Sayfasında Aç',action:()=>{nativeArtists.add(id);closeArtist();currentMode='native';}},
    ]));
    actions.append(button('Paylaş','share',copyLink),moreButton);
    page.append(back,actions);
    // Hero: full-bleed artwork that fades into the tint, name and the play/follow pair.
    const hero=el('header','am-artist-hero'+(avatarOnly?' am-hero-avatar':''));
    const heroArt=lazyImage(artistImage(visuals.headerImage||visuals.avatarImage,true),avatarOnly?'am-hero-portrait':'am-hero-image');heroArt.loading='eager';
    const heroContent=el('div','am-hero-content');
    if(avatarOnly)heroContent.append(heroArt);
    const concerts=artist.goods?.events?.concerts?.items||[];
    if(concerts.length)heroContent.append(el('span','am-hero-pill','Yaklaşan Konserler'));
    heroContent.append(el('h1','am-artist-name',artist.profile.name));
    const heroActions=el('div','am-hero-actions');
    const playButton=button(artist.profile.name+' çal','play',()=>playArtist(uri),'am-hero-play');
    let saved=!!artist.saved;
    const follow=button('Takip et','star',async()=>{
      try{saved=await toggleSaved(uri,saved);follow.classList.toggle('am-active',saved);follow.title=saved?'Takibi bırak':'Takip et';}
      catch{S.showNotification('Takip durumu değiştirilemedi.');}
    },'am-hero-follow');
    follow.classList.toggle('am-active',saved);follow.title=saved?'Takibi bırak':'Takip et';
    heroActions.append(playButton,follow);heroContent.append(heroActions);
    // The mask lives on a wrapper so the drifting image never shows a hard clipped edge.
    if(avatarOnly)hero.append(heroContent);
    else{const heroMedia=el('div','am-hero-media');heroMedia.append(heroArt);hero.append(heroMedia,heroContent);}
    page.append(hero);
    const body=el('div','am-artist-body');page.append(body);
    // Latest release and top songs share one horizontal row, as in Apple Music.
    const latest=discography.latest;
    const topTracks=(discography.topTracks?.items||[]).map(item=>item?.track).filter(track=>track?.uri).slice(0,12);
    if(latest?.uri||topTracks.length){
      const row=el('section','am-shelf am-shelf-top'),track=el('div','am-shelf-track');
      if(latest?.uri){
        const block=el('div','am-latest');
        block.append(el('h2','am-shelf-title','Son Çıkan'));
        const card=el('div','am-latest-card');
        const cover=el('button','am-latest-art');cover.type='button';cover.title=latest.name||'';cover.append(lazyImage(artistImage(latest.coverArt)));cover.addEventListener('click',()=>openUri(latest.uri));
        const info=el('div','am-latest-info');
        info.append(el('span','am-latest-date',releaseDate(latest.date)),el('span','am-latest-name',(latest.name||'')+(releaseLabel[latest.type]?' - '+releaseLabel[latest.type]:'')));
        const count=latest.tracks?.totalCount;if(count)info.append(el('span','am-latest-count',count+' şarkı'));
        let added=false;
        const add=button('Arşive ekle','plus',async()=>{try{added=await toggleSaved(latest.uri,added);add.classList.toggle('am-active',added);S.showNotification(added?'Arşive eklendi.':'Arşivden çıkarıldı.');}catch{S.showNotification('Arşiv güncellenemedi.');}},'am-latest-add');
        info.append(add);card.append(cover,info);block.append(card);track.append(block);
      }
      if(topTracks.length){
        const block=el('div','am-top-songs');
        block.append(el('h2','am-shelf-title','Popüler Şarkılar'));
        const grid=el('div','am-song-grid');
        for(const song of topTracks){
          const row=el('div','am-song');
          const playSong=el('button','am-song-main');playSong.type='button';playSong.title=song.name||'';
          playSong.addEventListener('click',()=>playArtist(uri,song.uri));
          const text=el('span','am-song-text');
          const albumName=song.albumOfTrack?.name;
          const sub=albumName||(song.artists?.items||[]).map(a=>a.profile?.name).filter(Boolean).join(', ');
          text.append(el('span','am-song-name',song.name||''),el('span','am-song-sub',sub||''));
          playSong.append(lazyImage(artistImage(song.albumOfTrack?.coverArt),'am-song-art'),text);
          const songMore=button('Diğer seçenekler','more',()=>togglePopover(songMore,()=>[
            ...(song.albumOfTrack?.uri?[{label:'Albüme Git',action:()=>openUri(song.albumOfTrack.uri)}]:[]),
            {label:'Şarkı Bağlantısını Kopyala',action:async()=>{const link='https://open.spotify.com/track/'+song.uri.split(':').pop();try{if(S.Platform.ClipboardAPI?.copy)await S.Platform.ClipboardAPI.copy(link);else await navigator.clipboard.writeText(link);S.showNotification('Bağlantı kopyalandı.');}catch{S.showNotification('Bağlantı kopyalanamadı.');}}},
          ]),'am-song-more');
          row.append(playSong,songMore);grid.append(row);
        }
        block.append(grid);track.append(block);
      }
      const prev=button('Geri kaydır','left',()=>track.scrollBy({left:-track.clientWidth*.85,behavior:'smooth'}),'am-shelf-arrow am-prev');
      const next=button('İleri kaydır','chevron',()=>track.scrollBy({left:track.clientWidth*.85,behavior:'smooth'}),'am-shelf-arrow am-next');
      const edges=()=>{prev.hidden=track.scrollLeft<4;next.hidden=track.scrollLeft+track.clientWidth>=track.scrollWidth-4;};
      track.addEventListener('scroll',edges,{passive:true});requestAnimationFrame(edges);
      row.append(track,prev,next);body.append(row);
    }
    const releases=group=>(group?.items||[]).map(item=>item?.releases?.items?.[0]||item).filter(release=>release?.uri);
    const shelves=[
      artistShelf('Albümler',releases(discography.albums),release=>releaseCard(release,{subtitle:String(release.date?.year||'')}),{link:`/artist/${id}/discography/album`}),
      artistShelf('Single\'lar ve EP\'ler',releases(discography.singles),release=>releaseCard({...release,name:(release.name||'')+(releaseLabel[release.type]?' - '+releaseLabel[release.type]:'')},{subtitle:String(release.date?.year||'')}),{link:`/artist/${id}/discography/single`}),
      artistShelf('Derlemeler',releases(discography.compilations),release=>releaseCard(release,{subtitle:String(release.date?.year||'')})),
      concertList(concerts),
      artistShelf('Sanatçı Çalma Listeleri',(related.featuringV2?.items||[]).map(item=>item?.data).filter(list=>list?.uri),list=>releaseCard(list,{subtitle:list.ownerV2?.data?.name||''})),
      artistShelf('Yer Aldığı',releases(related.appearsOn),release=>releaseCard(release,{subtitle:(release.artists?.items||[]).map(a=>a.profile?.name).filter(Boolean).join(', ')}),{link:`/artist/${id}/appears-on`}),
      artistShelf('Benzer Sanatçılar',(related.relatedArtists?.items||[]).filter(a=>a?.uri),person=>releaseCard({uri:person.uri,name:person.profile?.name,visuals:person.visuals},{round:true}),{link:`/artist/${id}/related`,cls:'am-shelf-artists'}),
      aboutSection(artist),
    ];
    for(const shelf of shelves)if(shelf)body.append(shelf);
    artistView.replaceChildren(page);artistScroll=0;updateHero();
  }
  function concertList(items) {
    const concerts=items.map(item=>item?.data||item).filter(c=>c?.date?.isoString||c?.startDateIsoString).slice(0,6);
    if(!concerts.length)return null;
    const section=el('section','am-shelf am-concerts');section.append(el('h2','am-shelf-title','Yaklaşan Konserler'));
    const grid=el('div','am-concert-grid');
    for(const concert of concerts){
      const date=new Date(concert.date?.isoString||concert.startDateIsoString);if(isNaN(date))continue;
      const row=el('div','am-concert');
      const place=concert.venue?.location?.name||concert.location?.name||concert.title||'';
      const detail=[concert.venue?.name,new Intl.DateTimeFormat('tr',{weekday:'short',hour:'2-digit',minute:'2-digit'}).format(date)].filter(Boolean).join(' · ');
      const text=el('span','am-concert-text');text.append(el('span','am-concert-place',place),el('span','am-concert-detail',detail));
      row.append(el('span','am-concert-day',String(date.getDate())),text);grid.append(row);
    }
    section.append(grid);return section;
  }
  function aboutSection(artist) {
    const raw=artist.profile?.biography?.text||'';
    const listeners=artist.stats?.monthlyListeners;
    if(!raw&&!listeners)return null;
    const section=el('section','am-shelf am-about');section.append(el('h2','am-shelf-title','Hakkında'));
    if(raw){const holder=document.createElement('template');holder.innerHTML=raw;section.append(el('p','am-about-text',holder.content.textContent.trim()));}
    if(listeners)section.append(el('p','am-about-stat',new Intl.NumberFormat('tr').format(listeners)+' aylık dinleyici'));
    return section;
  }
  // The hero image drifts and softens as the page scrolls, like Apple Music's artist header.
  let heroFrame=0;
  function updateHero() {
    heroFrame=0;
    const progress=Math.min(1,artistScroll/Math.max(1,artistView.clientHeight*.7));
    artistView.style.setProperty('--am-hero-progress',progress.toFixed(3));
  }
  artistView.addEventListener('scroll',()=>{artistScroll=artistView.scrollTop;if(!heroFrame)heroFrame=requestAnimationFrame(updateHero);},{passive:true});
  H.listen(() => {
    syncSpicyControls();
    document.body.classList.add('am-ready');
    document.body.classList.remove('am-account-open');
    const query=new URLSearchParams(H.location.search);
    const kind=query.get('am-library');
    if(libraryLabels[kind]){closeArtist();renderLibrary(kind,query.get('am-folder')||'');return;}
    const artistId=/^\/artist\/([A-Za-z0-9]+)\/?$/.exec(routePath())?.[1];
    if(artistId&&!nativeArtists.has(artistId)&&S.GraphQL?.Request&&S.GraphQL.Definitions?.queryArtistOverview){renderArtist(artistId);return;}
    closeArtist();
    currentMode='native';++libraryRequest;clearLibrary();document.body.classList.remove('am-library-open');
    document.body.classList.toggle('am-search-open',routePath().startsWith('/search'));updateNav();
  });
  // Ignore feed cards, lyrics text and player progress mutations. Only host
  // replacements and extension/panel controls need a theme reconciliation.
  const relevantHosts='#global-nav-bar,#SpicyLyricsPage,#SpicyLyrics_PageButton,#SpicyLyrics_FullscreenButton,.fkgR9mQfUbjSxQi0FXd4,[data-testid^="buddy-feed-"],aside[aria-label]';
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
  document.addEventListener('keydown',event=>{
    if(currentMode!=='library'||!(event.metaKey||event.ctrlKey)||event.key?.toLowerCase()!=='f')return;
    const input=libraryView.querySelector('.am-library-filter');
    if(input){event.preventDefault();input.focus();input.select();}
  });
  // Profile menu → mcloud. Older Spicetify builds without Menu keep the defaults.
  if(S.Menu?.SubMenu&&S.Menu?.Item){
    const toggle=(label,key)=>{const item=new S.Menu.Item(label,settings[key],()=>{settings[key]=!settings[key];item.setState(settings[key]);saveSettings();applySettings();});return item;};
    const colors=Object.entries(accents).map(([key,[label]])=>new S.Menu.Item('Renk: '+label,settings.accent===key,()=>setAccent(key)));
    accentListeners.push(()=>colors.forEach((item,i)=>item.setState(Object.keys(accents)[i]===settings.accent)));
    new S.Menu.SubMenu('mcloud',[toggle('Oynatıcıda albüm kapağı','artwork'),toggle('Liquid Glass oynatıcı','liquid'),...colors]).register();
  }
  document.body.classList.add('am-ready');bindToolbar();go('/');
})();
