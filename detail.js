(() => {
  const get = id => document.getElementById(id);
  const id = new URLSearchParams(location.search).get('term');
  const term = TERMS.find(item => item.id === id);
  if (!term) {
    get('detailName').textContent = '用語が見つかりません';
    get('detailDescription').textContent = '辞典に戻って用語を選んでください。';
    get('detailExampleBox').hidden = true;
    return;
  }
  document.title = term.name + ' | AI技術辞典';
  get('detailName').textContent = term.name; get('detailEnglish').textContent = term.english;
  get('detailCategory').textContent = term.category; get('detailDescription').textContent = term.description;
  get('detailExample').textContent = term.example;
  if (TERM_RELATIONS.some(edge => edge.a === id || edge.b === id)) {
    get('detailMap').hidden = false; get('detailMap').href = 'map.html?term=' + encodeURIComponent(id);
  }
})();
