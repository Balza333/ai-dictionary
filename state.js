const LEARNING_STORAGE = (() => {
  const selectionKey = 'learning-material-v1';
  const key = (material, kind) => 'learning-v1:' + material + ':' + kind;
  function read(material, kind) {
    const current = localStorage.getItem(key(material, kind));
    if (current !== null) return JSON.parse(current);
    if (material !== 'ai-dictionary') return null;

    const legacy = {
      progress: 'ai-dictionary-progress-v1',
      examples: 'ai-dictionary-audio-read-examples',
      commute: 'ai-dictionary-commute-v2'
    }[kind];
    if (!legacy) return null;
    const raw = localStorage.getItem(legacy);
    let value = kind === 'examples' ? raw : JSON.parse(raw);
    if (kind === 'commute' && !value?.rate) {
      try {
        const oldRate = JSON.parse(localStorage.getItem('ai-dictionary-commute-v1'))?.rate;
        if (oldRate) value = {...value, rate: oldRate};
      } catch { /* A broken speed preference must not discard the newer position. */ }
    }
    if (value !== null) {
      try {write(material, kind, value);} catch { /* 読み出せる旧データをそのまま利用する。 */ }
    }
    return value;
  }
  function write(material, kind, value) {
    localStorage.setItem(key(material, kind), JSON.stringify(value));
  }
  function selected() {
    try {return localStorage.getItem(selectionKey);} catch {return null;}
  }
  function select(id) {
    try {localStorage.setItem(selectionKey, id);} catch { /* URLで選択を引き継ぐ。 */ }
  }
  return {read, write, selected, select};
})();
