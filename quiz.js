// 既存のTERMSを使うクイズ。辞典の保存データは変更しません。
(() => {
  const get = id => document.getElementById(id);
  const QUESTION_COUNT = 10;
  let questions = [];
  let current = 0;
  let score = 0;
  let answered = false;
  let playing = false;

  // Fisher–Yates法で、元の配列を変更せずにシャッフルします。
  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function start() {
    questions = shuffle(TERMS).slice(0, QUESTION_COUNT).map(term => ({
      term,
      options: shuffle([term, ...shuffle(TERMS.filter(other => other.id !== term.id)).slice(0, 3)])
    }));
    current = 0;
    score = 0;
    playing = true;
    get('quizIntro').hidden = true;
    get('quizResult').hidden = true;
    get('quizPlay').hidden = false;
    get('dictionary').hidden = true;
    showQuestion();
  }

  function showQuestion() {
    answered = false;
    const question = questions[current];
    get('quizCounter').textContent = '第 ' + (current + 1) + ' 問 / ' + questions.length + ' 問';
    get('quizProgress').style.width = current / questions.length * 100 + '%';
    get('quizDescription').textContent = question.term.description;
    get('quizOptions').replaceChildren();
    get('quizFeedback').hidden = true;
    get('quizVerdict').textContent = '';
    get('quizNext').hidden = true;
    get('quizNext').textContent = current === questions.length - 1 ? '結果を見る →' : '次の問題へ →';
    question.options.forEach((term, index) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'quiz-option';
      const title = document.createElement('span');
      title.className = 'quiz-option-title';
      title.textContent = ['A', 'B', 'C', 'D'][index] + '. ' + term.name;
      option.append(title);
      option.addEventListener('click', () => answer(term.id));
      get('quizOptions').append(option);
    });
    get('quizQuestion').focus();
  }

  function answer(selectedId) {
    if (!playing || answered) return;
    answered = true;
    const question = questions[current];
    const correct = selectedId === question.term.id;
    if (correct) score++;
    [...get('quizOptions').children].forEach((option, index) => {
      option.disabled = true;
      const term = question.options[index];
      if (term.id === question.term.id) {
        option.classList.add('correct');
        option.firstElementChild.textContent += ' ✓';
      } else if (term.id === selectedId) {
        option.classList.add('incorrect');
        option.firstElementChild.textContent += ' ✖';
      }
      const description = document.createElement('span');
      description.className = 'quiz-option-description';
      description.textContent = term.description;
      option.append(description);
    });
    get('quizFeedback').className = 'quiz-feedback ' + (correct ? 'correct' : 'incorrect');
    get('quizVerdict').textContent = correct ? '✓ 正解！' : '✕ 不正解。正解は「' + question.term.name + '」です。';
    get('quizFeedback').hidden = false;
    get('quizProgress').style.width = (current + 1) / questions.length * 100 + '%';
    get('quizNext').hidden = false;
    // 判定にフォーカスし、直後の4つの解説を上から読めるようにします。
    get('quizFeedback').focus();
  }

  function next() {
    if (!playing || !answered) return;
    current++;
    if (current < questions.length) {
      showQuestion();
      return;
    }
    playing = false;
    get('quizPlay').hidden = true;
    get('quizResult').hidden = false;
    get('quizAccuracy').textContent = Math.round(score / questions.length * 100) + '%';
    get('quizScoreText').textContent = questions.length + '問中 ' + score + '問正解。' +
      (score === questions.length ? '全問正解です！' : '辞典で復習して、また挑戦してみましょう。');
    get('quizResultHeading').focus();
  }

  function exit() {
    playing = false;
    questions = [];
    get('quizPlay').hidden = true;
    get('quizResult').hidden = true;
    get('quizIntro').hidden = false;
    get('dictionary').hidden = false;
    get('quizStart').focus();
  }

  get('quizStart').addEventListener('click', start);
  get('quizRetry').addEventListener('click', start);
  get('quizNext').addEventListener('click', next);
  get('quizExit').addEventListener('click', exit);
  get('quizReturn').addEventListener('click', exit);
})();
