const COMMUTE_PLAN = (() => {
  const aiVersion = 'git:35dd98b2cfa2af325906565049783efcad363541';

  function build(manifest, selected, order, previousOrder, random = Math.random) {
    const available = manifest.sources.filter(source => source.chapterIds.length === 1);
    const allIds = (manifest.chapterIds ?? [...new Set(available.map(source => source.chapterIds[0]))])
      .filter(id => available.some(source => source.chapterIds[0] === id));
    if (!allIds.length) return {selected: [], sequence: [], sources: manifest.sources.slice(0, 1)};
    const ids = allIds.filter(id => selected.includes(id));
    if (!ids.length) return {selected: [], sequence: [], sources: []};
    if (order !== 'random') {
      const combined = manifest.sources.find(source =>
        source.chapterIds.length === ids.length && source.chapterIds.every((id, index) => id === ids[index]));
      if (combined) return {selected: ids, sequence: ids, sources: [combined]};
    }
    const reusable = order === 'random' && Array.isArray(previousOrder) &&
      previousOrder.length === ids.length && ids.every(id => previousOrder.includes(id));
    const sequence = reusable ? [...previousOrder] : [...ids];
    if (order === 'random' && !reusable) {
      for (let index = sequence.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1));
        [sequence[index], sequence[other]] = [sequence[other], sequence[index]];
      }
    }
    return {selected: ids, sequence, sources: sequence.map(id =>
      available.find(source => source.chapterIds[0] === id))};
  }

  function restore(manifest, plan, saved) {
    const first = {index: 0, position: 0, note: ''};
    if (!saved || !plan.sources.length) return first;
    const validPosition = (source, time) => Number.isFinite(time) && time >= 0 && time < source.duration;
    if (!saved.sourceId) {
      // The old, unversioned position was saved against this exact published AI recording.
      const source = plan.sources[0];
      if (manifest.materialId === 'ai-dictionary' && source.id === 'all' && source.version === aiVersion &&
          validPosition(source, saved.position)) return {...first, position: saved.position};
      return {...first, note: '以前の音源の再生位置を確認できないため、学習範囲の先頭を表示しています。'};
    }
    if (saved.materialId !== manifest.materialId) return first;
    const index = plan.sources.findIndex(source => source.id === saved.sourceId && source.version === saved.version);
    if (index >= 0 && validPosition(plan.sources[index], saved.position)) return {...first, index, position: saved.position};
    const replacement = plan.sources.findIndex(source => source.cues.some(cue => cue.termId === saved.termId));
    if (replacement >= 0) {
      const cue = plan.sources[replacement].cues.find(item => item.termId === saved.termId);
      return {index: replacement, position: cue.start, note: '音源を更新したため、前回の用語の先頭から再開できます。'};
    }
    return {...first, note: '前回の用語が学習範囲にないため、先頭から再開できます。'};
  }

  function cueIndex(source, time) {
    // Media time can be rounded slightly below the requested cue boundary.
    return Math.max(0, source.cues.findLastIndex(cue => cue.start <= time + 0.001));
  }
  function totals(sources) {
    return sources.reduce((total, source) => ({
      words: total.words + source.cues.length, duration: total.duration + source.duration
    }), {words: 0, duration: 0});
  }
  return {aiVersion, build, restore, cueIndex, totals};
})();
