// 用語本文はTERMSを共用。再生の状態はこの画面内だけで管理します。
(() => {
  const get = id => document.getElementById(id);
  const supported = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
  const synth = supported ? window.speechSynthesis : null;
  const examplesSetting = get('audioExamples');
  try {examplesSetting.value = LEARNING_STORAGE.read(MATERIAL.id, 'examples') === 'on' ? 'on' : 'off';}
  catch {examplesSetting.value = 'off';}
  let voices = [], queue = [], index = 0, steps = [], step = 0, voiceChosen = false;
  let state = 'idle', generation = 0, utterance = null, timer = null;
  let waitRemaining = null, waitDeadline = 0;
  let channel = null;
  const playing = () => state === 'playing';
  const current = () => queue[index];
  const quiz = () => get('audioMode').value === 'quiz';
  const isJapanese = voice => /^ja(?:[-_]|$)/i.test(voice.lang);

  for (const category of new Set(TERMS.map(term => term.category))) {
    const option = document.createElement('option'); option.value = category; option.textContent = category;
    get('audioCategory').append(option);
  }
  function clearTimer() {if (timer !== null) clearTimeout(timer); timer = null;}
  function cancelActive() {
    // cancel()が古いend/errorを発火しても、次の読み上げへ進ませない世代番号。
    generation++; clearTimer(); utterance = null;
    if (synth) {try {synth.cancel();} catch { /* 終了処理を続けます。 */ }}
  }
  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function sentences(text) {
    // 長い発話を避け、将来別の学習データへ差し替えても文ごとに再開できます。
    return (text.match(/[^。！？!?]+[。！？!?]?/gu) || [text]).flatMap(sentence => {
      const chars = Array.from(sentence.trim()), parts = [];
      for (let i = 0; i < chars.length; i += 80) parts.push(chars.slice(i, i + 80).join(''));
      return parts;
    }).filter(Boolean);
  }
  function buildSteps() {
    const term = current(); if (!term) return [];
    const speech = (text, label) => ({kind: 'speech', text, label});
    const explanation = sentences(termDefinition(term) ?? '').map(text => speech(text, '解説'));
    const result = quiz() ? [
      speech('第' + (index + 1) + '問。説明を聞いて、用語を考えてください。', '出題'), ...explanation,
      speech(get('audioWait').value + '秒、考えてみましょう。', '考える準備'),
      {kind: 'wait', ms: Number(get('audioWait').value) * 1000, label: '考える時間'},
      {...speech('正解は、' + term.name + 'です。', '正解'), reveal: true}
    ] : [speech('第' + (index + 1) + '語。' + term.name + '。', '用語'), ...explanation];
    if (examplesSetting.value === 'on' && term.example) {
      result.push(...sentences('使用例。' + term.example).map(text => speech(text, '使用例')));
    }
    if (index === queue.length - 1) result.push(speech('今回の' + queue.length + '語の学習は終わりです。', '終了の案内'));
    return result;
  }
  function paint(message) {
    const term = current(), stage = steps[step];
    const revealed = !quiz() || steps.slice(0, step + 1).some(item => item.reveal);
    get('audioPosition').textContent = queue.length ? (index + 1) + ' / ' + queue.length + (quiz() ? ' 問' : ' 語') : '0 語';
    get('audioPhase').textContent = playing() || state === 'paused' ? (stage?.label || '準備') : '';
    get('audioTerm').textContent = term ? (revealed ? term.name : 'この説明の用語は？') : '対象の用語がありません';
    get('audioDetail').hidden = !term || !revealed;
    if (term) get('audioDetail').href = materialHref('detail.html', term.id);
    get('audioPlay').textContent = state === 'completed' ? '↻ もう一度再生' : '▶ 再生';
    const canSpeak = supported && voices.length > 0 && queue.length > 0;
    get('audioPlay').disabled = !canSpeak || playing() || state === 'paused';
    get('audioPause').disabled = !playing(); get('audioResume').disabled = !canSpeak || state !== 'paused';
    get('audioStop').disabled = !supported || state === 'idle';
    get('audioPrev').disabled = !supported || !queue.length || index === 0;
    get('audioNext').disabled = !supported || index >= queue.length - 1;
    get('audioWait').disabled = !quiz();
    if (message) get('audioStatus').textContent = message;
  }
  function resetQueue(message = '設定を確認して「再生」を押してください。') {
    cancelActive(); state = 'idle'; index = 0; step = 0; waitRemaining = null;
    const pool = TERMS.filter(term => get('audioCategory').value === 'all' || term.category === get('audioCategory').value);
    const ordered = get('audioOrder').value === 'random' ? shuffle(pool) : [...pool];
    queue = get('audioCount').value === 'all' ? ordered : ordered.slice(0, Number(get('audioCount').value));
    steps = buildSteps(); get('audioTranscript').textContent = '再生すると、読み上げている内容がここに表示されます。';
    get('audioQueueInfo').textContent = '対象 ' + pool.length + '語から、今回は' + queue.length + '語。同じ回では重複しません。' +
      (get('audioCount').value !== 'all' && pool.length < Number(get('audioCount').value) ? 'カテゴリ内の語数が少ないため、ある用語だけを再生します。' : '');
    paint(message);
  }
  function loadVoices() {
    if (!supported) return;
    const previous = get('audioVoice').value;
    // OS・ブラウザが端末内音声と報告したものだけを使用。リモート音声へフォールバックしません。
    try {voices = synth.getVoices().filter(voice => voice.localService === true).sort((a, b) => Number(isJapanese(b)) - Number(isJapanese(a)));}
    catch {voices = [];}
    get('audioVoice').replaceChildren();
    voices.forEach(voice => {
      const option = document.createElement('option'); option.value = voice.voiceURI;
      option.textContent = voice.name + '（' + voice.lang + '・端末内）'; get('audioVoice').append(option);
    });
    if (!voices.length) {
      const option = document.createElement('option'); option.value = ''; option.textContent = '端末内音声がまだ見つかりません'; get('audioVoice').append(option);
      get('audioVoiceNote').textContent = '端末内音声が読み込まれるのを待つか「音声一覧を再確認」を押してください。日本語音声の有無は端末の設定でも確認できます。';
      if (playing()) pause('端末内音声を確認できないため一時停止しました。');
    } else {
      get('audioVoice').value = voiceChosen && voices.some(voice => voice.voiceURI === previous) ? previous : voices[0].voiceURI;
      get('audioVoiceNote').textContent = voices.some(isJapanese) ? '日本語の端末内音声を優先しています。声・速度は次の文から反映します。' : '日本語の端末内音声が見つかりません。別言語の音声では日本語が正しく読まれない場合があります。';
    }
    paint();
  }
  function fail(message) {
    cancelActive(); state = 'error'; paint(message + ' 音量・音声を確認し、「再生」でこの文からやり直せます。');
  }
  function finishTerm() {
    if (index >= queue.length - 1) {state = 'completed'; paint('今回の学習が終わりました。「もう一度再生」で新しく始められます。'); return;}
    index++; step = 0; waitRemaining = null; steps = buildSteps();
    if (get('audioContinuous').checked) run();
    else {state = 'ready'; get('audioTranscript').textContent = '続きは「再生」を押してください。'; paint('1語の学習が終わりました。次の用語を準備しました。');}
  }
  function run() {
    if (!playing()) return;
    if (document.hidden) {pause('画面が隠れたため一時停止しました。戻って「再開」を押してください。'); return;}
    const stage = steps[step];
    if (!stage) {finishTerm(); return;}
    paint('再生中です。');
    const token = generation;
    if (stage.kind === 'wait') {
      if (waitRemaining === null) waitRemaining = stage.ms;
      get('audioTranscript').textContent = '考える時間。正解まで約' + Math.ceil(waitRemaining / 1000) + '秒です。';
      get('audioStatus').textContent = '頭の中で答えを考えてみましょう。';
      waitDeadline = performance.now() + waitRemaining;
      timer = setTimeout(() => {
        if (token !== generation || !playing()) return;
        timer = null; waitRemaining = null; step++; run();
      }, waitRemaining);
      return;
    }
    const voice = voices.find(item => item.voiceURI === get('audioVoice').value) || voices[0];
    if (!voice) {fail('端末内の音声がありません。'); return;}
    const speech = new window.SpeechSynthesisUtterance(stage.text);
    speech.voice = voice; speech.lang = isJapanese(voice) ? voice.lang : 'ja-JP'; speech.rate = Number(get('audioRate').value);
    utterance = speech; get('audioTranscript').textContent = stage.text;
    const valid = () => generation === token && playing() && utterance === speech;
    speech.onstart = () => {
      if (!valid()) return;
      clearTimer();
      timer = setTimeout(() => {if (valid()) fail('読み上げが完了しませんでした。');}, Math.max(30000, stage.text.length * 1500 / speech.rate));
    };
    speech.onend = () => {if (!valid()) return; clearTimer(); utterance = null; step++; run();};
    speech.onerror = () => {if (valid()) fail('読み上げを続けられませんでした。');};
    timer = setTimeout(() => {if (valid()) fail('音声が開始されませんでした。');}, 12000);
    try {if (synth.paused) synth.resume(); synth.speak(speech);} catch {fail('この音声では再生できませんでした。');}
  }
  function announcePlay() {try {channel?.postMessage('playing');} catch { /* 同一オリジンの他タブへの通知は任意。 */ }}
  function play() {
    if (playing() || state === 'paused' || !supported || !voices.length || !queue.length) return;
    if (state === 'completed') resetQueue();
    cancelActive(); state = 'playing'; announcePlay(); run();
  }
  function pause(message = '一時停止しました。「再開」で中断した文の先頭から続けます。') {
    if (!playing()) return;
    if (steps[step]?.kind === 'wait' && waitRemaining !== null) waitRemaining = Math.max(0, waitDeadline - performance.now());
    // Android等のpause/resume差を避け、文を覚えてcancelし、再開時に同じ文を読み直します。
    cancelActive(); state = 'paused'; paint(message);
  }
  function resume() {
    if (state !== 'paused' || !supported || !voices.length) return;
    cancelActive(); state = 'playing'; announcePlay(); run();
  }
  function stop() {
    cancelActive(); state = 'idle'; index = 0; step = 0; waitRemaining = null; steps = buildSteps();
    get('audioTranscript').textContent = '停止しました。再生すると今回の先頭から始まります。'; paint('停止しました。');
  }
  function move(delta) {
    const target = index + delta;
    if (target < 0 || target >= queue.length) return;
    const before = state; cancelActive(); index = target; step = 0; waitRemaining = null; steps = buildSteps();
    state = before === 'playing' ? 'playing' : before === 'paused' ? 'paused' : 'ready';
    get('audioTranscript').textContent = 'この用語の先頭を準備しました。'; paint('用語を切り替えました。');
    if (playing()) run();
  }
  get('audioPlay').addEventListener('click', play); get('audioPause').addEventListener('click', () => pause());
  get('audioResume').addEventListener('click', resume); get('audioStop').addEventListener('click', stop);
  get('audioPrev').addEventListener('click', () => move(-1)); get('audioNext').addEventListener('click', () => move(1));
  for (const id of ['audioMode', 'audioCategory', 'audioCount', 'audioOrder', 'audioWait']) {
    get(id).addEventListener('change', () => resetQueue('設定を変更しました。「再生」で先頭から始めます。'));
  }
  examplesSetting.addEventListener('change', () => {
    let message = '設定を変更しました。「再生」で先頭から始めます。';
    try {LEARNING_STORAGE.write(MATERIAL.id, 'examples', examplesSetting.value);}
    catch {message = '使用例の設定を保存できませんでした。この画面では変更が適用されます。「再生」で先頭から始めます。';}
    resetQueue(message);
  });
  get('audioReloadVoices').addEventListener('click', loadVoices);
  get('audioVoice').addEventListener('change', () => {voiceChosen = true;});
  document.addEventListener('visibilitychange', () => {if (document.hidden) pause('画面が隠れたため一時停止しました。戻って「再開」を押してください。');});
  window.addEventListener('pagehide', () => {if (playing()) pause('画面を離れたため一時停止しました。'); else cancelActive();});
  if (supported) {
    synth.addEventListener('voiceschanged', loadVoices);
    try {channel = new BroadcastChannel('ai-dictionary-audio'); channel.onmessage = event => {if (event.data === 'playing') pause('別のタブで再生を始めたため、こちらは一時停止しました。');};} catch { /* 非対応環境では単一ページ内の制御のみ。 */ }
  } else {
    get('audioUnsupported').hidden = false; get('audioReloadVoices').disabled = true;
    get('audioVoiceNote').textContent = 'この環境では音声機能を利用できません。';
  }
  resetQueue(); loadVoices();
})();
