// Every AI job Recall can run. The browser names a task and sends its inputs;
// the prompts and schemas live here so the endpoint can't be used as a
// general-purpose proxy.

const ACCURACY = `Accuracy rules — these matter more than anything else:
- Only state facts you are confident are correct and standard for this subject and level. If something is contested or varies by exam board/edition, say so briefly.
- Use the textbooks the student named to match scope, terminology and notation, but never invent quotations, page numbers, figure numbers or chapter numbers. Refer to books by title and topic only ("see the chapter on cellular respiration in Campbell Biology").
- Show working for anything quantitative and check every calculation.
- Write maths with LaTeX between $...$ (inline) or $$...$$ (display). Write chemical formulas upright, e.g. $\\mathrm{H_2O}$, or as plain text (H₂O). Never use a bare $ for money — write "USD 5" or "5 dollars".`;

function courseContext(c = {}) {
  const lines = [];
  if (c.title) lines.push(`Course: ${c.title}`);
  if (c.level) lines.push(`Level: ${c.level}`);
  if (c.books?.length) lines.push(`Textbooks: ${c.books.join('; ')}`);
  if (c.examFormat) lines.push(`Exam format: ${c.examFormat}`);
  if (c.struggles) lines.push(`Student says they struggle with: ${c.struggles}`);
  if (c.outline) lines.push(`Course outline:\n${c.outline}`);
  return lines.join('\n');
}

const str = { type: 'string' };
const int = { type: 'integer' };
const obj = (properties) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const arr = (items) => ({ type: 'array', items });

const questionSchema = obj({
  id: str,
  type: { type: 'string', enum: ['mcq', 'tf', 'short'] },
  topicId: str,
  difficulty: { type: 'integer', enum: [1, 2, 3] },
  prompt: str,
  options: arr(str),
  answerIndex: int,
  modelAnswer: str,
  rubric: str,
  explanation: str,
  source: str,
});

export const TASKS = {
  // Syllabus (+ optional PDF) -> structured course map.
  course: {
    mode: 'json',
    effort: 'medium',
    maxTokens: 32000,
    status: 'Reading your syllabus',
    schema: obj({
      title: str,
      subject: str,
      level: str,
      summary: str,
      units: arr(
        obj({
          title: str,
          topics: arr(obj({ title: str, summary: str, objectives: arr(str), weight: int })),
        }),
      ),
    }),
    system: `You are an expert curriculum designer and teacher. You turn a student's syllabus into a precise course map they will study from.
${ACCURACY}
Rules for the map:
- Cover every topic in the syllabus — nothing left out, nothing invented outside its scope. If the syllabus is vague, use the named textbooks and the level to infer the standard content of each unit.
- Group into units in the syllabus order. Use 3–8 topics per unit; each topic should be one teachable lesson (20–40 minutes).
- objectives: 2–5 concrete "be able to…" learning objectives per topic.
- weight: 1 (minor) to 3 (core, heavily examined).
- summary: one sentence per topic; for the course, two sentences.
- level: a short description like "High school (Year 10)" or "University, first year".`,
    build(input) {
      const content = [];
      if (input.pdf) {
        content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: input.pdf } });
      }
      content.push({
        type: 'text',
        text: `${courseContext(input)}

Syllabus text:
"""
${input.syllabus || '(see attached document)'}
"""

Build the course map.`,
      });
      return [{ role: 'user', content }];
    },
  },

  // A full lesson for one topic, streamed as Markdown.
  lesson: {
    mode: 'text',
    effort: 'medium',
    maxTokens: 24000,
    status: 'Writing your lesson',
    system: `You are a patient, brilliant private tutor. You write lessons that make a topic genuinely click, pitched exactly at the student's level.
${ACCURACY}
Format: Markdown. Start directly with the content (no preamble). Use this structure:
## The big idea — 2–4 sentences of intuition first.
## Explained — the core content in short sections with ### subheadings, building from simple to precise. Define every key term in **bold** the first time it appears.
## Worked example(s) — at least one, step by step (more for quantitative topics).
## Common mistakes — the misconceptions and exam traps students fall into, and how to avoid them.
## Key terms — a compact list: **term** — definition.
## Check yourself — 3 short questions; put each answer in a collapsed block exactly like: <details><summary>Answer</summary>…</details>
## Where to read more — which of the student's textbooks covers this and which part (by topic, never page numbers).
Keep paragraphs short. Use tables where they help compare things.`,
    build(input) {
      const style = {
        normal: '',
        simpler: 'The student found the previous explanation hard. Explain it much more simply: everyday analogies, smaller steps, fewer terms at once — but stay accurate.',
        deeper: 'The student is ready to go deeper: add rigour, edge cases, connections to other topics and harder exam-style examples.',
        examples: 'Focus on worked examples: give 4 or more fully worked, exam-style examples of increasing difficulty, each with a short explanation of the method.',
      }[input.style || 'normal'];
      return [
        {
          role: 'user',
          content: `${courseContext(input.course)}

Topic: ${input.topic.title}
Unit: ${input.topic.unit || ''}
Summary: ${input.topic.summary || ''}
Learning objectives:
${(input.topic.objectives || []).map((o) => `- ${o}`).join('\n')}

Student's current mastery of this topic: ${input.mastery ?? 'not tested yet'}
${input.mistakes?.length ? `Questions on this topic they recently got wrong (address these misunderstandings directly):\n${input.mistakes.map((m) => `- ${m}`).join('\n')}` : ''}
${style}

Write the lesson.`,
        },
      ];
    },
  },

  // Practice exam questions for a planned spread of topics.
  exam: {
    mode: 'json',
    effort: 'high',
    maxTokens: 64000,
    status: 'Writing your exam',
    schema: obj({ questions: arr(questionSchema) }),
    system: `You are a senior examiner writing a practice exam. Questions must be accurate, unambiguous and look like real exam questions for this course and level.
${ACCURACY}
Question rules:
- Write exactly the number of questions requested for each topic, with the requested types, and set topicId to the topic's id exactly as given.
- Test understanding and application, not just recall. Vary the angle: definitions, explanations, calculations, data interpretation, compare/contrast, predict-what-happens.
- difficulty: 1 = foundation, 2 = standard, 3 = challenging (top grades).
- mcq: exactly 4 options, one unambiguously correct; distractors must be plausible and based on real misconceptions. Don't use "all of the above". answerIndex is the 0-based index of the correct option. Spread the correct letter across A–D.
- tf: options must be exactly ["True", "False"]; answerIndex 0 for True, 1 for False. The statement must be clearly true or clearly false.
- short: a question answered in 1–6 sentences or a short calculation. options = [], answerIndex = -1. modelAnswer is a full-mark answer; rubric lists the marking points (e.g. "1 mark: …; 1 mark: …").
- For mcq/tf, modelAnswer restates the correct answer and rubric is "".
- explanation: why the correct answer is right AND why the tempting wrong answers are wrong — this is how the student learns from mistakes.
- source: where in the student's textbooks to revise this (book title + topic, no page numbers), or "" if none were given.
- id: "q1", "q2", … in order.
- Before finalising each question, solve it yourself independently and confirm the keyed answer is correct and the only correct option.`,
    build(input) {
      const plan = input.plan
        .map((p) => `- topicId "${p.topicId}": ${p.title} (unit: ${p.unit}) — ${p.count} question(s), target difficulty ${p.difficulty}. Objectives: ${(p.objectives || []).join('; ')}`)
        .join('\n');
      return [
        {
          role: 'user',
          content: `${courseContext(input.course)}

Question types allowed: ${input.types.join(', ')} (mix them sensibly; short answers take longer so use fewer of them).
${input.avoid?.length ? `Do not repeat these questions the student has already seen:\n${input.avoid.map((a) => `- ${a}`).join('\n')}` : ''}

Exam plan:
${plan}

Write the exam.`,
        },
      ];
    },
  },

  // Independent second pass over a generated exam's answer key.
  verify: {
    mode: 'json',
    effort: 'high',
    maxTokens: 32000,
    status: 'Double-checking the answer key',
    schema: obj({
      reviews: arr(obj({ id: str, verdict: { type: 'string', enum: ['ok', 'fix', 'drop'] }, answerIndex: int, modelAnswer: str, explanation: str, issue: str })),
    }),
    system: `You are an independent exam checker. For each question, solve it from scratch without trusting the key, then judge it.
${ACCURACY}
verdict:
- "ok": the question is clear and the key is correct. Echo the existing answerIndex/modelAnswer/explanation.
- "fix": the question is fine but the key or explanation is wrong or incomplete. Give the corrected answerIndex (or -1 for short), modelAnswer and explanation.
- "drop": the question is ambiguous, has more than one correct option, has no correct option, or is factually broken.
issue: one sentence on what was wrong, or "" for ok.`,
    build(input) {
      return [
        {
          role: 'user',
          content: `${courseContext(input.course)}

Questions (JSON):
${JSON.stringify(input.questions.map(({ id, type, prompt, options, answerIndex, modelAnswer, explanation }) => ({ id, type, prompt, options, answerIndex, modelAnswer, explanation })))}

Review every question.`,
        },
      ];
    },
  },

  // Marks written answers against the model answer and rubric.
  grade: {
    mode: 'json',
    effort: 'high',
    maxTokens: 24000,
    status: 'Marking your written answers',
    schema: obj({ results: arr(obj({ id: str, score: { type: 'number' }, verdict: { type: 'string', enum: ['correct', 'partial', 'incorrect'] }, feedback: str, missing: arr(str) })) }),
    system: `You are a fair, encouraging but rigorous examiner marking short written answers.
${ACCURACY}
For each answer:
- score from 0 to 1 (fraction of the rubric's marks earned). Accept any correct wording or equivalent method; don't demand the model answer's exact phrasing. Ignore spelling unless it changes the meaning.
- verdict: "correct" (score ≥ 0.85), "partial", or "incorrect" (score < 0.2). A blank answer is incorrect with score 0.
- feedback: 1–3 sentences talking to the student — what they got right, and precisely what was wrong or missing.
- missing: the marking points they didn't hit (empty if none).`,
    build(input) {
      return [
        {
          role: 'user',
          content: `${courseContext(input.course)}

Answers to mark (JSON):
${JSON.stringify(input.items)}

Mark every answer.`,
        },
      ];
    },
  },

  // The student thinks a question was marked unfairly.
  dispute: {
    mode: 'json',
    effort: 'high',
    maxTokens: 12000,
    status: 'Re-checking this question',
    schema: obj({ studentCorrect: { type: 'boolean' }, score: { type: 'number' }, questionFlawed: { type: 'boolean' }, reply: str, correctedAnswer: str }),
    system: `You are re-examining one exam question because the student disputes the marking. Be honest in both directions: if the key or marking was wrong, say so plainly; if the student is wrong, explain kindly and precisely why.
${ACCURACY}
- studentCorrect: true if the student's answer deserves full credit.
- score: the fair score from 0 to 1.
- questionFlawed: true if the question itself is ambiguous or wrongly keyed.
- reply: 2–5 sentences to the student.
- correctedAnswer: the correct answer stated in full.`,
    build(input) {
      return [
        {
          role: 'user',
          content: `${courseContext(input.course)}

Question: ${JSON.stringify(input.question)}
Student's answer: ${input.answer}
Student's argument: ${input.argument || '(none given)'}

Re-examine it.`,
        },
      ];
    },
  },

  // Flashcards for a topic.
  cards: {
    mode: 'json',
    effort: 'medium',
    maxTokens: 12000,
    status: 'Making flashcards',
    schema: obj({ cards: arr(obj({ front: str, back: str })) }),
    system: `You write excellent flashcards for spaced repetition.
${ACCURACY}
- One fact, definition, formula, process step or distinction per card.
- front: a precise question (not a bare keyword). back: the answer in at most 2 short sentences.
- Cover the most examinable content of the topic first.`,
    build(input) {
      return [
        {
          role: 'user',
          content: `${courseContext(input.course)}

Topic: ${input.topic.title}
Objectives: ${(input.topic.objectives || []).join('; ')}
${input.mistakes?.length ? `Include cards targeting these recent mistakes:\n${input.mistakes.map((m) => `- ${m}`).join('\n')}` : ''}

Write ${input.count || 12} flashcards.`,
        },
      ];
    },
  },

  // Free-form tutor chat, streamed.
  tutor: {
    mode: 'text',
    effort: 'medium',
    maxTokens: 16000,
    status: 'Thinking',
    system: `You are Recall's tutor: a warm, sharp, Socratic private tutor for one student and one course. Latency-sensitive; begin your visible answer immediately.
${ACCURACY}
How to tutor:
- Answer the question directly and clearly first, then deepen understanding. Keep replies focused — use Markdown, short paragraphs, and examples.
- If the student asks you to just give answers to homework, help them understand the method instead and check their attempt.
- When useful, end with one quick question that checks their understanding.
- Tailor everything to their level and to the weak areas listed below.`,
    build(input) {
      const messages = (input.history || []).slice(-20).map((m) => ({ role: m.role, content: m.content }));
      const ctx = `${courseContext(input.course)}
${input.weak?.length ? `Weakest topics right now: ${input.weak.join('; ')}` : ''}
${input.focus ? `The student is currently studying: ${input.focus}` : ''}`;
      if (messages.length && messages[0].role === 'user') {
        messages[0] = { role: 'user', content: `[Context for the tutor]\n${ctx}\n\n[Student]\n${messages[0].content}` };
      }
      return messages;
    },
  },
};
