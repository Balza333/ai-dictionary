// 教材選択を導入するまでは、従来の画面をこの教材に接続します。
const MATERIAL = AI_DICTIONARY_MATERIAL;
const TERMS = MATERIAL.terms;

function getMaterialTerm(materialId, termId) {
  if (materialId !== MATERIAL.id) return undefined;
  return MATERIAL.terms.find(term => term.id === termId);
}
