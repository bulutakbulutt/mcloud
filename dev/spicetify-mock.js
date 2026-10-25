// Minimal Spicetify API stand-in so theme.js can run in a plain browser (see dev/smoke.mjs).
(() => {
  const listeners = [], playerListeners = {};
  const art = (hue, label) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,55%)"/><stop offset="1" stop-color="hsl(${(hue+60)%360},70%,30%)"/></linearGradient></defs><rect width="300" height="300" fill="url(#g)"/><text x="20" y="270" font-family="Helvetica" font-size="36" fill="white">${label}</text></svg>`);
  const names = ['Blonde','Currents','In Rainbows','Random Access Memories','Melodrama','Discovery','Norman F***ing Rockwell','Ctrl','Igor','Awaken, My Love!','Channel Orange','Kid A','Sour','folklore','After Hours','Ants From Up There','Punisher','Titanic Rising','Since I Left You','Heaven or Las Vegas'];
  const library = [];
  names.forEach((n, i) => library.push({ uri: 'spotify:album:' + i, type: 'album', name: n, images: [{ url: art(i * 37, n.slice(0, 2)) }], owner: { name: 'Sanatçı ' + i } }));
  ['Frank Ocean','Tame Impala','Radiohead','Daft Punk','Lorde','Phoebe Bridgers'].forEach((n, i) => library.push({ uri: 'spotify:artist:' + i, type: 'artist', name: n, images: [{ url: art(200 + i * 20, n[0]) }] }));
  ['Sabah Kahvesi','Koşu','Odak','Yol Şarkıları'].forEach((n, i) => library.push({ uri: 'spotify:playlist:' + i, type: 'playlist', name: n, images: [{ url: art(i * 90, '♪') }], owner: { displayName: 'emir' } }));
  window.__mockLibrary = library;
  const state = { playing: true, shuffle: false, repeat: 0, volume: .6, progress: 83000, duration: 245000 };
  window.__menus = [];
  window.Spicetify = {
    showNotification: m => { (window.__notes ||= []).push(m); },
    Menu: {
      Item: class { constructor(name, checked, onClick) { Object.assign(this, { name, checked, onClick }); } setState(v) { this.checked = v; } },
      SubMenu: class { constructor(name, items) { Object.assign(this, { name, items }); } register() { window.__menus.push(this); } deregister() {} },
    },
    Player: {
      origin: { _state: {} },
      data: { item: { uri: 'spotify:track:1', name: 'Nights', artists: [{ name: 'Frank Ocean' }], album: { uri: 'spotify:album:0', images: [{ url: art(30, 'Bl'), label: 'standard' }] }, images: [{ url: art(30, 'Bl'), label: 'small' }], metadata: { title: 'Nights', artist_name: 'Frank Ocean', album_uri: 'spotify:album:0' } } },
      isPlaying: () => state.playing, togglePlay: () => { state.playing = !state.playing; },
      getShuffle: () => state.shuffle, toggleShuffle: () => { state.shuffle = !state.shuffle; },
      getRepeat: () => state.repeat, toggleRepeat: () => { state.repeat = (state.repeat + 1) % 3; },
      getVolume: () => state.volume, setVolume: v => { state.volume = v; },
      getProgress: () => state.progress, getDuration: () => state.duration,
      getProgressPercent: () => state.progress / state.duration, seek: ms => { state.progress = ms; },
      back() {}, next() {},
      addEventListener: (n, f) => (playerListeners[n] ||= []).push(f),
    },
    Platform: {
      History: {
        location: { pathname: '/', search: '' },
        push(p) { this.location = typeof p === 'string' ? { pathname: p, search: '' } : { pathname: p.pathname, search: p.search || '' }; listeners.forEach(f => f(this.location)); },
        listen: f => listeners.push(f),
      },
      LibraryAPI: { getContents: async ({ offset }) => ({ items: offset ? [] : library, totalLength: library.length }) },
    },
  };
  window.__mockState = state;
})();
