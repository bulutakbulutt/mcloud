/* AppleMusicMac 2.8. Local theme UI; no remote scripts or credentials. */
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
    plus:'<path d="M12 5v14M5 12h14"/>',
    bell:'<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 21h4"/>',
    friends:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17.2" cy="9" r="2.6"/><path d="M16 14.1a5.5 5.5 0 0 1 5.4 5.9"/>',
    devices:'<path d="M7 17H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="m12 15 5 6H7z" fill="currentColor"/>',
    popup:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><rect x="11.5" y="11" width="7" height="6" rx="1.2" fill="currentColor" stroke="none"/>'
  };
  const svg = name => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.music}</svg>`;
  function el(tag, cls, text) { const e = document.createElement(tag); e.className = cls; if (text) e.textContent = text; return e; }
  // Spotify's toasts live inside its own stacking context, under the floating player and the artist view, so the
  // theme shows its messages in a toast of its own above the player.
  const toast=el('div','am-toast');toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');document.body.append(toast);
  let toastTimer=0;
  function notify(message) { toast.textContent=message;toast.classList.add('am-toast-show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('am-toast-show'),2600); }
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
    document.dispatchEvent(new Event('am-settings'));
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
  // Apple Music's sidebar glass picks up the colours of the artwork beside it. A blurred backdrop that reaches past
  // the sidebar's edge carries those colours in; user.css shows it only inside the sidebar, fading from the edge.
  const sidebarGlow=el('div','');sidebarGlow.id='am-sidebar-glow';sidebarGlow.setAttribute('aria-hidden','true');
  document.body.append(sidebarGlow,sidebar);
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
  // Apple Music keeps the account in the sidebar's bottom-left corner. Notifications and Friend Activity sit beside
  // it; all three click Spotify's own toolbar buttons, which user.css keeps laid out (invisible) under this row, so
  // Spotify's account menu (with Spicetify's entries) and panels open here and work as they do natively.
  const account=el('div','am-account');
  const profile=el('button','am-profile');profile.type='button';profile.hidden=true;profile.setAttribute('aria-haspopup','menu');
  const avatar=el('span','am-avatar'),profileName=el('span','am-profile-name');profile.append(avatar,profileName);
  const nativeToolbarButton=selector=>document.querySelector('#global-nav-bar .am-toolbar-trailing '+selector);
  const nativeNews=()=>[...document.querySelectorAll('#global-nav-bar .am-toolbar-trailing button')].find(b=>!b.matches('[data-restore-focus-key],[data-testid="user-widget-link"]'));
  const newsButton=button('Yenilikler','bell',()=>{const native=nativeNews();if(native)native.click();else go('/content-feed');},'am-account-button');
  // Spotify mounts the feed only after fetching it (~0.5s on the first open), so press the button at once and let
  // syncNativePanels confirm it; a feed that never arrives releases it after 3s.
  let friendsPending=0;
  const friendsButton=button('Arkadaş etkinliği','friends',()=>{
    const native=nativeToolbarButton('[data-restore-focus-key="buddy_feed"]');
    if(!native){notify('Arkadaş etkinliği bu Spotify sürümünde kullanılamıyor.');return;}
    const open=!friendsButton.classList.contains('am-active');friendsPending=open?performance.now():0;
    friendsButton.classList.toggle('am-active',open);friendsButton.setAttribute('aria-pressed',String(open));
    native.click();if(open)setTimeout(syncNativePanels,3100);
  },'am-account-button');
  account.append(profile,newsButton,friendsButton);sidebar.append(account);
  (async()=>{
    try{
      const user=await S.Platform.UserAPI?.getUser?.();const name=user?.displayName||user?.username||'';if(!name)return;
      profileName.textContent=name;avatar.textContent=name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toLocaleUpperCase('tr');
      const image=spotifyImage(user.images?.[0]?.url||user.avatar?.sources?.[0]?.url||'');
      if(image){const img=el('img','');img.alt='';img.decoding='async';img.onerror=()=>img.remove();img.src=image;avatar.append(img);}
      profile.onclick=()=>{const native=nativeToolbarButton('[data-testid="user-widget-link"]');if(native){closePopover();native.click();}else togglePopover(profile,menu);};
      const menu=()=>[
        ...(user.username?[{label:'Profil',action:()=>go('/user/'+encodeURIComponent(user.username))}]:[]),
        {label:'Ayarlar',action:()=>go('/preferences')},
        '-',{swatches:true},
      ];
      profile.hidden=false;
    }catch(e){console.warn('[AppleMusicMac] Profile',e);}
  })();
  function updateNav() {
    const path = routePath();
    for (const { b, key } of navItems) {
      const selected = currentMode === 'library' ? key === libraryKeys[libraryKind] : path === key;
      b.classList.toggle('am-selected', selected);
      if(selected) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
    }    newsButton.classList.toggle('am-active',path==='/content-feed');
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
  const safe = fn => () => { try { const result=fn();result?.catch?.(()=>notify('Bu işlem şu anda kullanılamıyor.')); } catch { notify('Oynatıcı henüz hazır değil.'); } };
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
  const popupLyricsButton=button('Spicy Lyrics açılır pencere','popup',()=>runSpicyControl('SpicyLyrics_PopupLyricsButton'));popupLyricsButton.hidden=true;
  // Spotify Connect opens its device list in the right panel, shown as the same glass sheet as the queue.
  const connectButton=button('Bir cihaza bağlan','devices',()=>{
    const native=nativeConnect();
    if(native)native.click();else notify('Cihaz seçimi bu Spotify sürümünde kullanılamıyor.');
  });
  extras.append(popupLyricsButton,lyricsButton,connectButton,button('Çalma sırası','queue',()=>{
    const native=root.querySelector('[data-testid="control-button-queue"]');
    if(native)native.click();
    else notify('Çalma sırası bu Spotify sürümünde kullanılamıyor.');
  }));
  // Volume follows Apple Music: resting on the speaker opens a capsule with a thick level bar over the
  // lyrics and queue buttons; the speaker mutes and brings back the previous level.
  const volumeWrap=el('div','am-volume-wrap'),volumeCapsule=el('div','am-volume-capsule');
  const volume=el('input','am-volume');volume.type='range';volume.min='0';volume.max='1';volume.step='.01';volume.setAttribute('aria-label','Ses seviyesi');
  let unmutedVolume=.5,volumeIcon='volume',volumeTimer=0,wheelAccum=0,wheelTimer=0;
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
  // Scrolling over the volume control opens it and nudges the level along an audio-taper (perceptual) curve.
  volumeWrap.addEventListener('wheel',event=>{
    if(!event.deltaY)return;event.preventDefault();openVolume(true,0);
    clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>{wheelAccum=0;},150);
    const dy=event.deltaMode===1?event.deltaY*40:event.deltaMode===2?event.deltaY*800:event.deltaY;
    if(wheelAccum&&Math.sign(dy)!==Math.sign(wheelAccum))wheelAccum=0;
    wheelAccum+=dy;
    if(Math.abs(wheelAccum)<60)return;
    const dir=-Math.sign(wheelAccum);
    wheelAccum=0;
    try{
      const v=S.Player.getVolume();
      if((dir>0&&v>=1)||(dir<0&&v<=0))return;
      const next=Math.round(Math.min(1,Math.max(0,Math.sqrt(v)+dir*.05))**2*100)/100;
      setVolume(dir>0?Math.max(v+.01,next):Math.min(v-.01,next));
    }catch{}
  },{passive:false});
  document.body.append(player);
  // Liquid Glass, fitted to macOS's own glass. Apple Music's player is an NSGlassView, a private subclass of
  // NSGlassEffectView; a test app (github.com/emribilemir/liquid-glass-research) put the same glass over test patterns and over the scene behind
  // Music's real player, and these parameters minimise the difference to it. macOS glass turns diffuse when its
  // window is in the background; the theme keeps the focused look throughout, which is the one that reads as
  // Liquid Glass. The filter:
  //  - a slight blur and a bend at the rim (the outermost ~2px show the page 15-16px further in, so the edge
  //    mirrors what is just inside it; flat from 14px in), drawn at device resolution: the outermost 2px hold
  //    four steps of the bend on a 2x screen, which keeps the fold as soft as Apple's;
  //  - a highlight along the top and bottom edges (none at the round ends' middles): the outermost device pixel
  //    mixes 13% toward ~2x white, fading over ~5px;
  //  - a "darken" halo: bright detail is pulled toward its darker surroundings (a min with a 13.5px blur,
  //    mixed in at 70%) while dark detail stays, so fine bright lines dim and edges shade into bright areas but
  //    blacks never lift; a plain blur could not match both the sharp detail and the wide shading;
  //  - a tone by luminance that keeps the hue (with a slight gain on colour around it): black lifts to 32, mid grey
  //    to ~130, white comes down to 185;
  //  - no saturation boost at the user's Liquid Glass setting it was fitted at (the leftmost).
  const glass=document.createElementNS('http://www.w3.org/2000/svg','svg');
  glass.setAttribute('aria-hidden','true');glass.setAttribute('width','0');glass.setAttribute('height','0');glass.style.position='absolute';
  const glassStates={
    focused:{pre:.4,post:0,darken:.7,darkenBlur:13.5,gain:1.05,lensAt:[0,.5,1,1.5,2,3,4,6,9,14],lens:[15,15.6,16.1,15.7,12.25,10.9,7.5,5,.75,0],
      // Highlight along the top and bottom edges, every 0.5px from the edge, mixed toward 2x white (fitted to Apple
      // Music's own frames: stronger and it overshoots over bright artwork).
      highlight:[.13,.085,.032,.019,.014,.011,.009,.007,.005,.004,.003,.002,.001,.0005,0],highlightTo:2,highlightPow:3.5,
      tone:[32,36,45,56,65,71,78,86,90,96,102,109,116,120,122,125,130,135,141,147,152,156,156,157,161,167,170,170,174,178,179,181,185]},
  };
  // On wide-gamut (P3) Macs Chromium converts the recombined map from sRGB to P3 before displacing, and that
  // mixes channels: red took ~18% of green, so a vertical shift also shifted the page up to ~2.7px sideways. The
  // map therefore arrives as two grey images (greys survive the conversion) recombined as R=G=x shift and B=y
  // shift: red gains nothing when green equals it, and blue's ~9% share of x is compensated in glassLens().
  // The tone is stored as the offset to add at each luminance, (out-in+1)/2, so colours move with their luminance
  // instead of each channel on its own curve.
  const glassFilter=(id,state)=>{
    const tone=`type="table" tableValues="${state.tone.map((t,k)=>((t/255-state.gain*k/32+1)/2).toFixed(4)).join(' ')}"`;
    const darken=state.darken?`<feGaussianBlur stdDeviation="${state.darkenBlur}" edgeMode="duplicate" result="halo"/><feBlend in="core" in2="halo" mode="darken"/><feComposite in="core" operator="arithmetic" k2="${(1-state.darken).toFixed(2)}" k3="${state.darken}"/>`:'';
    const peakHighlight=state.highlight[0];
    return `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feImage result="mx" preserveAspectRatio="none"/><feImage result="my" preserveAspectRatio="none"/><feImage result="mh" preserveAspectRatio="none"/><feColorMatrix in="mx" values="1 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 1" result="x"/><feColorMatrix in="my" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 1" result="y"/><feComposite in="x" in2="y" operator="arithmetic" k2="1" k3="1" result="map"/><feGaussianBlur in="SourceGraphic" stdDeviation="${state.pre}" edgeMode="duplicate" result="soft"/><feDisplacementMap in="soft" in2="map" xChannelSelector="R" yChannelSelector="B" result="core"/>${state.post?`<feGaussianBlur stdDeviation="${state.post}" edgeMode="duplicate"/>`:''}${darken}<feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0 1" result="glass"/><feColorMatrix values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0"/><feComponentTransfer result="tone"><feFuncR ${tone}/><feFuncG ${tone}/><feFuncB ${tone}/></feComponentTransfer><feComposite in="glass" in2="tone" operator="arithmetic" k2="${state.gain}" k3="2" k4="-1"/><feComposite in2="mh" operator="arithmetic" k1="${-peakHighlight}" k2="1" k3="${(state.highlightTo*peakHighlight).toFixed(4)}"/></filter>`;
  };
  // The sidebar glow (user.css) saturates and brightens hard so that small covers reach its edge; this soft
  // ceiling keeps large coloured areas, such as playlist headers under the sidebar, from blowing out.
  const glowCap='tableValues="0 .1 .2 .3 .4 .48 .55 .6 .63 .65 .66"';
  // The player's glass is toolbarLens (below); the toast keeps this filter: it fades in with opacity, and an element
  // below 1 opacity is its children's backdrop root, which would blank the three-layer glass while it fades.
  glass.innerHTML=glassFilter('am-glass-toast',glassStates.focused)
    +`<filter id="am-glow-cap" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="table" ${glowCap}/><feFuncG type="table" ${glowCap}/><feFuncB type="table" ${glowCap}/></feComponentTransfer></filter>`;
  document.body.append(glass);
  // sRGB transfer functions, for undoing P3's blue row (B' = .0171R + .0724G + .9108B in linear light).
  const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4,encode=v=>v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055;
  const wideGamut=matchMedia('(color-gamut: p3)').matches;
  function glassLens(filterId,node,state) {
    const filter=glass.querySelector('#'+filterId),maps=filter.querySelectorAll('feImage'),glassShift=filter.querySelector('feDisplacementMap');let glassSize='';
    // Inward shift (px) by distance from the edge (px), linear between the points.
    const at=state.lensAt,shift=state.lens,peak=Math.max(...shift);
    const shiftAt=edge=>{if(edge>=at[at.length-1])return 0;let i=0;while(edge>at[i+1])i++;return shift[i]+(shift[i+1]-shift[i])*(edge-at[i])/(at[i+1]-at[i]);};
    const hl=state.highlight,highlightAt=edge=>{const f=edge/.5;if(f>=hl.length-1)return 0;const i=Math.floor(f);return (hl[i]+(hl[i+1]-hl[i])*(f-i))/hl[0];};
    const draw=()=>{
      // Drawn at device resolution and redrawn only on resize or a change of screen: the bend and the highlight
      // live in the outermost few pixels. Scrolling frame times were measured unchanged against a CSS-size map.
      const w=node.offsetWidth,h=node.offsetHeight,k=devicePixelRatio||1;if(!w||!h||glassSize===w+'x'+h+'@'+k)return;glassSize=w+'x'+h+'@'+k;
      const W=Math.round(w*k),H=Math.round(h*k),r=h/2,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
      const context=canvas.getContext('2d'),images=[0,1,2].map(()=>context.createImageData(W,H)),[mx,my,mh]=images.map(image=>image.data);
      for(let y=0;y<H;y++)for(let x=0;x<W;x++){
        // The vector to the pill's centre line is the rim's inward normal; the maps hold its x/y shift.
        const px=(x+.5)/k,py=(y+.5)/k,dx=Math.min(w-r,Math.max(r,px))-px,dy=r-py,length=Math.hypot(dx,dy)||1,edge=Math.max(0,r-length),t=shiftAt(edge)/peak/length,i=(y*W+x)*4;
        const xv=Math.round(128+127*t*dx),yv=(128+127*t*dy)/255;
        mx[i]=mx[i+1]=mx[i+2]=xv;my[i]=my[i+1]=my[i+2]=Math.round(255*(wideGamut?encode(Math.min(1,Math.max(0,(linear(yv)-.0895*linear(xv/255))/.9108))):yv));
        mh[i]=mh[i+1]=mh[i+2]=Math.round(255*highlightAt(edge)*Math.abs(dy/length)**state.highlightPow);mx[i+3]=my[i+3]=mh[i+3]=255;
      }
      images.forEach((image,n)=>{context.putImageData(image,0,0);maps[n].setAttribute('href',canvas.toDataURL());maps[n].setAttribute('width',w);maps[n].setAttribute('height',h);});
      glassShift.setAttribute('scale',2*peak);
    };
    if(typeof ResizeObserver==='function')new ResizeObserver(draw).observe(node);draw();
    const watchResolution=()=>matchMedia(`(resolution: ${devicePixelRatio||1}dppx)`).addEventListener('change',()=>{draw();watchResolution();},{once:true});watchResolution();
  }
  glassLens('am-glass-toast',toast,glassStates.focused);
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
        try{if(S.Platform.ClipboardAPI?.copy)await S.Platform.ClipboardAPI.copy(link);else await navigator.clipboard.writeText(link);notify('Bağlantı kopyalandı.');}
        catch{notify('Bağlantı kopyalanamadı.');}
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
    if(boundToolbar===toolbar&&toolbarChildren.length===toolbar.children.length&&toolbarChildren.every((n,i)=>n===toolbar.children[i]))return syncToolbarGlass(toolbar);
    boundToolbar=toolbar;toolbarChildren=[...toolbar.children];
    nativeNav=toolbar;toolbar.classList.add('am-native-global');
    const groups=[...toolbar.children].filter(n=>n.tagName==='DIV');
    groups[0]?.classList.add('am-toolbar-leading');
    groups[1]?.classList.add('am-toolbar-center');
    groups[2]?.classList.add('am-toolbar-trailing');
    syncToolbarGlass(toolbar);
  }
  // Toolbar glass. The lens fitted to macOS's toolbar buttons (github.com/emribilemir/liquid-glass-research,
  // buttons/lens.js and RESEARCH.md "Toolbar glass buttons"): the player's lens with the tone and colour gain by
  // luminance measured on flat colours, the page read ~11.5pt past the edge, a hue-keeping highlight, a hairline in
  // the page's colour, in three backdrop-filter layers (one filter recomputed its blurs per reader: 11fps).
  const toolbarLens=(()=>{
    const glass=document.createElementNS('http://www.w3.org/2000/svg','svg');
    glass.setAttribute('aria-hidden','true');glass.setAttribute('width','0');glass.setAttribute('height','0');glass.style.position='absolute';
    const glassStates={
      focused:{pre:.4,darken:.7,darkenBlur:13.5,gain:1.05,lensA:1.01,lensH:.495,
        // Highlight along the top and bottom edges, every 0.5px from the edge, mixed toward 2x white (fitted to Apple
        // Music's own frames: stronger and it overshoots over bright artwork).
        highlight:[.13,.085,.032,.019,.014,.011,.009,.007,.005,.004,.003,.002,.001,.0005,0],highlightTo:2,highlightPow:3.5,
        // Edge line inside the glass (the toast): the glass times 1 - line*(1 - smoothstep(0, lineW, d))*|n_x|, d in
        // device pixels. Music's ends also darken gradually where the page beside the bar is dark: its blur reaches
        // outside the bar, which a backdrop-filter cannot. Page mix: the outermost pixels show the page right under
        // them by pageMix*(1 - d/pageMixW) (d in device pixels; a light halo where the bar's edge lies on bright
        // content). Rim smoothing: blur (px) mixed in by (1/compression - 1)/smoothDiv where the bend
        // magnifies; rim darkening: the darken result mixed in by rimDark, fading out by rimDarkW (px).
        line:.9,lineW:1,pageMix:.65,pageMixW:2.2,smooth:1,smoothDiv:2,rimDark:.6,rimDarkW:12,thin:1,thinMix:.3,
        tone:[32,36,45,56,65,71,78,86,90,96,102,109,116,120,122,125,130,135,141,147,152,156,156,157,161,167,170,170,174,178,179,181,185]},
    };
    // On wide-gamut (P3) Macs Chromium converts the recombined map from sRGB to P3 before displacing, and that
    // mixes channels: red took ~18% of green, so a vertical shift also shifted the page up to ~2.7px sideways. The
    // map therefore holds R=G=x shift and B=y shift: red gains nothing when green equals it, and blue's ~9% share of
    // x is compensated in glassLens(). One such image displaces exactly as two grey images recombined in the filter
    // (measured in Spotify: identical pixels), which cost two passes more per map, every frame the page moves.
    // The tone is stored as the offset to add at each luminance, (out-in+1)/2, so colours move with their luminance
    // instead of each channel on its own curve.
    // part: 'bend' (the page bent at the rim), 'face' (the rest, reading the bent page as its backdrop, with the rim
    // darkening) or 'all' (one filter without the rim steps, which would multiply its cost: the toast). The buttons split
    // 'face' further: 'mid' (thin lines, darken halo, edge read) and 'tone' (colour and highlight, which read their input
    // several times: as a filter's own backdrop that input is a texture, not a chain recomputed per reader). exact: the
    // bend samples bilinearly (4 taps); otherwise one tap, and the face blurs where the bend magnifies.
    const glassFilter=(id,state,part,exact,n=1)=>{
      const tone=`type="table" tableValues="${state.tone.map((t,k)=>((t/255-state.gain*k/32+1)/2).toFixed(4)).join(' ')}"`,img=name=>mapImage(name,n);
      const shift=(m,result)=>`<feDisplacementMap in="soft" in2="${m}" xChannelSelector="R" yChannelSelector="B" result="${result}"/>`,soft=`<feGaussianBlur in="SourceGraphic" stdDeviation="${state.pre}" edgeMode="duplicate" result="soft"/>`;
      // Taps 0-3 hit the page pixels left/right (fx) and above/below (fy) the source point; each reads only its own map.
      const bend=exact?soft+[0,1,2,3].map(j=>img('bm'+j)+shift('bm'+j,'tp'+j)).join('')+`${img('fx')}${img('fy')}<feComposite in="tp1" in2="fx" operator="in" result="t1"/><feComposite in="t1" in2="tp0" operator="over" result="row0"/><feComposite in="tp3" in2="fx" operator="in" result="t3"/><feComposite in="t3" in2="tp2" operator="over" result="row1"/><feComposite in="row1" in2="fy" operator="in" result="row1f"/><feComposite in="row1f" in2="row0" operator="over" result="core"/>`
        :img('map')+soft+shift('map','core');
      // Outside the glass (buttons, state.margin > 0): the outermost pixels read the page outerDist beyond the edge,
      // blurred (taps 'om', weight 'me', outerEnd of it where the edge faces sideways, at the round ends), and the whole glass takes the colour of a wide blur of the page around it, both
      // from the margin of page the element's larger box gives the backdrop-filter. macOS's glass does both; a
      // backdrop-filter the size of the glass never sees past its edge.
      // They come after the darken halo (which would pull the read page toward the glass's grey) and before the tone.
      const outer=state.margin?`${img('om')}<feGaussianBlur in="SourceGraphic" stdDeviation="${state.outerBlur}" edgeMode="none" result="ob"/><feDisplacementMap in="ob" in2="om" xChannelSelector="R" yChannelSelector="B" result="out"/>${img('me')}<feComposite in="out" in2="me" operator="in" result="oe"/><feComposite in="oe" in2="glass" operator="over" result="glass"/>`
        // The wash tints the glass with the colour of the page around it, without its luminance (a green page above the
        // glass leaves its brightness unchanged) and only where that colour differs from the page under it (on a flat
        // colour Apple's glass adds nothing): the chroma (R-L, G-L, B-L) of a wide blur minus that of the bent page,
        // added at washMix (washLocal scales the subtracted part: 0 is the plain chroma of the blur).
        +(state.washMix?`<feGaussianBlur in="SourceGraphic" stdDeviation="${state.washBlur}" edgeMode="none" result="wb"/><feColorMatrix in="wb" values=".7874 -.7152 -.0722 0 .5 -.2126 .2848 -.0722 0 .5 -.2126 -.7152 .9278 0 .5 0 0 0 1 0" result="wc"/><feColorMatrix in="core" values=".7874 -.7152 -.0722 0 .5 -.2126 .2848 -.0722 0 .5 -.2126 -.7152 .9278 0 .5 0 0 0 1 0" result="cc"/><feComposite in="wc" in2="cc" operator="arithmetic" k2="1" k3="${-(state.washLocal??1)}" k4="${((state.washLocal??1)/2).toFixed(4)}" result="wd"/><feComposite in="glass" in2="wd" operator="arithmetic" k2="1" k3="${state.washMix}" k4="${(-state.washMix/2).toFixed(4)}" result="glass"/>`:''):'';
      // Rim smoothing along the edge normal: a vertical and a sideways blur, each mixed in through its mask's alpha. The
      // layered glass does it at the end of the bend: in mid, before the thin lines and the halo, its result was read
      // three times and theirs four, each read recomputing the chain (on fractional screen scales, the only ones without
      // the exact bend, a 36pt circle's mid ran 134 passes a frame and scrolling held ~22fps). The one-tap map leaves the
      // page outside the glass unshifted, so the blurs there read the page as they did in mid.
      const smooth=src=>`${img('mv')}${img('mz')}<feGaussianBlur in="${src}" stdDeviation="0 ${state.smooth}" edgeMode="duplicate" result="bv"/><feGaussianBlur in="${src}" stdDeviation="${state.smooth} 0" edgeMode="duplicate" result="bz"/><feComposite in="bv" in2="mv" operator="in" result="sv"/><feComposite in="bz" in2="mz" operator="in" result="sz"/><feComposite in="sv" in2="${src}" operator="over" result="s1"/><feComposite in="sz" in2="s1" operator="over" result="core"/>`;
      // Thin bright detail dims (a min with a 1px blur, mixed in): Apple's 1pt lines carry ~75% of ours, flat colour is equal.
      const thin=src=>`<feGaussianBlur in="${src}" stdDeviation="${state.thin}" edgeMode="duplicate" result="tb"/><feBlend in="${src}" in2="tb" mode="darken" result="td"/><feComposite in="${src}" in2="td" operator="arithmetic" k2="${1-state.thinMix}" k3="${state.thinMix}" result="core"/>`;
      const darken=`<feGaussianBlur in="core" stdDeviation="${state.darkenBlur}" edgeMode="duplicate" result="halo"/><feBlend in="core" in2="halo" mode="darken" result="dk"/><feComposite in="core" in2="dk" operator="arithmetic" k2="${(1-state.darken).toFixed(2)}" k3="${state.darken}" result="glass"/>`
        +(part==='face'?`${img('md')}<feComposite in="dk" in2="md" operator="in" result="rd"/><feComposite in="rd" in2="glass" operator="over" result="glass"/>`:'');
      const peakHighlight=state.highlight[0];
      // gainL (buttons): the colour gain by luminance, a table like tone (macOS's glass boosts dark colours more: purple
      // 1.25, red 1.17, orange 1.04): out = tone(L) + (in - L) * gainL(L), as (in + 2*tone1 - 1) + chroma*(gainL - 1).
      const tone1=state.gainL&&`type="table" tableValues="${state.tone.map((t,k)=>((t/255-k/32+1)/2).toFixed(4)).join(' ')}"`,gl=state.gainL&&`type="table" tableValues="${state.gainL.map(g=>Math.min(1,Math.max(0,(g-1)*2)).toFixed(4)).join(' ')}"`;
      // The tone layer reads its backdrop (a texture) directly: an alias (feMerge) is redrawn for each of its readers.
      const g=part==='tone'?'SourceGraphic':'glass';
      const colour=state.gainL?`<feColorMatrix in="${g}" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0" result="lum"/><feComponentTransfer in="lum" result="tone"><feFuncR ${tone1}/><feFuncG ${tone1}/><feFuncB ${tone1}/></feComponentTransfer><feComponentTransfer in="lum" result="gl"><feFuncR ${gl}/><feFuncG ${gl}/><feFuncB ${gl}/></feComponentTransfer><feComposite in="${g}" in2="lum" operator="arithmetic" k2="1" k3="-1" k4=".5" result="chroma"/><feComposite in="chroma" in2="gl" operator="arithmetic" k1=".5" k3="-.25" k4=".5" result="boost"/><feComposite in="${g}" in2="tone" operator="arithmetic" k2="1" k3="2" k4="-1" result="toned"/><feComposite in="toned" in2="boost" operator="arithmetic" k2="1" k3="1" k4="-.5" result="tn"/>`
        :`<feColorMatrix in="${g}" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0"/><feComponentTransfer result="tone"><feFuncR ${tone}/><feFuncG ${tone}/><feFuncB ${tone}/></feComponentTransfer><feComposite in="${g}" in2="tone" operator="arithmetic" k2="${state.gain}" k3="2" k4="-1" result="tn"/>`;
      // hlHue: the highlight raises the luminance as it does on grey (L + peak*mh*(highlightTo - L)) but keeps the hue,
      // scaling the three channels alike (Music's player: orange edge 255,176,65 where mixing toward white gave
      // 255,180,99): out = c * (1 + peak*mh*(highlightTo - L)/L), the ratio from a table on L capped at hlCap.
      const hlCap=16,hlRatio=`type="table" tableValues="${Array.from({length:65},(_,k)=>{const L=Math.max(k/64,1e-3);return Math.min(1,(state.highlightTo-L)/L/hlCap).toFixed(4);}).join(' ')}"`;
      const highlight=state.hlHue?`<feColorMatrix in="tn" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0" result="hll"/><feComponentTransfer in="hll" result="hlt"><feFuncR ${hlRatio}/><feFuncG ${hlRatio}/><feFuncB ${hlRatio}/></feComponentTransfer><feComposite in="hlt" in2="mh" operator="arithmetic" k1="1" result="hlf"/><feComposite in="tn" in2="hlf" operator="arithmetic" k1="${(hlCap*peakHighlight).toFixed(4)}" k2="1"/>`
        :`<feComposite in2="mh" operator="arithmetic" k1="${state.hlK1??-peakHighlight}" k2="1" k3="${state.hlK3??(state.highlightTo*peakHighlight).toFixed(4)}"/>`;
      const face=`${img('mh')}${state.line?img('ml'):''}${colour}${highlight}${state.line?'<feBlend in2="ml" mode="multiply"/>':''}`;
      return `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">${part==='bend'?bend+(exact?'':smooth('core')):part==='face'?(exact?thin('SourceGraphic'):smooth('SourceGraphic')+thin('core'))+darken+outer+face:part==='mid'?thin('SourceGraphic')+darken+outer:part==='tone'?face:bend+darken+outer+face}</filter>`;
    };
    // The sidebar glow (user.css) saturates and brightens hard so that small covers reach its edge; this soft
    // ceiling keeps large coloured areas, such as playlist headers under the sidebar, from blowing out.
    const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4,encode=v=>v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055;
    const wideGamut=matchMedia('(color-gamut: p3)').matches;
    // Chromium sends a filter's images again with every frame drawn under it, so their bytes are what anything moving
    // over the glass costs (the player's 16 full maps, ~14MB a frame, held its marquee at ~33fps). A map varies along
    // x only in the columns at either end (margin and round end); between them every column is the same. So each map
    // is three images merged: both ends at device resolution and one column stretched across the middle (~1/9 of the
    // bytes at player size, the same pixels). n: the shapes sharing the filter (shared()), each with its three pieces.
    const mapImage=(name,n=1)=>{const pieces=Array.from({length:n},(_,i)=>['m','l','r'].map(p=>[i,p])).flat();
      return pieces.map(([i,p])=>`<feImage data-map="${name}" data-member="${i}" data-part="${p}" result="${name}-${i}${p}" preserveAspectRatio="none"/>`).join('')+`<feMerge result="${name}">${pieces.map(([i,p])=>`<feMergeNode in="${name}-${i}${p}"/>`).join('')}</feMerge>`;};
    // The device columns to draw: cap columns at each end and the middle one, or all of them where the ends meet.
    const mapColumns=(W,cap)=>{const split=2*cap+1<W?cap:0;return {split,cols:split?[...Array(cap).keys(),W>>1,...Array.from({length:cap},(_,i)=>W-cap+i)]:[...Array(W).keys()]};};
    // data: map name -> ImageData of those columns. Without a split the whole map is the left piece. inset(image): how
    // far inside the drawn box the box of that image's layer starts.
    function setMaps(images,data,{w,h,k,W,H,split},inset=()=>0){
      const canvas=document.createElement('canvas'),context=canvas.getContext('2d'),urls={};
      const url=(image,from,width)=>{canvas.width=width;canvas.height=H;context.putImageData(image,-from,0,from,0,width,H);return canvas.toDataURL();};
      for(const [n,image] of Object.entries(data))urls[n]=split?{l:url(image,0,split),m:url(image,split,1),r:url(image,split+1,split)}:{l:url(image,0,W)};
      const box=split?{l:[0,split/k],m:[split/k,w-2*split/k],r:[w-split/k,split/k]}:{l:[0,w],m:[0,w],r:[0,w]};
      for(const image of images){const p=image.dataset.part,u=urls[image.dataset.map][p],d=inset(image);if(u)image.setAttribute('href',u);else image.removeAttribute('href');
        image.setAttribute('x',box[p][0]-d);image.setAttribute('y',-d);image.setAttribute('width',box[p][1]);image.setAttribute('height',h);}
    }
    // build (optional) rebuilds the filters before each redraw: the player's change with the screen scale. drawn
    // (optional) runs after each drawing. state.scaleOf (shared(), whole-pixel screens: the 4-tap bend) turns the
    // displacement scale this shape needs into the one every shape of its filter uses. inset: passed to setMaps. Returns a function that draws again.
    function glassLens(node,state,filterIds,build,drawn,inset) {
      let glassSize='';
      const hl=state.highlight,highlightAt=edge=>{const f=edge/.5;if(f>=hl.length-1)return 0;const i=Math.floor(f);return (hl[i]+(hl[i+1]-hl[i])*(f-i))/hl[0];},fade=u=>1-u*u*(3-2*u);
      const draw=force=>{
        // Drawn at device resolution and redrawn only on resize or a change of screen: the bend and the highlight
        // live in the outermost few pixels. Scrolling frame times were measured unchanged against a CSS-size map.
        const {width:w,height:h}=node.getBoundingClientRect(),k=devicePixelRatio||1;if(!w||!h||(!force&&glassSize===w+'x'+h+'@'+k))return;glassSize=w+'x'+h+'@'+k;
        build?.();const maps=filterIds.flatMap(id=>[...glass.querySelectorAll(`#${id} feImage`)]),shifts=filterIds.flatMap(id=>[...glass.querySelectorAll(`#${id} feDisplacementMap`)]);
        // margin: the glass is the box inset by M on every side; the rest is page the filter may read (clipped away).
        const M=state.margin||0,gw=w-2*M,gh=h-2*M,W=Math.round(w*k),H=Math.round(h*k),r=gh/2,A=state.lensA*r,L=state.lensH*r;
        // Inward shift (px) by distance from the edge, and how much the bend squeezes (> 1) or magnifies (< 1) the page.
        const shiftAt=d=>{const t=Math.min(1,d/L);return A*(1-Math.sqrt((2-t)*t));},squeeze=d=>{const t=d/L;return t>=1?1:Math.abs(1-A/L*(1-t)/Math.sqrt(Math.max(1e-4,t*(2-t))));};
        const {cols,split}=mapColumns(W,Math.ceil((M+r)*k)+1),CW=cols.length,data={};for(const map of maps)data[map.dataset.map]??=new ImageData(CW,H);
        const {map:mm,mh,ml,mv,mz,md,fx,fy,me}=Object.fromEntries(Object.entries(data).map(([n,image])=>[n,image.data]));
        // A shift map pixel: x (a byte) in red and green, y (0-1) in blue, compensated for P3's blue row.
        const put=(m,i,xv,yv)=>{m[i]=m[i+1]=xv;m[i+2]=Math.round(255*(wideGamut?encode(Math.min(1,Math.max(0,(linear(yv)-.0895*linear(xv/255))/.9108))):yv));m[i+3]=255;};
        // Bilinear taps: per pixel, offsets (px) to the 4 page pixels around its source point; one scale for all four.
        const taps=fx?[0,1,2,3].map(j=>data['bm'+j].data):null,offsets=taps&&new Float32Array(CW*H*8),outs=me&&new Float32Array(CW*H*2);let reach=me?state.outerDist:1;
        for(let y=0;y<H;y++)for(let c=0;c<CW;c++){
          // The vector to the pill's centre line is the rim's inward normal; the maps hold its x/y shift. Masks are
          // white with their weight in alpha (alpha survives the P3 conversion of feImage; greys survive it too).
          const x=cols[c],px=(x+.5)/k-M,py=(y+.5)/k-M,dx=Math.min(gw-r,Math.max(r,px))-px,dy=r-py,length=Math.hypot(dx,dy)||1,edge=Math.max(0,r-length),ny2=(dy/length)**2,i=(y*CW+c)*4;
          if(me){const u=length>r+1/k?0:state.outerMix*(ny2+(1-ny2)*(state.outerEnd??1))*Math.max(0,1-edge*k/state.outerW);me[i]=me[i+1]=me[i+2]=255;me[i+3]=Math.round(255*u);
            outs[(y*CW+c)*2]=-state.outerDist*dx/length;outs[(y*CW+c)*2+1]=-state.outerDist*dy/length;}
          if(mm){const t=length>r+1/k?0:shiftAt(edge)/A/length;put(mm,i,Math.round(128+127*t*dx),(128+127*t*dy)/255);}
          if(mh){mh[i]=mh[i+1]=mh[i+2]=Math.round(255*highlightAt(edge)*Math.sqrt(ny2)**state.highlightPow);mh[i+3]=255;}
          if(ml){ml[i]=ml[i+1]=ml[i+2]=Math.round(255*(1-state.line*fade(Math.min(1,edge*k/state.lineW))*Math.sqrt(1-ny2)));ml[i+3]=255;}
          if(mv){const m=Math.min(1,Math.max(0,(1/Math.max(squeeze(edge),.05)-1)/state.smoothDiv));mv[i]=mv[i+1]=mv[i+2]=mz[i]=mz[i+1]=mz[i+2]=255;mv[i+3]=Math.round(255*m*ny2);mz[i+3]=Math.round(255*m*(1-ny2));}
          if(md){md[i]=md[i+1]=md[i+2]=255;md[i+3]=Math.round(255*state.rimDark*fade(Math.min(1,edge/state.rimDarkW)));}
          if(taps){const s=shiftAt(edge),sx=(px+M+s*dx/length)*k-.5,sy=(py+M+s*dy/length)*k-.5,ix=Math.floor(sx),iy=Math.floor(sy),q=(y*CW+c)*8,
              u=state.pageMix*(1-edge*k/state.pageMixW);
            fx[i]=fx[i+1]=fx[i+2]=fy[i]=fy[i+1]=fy[i+2]=255;fx[i+3]=Math.round(255*(u>0?1-u:sx-ix));fy[i+3]=u>0?0:Math.round(255*(sy-iy));
            // Where the page mixes in, taps 0 and 2 read the pixel itself and taps 1 and 3 the nearest bent one.
            for(let j=0;j<4;j++){const ox=u>0?j%2&&(Math.round(sx)-x)/k:(ix+j%2-x)/k,oy=u>0?j%2&&(Math.round(sy)-y)/k:(iy+(j>>1)-y)/k;offsets[q+2*j]=ox;offsets[q+2*j+1]=oy;reach=Math.max(reach,Math.abs(ox),Math.abs(oy));}}
        }
        // Each tap's offset in its own map, aimed at the target pixel's centre: Chromium takes the pixel nearest to the
        // displaced point, and the 8-bit step (scale/255) stays under a device pixel.
        const own=taps?2*(reach+1):2*A,scale=state.scaleOf?.(own)??own,offset=(m,i,ox,oy)=>put(m,i,Math.round(255*(ox/scale+.5)),oy/scale+.5);
        if(outs)for(let p=0;p<CW*H;p++)offset(data.om.data,p*4,outs[p*2],outs[p*2+1]);
        if(taps)for(let p=0;p<CW*H;p++)for(let j=0;j<4;j++)offset(taps[j],p*4,offsets[p*8+2*j],offsets[p*8+2*j+1]);
        setMaps(maps,data,{w,h,k,W,H,split},inset);
        for(const shift of shifts)shift.setAttribute('scale',scale);
        drawn?.();
      };
      if(typeof ResizeObserver==='function')new ResizeObserver(()=>draw()).observe(node);draw();
      const watchResolution=()=>matchMedia(`(resolution: ${devicePixelRatio||1}dppx)`).addEventListener('change',()=>{draw();watchResolution();},{once:true});watchResolution();
      return ()=>draw(true);
    }
    // The toolbar buttons' glass (research/RESEARCH.md, "Toolbar glass buttons"): fitted to BtnLab's 36pt and 73pt glass
    // with the tone and colour gain by luminance measured on flat colours, the page read past the edge, a hue-keeping
    // highlight (research/buttons/params-button.json).
    glassStates.button={...glassStates.focused,pre:0.35,darken:0.7984,darkenBlur:15.2999,lensA:1.01,lensH:0.497,highlightPow:4.091,highlight:[0.1105,0.07225,0.0272,0.01615,0.0119,0.00935,0.00765,0.00595,0.00425,0.0034,0.00255,0.0017,0.00085,0.00042,0.0],tone:[31.6,39.3,46.9,54.3,61.5,68.5,75.3,81.9,88.3,94.5,100.6,106.4,112,117.4,122.7,127.7,132.6,137.2,141.6,145.9,149.9,153.7,157.4,160.8,164,167.1,170,172.7,175.2,177.4,179.5,181.4,183],gainL:[1.2962,1.2833,1.2705,1.2576,1.2447,1.2319,1.219,1.2062,1.1933,1.1805,1.1676,1.1547,1.1419,1.129,1.1162,1.1033,1.0905,1.0776,1.0647,1.0519,1.039,1.0262,1.0133,1.0005,1,1,1,1,1,1,1,1,1],margin:12,outerDist:11.5,outerBlur:3,outerMix:0.7234,outerEnd:0.75,outerW:2.091,washBlur:10,washMix:0.0697,washLocal:1.0427,hlHue:true,pageMix:0};
    // lgRimF(box, {w, s}): the hairline as macOS draws it, from the page under it: the luminance through a table
    // measured on flat greys (BtnLab: 128 -> 68, 255 -> 123) and ~0.8 of the colour around it kept (pink 230,120,170 ->
    // 166,60,104), so the line takes the page's hue instead of greying it. A backdrop-filter on the shape grown by 1px,
    // its weight a map of the 1-device-pixel band outside the glass (4x4 samples per pixel) fading as (1 - x/r)^3 from
    // each end; over the glass. w: the line's strength (1 at 36pt, lighter on the player).
    const rimT=[0.0, 0.0098, 0.0208, 0.0326, 0.0453, 0.0591, 0.0743, 0.0904, 0.1069, 0.1238, 0.1412, 0.1595, 0.1787, 0.1996, 0.2221, 0.245, 0.2669, 0.288, 0.3089, 0.3286, 0.3462, 0.3612, 0.3747, 0.3873, 0.3996, 0.412, 0.4242, 0.4359, 0.4467, 0.4567, 0.4662, 0.475, 0.4831];let rimN=0;
    const rimFilter=(id,s,n=1)=>{const tt=`type="table" tableValues="${rimT.join(' ')}"`;
      return `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0" result="rl"/><feComponentTransfer in="rl" result="rt"><feFuncR ${tt}/><feFuncG ${tt}/><feFuncB ${tt}/></feComponentTransfer><feComposite in="SourceGraphic" in2="rl" operator="arithmetic" k2="1" k3="-1" k4=".5" result="rc"/><feComposite in="rt" in2="rc" operator="arithmetic" k2="1" k3="${s}" k4="${(-s/2).toFixed(3)}" result="rd"/>${mapImage('rm',n)}<feComposite in="rd" in2="rm" operator="in" result="rdm"/><feComposite in="rdm" in2="SourceGraphic" operator="over"/></filter>`;};
    // The map is drawn for each end only (setMaps): the line fades out within r of either end. drawn (shared()): the
    // element only sizes the map, which runs after each drawing; the shared hairline draws it.
    const rimF=(box,{w=1,s=.8}={},drawn)=>{
      const id='am-tglass-rim-'+(++rimN),el=document.createElement('div');el.className='am-tglass-rim';el.dataset.filter=id;box.append(el);
      glass.insertAdjacentHTML('beforeend',rimFilter(id,s));
      if(!glass.isConnected)document.body.append(glass);
      if(!drawn)el.style.backdropFilter=el.style.webkitBackdropFilter=`url(#${id})`;
      const maps=[...glass.querySelectorAll(`#${id} feImage`)];let size='';
      const draw=()=>{const {width:bw,height:bh}=el.getBoundingClientRect(),k=devicePixelRatio||1;if(!bw||size===bw+'x'+bh+'@'+k)return;size=bw+'x'+bh+'@'+k;
        const W=Math.round(bw*k),H=Math.round(bh*k),gw=bw-2,gh=bh-2,r=gh/2,{cols,split}=mapColumns(W,Math.ceil((r+1)*k)+1),CW=cols.length,img=new ImageData(CW,H),dd=img.data;
        for(let y=0;y<H;y++)for(let c=0;c<CW;c++){const x=cols[c];let cov=0;
          for(let sy=0;sy<4;sy++)for(let sx=0;sx<4;sx++){const px=(x+(sx+.5)/4)/k-1,py=(y+(sy+.5)/4)/k-1,cx=Math.min(gw-r,Math.max(r,px)),d=(Math.hypot(px-cx,py-r)-r)*k;if(d>=0&&d<1)cov++;}
          const px=(x+.5)/k-1,fade=Math.max(0,1-Math.min(px,gw-px)/r)**3,i=(y*CW+c)*4;dd[i]=dd[i+1]=dd[i+2]=255;dd[i+3]=Math.round(255*Math.min(1,w*cov/16*fade));}
        setMaps(maps,{rm:img},{w:bw,h:bh,k,W,H,split});drawn?.();};
      if(typeof ResizeObserver==='function')new ResizeObserver(draw).observe(el);draw();return el;
    };
    // Only mid reads the page past the glass's edge (the edge read, the halo, the wash); bend and tone take the glass's
    // own box, as the hairline takes the glass grown by 1px: on the wide shared toolbar glass the area counts too (the
    // margin added half again to the player's, two thirds to the toolbar's; ~1.8ms of a scrolling frame). On a
    // fractional screen scale (Windows at 125%) a layer of another size lands on the device pixels differently and the
    // page under the bend moved by up to a pixel, so there every layer keeps the margin's box.
    let n=0;const parts=['bend','mid','tone'],inner=(p,M,exact)=>p==='mid'||!exact?0:M,layer=(p,id,inset,clip)=>{const l=document.createElement('div');l.className='am-tglass-layer';
      Object.assign(l.style,{position:'absolute',inset:inset+'px',pointerEvents:'none',clipPath:clip});l.style.backdropFilter=l.style.webkitBackdropFilter=`url(#${id}-${p})`;return l;};
    // over: overrides of glassStates.focused (fitlens.mjs fits them at button sizes).
    // node: the glass's box grown by state.margin; it gets three layers, each a backdrop-filter clipped to the glass
    // (bend, mid, tone), as siblings so each reads the one before as a texture. The node itself must not clip or filter
    // (that would make it the layers' backdrop root). drawn (shared()): no layers; the node only sizes the maps, held in
    // filters of its own, and drawn runs after each drawing. Returns the filters' id and a function that draws again.
    const lens=(node,over,drawn)=>{
      // No edge line in the layered glass (the toast's): its map would be all white.
      const state={...glassStates[over?.state||'focused'],...over,line:0},id='am-tglass-'+(++n),exact=Number.isInteger(devicePixelRatio||1);
      glass.insertAdjacentHTML('beforeend',parts.map(p=>glassFilter(`${id}-${p}`,state,p,exact)).join(''));
      if(!glass.isConnected)document.body.append(glass);
      node.style.setProperty('--am-tg-hair',1/(devicePixelRatio||1)+'px');node.style.setProperty('--am-tg-m',(state.margin||0)+'px');
      node.style.backdropFilter=node.style.webkitBackdropFilter='none';
      const M=state.margin||0;if(!drawn)node.prepend(...parts.map(p=>layer(p,id,inner(p,M,exact),`inset(${M-inner(p,M,exact)}px round 999px)`)));
      return {id,redraw:glassLens(node,state,parts.map(p=>`${id}-${p}`),null,drawn,drawn?undefined:image=>inner(image.closest('filter').id.slice(id.length+1),M,exact))};
    };
    // shared(root, over, rim): the glass of several shapes in root as one set of layers and one hairline. A filter's
    // cost is per pass, nearly whatever its size, and the page moving under the glass reruns every pass each frame: the
    // toolbar's four shapes, three layers and a hairline each, cost ~11ms a frame while the page scrolled (the player,
    // larger than all four together, ~2.7ms). add(face, box) takes a shape's face (its glass grown by the margin, as
    // for lens()) and the element its hairline is laid in; each shape's maps are drawn at its own size into filters
    // that nothing applies, and the shared filters merge every shape's pieces at its place, clipped to the shapes'
    // union. build() after the adds; update() follows the shapes' places and sizes. On a fractional screen scale
    // (Windows at 125%) the shapes' edges moved by up to a pixel against their own layers' (each layer lands on the
    // device pixels in its own way), so there it returns null and each shape keeps lens() and rimF().
    const shared=(root,over,rim)=>{
      if(!Number.isInteger(devicePixelRatio||1))return null;
      const state={...glassStates[over?.state||'focused'],...over,line:0},id='am-tglass-'+(++n),exact=true,M=state.margin||0;
      const box=cls=>{const e=document.createElement('div');e.className=cls;Object.assign(e.style,{position:'fixed',pointerEvents:'none'});return e;};
      const face=box('am-tglass-pane'),line=box('am-tglass-pane-rim'),layers=parts.map(p=>layer(p,id,inner(p,M,exact),''));face.append(...layers);
      line.style.backdropFilter=line.style.webkitBackdropFilter=`url(#${id}-rim)`;root.prepend(face);root.append(line);
      const members=[];let scale=0,pairs=[],shifts=[],clip='';
      // The displacement scale is the filter's, so every shape encodes its shifts with the largest any needs (10% over,
      // for the press growing a shape); a shape needing more redraws the others.
      const scaleOf=(need,m)=>{if(need>scale){scale=need*1.1;members.forEach(x=>x!==m&&x.redraw?.());}return scale;};
      const set=(e,a,v)=>{if(v==null)e.removeAttribute(a);else if(e.getAttribute(a)!==String(v))e.setAttribute(a,v);};
      const pill=(x,y,w,h)=>{const r=Math.min(w,h)/2,f=v=>+v.toFixed(2);return `M${f(x+r)} ${f(y)}H${f(x+w-r)}A${f(r)} ${f(r)} 0 0 1 ${f(x+w-r)} ${f(y+h)}H${f(x+r)}A${f(r)} ${f(r)} 0 0 1 ${f(x+r)} ${f(y)}Z`;};
      const update=()=>{
        if(!pairs.length)return;
        const bounds=(e,rs)=>{const l=Math.floor(Math.min(...rs.map(r=>r.left))),t=Math.floor(Math.min(...rs.map(r=>r.top)));
          Object.assign(e.style,{left:l+'px',top:t+'px',width:Math.ceil(Math.max(...rs.map(r=>r.right)))-l+'px',height:Math.ceil(Math.max(...rs.map(r=>r.bottom)))-t+'px'});return rs.map(r=>[r.left-l,r.top-t]);};
        const rs=members.map(m=>m.face.getBoundingClientRect()),fo=bounds(face,rs),lo=bounds(line,members.map(m=>m.rim.getBoundingClientRect()));
        const union=fo.map(([x,y],i)=>pill(x,y,rs[i].width-2*M,rs[i].height-2*M)).join('');if(union!==clip){clip=union;layers.forEach((e,j)=>{const d=M-inner(parts[j],M,exact);e.style.clipPath=`path('${fo.map(([x,y],i)=>pill(x+d,y+d,rs[i].width-2*M,rs[i].height-2*M)).join('')}')`;});}
        // Offsets of each shape's face in each layer's box (its parts index) and of its hairline in the shared one.
        const at=fo.map(([x,y],i)=>[...parts.map(p=>[x-inner(p,M,exact),y-inner(p,M,exact)]),lo[i]]);
        for(const [to,from,i,j] of pairs){const [dx,dy]=at[i][j];set(to,'href',from.getAttribute('href'));if(!from.hasAttribute('href'))continue;set(to,'x',+from.getAttribute('x')+dx);set(to,'y',+from.getAttribute('y')+dy);set(to,'width',from.getAttribute('width'));set(to,'height',from.getAttribute('height'));}
        for(const e of shifts)set(e,'scale',scale);
      };
      return {update,
        add(node,host){const m={face:node};members.push(m);
          ({id:m.id,redraw:m.redraw}=lens(node,{...over,scaleOf:need=>scaleOf(need,m)},update));m.rim=rimF(host,rim,update);return m;},
        build(){
          glass.querySelectorAll(`[id^="${id}-"]`).forEach(f=>f.remove());
          glass.insertAdjacentHTML('beforeend',parts.map(p=>glassFilter(`${id}-${p}`,state,p,exact,members.length)).join('')+rimFilter(`${id}-rim`,rim.s,members.length));
          // Each shared piece and the piece of its shape's own filter it copies, placed by the face (or the hairline).
          pairs=[...glass.querySelectorAll(`[id^="${id}-"] feImage`)].map(to=>{const i=+to.dataset.member,part=to.closest('filter').id.slice(id.length+1),rim=part==='rim',src=rim?members[i].rim.dataset.filter:members[i].id+'-'+part;
            return [to,glass.querySelector(`#${src} feImage[data-map="${to.dataset.map}"][data-part="${to.dataset.part}"]`),i,rim?parts.length:parts.indexOf(part)];});
          // The hairline over the shapes' lights, as each shape's own was.
          shifts=[...glass.querySelectorAll(`[id^="${id}-"] feDisplacementMap`)];root.append(line);update();},
        destroy(){face.remove();line.remove();[...parts,'rim'].map(p=>`${id}-${p}`).concat(members.flatMap(m=>[...parts.map(p=>`${m.id}-${p}`),m.rim.dataset.filter])).forEach(f=>document.getElementById(f)?.remove());}};
    };
    // The player: its own fitted look (tone, bend, highlight) with what the buttons showed macOS's glass does, as
    // measured against Music's own player frames (research repo buttons/player.mjs: inside 4.75 -> 2.85, outer 3pt
    // 8.53 -> 4.40, 2pt outside 4.78 -> 3.47): colour gain by luminance, hue-keeping highlight, the page read past the
    // edge. The colour wash fitted on the buttons hurt the player and stays off.
    glassStates.player={...glassStates.focused,hlHue:true,gainL:glassStates.button.gainL,margin:12,outerDist:11.5,outerBlur:3,outerMix:.72,outerEnd:.75,outerW:2.09,washMix:0,pageMix:0};
    return {lens,rimF,shared,states:glassStates};
  })();
  // The player's Liquid Glass: three layers in a face 12pt larger than the player (the page past its edge), under its
  // content (z-index -1 in its stacking context), and the hairline in the page's colour (weight 0.8, lighter than at
  // button size). Off with the setting or reduced transparency (user.css keeps the frosted or solid player then).
  let playerFace=null;
  function syncPlayerGlass() {
    const live=document.body.classList.contains('am-liquid')&&!matchMedia('(prefers-reduced-transparency: reduce)').matches;
    player.classList.toggle('am-player-glass',live);
    if(!live){playerFace?.remove();player.querySelector(':scope > .am-tglass-rim')?.remove();playerFace=null;return;}
    if(playerFace)return;
    playerFace=el('div','am-player-face');player.prepend(playerFace);
    toolbarLens.lens(playerFace,{state:'player'});toolbarLens.rimF(player,{w:.8,s:.8});
  }
  syncPlayerGlass();document.addEventListener('am-settings',syncPlayerGlass);
  // Spotify's toolbar controls keep their nodes, handlers and icons; the glass is ours, in #am-toolbar-glass under
  // the toolbar, one shape per group laid on the controls' rects: back + forward and the extension icons
  // (Marketplace) as capsules lit per segment, Home a circle, the search field a capsule. Hover and press come from
  // the controls' own pointer events, with Apple Music's toolbar measured (RESEARCH.md): a press grows the long axis
  // by 2.2pt on spring(0.265, 0.48) and settles back on spring(0.17, 0.75); a group lights the segment under the
  // pointer at once, a single button fades its whole face in ~0.1s; pressed, a group glows around the pointer.
  const TG={grow:2.2,press:{response:.265,damping:.48},release:{response:.17,damping:.75},fill:{response:.12,damping:1},pressFill:{response:.25,damping:1},hover:.11,hoverGroup:.1,pressed:.13,glow:.13,falloffK:5,falloffP:.575,rim:{w:.85,s:.8}};
  class Spring{constructor(x){this.x=this.t=x;this.v=0;this.set(x,TG.fill);}set(t,{response,damping}){this.t=t;this.k=(2*Math.PI/response)**2;this.c=4*Math.PI*damping/response;}step(dt){for(let s=dt;s>1e-9;s-=.002){const h=Math.min(.002,s);this.v+=(this.k*(this.t-this.x)-this.c*this.v)*h;this.x+=this.v*h;}}get idle(){return Math.abs(this.t-this.x)<1e-4&&Math.abs(this.v)<1e-3;}}
  let toolbarGlassRoot=null,toolbarPane=null,toolbarGlasses=[],toolbarGlassKey='',tgFrame=0,tgLast=0;const tgLive=new Set();
  function tgTick(now){tgFrame=0;const dt=Math.min(.05,Math.max(0,(now-tgLast)/1000));tgLast=now;for(const g of tgLive){g.step(dt);if(g.idle)tgLive.delete(g);}if(tgLive.size)tgFrame=requestAnimationFrame(tgTick);}
  function tgWake(g){tgLive.add(g);if(!tgFrame){tgLast=performance.now();tgFrame=requestAnimationFrame(tgTick);}}
  const inRect=(r,x,y)=>x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom;
  class ToolbarGlass{
    // pane: the shared glass (toolbarLens.shared) the shape is drawn in, with the other shapes of its root; without
    // one the shape has its own layers.
    constructor(controls,interactive,root=toolbarGlassRoot,pane=toolbarPane){
      this.controls=controls;this.interactive=interactive;this.group=controls.length>1;this.box=null;
      this.el=el('div','am-tglass'+(this.group?' am-tglass-group':''));this.face=el('div','am-tglass-face');
      this.lights=controls.map(()=>el('div','am-tglass-light'));this.el.append(this.face,...this.lights);root.append(this.el);
      this.pane=pane;this.margin=toolbarLens.states.button.margin;
      if(pane)this.rim=pane.add(this.face,this.el).rim;else{toolbarLens.lens(this.face,{state:'button'});this.rim=toolbarLens.rimF(this.el,TG.rim);}
      this.scale=new Spring(1);this.glow=new Spring(0);this.light=controls.map(()=>new Spring(0));this.push=controls.map(()=>new Spring(0));
      this.down=-1;this.over=-1;this.p=null;this.place();
      if(!interactive)return;
      this.off=new AbortController();const o={signal:this.off.signal};
      controls.forEach((c,i)=>{
        c.addEventListener('pointermove',e=>this.move(e),o);c.addEventListener('pointerleave',e=>{if(this.down<0)this.move(e,true);},o);
        c.addEventListener('pointerdown',e=>{if(e.button||c.disabled)return;this.down=i;this.scale.set(1+TG.grow/Math.max(this.box.width,this.box.height),TG.press);this.move(e);
          const up=ev=>{removeEventListener('pointermove',track,true);this.down=-1;this.scale.set(1,TG.release);this.move(ev,!inRect(this.box,ev.clientX,ev.clientY));},track=ev=>this.move(ev);
          addEventListener('pointermove',track,true);addEventListener('pointerup',up,{capture:true,once:true});addEventListener('pointercancel',up,{capture:true,once:true});},o);
      });
    }
    destroy(){this.off?.abort();this.el.remove();tgLive.delete(this);}
    // The shape covers the controls' union, on whole CSS pixels (a filtered layer snaps to them, its clip does not).
    place(){
      const rs=this.controls.map(c=>c.getBoundingClientRect()),l=Math.round(Math.min(...rs.map(r=>r.left))),t=Math.round(Math.min(...rs.map(r=>r.top))),
        w=Math.round(Math.max(...rs.map(r=>r.right)))-l,h=Math.round(Math.max(...rs.map(r=>r.bottom)))-t;
      this.box={left:l,top:t,width:w,height:h,right:l+w,bottom:t+h};Object.assign(this.el.style,{left:l+'px',top:t+'px',width:w+'px',height:h+'px'});
      rs.forEach((r,i)=>Object.assign(this.lights[i].style,{left:r.left-l+'px',top:'0',width:r.width+'px',height:h+'px',transformOrigin:`${w/2-(r.left-l)}px 50%`}));
      this.render();
    }
    move(e,gone){
      const b=this.box,pressed=this.down>=0,inside=!gone&&inRect(b,e.clientX,e.clientY);
      this.over=inside?this.controls.findIndex(c=>!c.disabled&&inRect(c.getBoundingClientRect(),e.clientX,e.clientY)):-1;
      this.p=[Math.min(Math.max(e.clientX-b.left,0),b.width),Math.min(Math.max(e.clientY-b.top,0),b.height)];
      this.light.forEach((s,i)=>{const on=i===this.over||(pressed&&i===this.down&&e.clientY<b.bottom+40);if(this.group){s.x=s.t=on?1:0;s.v=0;}else s.set(on?1:0,TG.fill);});
      const d=pressed?Math.hypot(Math.max(b.left-e.clientX,0,e.clientX-b.right),Math.max(b.top-e.clientY,0,e.clientY-b.bottom)):0,f=pressed?1/(1+(d/TG.falloffK)**TG.falloffP):0;
      this.push.forEach((s,i)=>s.set(i===this.down&&!this.group?f:0,TG.pressFill));this.glow.set(pressed&&this.group?f:0,TG.pressFill);
      tgWake(this);this.render();
    }
    get idle(){return [this.scale,this.glow,...this.light,...this.push].every(s=>s.idle);}
    step(dt){for(const s of [this.scale,this.glow,...this.light,...this.push])s.step(dt);this.render();}
    render(){
      const b=this.box,k=this.scale.x,gx=(k-1)*b.width/2,gy=(k-1)*b.height/2,m=this.margin;
      this.face.style.inset=`${(-gy-m).toFixed(2)}px ${(-gx-m).toFixed(2)}px`;if(this.rim)this.rim.style.inset=`${(-gy-1).toFixed(2)}px ${(-gx-1).toFixed(2)}px`;
      this.el.style.setProperty('--am-tg-scale',k.toFixed(4));
      if(this.p){this.face.style.setProperty('--am-tg-px',(this.p[0]+gx+m).toFixed(1)+'px');this.face.style.setProperty('--am-tg-py',(this.p[1]+gy+m).toFixed(1)+'px');}
      this.face.style.setProperty('--am-tg-glow',(this.glow.x*TG.glow).toFixed(4));
      const hover=this.group?TG.hoverGroup:TG.hover;this.lights.forEach((l,i)=>l.style.setProperty('--am-tg-light',(this.light[i].x*hover+this.push[i].x*TG.pressed).toFixed(4)));
      this.controls.forEach(c=>c.style.setProperty('--am-tg-scale',k.toFixed(4)));
      this.pane?.update();
    }
  }
  // Groups from the toolbar as Spotify renders it; rebuilt only when its controls change, re-placed on any resize.
  const toolbarGlassResize=typeof ResizeObserver==='function'?new ResizeObserver(()=>toolbarGlasses.forEach(g=>g.place())):null;
  const glassLive=()=>document.body.classList.contains('am-liquid')&&!matchMedia('(prefers-reduced-transparency: reduce)').matches;
  function syncToolbarGlass(toolbar) {
    const live=glassLive();
    const lead=toolbar.querySelector('.am-toolbar-leading'),center=toolbar.querySelector('.am-toolbar-center'),search=center?.querySelector('form[role="search"],[role="search"]');
    const history=[...(lead?.querySelector('.main-globalNav-historyButtonsWrapper')||lead||toolbar).querySelectorAll('button')].slice(0,2);
    const extensions=[...(lead?.querySelectorAll('button')||[])].filter(b=>!history.includes(b)&&b.offsetWidth);
    // Spotify spaces back and forward 8px apart; one capsule wants them touching (user.css .am-tg-pair).
    if(history.length===2&&history[0].parentElement===history[1].parentElement)history[0].parentElement.classList.add('am-tg-pair');
    const home=[...(center?.querySelectorAll('button')||[])].filter(b=>!search?.contains(b)&&b.offsetWidth);
    // The search field's glass is its input's rect: the form around it is taller.
    const field=search?.querySelector('input')||search;
    const sets=live?[[history,true],[extensions,true],...home.map(b=>[[b],true]),[field?[field]:[],false]].filter(([c])=>c.length):[];
    const key=sets.map(([c])=>c.map(n=>n.getAttribute('aria-label')||n.tagName).join('+')).join('|');
    if(key===toolbarGlassKey&&toolbarGlasses.every(g=>g.controls.every(c=>c.isConnected)))return toolbarGlasses.forEach(g=>g.place());
    toolbarGlassKey=key;toolbarGlasses.forEach(g=>g.destroy());toolbarGlasses=[];toolbarPane?.destroy();toolbarPane=null;toolbarGlassResize?.disconnect();
    document.body.classList.toggle('am-tglass-on',sets.length>0);
    if(!sets.length){toolbarGlassRoot?.remove();toolbarGlassRoot=null;return;}
    // #main isolates Spotify's app (its own stacking context), so the glass goes in it, after React's .Root: over
    // the page and under the toolbar. In <body>, like the sidebar and the player, it covered the toolbar's icons.
    if(!toolbarGlassRoot){toolbarGlassRoot=el('div','');toolbarGlassRoot.id='am-toolbar-glass';}
    const host=document.getElementById('main')||document.body;if(toolbarGlassRoot.parentElement!==host)host.append(toolbarGlassRoot);
    toolbarPane=toolbarLens.shared(toolbarGlassRoot,{state:'button'},TG.rim);toolbarGlasses=sets.map(([c,i])=>new ToolbarGlass(c,i));toolbarPane?.build();
    if(toolbarGlassResize){toolbarGlassResize.observe(toolbar);sets.forEach(([c])=>c.forEach(n=>toolbarGlassResize.observe(n)));}
  }
  // The artist page's floating back and share + more get the same glass, in a layer of their own inside #am-artist
  // (its own stacking context, over #main), rebuilt with the page (renderArtist).
  let artistGlasses=[],artistPane=null;
  function syncArtistGlass(root,back,actions) {
    // The class first: it sizes the buttons the glass is laid on.
    artistGlasses.forEach(g=>g.destroy());artistPane?.destroy();artistPane=null;const live=!!root&&glassLive();artistView.classList.toggle('am-tglass-on',live);
    if(live)artistPane=toolbarLens.shared(root,{state:'button'},TG.rim);
    artistGlasses=live?[new ToolbarGlass([back],true,root,artistPane),new ToolbarGlass(actions,true,root,artistPane)]:[];artistPane?.build();
  }
  // A ResizeObserver misses controls that only move (the toolbar follows --am-side), so the shapes are placed again
  // two frames after a settings change (sidebar width) and when a transition in the toolbar or sidebar ends.
  const placeGlasses=()=>[...toolbarGlasses,...artistGlasses].forEach(g=>g.place());
  addEventListener('resize',placeGlasses);
  document.addEventListener('am-settings',()=>{if(boundToolbar)syncToolbarGlass(boundToolbar);if(!glassLive())syncArtistGlass(null);requestAnimationFrame(()=>requestAnimationFrame(placeGlasses));});
  document.addEventListener('transitionend',event=>{if(toolbarGlasses.length&&(boundToolbar?.contains(event.target)||event.target.closest?.('#am-sidebar')))placeGlasses();},true);
  function spicyPage() { return document.getElementById('SpicyLyricsPage'); }
  function runSpicyControl(id) {
    const native=document.getElementById(id);
    if(!native){notify('Spicy Lyrics henüz hazır değil. Eklenti yüklendiğinde tekrar dene.');return;}
    // Invoke the installed extension's real controls, including its settings,
    // route history, pending page mount and fullscreen lifecycle.
    native.click();
  }
  function toggleSpicyLyrics() { runSpicyControl('SpicyLyrics_PageButton'); }
  // Spotify's Connect button has no test id and a translated label; it follows the queue button.
  function nativeConnect() {
    const buttons=[...document.querySelectorAll('.am-native-player button')];
    return document.querySelector('.am-native-player button[aria-describedby*="connect"]')||buttons[buttons.findIndex(b=>b.matches('[data-testid="control-button-queue"]'))+1]||null;
  }
  // Artwork opens Spicy Lyrics' fullscreen view, or Spotify's own when it is absent.
  function toggleFullscreen() {
    if(document.getElementById('SpicyLyrics_FullscreenButton')){runSpicyControl('SpicyLyrics_FullscreenButton');return;}
    const native=document.querySelector('[data-testid="fullscreen-mode-button"]');
    if(native)native.click();else notify('Tam ekran bu Spotify sürümünde kullanılamıyor.');
  }
  let friendPane=null,asideSeq=0;const asideSeen=new WeakMap();
  function syncNativePanels() {
    // Spotify 1.3 opens Friend Activity and the queue in the right panel as an <aside> labelled like the button
    // that opens it (data-restore-focus-key "buddy_feed" / "queue"); the panel otherwise holds the hidden Now
    // Playing view. Reading the open state from the panel itself means any close button closes the sheet.
    // Panels cross-fade: the outgoing <aside> stays mounted beside the incoming one for a few hundred ms, so the
    // newest one is current. The outgoing one is hidden by a data attribute, which survives React rewriting class.
    const asides=[...document.querySelectorAll('.am-native-right aside[aria-label]')];
    for(const a of asides)if(!asideSeen.has(a))asideSeen.set(a,++asideSeq);
    const current=asides.reduce((a,b)=>!a||asideSeen.get(b)>asideSeen.get(a)?b:a,null);
    for(const a of asides)if(a.hasAttribute('data-am-current')!==(a===current))a.toggleAttribute('data-am-current',a===current);
    const panelOf=native=>{const label=native?.getAttribute('aria-label');return label&&current?.getAttribute('aria-label')===label?current:null;};
    const panelFor=key=>panelOf(document.querySelector(`[data-restore-focus-key="${key}"]`));
    const friends=panelFor('buddy_feed'),devices=panelOf(nativeConnect());
    if(friends||performance.now()-friendsPending>3000)friendsPending=0;
    for(const [node,open] of [[friendsButton,friends||friendsPending],[connectButton,devices]]){node.classList.toggle('am-active',!!open);setAttributeIfChanged(node,'aria-pressed',String(!!open));}
    // Older clients without labelled panels: find the feed itself. With labels, the outgoing feed must not count.
    const feed=friends||panelFor('queue')||devices||(asides.length?null:
      document.querySelector('.fkgR9mQfUbjSxQi0FXd4')
      ||document.querySelector('[data-testid^="buddy-feed-"]')?.parentElement);
    document.body.classList.toggle('am-panel-open',!!feed);
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
    document.body.classList.toggle('am-spicy-route',lyricsOpen);
    const available=!!document.getElementById('SpicyLyrics_PageButton');
    popupLyricsButton.hidden=!document.getElementById('SpicyLyrics_PopupLyricsButton');
    lyricsButton.classList.toggle('am-active',lyricsOpen);
    setAttributeIfChanged(lyricsButton,'aria-pressed',String(lyricsOpen));
    setAttributeIfChanged(lyricsButton,'title',available?(lyricsOpen?'Spicy Lyrics sözlerini kapat':'Spicy Lyrics sözlerini aç'):'Spicy Lyrics yükleniyor…');
    fullscreenButton.classList.toggle('am-active',fullscreen);
    setAttributeIfChanged(fullscreenButton,'aria-pressed',String(fullscreen));
    setAttributeIfChanged(fullscreenButton,'title',fullscreen?'Tam ekrandan çık':'Tam ekran');
  }
  // Playlist and album pages label Spotify's play button "Çal"/"Duraklat" in CSS; this says whether that page is the one playing.
  function syncEntityPlaying() {
    const [,kind,id]=/^\/(playlist|album)\/([A-Za-z0-9]+)/.exec(routePath())||[];
    const playing=!!kind&&S.Player.data?.context?.uri===`spotify:${kind}:${id}`&&!!S.Player.isPlaying?.();
    document.body.classList.toggle('am-entity-playing',playing);
  }
  let previousTrack='',previousPlaying=null;
  function syncPlayer() {
    if(document.hidden||!S.Player.origin?._state) return;
    syncEntityPlaying();
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
  // Photo headers (Daily Mix, genre pages): Spotify colours the page below with the photo's overall colour, which
  // often clashes with the photo's bottom edge (a dark purple edge over bright green) and leaves a hard seam. The
  // colour is taken from the bottom tenth of the visible photo instead (cover, positioned 50% 15%), kept deep so
  // white text stays readable, and user.css fades the photo into it.
  function headerEdgeColor(url,box) {
    return new Promise(resolve=>{
      const img=new Image();img.crossOrigin='anonymous';img.decoding='async';
      img.onerror=()=>resolve(null);
      img.onload=()=>{try{
        const w=box.offsetWidth||img.width,h=box.offsetHeight||img.height,scale=Math.max(w/img.width,h/img.height);
        const top=(h-img.height*scale)*.15,left=(w-img.width*scale)/2,bottom=Math.min(img.height,(h-top)/scale),strip=h*.1/scale;
        const canvas=document.createElement('canvas');canvas.width=32;canvas.height=4;
        const context=canvas.getContext('2d',{willReadFrequently:true});
        context.drawImage(img,Math.max(0,-left/scale),Math.max(0,bottom-strip),Math.min(img.width,w/scale),strip,0,0,32,4);
        const data=context.getImageData(0,0,32,4).data,sum=[0,0,0];
        for(let i=0;i<data.length;i+=4){sum[0]+=data[i];sum[1]+=data[i+1];sum[2]+=data[i+2];}
        const [hue,sat,light]=hexToHsl('#'+sum.map(v=>Math.round(v/(data.length/4)).toString(16).padStart(2,'0')).join(''));
        resolve(`hsl(${Math.round(hue)} ${Math.round(Math.min(.6,sat)*100)}% ${Math.round(Math.min(.24,Math.max(.1,light*.6))*100)}%)`);
      }catch{resolve(null);}};
      img.src=url;
    });
  }
  // Sampled colours by photo URL, so a page seen before gets its colour at once instead of after the photo loads;
  // a new photo waits on the neutral page colour, not the previous page's. The newest 100 survive restarts.
  const headerColors=new Map();
  try{for(const [url,color] of JSON.parse(localStorage.getItem('mcloud:header-colors')||'[]'))if(typeof color==='string')headerColors.set(url,color);}catch{}
  function rememberHeaderColor(url,color) {
    headerColors.delete(url);headerColors.set(url,color);
    while(headerColors.size>100)headerColors.delete(headerColors.keys().next().value);
    try{localStorage.setItem('mcloud:header-colors',JSON.stringify([...headerColors]));}catch{}
  }
  let headerImage='',headerHost=null,headerFrame=null;
  function syncHeaderColor() {
    const image=main?.querySelector('.before-scroll-node [data-testid="background-image"]'),url=spotifyImage(/url\("?([^")]+)"?\)/.exec(image?.style.backgroundImage||'')?.[1]||'');
    if(url===headerImage)return;headerImage=url;
    if(!url){document.body.classList.remove('am-image-header');return;}
    const known=headerColors.get(url);
    document.documentElement.style.setProperty('--am-header-base',known||'var(--am-bg)');
    document.body.classList.add('am-image-header');
    if(known)return;
    headerEdgeColor(url,image.parentElement).then(color=>{
      if(headerImage!==url)return;
      if(color){rememberHeaderColor(url,color);document.documentElement.style.setProperty('--am-header-base',color);}
      document.body.classList.toggle('am-image-header',!!color);
    });
  }
  // The photo is portalled into .before-scroll-node; its container's style also changes every scroll frame (--scroll),
  // so the callback only looks further when the photo itself or the portal's children changed. Spotify swaps
  // .before-scroll-node for a new one after History fires, so its stable parent is watched (children only) as well;
  // otherwise the observer stays on the old node and the next page's photo is never sampled.
  const headerObserver=new MutationObserver(records=>{if(records.some(r=>r.type==='childList'||r.target.dataset?.testid==='background-image'))watchHeader();});
  function watchHeader() {
    const frame=main?.querySelector('.main-view-container'),host=frame?.querySelector(':scope > .before-scroll-node')||main?.querySelector('.before-scroll-node');
    if(frame!==headerFrame||host!==headerHost){
      headerObserver.disconnect();headerFrame=frame;headerHost=host;
      if(frame)headerObserver.observe(frame,{childList:true});
      if(host)headerObserver.observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});
    }
    syncHeaderColor();
  }
  const smallImage=visual=>spotifyImage([...(visual?.sources||[])].sort((a,b)=>(a.width||0)-(b.width||0))[0]?.url||'');
  function closeArtist() {
    if(!document.body.classList.contains('am-artist-open')&&!artistView.hasChildNodes())return;
    ++artistRequest;document.body.classList.remove('am-artist-open','am-tinted');
    artistView.replaceChildren();artistView.scrollTop=0;syncArtistGlass(null);
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
    }catch{notify('Çalma başlatılamadı.');}
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
    const copyLink=async()=>{try{if(S.Platform.ClipboardAPI?.copy)await S.Platform.ClipboardAPI.copy(shareLink);else await navigator.clipboard.writeText(shareLink);notify('Bağlantı kopyalandı.');}catch{notify('Bağlantı kopyalanamadı.');}};
    const actions=el('div','am-artist-actions');
    const moreButton=button('Diğer seçenekler','more',()=>togglePopover(moreButton,()=>[
      {label:'Bağlantıyı Kopyala',action:copyLink},
      {label:'Spotify Sayfasında Aç',action:()=>{nativeArtists.add(id);closeArtist();currentMode='native';}},
    ]));
    const shareButton=button('Paylaş','share',copyLink),glassRoot=el('div','am-tglass-root');
    actions.append(shareButton,moreButton);
    page.append(glassRoot,back,actions);
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
      catch{notify('Takip durumu değiştirilemedi.');}
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
        const add=button('Arşive ekle','plus',async()=>{try{added=await toggleSaved(latest.uri,added);add.classList.toggle('am-active',added);notify(added?'Arşive eklendi.':'Arşivden çıkarıldı.');}catch{notify('Arşiv güncellenemedi.');}},'am-latest-add');
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
            {label:'Şarkı Bağlantısını Kopyala',action:async()=>{const link='https://open.spotify.com/track/'+song.uri.split(':').pop();try{if(S.Platform.ClipboardAPI?.copy)await S.Platform.ClipboardAPI.copy(link);else await navigator.clipboard.writeText(link);notify('Bağlantı kopyalandı.');}catch{notify('Bağlantı kopyalanamadı.');}}},
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
    artistView.replaceChildren(page);artistScroll=0;updateHero();syncArtistGlass(glassRoot,back,[shareButton,moreButton]);
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
  // Sticky bars such as the home chips row paint a solid layer: an absolute child of the sticky bar with only
  // an inline opacity, nothing user.css could select. The first scroll that may show it tags it as glass,
  // re-checking at most once a second while it is missing (Spotify replaces it when the chips change). React
  // rewrites this node's className as it scrolls, so the tag is an attribute it leaves alone.
  // Playlist and album title bar: hidden at the page top, shown once the play controls pass under it (user.css).
  // A page that has not rendered its controls yet counts as top: a slow load used to drop the class 600ms after
  // the route change, and the title showed on the unscrolled page once it arrived.
  let entityFrame=0,entityTimer=0;
  function syncEntityBar() {
    entityFrame=0;
    const row=main?.querySelector('[data-testid="action-bar-row"]'),bar=main?.querySelector('.main-topBar-container');
    const top=!row||!bar||row.getBoundingClientRect().bottom>bar.getBoundingClientRect().bottom;
    if(document.body.classList.contains('am-entity-top')!==top)document.body.classList.toggle('am-entity-top',top);
  }
  document.addEventListener('scroll',event=>{if(currentMode==='native'&&!entityFrame&&main?.contains(event.target))entityFrame=requestAnimationFrame(syncEntityBar);},{capture:true,passive:true});
  let glassBar=null,glassBarCheck=0;
  document.addEventListener('scroll',event=>{
    if(currentMode!=='native'||glassBar?.isConnected&&glassBar.hasAttribute('data-am-glass')||event.timeStamp-glassBarCheck<1000||!main?.contains(event.target))return;
    glassBarCheck=event.timeStamp;
    for(const layer of main.querySelectorAll('.main-view-container__scroll-node-child [style*="opacity"]'))
      if(layer.parentElement&&getComputedStyle(layer).position==='absolute'&&getComputedStyle(layer.parentElement).position==='sticky'){layer.setAttribute('data-am-glass','');glassBar=layer;break;}
  },{capture:true,passive:true});
  // The track list's column header turns to glass only while it sticks. Spotify marks that with an IntersectionObserver
  // whose margin ignores the viewport's --am-page-top padding, so its stuck class never comes; the theme measures it
  // once per frame while scrolling and writes only when the state flips.
  let listHeader=null,listHeaderLimit=0,listHeaderFrame=0;
  document.addEventListener('scroll',event=>{
    if(currentMode!=='native'||listHeaderFrame||!main?.contains(event.target))return;
    listHeaderFrame=requestAnimationFrame(()=>{
      listHeaderFrame=0;
      if(!listHeader?.isConnected){
        listHeader=main.querySelector('[role="grid"] > [role="presentation"][style*="top"]');
        const viewport=listHeader?.closest('[data-overlayscrollbars-viewport]');if(!viewport){listHeader=null;return;}
        listHeaderLimit=viewport.getBoundingClientRect().top+parseFloat(getComputedStyle(viewport).paddingTop)+parseFloat(listHeader.style.top||0)+1;
      }
      const stuck=listHeader.getBoundingClientRect().top<=listHeaderLimit;
      if(stuck!==listHeader.hasAttribute('data-am-stuck'))listHeader.toggleAttribute('data-am-stuck',stuck);
    });
  },{capture:true,passive:true});
  H.listen(() => {
    syncSpicyControls();syncEntityPlaying();
    // A new page renders after the route change; mark its top before the title bar can show.
    document.body.classList.add('am-entity-top');clearTimeout(entityTimer);entityTimer=setTimeout(syncEntityBar,600);
    document.body.classList.add('am-ready');
    document.body.classList.remove('am-account-open');
    const query=new URLSearchParams(H.location.search);
    const kind=query.get('am-library');
    if(libraryLabels[kind]){closeArtist();renderLibrary(kind,query.get('am-folder')||'');return;}
    const artistId=/^\/artist\/([A-Za-z0-9]+)\/?$/.exec(routePath())?.[1];
    if(artistId&&!nativeArtists.has(artistId)&&S.GraphQL?.Request&&S.GraphQL.Definitions?.queryArtistOverview){renderArtist(artistId);return;}
    closeArtist();
    currentMode='native';++libraryRequest;clearLibrary();document.body.classList.remove('am-library-open');
    document.body.classList.toggle('am-search-open',routePath().startsWith('/search'));updateNav();watchHeader();
  });
  // Ignore feed cards, lyrics text and player progress mutations. Only host
  // replacements and extension/panel controls need a theme reconciliation.
  const relevantHosts='#global-nav-bar,#SpicyLyricsPage,#SpicyLyrics_PageButton,#SpicyLyrics_FullscreenButton,#SpicyLyrics_PopupLyricsButton,.fkgR9mQfUbjSxQi0FXd4,[data-testid^="buddy-feed-"],aside[aria-label]';
  let reconciliation=null;
  function scheduleReconcile(records) {
    if(document.hidden)return;
    // Panel swaps sync at once: the observer runs before paint, so neither panel of a cross-fade flashes.
    const right=document.querySelector('.am-native-right');
    if(right&&records.some(record=>right.contains(record.target)&&[...record.addedNodes,...record.removedNodes].some(n=>n.nodeType===1&&(n.matches('aside[aria-label]')||n.querySelector('aside[aria-label]')))))syncNativePanels();
    if(reconciliation!==null)return;
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
    reconciliation=setTimeout(()=>{reconciliation=null;if(!main.isConnected)bindLayout();bindToolbar();syncNativePanels();syncSpicyControls();watchHeader();},150);
  }
  const observer=new MutationObserver(scheduleReconcile);
  if(!document.hidden)observer.observe(root,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){observer.disconnect();headerObserver.disconnect();headerHost=headerFrame=null;clearTimeout(reconciliation);reconciliation=null;}
    else {if(!main.isConnected)bindLayout();bindToolbar();syncNativePanels();syncSpicyControls();watchHeader();observer.observe(root,{childList:true,subtree:true});}
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
