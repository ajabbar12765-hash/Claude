// Canned Claude answers for local UI testing: `MOCK=1 node dev-server.mjs`.
// Never deployed (see .vercelignore).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function questionsFor(plan, types) {
  const out = [];
  let n = 0;
  for (const p of plan) {
    for (let i = 0; i < p.count; i++) {
      n++;
      const type = types[(n - 1) % types.length];
      const base = { id: `q${n}`, type, topicId: p.topicId, difficulty: 2, rubric: '', source: 'Mock textbook — chapter on ' + p.title };
      if (type === 'mcq') out.push({ ...base, prompt: `Mock question ${n} about **${p.title}**: which option is correct? (Energy $E = mc^2$)`, options: ['Wrong A', 'Right B', 'Wrong C', 'Wrong D'], answerIndex: 1, modelAnswer: 'Right B', explanation: 'B is right because this is a mock. A, C and D are distractors.' });
      else if (type === 'tf') out.push({ ...base, prompt: `Mock statement ${n} about ${p.title} is true.`, options: ['True', 'False'], answerIndex: 0, modelAnswer: 'True', explanation: 'It is true in the mock.' });
      else out.push({ ...base, prompt: `Explain one key idea of ${p.title}.`, options: [], answerIndex: -1, modelAnswer: `A key idea of ${p.title} is X because Y.`, rubric: '1 mark: X; 1 mark: because Y', explanation: 'Mention X and why.' });
    }
  }
  return out;
}

export async function mock(task, input, send) {
  send({ t: 'status', msg: 'Mock: ' + task });
  await sleep(400);
  const text = async (s) => { for (const chunk of s.match(/[\s\S]{1,40}/g)) { send({ t: 'delta', text: chunk }); await sleep(15); } };
  switch (task) {
    case 'course': {
      const units = [
        { title: 'Foundations', topics: [{ title: 'First ideas', summary: 'The basics.', objectives: ['Define the basics'], weight: 3 }, { title: 'Key vocabulary', summary: 'Words.', objectives: ['Use the words'], weight: 2 }] },
        { title: 'Applications', topics: [{ title: 'Solving problems', summary: 'Using it.', objectives: ['Solve a problem'], weight: 3 }] },
      ];
      for (let i = 1; i <= 3; i++) { send({ t: 'progress', n: i }); await sleep(150); }
      return send({ t: 'result', data: { title: input.title || 'Mock course', subject: 'Mock', level: input.level, summary: 'A mock course for testing.', units } });
    }
    case 'exam': {
      const qs = questionsFor(input.plan, input.types);
      for (let i = 1; i <= qs.length; i++) { send({ t: 'progress', n: i }); await sleep(60); }
      return send({ t: 'result', data: { questions: qs } });
    }
    case 'verify':
      return send({ t: 'result', data: { reviews: input.questions.map((q, i) => ({ id: q.id, verdict: i === 0 ? 'fix' : 'ok', answerIndex: q.answerIndex, modelAnswer: q.modelAnswer, explanation: q.explanation, issue: i === 0 ? 'Clarified the explanation.' : '' })) } });
    case 'grade':
      return send({ t: 'result', data: { results: input.items.map((it) => ({ id: it.id, score: it.answer.length > 20 ? 1 : 0.5, verdict: it.answer.length > 20 ? 'correct' : 'partial', feedback: 'Mock feedback on your answer.', missing: it.answer.length > 20 ? [] : ['because Y'] })) } });
    case 'dispute':
      return send({ t: 'result', data: { studentCorrect: true, score: 1, questionFlawed: false, reply: 'On reflection your answer is acceptable.', correctedAnswer: 'Right B' } });
    case 'cards':
      return send({ t: 'result', data: { cards: Array.from({ length: 5 }, (_, i) => ({ front: `Mock card ${i + 1} on ${input.topic.title}?`, back: `Answer ${i + 1}.` })) } });
    case 'lesson':
      await text(`## The big idea\nThis is a mock lesson on **${input.topic.title}** (${input.style}).\n\n## Explained\n### Part one\nInline maths $a^2 + b^2 = c^2$ and display:\n$$\\int_0^1 x\\,dx = \\tfrac12$$\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n## Check yourself\n1. What is 2+2?\n<details><summary>Answer</summary>4</details>\n`);
      return send({ t: 'done' });
    case 'tutor':
      await text(`Mock tutor reply to: “${input.history.at(-1).content}”. Here is $x_1 = 3$.`);
      return send({ t: 'done' });
  }
}
