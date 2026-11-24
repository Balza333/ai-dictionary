(() => {
  const get = id => document.getElementById(id);
  const term = getMaterialTerm(MATERIAL_PARAMS.get('material') ?? MATERIAL.id, MATERIAL_PARAMS.get('term'));
  if (!term) {
    get('detailName').textContent = '用語が見つかりません';
    get('detailDescription').textContent = '辞典に戻って用語を選んでください。';
    get('detailModes').hidden = true;
    return;
  }
  document.title = term.name + ' | ' + MATERIAL.title;
  get('detailName').textContent = term.name;
  get('detailDescription').textContent = termDefinition(term) ?? '';
  if (term.syllabusNote) {
    const note = document.createElement('p');
    note.className = 'map-note';
    note.textContent = term.syllabusNote;
    get('detailDescription').after(note);
  }
  const translation = get('detailTranslation');
  translation.hidden = !term.translation;
  translation.textContent = term.translation ?? '';
  const chapter = MATERIAL.chapters.find(item => item.id === term.chapterId);
  get('detailCategory').textContent = term.category;
  if (chapter && chapter.title !== term.category) get('detailChapter').textContent = chapter.title;
  const rich = get('detailRich');

  function section(title, content) {
    const box = document.createElement('section');
    const heading = document.createElement('h2');
    heading.textContent = title;
    box.append(heading, content);
    rich.append(box);
  }
  function paragraph(title, value) {
    if (!value) return;
    const p = document.createElement('p');
    p.textContent = value;
    section(title, p);
  }
  function termLink(related) {
    const link = document.createElement('a');
    link.href = materialHref('detail.html', related.id);
    link.textContent = related.name;
    return link;
  }
  const english = get('detailEnglish');
  english.textContent = term.english ?? '';
  english.hidden = !term.english;
  paragraph('読み方', term.reading);
  if (term.abbreviation && term.abbreviation !== term.name) paragraph('略称', term.abbreviation);
  if (term.wordParts?.length) {
    const list = document.createElement('dl');
    list.className = 'word-parts';
    for (const [word, meaning] of term.wordParts) {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = word;
      dd.textContent = meaning;
      list.append(dt, dd);
    }
    section('英単語の意味', list);
  }
  paragraph('目的', term.purpose);
  paragraph('仕組み', term.mechanism);
  paragraph('具体例', term.example);
  const related = document.createElement('ul');
  for (const edge of TERM_RELATIONS) {
    const id = edge.a === term.id ? edge.b : edge.b === term.id ? edge.a : null;
    const entry = id && getMaterialTerm(MATERIAL.id, id);
    if (!entry) continue;
    const item = document.createElement('li');
    item.append(termLink(entry), document.createTextNode(' — ' + edge.label));
    related.append(item);
  }
  if (related.childElementCount) {
    section('関連用語', related);
    get('detailMap').hidden = false;
    get('detailMap').href = materialHref('map.html', term.id);
  }
  const comparisons = document.createElement('ul');
  for (const comparison of term.comparisons ?? []) {
    const entry = getMaterialTerm(MATERIAL.id, comparison.termId);
    if (!entry) continue;
    const item = document.createElement('li');
    item.append(termLink(entry), document.createTextNode(' — ' + comparison.text));
    comparisons.append(item);
  }
  if (comparisons.childElementCount) section('混同しやすい用語', comparisons);
  if (term.diagram?.src) {
    const image = document.createElement('img');
    image.src = term.diagram.src;
    image.alt = term.diagram.alt ?? '';
    section('図解', image);
  }
  const sources = term.sources ?? MATERIAL.sources ?? [];
  const updatedAt = term.updatedAt ?? MATERIAL.updatedAt;
  if (sources.length || updatedAt) {
    const notes = document.createElement('div');
    for (const {label, url} of sources) {
      const p = document.createElement('p');
      const link = document.createElement('a');
      link.href = url;
      link.textContent = label;
      p.append(link);
      notes.append(p);
    }
    if (updatedAt) {
      const p = document.createElement('p');
      p.textContent = '教材更新日 ' + updatedAt;
      notes.append(p);
    }
    section('出典と更新情報', notes);
  }

  const buttons = [...get('detailModes').querySelectorAll('button')];
  function showMode(mode) {
    rich.hidden = mode === 'quick';
    english.hidden = mode === 'quick' || !term.english;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  }
  let saved = null;
  try {saved = LEARNING_STORAGE.read(MATERIAL.id, 'detail-mode');} catch { /* Use the default. */ }
  showMode(saved === 'quick' || saved === 'full' ? saved : MATERIAL.defaultDetailMode ?? 'quick');
  for (const button of buttons) button.addEventListener('click', () => {
    showMode(button.dataset.mode);
    try {LEARNING_STORAGE.write(MATERIAL.id, 'detail-mode', button.dataset.mode);} catch { /* Keep the selection on this page. */ }
  });
})();
