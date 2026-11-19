const MATERIAL_PARAMS = new URLSearchParams(location.search);
const MATERIAL_IS_HOME = Boolean(document.getElementById('materialSelect'));
const MATERIAL_BY_ID = new Map(MATERIALS.map(material => [material.id, material]));
// 教材指定のない旧詳細・マップ・音声URLは、公開当時の教材へ解決する。
const MATERIAL = MATERIAL_BY_ID.get(MATERIAL_PARAMS.get('material') ??
  (MATERIAL_IS_HOME ? LEARNING_STORAGE.selected() : null)) ?? AI_DICTIONARY_MATERIAL;
const TERMS = MATERIAL.terms;

function getMaterialTerm(materialId, termId) {
  return MATERIAL_BY_ID.get(materialId)?.terms.find(term => term.id === termId);
}

function materialHref(page, termId, materialId = MATERIAL.id) {
  const params = new URLSearchParams({material: materialId});
  if (termId) params.set('term', termId);
  return page + '?' + params;
}

function termDefinition(term) {
  return term.definition ?? term.description;
}

for (const link of document.querySelectorAll('a[data-material-page]')) {
  link.href = materialHref(link.dataset.materialPage);
}
for (const label of document.querySelectorAll('[data-material-title]')) {
  label.textContent = MATERIAL.title;
}
