(() => {
  const get = id => document.getElementById(id);
  const terms = new Map(TERMS.map(term => [term.id, term]));
  const palette = {'AIモデル': '#a5bfff', 'AI開発': '#c1b0fa', 'AIエージェント': '#ffcca2', 'AI連携': '#79ddcf', 'AIの基礎': '#e6c3e9'};
  const pairs = new Set();
  TERM_RELATIONS.forEach(edge => {
    const key = [edge.a, edge.b].sort().join('/');
    if (!terms.has(edge.a) || !terms.has(edge.b) || edge.a === edge.b || pairs.has(key) ||
        !edge.basis.every(id => terms.has(id))) throw new Error('関連データの用語ID・重複を確認してください。');
    pairs.add(key);
  });
  let selected = new URLSearchParams(location.search).get('term');
  if (!terms.has(selected)) selected = 'term-13';
  let mode = 'local', scale = 1, offsetX = 0, offsetY = 0, worldWidth = 1, worldHeight = 1;
  let activeEdge = null, edgeElements = [], dragging = null, selectedPosition = null;
  const viewport = get('mapViewport');
  for (const term of TERMS) {
    const option = document.createElement('option'); option.value = term.id; option.textContent = term.name;
    get('mapSelect').append(option);
  }
  for (const [name, color] of Object.entries(palette)) {
    const label = document.createElement('span'); label.textContent = '● ' + name;
    label.style.color = color; get('mapLegend').append(label);
  }
  function size() {
    const rect = viewport.getBoundingClientRect();
    return {width: Math.max(280, rect.width), height: Math.max(300, rect.height)};
  }
  function transform() {
    const box = size();
    // 図全体が画面の外へ消えてしまう移動を制限します。
    offsetX = Math.max(70 - worldWidth * scale, Math.min(box.width - 70, offsetX));
    offsetY = Math.max(70 - worldHeight * scale, Math.min(box.height - 70, offsetY));
    get('mapWorld').style.transform = 'translate(' + offsetX + 'px,' + offsetY + 'px) scale(' + scale + ')';
    get('mapZoomLevel').textContent = Math.round(scale * 100) + '%';
  }
  function fit() {
    const box = size();
    scale = Math.min(1, (box.width - 24) / worldWidth, (box.height - 24) / worldHeight);
    offsetX = (box.width - worldWidth * scale) / 2;
    offsetY = (box.height - worldHeight * scale) / 2;
    transform();
  }
  function zoom(factor, x = size().width / 2, y = size().height / 2) {
    const next = Math.max(0.1, Math.min(2.5, scale * factor));
    offsetX = x - (x - offsetX) * next / scale; offsetY = y - (y - offsetY) * next / scale;
    scale = next; transform();
  }
  function highlight() {
    edgeElements.forEach(({edge, visible}) => visible.setAttribute('class', 'map-edge-line' +
      (edge.a === selected || edge.b === selected ? ' related' : '') + (activeEdge === edge ? ' active' : '')));
  }
  function showEdge(edge, focus = true) {
    activeEdge = edge; highlight(); get('mapEdgeInfo').hidden = false;
    get('mapEdgeTitle').textContent = terms.get(edge.a).name + ' ↔ ' + terms.get(edge.b).name;
    get('mapEdgeDescription').textContent = '【' + edge.kind + '】' + edge.label;
    get('mapEdgeTerms').replaceChildren();
    for (const id of [edge.a, edge.b]) {
      const link = document.createElement('a'); link.className = 'back-link';
      link.href = 'detail.html?term=' + encodeURIComponent(id); link.textContent = terms.get(id).name + 'の詳細 →';
      get('mapEdgeTerms').append(link);
    }
    get('mapStatus').textContent = get('mapEdgeTitle').textContent + 'の関係：' + edge.label;
    if (focus) get('mapEdgeTitle').focus();
  }
  function render(focus = false, keepView = false) {
    const term = terms.get(selected);
    const around = TERM_RELATIONS.filter(edge => edge.a === selected || edge.b === selected);
    const displayedEdges = mode === 'overview' ? TERM_RELATIONS : around;
    const ids = mode === 'overview' ? new Set(terms.keys()) : new Set([selected, ...around.map(e => e.a === selected ? e.b : e.a)]);
    const positions = new Map();
    get('mapNodes').replaceChildren(); get('mapLines').replaceChildren(); get('mapRelations').replaceChildren();
    get('mapEdgeInfo').hidden = true; activeEdge = null; edgeElements = [];
    if (mode === 'overview') {
      worldWidth = 2160; worldHeight = 1240;
      // カテゴリ内は固定の格子。追加時もノードを重ねず、毎回同じ位置に表示します。
      const clusters = {'AIモデル': [70, 60], 'AI連携': [790, 60], 'AIエージェント': [1510, 60], 'AI開発': [1510, 700], 'AIの基礎': [70, 700]};
      for (const [category, [x, y]] of Object.entries(clusters)) {
        const heading = document.createElement('div'); heading.className = 'map-cluster'; heading.textContent = category;
        heading.style.left = x + 'px'; heading.style.top = y + 'px'; heading.style.color = palette[category]; get('mapNodes').append(heading);
        TERMS.filter(t => t.category === category).forEach((t, index) => {
          positions.set(t.id, {x: x + 100 + index % 3 * 220, y: y + 100 + Math.floor(index / 3) * 130, width: 190});
        });
      }
    } else {
      const columns = size().width < 620 ? 2 : 3;
      worldWidth = columns === 2 ? Math.max(280, size().width - 24) : Math.max(660, size().width - 24);
      worldHeight = Math.max(340, 240 + Math.ceil(around.length / columns) * 150);
      positions.set(selected, {x: worldWidth / 2, y: 60, width: Math.min(210, worldWidth - 40)});
      around.forEach((edge, index) => positions.set(edge.a === selected ? edge.b : edge.a, {
        x: worldWidth * (index % columns + 0.5) / columns,
        y: 225 + Math.floor(index / columns) * 150,
        width: Math.min(190, worldWidth / columns - 22)
      }));
    }
    selectedPosition = positions.get(selected);
    viewport.style.height = mode === 'local' && size().width < 620 ? Math.max(520, worldHeight + 24) + 'px' : '';
    get('mapWorld').style.width = worldWidth + 'px'; get('mapWorld').style.height = worldHeight + 'px';
    get('mapLines').setAttribute('viewBox', '0 0 ' + worldWidth + ' ' + worldHeight);
    // 線の端はノードの外周。見える線とタップ判定の太い透明な線を分けます。
    displayedEdges.forEach((edge, index) => {
      const a = positions.get(edge.a), b = positions.get(edge.b);
      const dx = b.x - a.x, dy = b.y - a.y;
      const trim = point => Math.min((point.width / 2 + 4) / (Math.abs(dx) || 1), 58 / (Math.abs(dy) || 1));
      const ta = trim(a), tb = trim(b);
      const sx = a.x + dx * ta, sy = a.y + dy * ta, ex = b.x - dx * tb, ey = b.y - dy * tb;
      const bend = mode === 'overview' ? (index % 7 - 3) * 24 : 0;
      const length = Math.hypot(dx, dy) || 1;
      const cx = (sx + ex) / 2 - dy / length * bend, cy = (sy + ey) / 2 + dx / length * bend;
      const pathData = 'M ' + sx + ' ' + sy + ' Q ' + cx + ' ' + cy + ' ' + ex + ' ' + ey;
      const visible = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      visible.setAttribute('d', pathData); visible.setAttribute('aria-hidden', 'true');
      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hit.setAttribute('d', pathData); hit.setAttribute('class', 'map-edge-hit');
      hit.setAttribute('tabindex', '0'); hit.setAttribute('role', 'button'); hit.dataset.edge = String(index);
      hit.setAttribute('aria-label', terms.get(edge.a).name + 'と' + terms.get(edge.b).name + 'の関係を表示');
      hit.addEventListener('click', () => showEdge(edge));
      hit.addEventListener('keydown', event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); showEdge(edge);}});
      get('mapLines').append(visible, hit); edgeElements.push({edge, visible});
    });
    for (const id of ids) {
      const item = terms.get(id), position = positions.get(id);
      const node = document.createElement('button'); node.type = 'button'; node.className = 'map-node' + (id === selected ? ' map-center' : '');
      node.style.left = position.x + 'px'; node.style.top = position.y + 'px'; node.style.width = position.width + 'px';
      node.style.setProperty('--node-color', palette[item.category]); node.dataset.term = id;
      const name = document.createElement('span'); name.textContent = item.name;
      const category = document.createElement('small'); category.textContent = item.category;
      node.append(name, category); node.setAttribute('aria-pressed', String(id === selected));
      node.addEventListener('click', () => {selected = id; render(true, mode === 'overview');}); get('mapNodes').append(node);
    }
    around.forEach(edge => {
      const other = terms.get(edge.a === selected ? edge.b : edge.a);
      const li = document.createElement('li');
      const link = document.createElement('button'); link.type = 'button'; link.className = 'map-relation-link'; link.textContent = other.name + 'との関係を読む →';
      link.addEventListener('click', () => showEdge(edge)); li.append(link); get('mapRelations').append(li);
    });
    if (!around.length) {
      const li = document.createElement('li'); li.textContent = '説明できる関係がまだ登録されていない用語です。'; get('mapRelations').append(li);
    }
    get('mapSelect').value = selected; get('mapCategory').textContent = term.category; get('mapTermName').textContent = term.name;
    get('mapEnglish').textContent = term.english; get('mapDescription').textContent = term.description;
    get('mapDetail').href = 'detail.html?term=' + encodeURIComponent(selected);
    get('mapOverview').setAttribute('aria-pressed', String(mode === 'overview'));
    get('mapLocal').setAttribute('aria-pressed', String(mode === 'local'));
    get('mapCount').textContent = ids.size + '語・' + displayedEdges.length + '本の関係線';
    get('mapStatus').textContent = term.name + 'を選択。' + (mode === 'overview' ? '全体マップ' : '周辺マップ') + 'を表示しました。';
    highlight();
    if (keepView) transform(); else fit();
    if (focus) get('mapTermName').focus({preventScroll: true});
  }
  get('mapSelect').addEventListener('change', () => {selected = get('mapSelect').value; render();});
  get('mapReset').addEventListener('click', () => {selected = 'term-13'; mode = 'local'; render(true);});
  get('mapOverview').addEventListener('click', () => {mode = 'overview'; render();});
  get('mapLocal').addEventListener('click', () => {mode = 'local'; render();});
  get('mapZoomIn').addEventListener('click', () => zoom(1.25)); get('mapZoomOut').addEventListener('click', () => zoom(0.8));
  get('mapFit').addEventListener('click', fit);
  get('mapFocus').addEventListener('click', () => {
    scale = 1; offsetX = size().width / 2 - selectedPosition.x; offsetY = size().height / 2 - selectedPosition.y; transform();
  });
  viewport.addEventListener('wheel', event => {event.preventDefault(); const rect = viewport.getBoundingClientRect(); zoom(event.deltaY < 0 ? 1.12 : 1 / 1.12, event.clientX - rect.left, event.clientY - rect.top);}, {passive: false});
  viewport.addEventListener('pointerdown', event => {
    if (event.target.closest('button,[data-edge]') || (event.pointerType === 'mouse' && event.button !== 0)) return;
    dragging = {id: event.pointerId, x: event.clientX, y: event.clientY, ox: offsetX, oy: offsetY}; viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener('pointermove', event => {
    if (!dragging || dragging.id !== event.pointerId) return;
    offsetX = dragging.ox + event.clientX - dragging.x; offsetY = dragging.oy + event.clientY - dragging.y; transform();
  });
  const endDrag = () => {dragging = null;};
  viewport.addEventListener('pointerup', endDrag); viewport.addEventListener('pointercancel', endDrag); viewport.addEventListener('lostpointercapture', endDrag);
  viewport.addEventListener('keydown', event => {
    if (event.target !== viewport) return;
    const moves = {ArrowLeft: [50, 0], ArrowRight: [-50, 0], ArrowUp: [0, 50], ArrowDown: [0, -50]};
    if (moves[event.key]) {event.preventDefault(); offsetX += moves[event.key][0]; offsetY += moves[event.key][1]; transform();}
    else if (event.key === '+' || event.key === '=') {event.preventDefault(); zoom(1.25);}
    else if (event.key === '-') {event.preventDefault(); zoom(0.8);}
    else if (event.key === 'Home') {event.preventDefault(); fit();}
  });
  let lastWidth = size().width;
  const resize = () => {if (Math.abs(size().width - lastWidth) > 2) {lastWidth = size().width; render();}};
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(viewport);
  else window.addEventListener('resize', resize);
  render();
})();
