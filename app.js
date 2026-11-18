const STORAGE_KEY = 'ai-dictionary-progress-v1';
const categories = ['すべて', 'AIモデル', 'AI開発', 'AIエージェント', 'AI連携', 'AIの基礎'];
let state = {favorites: [], learned: []};
let category = 'すべて';
let view = 'all';
const $ = id => document.getElementById(id);
const validIds = new Set(TERMS.map(term => term.id));
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved && typeof saved === 'object') {
    for (const key of ['favorites', 'learned']) {
      state[key] = Array.isArray(saved[key]) ? [...new Set(saved[key].filter(id => validIds.has(id)))] : [];
    }
  }
} catch { $('storageWarning').hidden = false; }
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { $('storageWarning').hidden = false; }
}
const normalize = text => text.normalize('NFKC').toLocaleLowerCase('ja');
function button(text, className) {
  const el = document.createElement('button'); el.type = 'button'; el.textContent = text; el.className = className; return el;
}
function render() {
  const query = normalize($('search').value.trim());
  const words = query.split(/\s+/).filter(Boolean);
  const results = TERMS.filter(term => (category === 'すべて' || term.category === category)
    && (view === 'all' || state[view].includes(term.id))
    && words.every(word => normalize([term.name, term.english, term.description, term.example, term.category].join(' ')).includes(word)));
  $('cards').replaceChildren();
  results.forEach(term => {
    const learned = state.learned.includes(term.id);
    const favorite = state.favorites.includes(term.id);
    const article = document.createElement('article'); article.className = 'card' + (learned ? ' is-learned' : '');
    article.id = term.id;
    const top = document.createElement('div'); top.className = 'card-top';
    const badge = document.createElement('span'); badge.className = 'badge cat-' + categories.indexOf(term.category); badge.textContent = term.category;
    const star = button(favorite ? '★' : '☆', 'star'); star.setAttribute('aria-label', term.name + 'をお気に入り' + (favorite ? 'から解除' : 'に登録')); star.setAttribute('aria-pressed', favorite); star.dataset.action = 'favorites'; star.dataset.id = term.id;
    top.append(badge, star);
    const title = document.createElement('h3'); title.textContent = term.name;
    const english = document.createElement('div'); english.className = 'english'; english.textContent = term.english;
    const description = document.createElement('p'); description.className = 'description'; description.textContent = term.description;
    const example = document.createElement('div'); example.className = 'example';
    const label = document.createElement('span'); label.textContent = '↳  たとえば、こんな使い方';
    const content = document.createElement('p'); content.textContent = term.example; example.append(label, content);
    const check = button((learned ? '☑ 学習済み' : '□ 学習済みにする'), 'learn'); check.setAttribute('aria-label', term.name + (learned ? 'の学習済みを解除' : 'を学習済みにする')); check.setAttribute('aria-pressed', learned); check.dataset.action = 'learned'; check.dataset.id = term.id;
    const detail = document.createElement('a'); detail.href = 'detail.html?term=' + encodeURIComponent(term.id); detail.className = 'term-detail-link'; detail.textContent = '詳しく見る →';
    article.append(top, title, english, description, example, check, detail); $('cards').append(article);
  });
  $('empty').hidden = results.length !== 0;
  $('resultCount').textContent = results.length + ' 件を表示';
  $('totalCount').textContent = TERMS.length + ' WORDS';
  $('favCount').textContent = state.favorites.length;
  $('learnedCount').textContent = state.learned.length;
  const percent = Math.round(state.learned.length / TERMS.length * 100);
  $('progressText').textContent = TERMS.length + '語のうち ' + state.learned.length + '語を学習済み' + (percent === 100 ? '。すべて学習できました！' : '。自分のペースで進めよう。');
  $('progressNumber').textContent = percent; $('progressBar').style.width = percent + '%';
  document.querySelectorAll('[data-view]').forEach(el => el.setAttribute('aria-pressed', el.dataset.view === view));
  document.querySelectorAll('[data-category]').forEach(el => el.setAttribute('aria-pressed', el.dataset.category === category));
}
categories.forEach(name => {
  const el = button(name, 'category'); el.dataset.category = name;
  el.addEventListener('click', () => { category = name; render(); }); $('categories').append(el);
});
document.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => { view = el.dataset.view; render(); }));
$('search').addEventListener('input', render);
$('cards').addEventListener('click', event => {
  const target = event.target.closest('button[data-action]'); if (!target) return;
  const {action, id} = target.dataset;
  state[action] = state[action].includes(id) ? state[action].filter(item => item !== id) : [...state[action], id];
  save(); render();
  const replacement = [...$('cards').querySelectorAll('button[data-action]')].find(el => el.dataset.action === action && el.dataset.id === id);
  if (replacement) replacement.focus();
  else document.querySelector('[data-view][aria-pressed="true"]').focus();
});
$('reset').addEventListener('click', () => { category = 'すべて'; view = 'all'; $('search').value = ''; render(); $('search').focus(); });
render();
