(() => {
  const get = id => document.getElementById(id);
  const audio = get('commuteAudio');
  const mode = get('commuteMode');
  const rate = get('commuteRate');
  const previous = get('commutePrev');
  const next = get('commuteNext');
  const status = get('commuteStatus');
  const session = navigator.mediaSession;
  const {chapters, duration} = COMMUTE_AUDIO;
  const names = chapters.map(chapter => TERMS.find(term => term.id === chapter.id).name);
  const storageKey = 'ai-dictionary-commute-v1';
  const media = name => 'commute-media/' + name;

  let saved = {};
  try {saved = JSON.parse(localStorage.getItem(storageKey)) || {};} catch { /* Storage can be blocked. */ }
  mode.value = saved.mode === 'split' ? 'split' : 'joined';
  if ([...rate.options].some(option => option.value === saved.rate)) rate.value = saved.rate;
  const start = Number.isFinite(saved.position) && saved.position >= 0 && saved.position < duration ? saved.position : 0;
  let track = 0;
  let displayedChapter = -1;
  let pendingSeek = null;
  let lastSave = 0;

  const split = () => mode.value === 'split';
  const chapterAt = time => Math.max(0, chapters.findLastIndex(chapter => chapter.start <= time));
  const fileTime = () => pendingSeek ?? audio.currentTime;
  const position = () => Math.min(duration, (split() ? chapters[track].start : 0) + fileTime());

  function save(at = position()) {
    lastSave = Date.now();
    try {localStorage.setItem(storageKey, JSON.stringify({position: at, mode: mode.value, rate: rate.value}));}
    catch { /* Playback stays available when storage is blocked. */ }
  }
  function applyRate() {
    audio.defaultPlaybackRate = Number(rate.value);
    audio.playbackRate = Number(rate.value);
  }
  function render() {
    const index = split() ? track : chapterAt(position());
    if (displayedChapter !== index) {
      displayedChapter = index;
      get('commuteTerm').textContent = names[index];
      get('commutePosition').textContent = (index + 1) + ' / ' + chapters.length + ' 語';
      previous.disabled = index === 0;
      next.disabled = index === chapters.length - 1;
      if (session && typeof MediaMetadata === 'function') {
        session.metadata = new MediaMetadata({title: names[index], artist: 'AI技術辞典', album: '通勤モード'});
      }
    }
    if (session) {
      session.playbackState = audio.paused || audio.ended ? 'paused' : 'playing';
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        session.setPositionState?.({
          duration: audio.duration,
          playbackRate: audio.playbackRate,
          position: Math.min(audio.duration, fileTime())
        });
      }
    }
  }
  function play() {
    audio.play().catch(error => {
      if (error.name === 'AbortError') return;
      status.textContent = '再生を開始できませんでした。画面を開いてプレーヤーの再生ボタンを押してください。';
    });
  }
  function loadAt(at, resume = false) {
    track = chapterAt(at);
    const source = media(split() ? chapters[track].file : 'commute-all.mp3');
    pendingSeek = at - (split() ? chapters[track].start : 0);
    if (audio.getAttribute('src') !== source) audio.src = source;
    if (audio.readyState >= 1) applySeek();
    applyRate();
    render();
    if (resume) play();
  }
  function applySeek() {
    if (pendingSeek === null) return;
    audio.currentTime = Math.min(pendingSeek, audio.duration);
    pendingSeek = null;
  }
  function seek(at) {
    loadAt(Math.max(0, Math.min(at, duration)), !audio.paused && !audio.ended);
    save();
  }
  function move(delta) {
    const target = displayedChapter + delta;
    if (target >= 0 && target < chapters.length) seek(chapters[target].start);
  }

  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  let activeMode = mode.value;
  mode.addEventListener('change', () => {
    const selected = mode.value;
    mode.value = activeMode;
    const at = position();
    audio.pause();
    mode.value = activeMode = selected;
    loadAt(at < duration ? at : 0);
    save();
    status.textContent = '再生方式を切り替えました。再生ボタンで続けられます。';
  });
  rate.addEventListener('change', () => {applyRate(); render(); save();});
  audio.addEventListener('loadedmetadata', () => {applySeek(); applyRate(); render();});
  audio.addEventListener('play', () => {status.textContent = ''; render();});
  audio.addEventListener('pause', () => {if (!audio.ended) save(); render();});
  audio.addEventListener('seeked', () => {save(); render();});
  audio.addEventListener('timeupdate', () => {
    if (!audio.paused && Date.now() - lastSave >= 1000) save();
    render();
  });
  audio.addEventListener('ended', () => {
    if (!audio.ended) return;
    if (split() && track < chapters.length - 1) {
      loadAt(chapters[track + 1].start, true);
      save();
    } else {
      save(0);
      render();
      status.textContent = '3語の再生が終わりました。';
    }
  });
  audio.addEventListener('error', () => {status.textContent = '音声ファイルを読み込めませんでした。';});
  function saveOnLeave() {save(audio.ended ? 0 : position());}
  window.addEventListener('pagehide', saveOnLeave);
  document.addEventListener('visibilitychange', () => {if (document.hidden) saveOnLeave();});
  if (session) {
    const handlers = {
      play,
      pause: () => audio.pause(),
      previoustrack: () => move(-1),
      nexttrack: () => move(1),
      seekto: ({seekTime}) => seek((split() ? chapters[track].start : 0) + seekTime),
      seekbackward: ({seekOffset = 10}) => seek(position() - seekOffset),
      seekforward: ({seekOffset = 10}) => seek(position() + seekOffset)
    };
    for (const [action, handler] of Object.entries(handlers)) {
      try {session.setActionHandler(action, handler);} catch { /* Individual actions vary by browser. */ }
    }
  }
  loadAt(start);
})();
