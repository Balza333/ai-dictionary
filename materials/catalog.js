const IT_PASSPORT_MATERIAL = (() => {
  const categories = ['経営戦略', 'プロジェクトマネジメント', '情報セキュリティ'];
  const chapters = [
    {id: 'strategy', title: '経営戦略'},
    {id: 'project', title: 'プロジェクトマネジメント'},
    {id: 'security', title: '情報セキュリティ'}
  ];
  const groups = [
    [
      ['kpi', 'KPI', 'Key Performance Indicator', '重要業績評価指標', '目標達成に向けた進捗や成果を測定する指標。', '売上目標に向けて、月間商談件数や契約率を測定する。'],
      ['kgi', 'KGI', 'Key Goal Indicator', '重要目標達成指標', '最終目標を達成できたかを数値で判定する指標。', '年度末に年間売上が1億円に達したか確認する。'],
      ['csf', 'CSF', 'Critical Success Factors', '重要成功要因', '目標を達成するうえで特に重要な成功の条件。', '契約を伸ばすため、商談で顧客の課題を把握できることを重視する。'],
      ['swot', 'SWOT分析', 'SWOT analysis', '', '内部の強み・弱みと、外部の機会・脅威を整理して戦略を考える手法。', '技術力の高さを強み、競合の参入を脅威として整理する。'],
      ['pdca', 'PDCA', 'Plan–Do–Check–Act', '', '計画、実行、評価、改善を繰り返して仕事の質を高める方法。', '対応時間の短縮策を試し、記録を確認して次の手順を見直す。']
    ],
    [
      ['wbs', 'WBS', 'Work Breakdown Structure', '作業分解構成図', 'プロジェクトの作業範囲を、管理できる大きさに階層分解したもの。', 'サイト制作を設計・実装・テストに分け、さらに個別の作業に分解する。'],
      ['gantt', 'ガントチャート', 'Gantt chart', '', '各作業の開始・終了時期を、時間軸上の横棒で示した計画表。', '設計と実装の期間を横棒で並べ、重なる期間を確認する。'],
      ['critical-path', 'クリティカルパス', 'Critical path', '', '依存関係のある作業経路のうち、所要時間が最長で全体の最短完了時期を決める経路。', '要件確定から実装、総合テストへと続く経路に余裕がなければ、実装の遅れが完了日に響く。'],
      ['qcd', 'QCD', 'Quality, Cost, Delivery', '品質・コスト・納期', '品質、予算、納期の三つの観点から仕事や成果物を管理する考え方。', '納期を早める案について、費用の増加と品質への影響も確認する。'],
      ['stakeholder', 'ステークホルダー', 'Stakeholder', '利害関係者', 'プロジェクトに影響を与えたり、その成果から影響を受けたりする個人や組織。', '業務システムの刷新で、利用部門、発注者、運用担当者の要望を整理する。']
    ],
    [
      ['confidentiality', '機密性', 'Confidentiality', '', '許可された人やシステムだけが情報にアクセスできる性質。', '人事情報の閲覧権限を担当者だけに付与する。'],
      ['integrity', '完全性', 'Integrity', '', '情報の正確さと完全さが保たれ、不正な変更や欠落から守られている性質。', '取引記録の変更権限を制限し、記録の改変を検知する。'],
      ['availability', '可用性', 'Availability', '', '許可された利用者が必要なときに情報やシステムを利用できる性質。', '予備サーバーを用意し、本番機が故障したときにもサービスを復旧できるようにする。'],
      ['mfa', '多要素認証', 'Multi-factor authentication', '', '知識・所持・生体のうち、異なる種類の認証要素を二つ以上使って本人確認する方法。', 'パスワードに加え、登録したセキュリティキーの所持を確認する。'],
      ['phishing', 'フィッシング', 'Phishing', '', '信頼できる組織などを装い、利用者をだまして認証情報や個人情報を取得しようとする手口。', '金融機関を装うメッセージで、偽サイトへ誘導してログイン情報の入力を求める。']
    ]
  ];
  const terms = groups.flatMap((rows, index) => rows.map(([id, name, english, translation, definition, example]) => ({
    id, name, english, translation, definition, example, category: categories[index], chapterId: chapters[index].id
  })));
  const spokenNames = {
    kpi: 'ケーピーアイ', kgi: 'ケージーアイ', csf: 'シーエスエフ', swot: 'スウォット分析',
    pdca: 'ピーディーシーエー', wbs: 'ダブリュービーエス', qcd: 'キューシーディー',
    confidentiality: 'きみつせい', integrity: 'かんぜんせい', availability: 'かようせい',
    mfa: 'たようそにんしょう'
  };
  for (const term of terms) {
    if (spokenNames[term.id]) term.narration = {name: spokenNames[term.id]};
  }
  Object.assign(terms[0], {
    abbreviation: 'KPI', reading: 'ケーピーアイ',
    wordParts: [['Key', '重要な'], ['Performance', '業績・成果'], ['Indicator', '指標']],
    purpose: '最終目標に向けた進み具合を早めに把握し、改善が必要な活動を見つける。',
    mechanism: '最終目標に影響する活動を選び、測り方と確認頻度を決める。結果を定期的に見て活動を見直す。',
    comparisons: [
      {termId: 'kgi', text: 'KGIは最終目標の達成度を測る。KPIはその目標に至る途中の進捗や成果を測る。'},
      {termId: 'csf', text: 'CSFは成功に欠かせない条件。KPIは活動や成果を数値で追う指標。'}
    ],
    diagram: {src: 'materials/kpi.svg', alt: '年間売上というKGIに向け、月間商談件数と契約率を別々のKPIとして測る。'}
  });
  terms.find(term => term.id === 'qcd').sources = [
    {label: '厚生労働省 ものづくりマイスター事業 QCD資料', url: 'https://monozukuri-meister.mhlw.go.jp/mm/export/sites/default/contents/.content/gallery-download/H28/H28saposte/03-1_qcd.pdf'}
  ];
  const relations = [
    ['kpi', 'kgi', '目標と指標', 'KGIで最終結果を、KPIで途中の進捗を追う。'],
    ['kpi', 'csf', '成功要因', '成功要因を踏まえて、観測する指標を選ぶ。'],
    ['pdca', 'kpi', '評価', '評価の段階で指標の推移を確認する。'],
    ['wbs', 'gantt', '計画', '分解した作業に開始日・終了日を割り当てる。'],
    ['gantt', 'critical-path', '日程', '作業の依存関係と日程を合わせて確認する。'],
    ['confidentiality', 'integrity', '比較', 'アクセスの制限と、情報の正確さの維持は異なる観点。'],
    ['integrity', 'availability', '比較', '情報の正確さと、必要なときに使えることは異なる観点。'],
    ['mfa', 'confidentiality', '対策', '認証を強化して、許可されていないアクセスを抑える。']
  ].map(([a, b, kind, label]) => ({a, b, kind, label, basis: [a, b]}));
  return {
    id: 'it-passport', title: 'ITパスポート', categories, chapters, terms, relations,
    commute: {manifest: () => IT_PASSPORT_AUDIO},
    updatedAt: '2026-11-19',
    sources: [
      {label: 'IPA ITパスポート試験シラバス Ver.6.5', url: 'https://www.ipa.go.jp/shiken/syllabus/omgdg50000005kn1-att/syllabus_ip_ver6_5.pdf'},
      {label: 'NIST セキュリティ用語集（情報セキュリティの章）', url: 'https://www.nist.gov/itl/smallbusinesscyber/training/glossary'}
    ]
  };
})();

// 新しい教材はここへ登録します。画面は選択された教材を共通の形式で読みます。
const MATERIALS = [AI_DICTIONARY_MATERIAL, IT_PASSPORT_MATERIAL];
