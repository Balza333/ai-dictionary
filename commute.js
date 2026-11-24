(() => {
  const get = id => document.getElementById(id);
  document.title = '通勤モード | ' + MATERIAL.title;
  const registered = MATERIAL.commute?.manifest();
  if (!registered || registered.materialId !== MATERIAL.id || !registered.sources.length) {
    get('commuteIntro').textContent = MATERIAL.title + 'の通勤用音声は準備中です。通常の音声学習を利用できます。';
    return;
  }
  get('commuteContent').hidden = false;
  get('commuteIntro').textContent = 'コハクの音声で、用語名と解説を聞けます。画面をロックする前に再生を始めてください。';
  const manifest = {...registered, chapterIds: MATERIAL.chapters.map(chapter => chapter.id)};
  const audio = get('commuteAudio');
  const rate = get('commuteRate');
  const order = get('commuteOrder');
  const repeat = get('commuteRepeat');
  const previous = get('commutePrev');
  const next = get('commuteNext');
  const status = get('commuteStatus');
  const session = navigator.mediaSession;
  const names = new Map(TERMS.map(term => [term.id, term.name]));
  const chapterTitles = new Map(MATERIAL.chapters.map(chapter => [chapter.id, chapter.title]));
  const chapterSources = manifest.chapterIds.map(id => manifest.sources.find(source =>
    source.chapterIds.length === 1 && source.chapterIds[0] === id)).filter(Boolean);
  const chapterIds = chapterSources.map(source => source.chapterIds[0]);
  const storage = kind => {
    try {return LEARNING_STORAGE.read(MATERIAL.id, kind);} catch {return null;}
  };
  // Do not overwrite v2 or its legacy origin. A newer session wins, even if its position is zero.
  const saved = storage('commute-session') ?? storage('commute');
  const preferences = storage('commute-settings') ?? saved ?? {};
  const normalizedOrder = value => value === 'random' ? 'random' : 'ordered';
  const normalizedRepeat = value => value === 'repeat' ? 'repeat' : 'once';
  const validRate = value => [...rate.options].some(option => option.value === value);
  const formatTime = seconds => {
    const rounded = Math.max(0, Math.ceil(seconds - 0.0001));
    return Math.floor(rounded / 60) + '分' + String(rounded % 60).padStart(2, '0') + '秒';
  };
  order.value = normalizedOrder(preferences.order);
  repeat.value = normalizedRepeat(preferences.repeat);
  if (validRate(preferences.rate)) rate.value = preferences.rate;

  const checks = [];
  const initialSelection = Array.isArray(preferences.selected) ? preferences.selected : chapterIds;
  for (const source of chapterSources) {
    const id = source.chapterIds[0];
    const label = document.createElement('label');
    label.className = 'commute-choice';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = id;
    input.checked = initialSelection.includes(id);
    const copy = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = chapterTitles.get(id);
    const info = document.createElement('small');
    info.textContent = source.cues.length + '語 · ' + formatTime(source.duration);
    copy.append(title, info);
    label.append(input, copy);
    get('commuteChapters').append(label);
    checks.push(input);
  }
  get('commuteScope').hidden = !checks.length;
  get('commuteOrderField').hidden = !checks.length;
  const selection = () => checks.filter(input => input.checked).map(input => input.value);
  const makePlan = (ids, mode, sequence) => COMMUTE_PLAN.build(manifest, ids, mode, sequence);
  let activeOrder = normalizedOrder(saved?.order);
  let activeRepeat = normalizedRepeat(saved?.repeat);
  let plan = makePlan(Array.isArray(saved?.selected) ? saved.selected : chapterIds, activeOrder, saved?.sequence);
  const scopeRemoved = Boolean(saved && !plan.sources.length);
  if (scopeRemoved) plan = makePlan(chapterIds, activeOrder);
  const restored = COMMUTE_PLAN.restore(manifest, plan, scopeRemoved ? null : saved);
  let hasSession = Boolean(saved && plan.sources.length && (saved.sourceId || Number.isFinite(saved.position)));
  let sourceIndex = restored.index;
  let pendingSeek = restored.position;
  let lastSave = 0;
  let asset;
  let termIndex = 0;
  let lastTerm = null;
  let loading = false;

  function write(kind, value) {
    try {LEARNING_STORAGE.write(MATERIAL.id, kind, value);} catch { /* Playback is available without storage. */ }
  }
  const time = () => asset ? Math.min(asset.duration, pendingSeek ?? audio.currentTime) : 0;
  function save() {
    if (!hasSession || !asset) return;
    lastSave = Date.now();
    const position = time();
    write('commute-session', {
      materialId: MATERIAL.id, selected: plan.selected, sequence: plan.sequence,
      sourceId: asset.id, version: asset.version, termId: asset.cues[COMMUTE_PLAN.cueIndex(asset, position)].termId,
      position, rate: rate.value, order: activeOrder, repeat: activeRepeat
    });
  }
  function applyRate() {
    audio.defaultPlaybackRate = Number(rate.value);
    audio.playbackRate = Number(rate.value);
  }
  function estimate() {
    const sources = makePlan(selection(), order.value, selection()).sources;
    const {words, duration} = COMMUTE_PLAN.totals(sources);
    const adjusted = duration / Number(rate.value);
    get('commuteEstimate').textContent = words ? words + '語 · 1周 ' + formatTime(duration) +
      '（' + rate.value + '倍速で ' + formatTime(adjusted) + '）' : '再生する章を選んでください。';
    get('commuteStart').disabled = !words;
    get('commuteContinue').disabled = !hasSession;
    get('commuteSwitchNote').hidden = sources.length < 2 && plan.sources.length < 2;
  }
  function preferencesChanged() {
    write('commute-settings', {selected: selection(), order: order.value, repeat: repeat.value, rate: rate.value});
    estimate();
  }
  function render() {
    if (!asset) return;
    const position = time();
    termIndex = COMMUTE_PLAN.cueIndex(asset, position);
    const cue = asset.cues[termIndex];
    const title = names.get(cue.termId) ?? cue.termId;
    const chapter = chapterTitles.get(cue.chapterId) ?? '';
    const before = COMMUTE_PLAN.totals(plan.sources.slice(0, sourceIndex));
    const after = COMMUTE_PLAN.totals(plan.sources.slice(sourceIndex + 1));
    get('commuteChapter').textContent = chapter;
    get('commuteTerm').textContent = title;
    get('commutePosition').textContent = (before.words + termIndex + 1) + ' / ' +
      (before.words + asset.cues.length + after.words) + ' 語';
    get('commuteRemaining').textContent = '1周の残り ' + formatTime((asset.duration - position + after.duration) / Number(rate.value));
    previous.disabled = !sourceIndex && !termIndex;
    next.disabled = sourceIndex === plan.sources.length - 1 && termIndex === asset.cues.length - 1;
    if (!session) return;
    if (hasSession && cue.termId !== lastTerm && typeof MediaMetadata === 'function') {
      session.metadata = new MediaMetadata({title, artist: MATERIAL.title, album: chapter || '通勤モード'});
      lastTerm = cue.termId;
    }
    if (!hasSession) return;
    session.playbackState = audio.paused || audio.ended ? 'paused' : 'playing';
    if (!loading && Number.isFinite(audio.duration) && audio.duration > 0) {
      session.setPositionState?.({
        duration: audio.duration, playbackRate: audio.playbackRate,
        position: Math.min(audio.duration, position)
      });
    }
  }
  function applySeek() {
    if (pendingSeek === null || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.min(pendingSeek, audio.duration);
    pendingSeek = null;
  }
  function seek(at) {
    if (!asset || !Number.isFinite(at)) return;
    pendingSeek = Math.max(0, Math.min(at, asset.duration));
    if (!loading && audio.readyState >= 1) applySeek();
    render();
    save();
  }
  function showSession() {
    audio.hidden = !hasSession;
    get('commuteNavigation').hidden = !hasSession;
    estimate();
  }
  function play(transition = false) {
    if (!hasSession || !asset) return;
    const expectedSource = asset;
    audio.play().catch(error => {
      if (error.name === 'AbortError' || asset !== expectedSource) return;
      status.textContent = transition
        ? '次の章を自動再生できませんでした。画面を開き「続きから再開」を押してください。'
        : '再生を開始できませんでした。「続きから再開」を押してください。';
    });
  }
  function load(index, position, autoplay = false, transition = false) {
    sourceIndex = index;
    asset = plan.sources[index];
    if (!asset) {
      audio.removeAttribute('src');
      audio.load();
      return;
    }
    pendingSeek = position;
    // Keep cached MP3 bytes in sync with new cue tables on static hosts.
    const revision = location.protocol !== 'file:' && /^[a-f0-9]{64}$/.test(asset.version) ? '?v=' + asset.version : '';
    const src = 'commute-media/' + asset.file + revision;
    if (audio.getAttribute('src') !== src) {
      loading = true;
      audio.src = src;
    } else if (!loading && audio.readyState >= 1) {
      applySeek();
    }
    audio.loop = plan.sources.length === 1 && activeRepeat === 'repeat';
    const range = plan.selected.length ? plan.selected.length + '章' : '全語';
    get('commuteActive').textContent = '再生範囲：' + range +
      (activeOrder === 'random' ? '（ランダム順）' : '') +
      (activeRepeat === 'repeat' ? ' · 繰り返し' : ' · 1周');
    applyRate();
    render();
    save();
    if (autoplay) play(transition);
  }
  function move(delta) {
    if (!asset || !hasSession) return;
    const target = termIndex + delta;
    if (target >= 0 && target < asset.cues.length) {
      seek(asset.cues[target].start);
    } else {
      const adjacent = plan.sources[sourceIndex + delta];
      if (!adjacent) return;
      const start = delta > 0 ? 0 : adjacent.cues.at(-1).start;
      load(sourceIndex + delta, start, !audio.paused, true);
    }
  }
  get('commuteStart').addEventListener('click', () => {
    const nextPlan = makePlan(selection(), order.value);
    if (!nextPlan.sources.length) return;
    plan = nextPlan;
    activeOrder = order.value;
    activeRepeat = repeat.value;
    hasSession = true;
    status.textContent = '';
    showSession();
    load(0, 0, true);
  });
  get('commuteContinue').addEventListener('click', () => play());
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  for (const input of [...checks, order, repeat]) input.addEventListener('change', preferencesChanged);
  for (const [id, checked] of [['commuteSelectAll', true], ['commuteClearAll', false]]) {
    get(id).addEventListener('click', () => {
      checks.forEach(input => {input.checked = checked;});
      preferencesChanged();
    });
  }
  rate.addEventListener('change', () => {applyRate(); render(); preferencesChanged(); save();});
  audio.addEventListener('loadedmetadata', () => {loading = false; applySeek(); applyRate(); render();});
  audio.addEventListener('playing', () => {status.textContent = ''; render();});
  audio.addEventListener('pause', () => {if (!loading && !audio.ended) save(); render();});
  audio.addEventListener('seeked', () => {if (!loading && !audio.ended) save(); render();});
  audio.addEventListener('timeupdate', () => {
    if (!loading && !audio.paused && Date.now() - lastSave >= 1000) save();
    render();
  });
  audio.addEventListener('ended', () => {
    if (loading || !audio.ended) return;
    if (sourceIndex + 1 < plan.sources.length) {
      load(sourceIndex + 1, 0, true, true);
    } else if (activeRepeat === 'repeat') {
      plan = makePlan(plan.selected, activeOrder);
      load(0, 0, true, true);
    } else {
      load(0, 0);
      status.textContent = COMMUTE_PLAN.totals(plan.sources).words + '語の再生が終わりました。';
    }
  });
  audio.addEventListener('error', () => {status.textContent = '音声ファイルを読み込めませんでした。';});
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => {if (document.hidden) save();});
  if (session) {
    const handlers = {
      play: () => play(),
      pause: () => audio.pause(),
      previoustrack: () => move(-1),
      nexttrack: () => move(1),
      seekto: ({seekTime}) => seek(seekTime),
      seekbackward: ({seekOffset = 10}) => seek(time() - seekOffset),
      seekforward: ({seekOffset = 10}) => seek(time() + seekOffset)
    };
    for (const [action, handler] of Object.entries(handlers)) {
      try {session.setActionHandler(action, handler);} catch { /* Individual actions vary by browser. */ }
    }
  }
  showSession();
  if (hasSession) load(sourceIndex, restored.position);
  else {
    get('commuteTerm').textContent = '学習範囲を選んで再生';
    get('commutePosition').textContent = '';
  }
  if (scopeRemoved) status.textContent = '前回の学習範囲が見つからないため、収録範囲の先頭から再開できます。';
  else if (restored.note) status.textContent = restored.note;
})();
