(() => {
  const get = id => document.getElementById(id);
  const manifest = MATERIAL.commute?.manifest();
  if (!manifest) {
    get('commuteIntro').textContent = MATERIAL.title + 'の通勤用音声は準備中です。通常の音声学習を利用できます。';
    return;
  }
  get('commuteContent').hidden = false;
  get('commuteIntro').textContent = '全' + manifest.chapters.length + '語の用語名と解説を、1本の音声で聞けます。画面をロックする前に再生を始めてください。';
  const audio = get('commuteAudio');
  const rate = get('commuteRate');
  const previous = get('commutePrev');
  const next = get('commuteNext');
  const status = get('commuteStatus');
  const session = navigator.mediaSession;
  const {file, chapters, duration} = manifest;
  const names = chapters.map(chapter => TERMS.find(term => term.id === chapter.id).name);
  let saved = {};
  try {saved = LEARNING_STORAGE.read(MATERIAL.id, 'commute') || {};} catch { /* Storage can be blocked. */ }
  if ([...rate.options].some(option => option.value === saved.rate)) rate.value = saved.rate;
  const start = Number.isFinite(saved.position) && saved.position >= 0 && saved.position < duration ? saved.position : 0;
  let displayedChapter = -1;
  let pendingSeek = start;
  let lastSave = 0;

  // Media time can be rounded slightly below the requested chapter boundary.
  const chapterAt = time => Math.max(0, chapters.findLastIndex(chapter => chapter.start <= time + 0.001));
  const position = () => Math.min(duration, pendingSeek ?? audio.currentTime);

  function save(at = position()) {
    lastSave = Date.now();
    try {LEARNING_STORAGE.write(MATERIAL.id, 'commute', {position: at, rate: rate.value});}
    catch { /* Playback stays available when storage is blocked. */ }
  }
  function applyRate() {
    audio.defaultPlaybackRate = Number(rate.value);
    audio.playbackRate = Number(rate.value);
  }
  function render() {
    const index = chapterAt(position());
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
          position: Math.min(audio.duration, position())
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
  function applySeek() {
    if (pendingSeek === null) return;
    audio.currentTime = Math.min(pendingSeek, audio.duration);
    pendingSeek = null;
  }
  function seek(at) {
    if (!Number.isFinite(at)) return;
    pendingSeek = Math.max(0, Math.min(at, duration));
    if (audio.readyState >= 1) applySeek();
    render();
    save();
  }
  function move(delta) {
    const target = displayedChapter + delta;
    if (target >= 0 && target < chapters.length) seek(chapters[target].start);
  }

  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  rate.addEventListener('change', () => {applyRate(); render(); save();});
  audio.addEventListener('loadedmetadata', () => {applySeek(); applyRate(); render();});
  audio.addEventListener('play', () => {status.textContent = ''; render();});
  audio.addEventListener('pause', () => {if (!audio.ended) save(); render();});
  audio.addEventListener('seeked', () => {save(audio.ended ? 0 : position()); render();});
  audio.addEventListener('timeupdate', () => {
    if (!audio.paused && Date.now() - lastSave >= 1000) save();
    render();
  });
  audio.addEventListener('ended', () => {
    if (!audio.ended) return;
    save(0);
    render();
    status.textContent = chapters.length + '語の再生が終わりました。';
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
      seekto: ({seekTime}) => seek(seekTime),
      seekbackward: ({seekOffset = 10}) => seek(position() - seekOffset),
      seekforward: ({seekOffset = 10}) => seek(position() + seekOffset)
    };
    for (const [action, handler] of Object.entries(handlers)) {
      try {session.setActionHandler(action, handler);} catch { /* Individual actions vary by browser. */ }
    }
  }
  audio.src = 'commute-media/' + file;
  applyRate();
  render();
})();
