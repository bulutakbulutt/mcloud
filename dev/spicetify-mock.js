// Minimal Spicetify API stand-in so theme.js can run in a plain browser (see dev/smoke.mjs).
(() => {
  const listeners = [], playerListeners = {};
  const art = (hue, label) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,55%)"/><stop offset="1" stop-color="hsl(${(hue+60)%360},70%,30%)"/></linearGradient></defs><rect width="300" height="300" fill="url(#g)"/><text x="20" y="270" font-family="Helvetica" font-size="36" fill="white">${label}</text></svg>`);
  const names = ['Blonde','Currents','In Rainbows','Random Access Memories','Melodrama','Discovery','Norman F***ing Rockwell','Ctrl','Igor','Awaken, My Love!','Channel Orange','Kid A','Sour','folklore','After Hours','Ants From Up There','Punisher','Titanic Rising','Since I Left You','Heaven or Las Vegas'];
  const library = [];
  names.forEach((n, i) => library.push({ uri: 'spotify:album:' + i, type: 'album', name: n, images: [{ url: art(i * 37, n.slice(0, 2)) }], owner: { name: 'Sanatçı ' + i } }));
  ['Frank Ocean','Tame Impala','Radiohead','Daft Punk','Lorde','Phoebe Bridgers'].forEach((n, i) => library.push({ uri: 'spotify:artist:' + i, type: 'artist', name: n, images: [{ url: art(200 + i * 20, n[0]) }] }));
  // Playlists in the order Spotify's Recents sort returns them: pinned first, then by last played.
  library.push({ uri: 'spotify:folder:ruh', type: 'folder', name: 'Ruh Hali', pinned: true, images: [] });
  ['Sabah Kahvesi','Koşu','Odak','Yol Şarkıları','Gece Sürüşü','Ders Çalışma','Akustik Akşamlar','Yağmurlu Günler','90\'lar Türkçe Pop','Haftalık Keşif'].forEach((n, i) => library.push({ uri: 'spotify:playlist:' + i, type: 'playlist', name: n, pinned: i === 0,
    images: i === 6 ? [] : [{ url: art(i * 90, '♪'), width: 640 }, { url: art(i * 90 + 20, '♪'), width: 60 }], owner: { displayName: 'emir' }, lastPlayedAt: 1e12 - i }));
  library.push({ uri: 'spotify:collection:tracks', type: 'liked-songs', name: 'Beğenilen Şarkılar', pinned: true, images: [] });
  const folders = { 'spotify:folder:ruh': ['Neşeli', 'Hüzünlü'].map((n, i) => ({ uri: 'spotify:playlist:f' + i, type: 'playlist', name: n, images: [{ url: art(300 + i * 30, '♪') }], owner: { displayName: 'emir' } })) };
  window.__mockLibrary = library;
  // Spotify's library and rootlist emit 'update' through an emitter behind getEvents().
  const emitter = { listeners: [], addListener(name, fn) { if (name === 'update') this.listeners.push(fn); }, removeListener() {}, emit() { this.listeners.forEach(fn => fn({})); } };
  let created = 0;
  const createItem = type => async (name, location) => {
    const uri = `spotify:${type}:new${++created}`;
    (window.__created ||= []).push([type, name, location]);
    library.splice(library.findIndex(i => !i.pinned && ['playlist', 'folder'].includes(i.type)), 0, { uri, type, name, images: [], owner: { displayName: 'emir' }, lastPlayedAt: 2e12 });
    emitter.emit(); return uri;
  };
  const state = { liked: false, playing: true, shuffle: false, repeat: 0, volume: .6, progress: 83000, duration: 245000 };
  window.__menus = [];
  window.Spicetify = {
    showNotification: m => { (window.__notes ||= []).push(m); },
    Menu: {
      Item: class { constructor(name, checked, onClick) { Object.assign(this, { name, checked, onClick }); } setState(v) { this.checked = v; } },
      SubMenu: class { constructor(name, items) { Object.assign(this, { name, items }); } register() { window.__menus.push(this); } deregister() {} },
    },
    Player: {
      origin: { _state: {} },
      data: { context: { uri: 'spotify:album:0' }, item: { uri: 'spotify:track:1', name: 'Nights', artists: [{ name: 'Frank Ocean', uri: 'spotify:artist:0' }], album: { uri: 'spotify:album:0', name: 'Blonde', images: [{ url: art(30, 'Bl'), label: 'standard' }] }, images: [{ url: art(30, 'Bl'), label: 'small' }], metadata: { title: 'Nights', artist_name: 'Frank Ocean', album_uri: 'spotify:album:0' } } },
      isPlaying: () => state.playing, togglePlay: () => { state.playing = !state.playing; },
      getShuffle: () => state.shuffle, toggleShuffle: () => { state.shuffle = !state.shuffle; },
      getRepeat: () => state.repeat, toggleRepeat: () => { state.repeat = (state.repeat + 1) % 3; },
      getVolume: () => state.volume, setVolume: v => { state.volume = v; },
      getProgress: () => state.progress, getDuration: () => state.duration,
      getProgressPercent: () => state.progress / state.duration, seek: ms => { state.progress = ms; },
      getHeart: () => state.liked, toggleHeart: () => { state.liked = !state.liked; },
      back() {}, next() {},
      playUri: async uri => { window.__playedUri = uri; },
      addEventListener: (n, f) => (playerListeners[n] ||= []).push(f),
    },
    addToQueue: async items => { (window.__queueAdds ||= []).push(...items); },
    Platform: {
      History: {
        location: { pathname: '/', search: '' },
        push(p) { this.location = typeof p === 'string' ? { pathname: p, search: '' } : { pathname: p.pathname, search: p.search || '' }; listeners.forEach(f => f(this.location)); },
        listen: f => listeners.push(f),
      },
      UserAPI: { getUser: async () => ({ username: 'emir', displayName: 'Emir Bilici', images: [] }) },
      PlayerAPI: {
        addToQueue: async items => { (window.__queueAdds ||= []).push(...items); },
        play: async () => {},
      },
      PlaylistAPI: {
        add: async (playlistUri, uris, options) => { (window.__playlistAdds ||= []).push({ playlistUri, uris, options }); },
      },
      LibraryAPI: {
        // filters ['2'] = playlists and folders; sortOrder '6' = Recents, the order the mock list is already in.
        getContents: async ({ offset, filters = [], folderUri }) => {
          let items = folderUri ? folders[folderUri] || [] : library;
          if (filters.includes('2')) items = items.filter(i => ['playlist', 'folder', 'liked-songs'].includes(i.type));
          return { items: offset ? [] : items, totalLength: items.length };
        },
        getEvents: () => ({ _emitter: emitter }),
      },
      RootlistAPI: { createPlaylist: createItem('playlist'), createFolder: createItem('folder'), getEvents: () => ({ _emitter: emitter }) },
    },
  };
  window.__mockState = state;
  window.__firePlayer = name => (playerListeners[name] || []).forEach(f => f({}));
  window.__libraryUpdate = () => emitter.emit();
  // Shape follows Spotify's queryArtistOverview response (artistUnion).
  const cover = (n, i) => ({ sources: [{ url: art(i * 47, n.slice(0, 2)), width: 300, height: 300 }] });
  const release = (n, i, type, year) => ({ releases: { items: [{ uri: 'spotify:album:r' + i, name: n, type, date: { year }, coverArt: cover(n, i) }] } });
  window.__mockArtist = {
    uri: 'spotify:artist:mock', saved: false,
    profile: { name: 'Sena Şener', biography: { text: 'Sena Şener, <b>İstanbul</b> doğumlu şarkıcı ve söz yazarı.' } },
    stats: { monthlyListeners: 1234567 },
    // Spotify moved the wide header out of visuals (2026): sources carry maxWidth/maxHeight, largest first.
    headerImage: { data: { sources: [{ url: art(355, 'SŞ'), maxWidth: 2660, maxHeight: 1140 }, { url: art(350, 'S'), maxWidth: 1495, maxHeight: 641 }] } },
    visuals: {
      avatarImage: { sources: [{ url: art(355, 'SŞ'), width: 640 }], extractedColors: { colorRaw: { hex: '#C8102E' } } },
    },
    goods: { events: { concerts: { items: [
      { title: 'Edirne', date: { isoString: '2026-11-13T22:00:00' }, venue: { name: 'Black Corner Pub', location: { name: 'Edirne, Türkiye' } } },
      { title: 'Ankara', date: { isoString: '2026-11-21T22:00:00' }, venue: { name: 'Milyon Event Hall', location: { name: 'Ankara, Türkiye' } } },
    ] } } },
    discography: {
      latest: { uri: 'spotify:album:latest', name: 'Sev Diyeydi', type: 'SINGLE', date: { year: 2026, month: 10, day: 23 }, coverArt: cover('Sev Diyeydi', 1), tracks: { totalCount: 1 } },
      topTracks: { items: ['Sev Diyeydi', 'Sevmemeliyiz', 'Alışılır Mı Aşka', 'Affettim Herkesi', 'Fly Above', 'Affetmem', 'Dönmek', 'Kaybettiklerimi Geri Ver', 'Feel'].map((n, i) => ({ track: { uri: 'spotify:track:t' + i, name: n, albumOfTrack: { uri: 'spotify:album:a' + i, name: n + ' - Single', coverArt: cover(n, i + 3) }, artists: { items: [{ profile: { name: 'Sena Şener' } }] } } })) },
      albums: { items: [release('İnsan Gelir İnsan Geçer (Deluxe)', 20, 'ALBUM', 2018)] },
      singles: { items: ['Sev Diyeydi', 'Alışılır Mı Aşka', 'Aşkından Ölmemeli', 'Gurbet', 'Defolup Gidelim', 'Affettim Herkesi', 'Kaybettiklerimi Geri Ver'].map((n, i) => release(n, 30 + i, 'SINGLE', 2026 - i)) },
    },
    relatedContent: {
      appearsOn: { items: ['Feel (feat. Sena Şener)', 'Waiting on the Shore', 'Slavery'].map((n, i) => ({ releases: { items: [{ uri: 'spotify:album:ap' + i, name: n, artists: { items: [{ profile: { name: 'Mahmut Orhan' } }] }, coverArt: cover(n, 50 + i) }] } })) },
      relatedArtists: { items: ['Canozan', 'Dolu Kadehi Ters Tut', 'Sufle', 'Pinhani', 'Cem Adrian'].map((n, i) => ({ uri: 'spotify:artist:s' + i, profile: { name: n }, visuals: { avatarImage: cover(n, 70 + i) } })) },
    },
  };
  Spicetify.Locale = { getLocale: () => new URLSearchParams(location.search).get('locale') || 'tr' };
  Spicetify.GraphQL = {
    Definitions: { queryArtistOverview: { name: 'queryArtistOverview' } },
    Request: async (def, vars) => (window.__artistRequests ||= []).push(vars) && { data: { artistUnion: window.__mockArtist } },
  };
  Object.assign(Spicetify.Platform.LibraryAPI, {
    add: async ({ uris }) => { (window.__libraryAdds ||= []).push(...uris); },
    remove: async ({ uris }) => { (window.__libraryRemoves ||= []).push(...uris); },
  });
  Spicetify.Platform.History.goBack = function () { this.push('/'); };
})();
