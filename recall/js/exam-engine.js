// Planning, writing, checking and marking practice exams.
import { uid, shuffle, clamp, dateKey, plainText, toast } from './util.js';
import { state, save, allTopics, masteryMap, courseCtx, record, logActivity, newCard } from './store.js';
import { run, pool } from './ai.js';

// ── Planning: how many questions per topic, at what difficulty ──────
export function planExam(course, cfg) {
  const m = masteryMap(course);
  let topics = allTopics(course);
  if (cfg.scope === 'pick') topics = topics.filter((t) => cfg.topicIds?.includes(t.id));
  if (!topics.length) return [];

  const prio = (t) => {
    const w = t.weight || 2;
    if (cfg.scope !== 'adaptive') return w;
    const e = m[t.id];
    // Untested topics count as half-known; weak ones get the most questions.
    return w * (1.6 - (e?.n >= 1 ? e.score : 0.5));
  };
  const diffFor = (t) => {
    if (cfg.difficulty === 'mixed') return 'mixed 1–3';
    if (cfg.difficulty !== 'adaptive') return String(cfg.difficulty);
    const e = m[t.id];
    if (!e || e.n < 1) return '2';
    return e.score < 0.45 ? '1' : e.score < 0.8 ? '2' : '3';
  };

  const N = cfg.count;
  const counts = new Map();
  if (N >= topics.length) {
    topics.forEach((t) => counts.set(t.id, 1));
    const rest = N - topics.length;
    const total = topics.reduce((s, t) => s + prio(t), 0);
    const shares = topics.map((t) => ({ t, x: (prio(t) / total) * rest }));
    shares.forEach((s) => counts.set(s.t.id, counts.get(s.t.id) + Math.floor(s.x)));
    let left = N - [...counts.values()].reduce((a, b) => a + b, 0);
    shares.sort((a, b) => (b.x % 1) - (a.x % 1));
    for (let i = 0; left > 0; i = (i + 1) % shares.length, left--) counts.set(shares[i].t.id, counts.get(shares[i].t.id) + 1);
  } else {
    // Fewer questions than topics: weighted random pick, so repeated exams roam the syllabus.
    const pool = topics.map((t) => ({ t, k: Math.random() ** (1 / prio(t)) }));
    pool.sort((a, b) => b.k - a.k).slice(0, N).forEach(({ t }) => counts.set(t.id, 1));
  }

  return topics
    .filter((t) => counts.get(t.id))
    .map((t) => ({ topicId: t.id, title: t.title, unit: t.unit, objectives: t.objectives || [], count: counts.get(t.id), difficulty: diffFor(t) }));
}

// ── Writing with Claude: parallel chunks, then an independent check ──
function chunkPlan(plan, size = 8) {
  const chunks = [];
  let cur = [], n = 0;
  for (const p of plan) {
    let left = p.count;
    while (left > 0) {
      const take = Math.min(left, size - n);
      cur.push({ ...p, count: take });
      n += take; left -= take;
      if (n >= size) { chunks.push(cur); cur = []; n = 0; }
    }
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}

function validQuestion(q, allowed) {
  if (!q || !q.prompt || !allowed.has(q.type)) return false;
  if (q.type === 'mcq') return Array.isArray(q.options) && q.options.length >= 3 && q.answerIndex >= 0 && q.answerIndex < q.options.length;
  if (q.type === 'tf') { q.options = ['True', 'False']; return q.answerIndex === 0 || q.answerIndex === 1; }
  if (q.type === 'short') { q.options = []; q.answerIndex = -1; return !!q.modelAnswer; }
  return false;
}

export async function writeExam(course, cfg, plan, { onProgress, signal } = {}) {
  const total = plan.reduce((s, p) => s + p.count, 0);
  const types = cfg.types;
  const allowed = new Set(types);
  const avoid = course.bank.slice(-60).map((q) => plainText(q.prompt).slice(0, 110));
  const chunks = chunkPlan(plan);
  const written = new Array(chunks.length).fill(0);
  const report = () => {
    const n = written.reduce((a, b) => a + b, 0);
    onProgress?.(`Writing question ${Math.min(n + 1, total)} of ${total}…`, (n / total) * (state.settings.verify ? 0.7 : 0.95));
  };
  report();

  // At most 5 chunks (40 questions), so they all run at once.
  const settled = await Promise.allSettled(
    chunks.map((chunk, ci) =>
      run('exam', { course: courseCtx(course), types, plan: chunk, avoid }, {
        signal,
        onProgress: (n) => { written[ci] = Math.min(n, chunk.reduce((s, p) => s + p.count, 0)); report(); },
      }).then((data) => {
        const ids = new Set(chunk.map((p) => p.topicId));
        return (data.questions || []).map((q) => ({ ...q, topicId: ids.has(q.topicId) ? q.topicId : chunk[0].topicId }));
      }),
    ),
  );

  const ok = settled.filter((s) => s.status === 'fulfilled');
  if (!ok.length) throw settled[0].reason;
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (ok.length < settled.length) toast('Some questions could not be written; the exam is a little shorter.');

  let questions = ok.flatMap((s) => s.value).filter((q) => validQuestion(q, allowed));
  questions.forEach((q, i) => { q.id = `q${i + 1}`; q.difficulty = clamp(q.difficulty || 2, 1, 3); });

  if (state.settings.verify && questions.length) {
    onProgress?.('Double-checking every answer…', 0.72);
    const groups = [];
    for (let i = 0; i < questions.length; i += 10) groups.push(questions.slice(i, i + 10));
    let checked = 0;
    const results = await pool(groups.map((g) => async () => {
      try {
        const r = await run('verify', { course: courseCtx(course), questions: g }, { signal });
        checked += g.length;
        onProgress?.(`Double-checking every answer… ${checked}/${questions.length}`, 0.72 + 0.27 * (checked / questions.length));
        return r.reviews || [];
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        return [];
      }
    }), 4);
    const byId = new Map(results.flat().map((r) => [r.id, r]));
    let fixed = 0, dropped = 0;
    questions = questions.filter((q) => {
      const r = byId.get(q.id);
      if (!r) return true;
      q.checked = true;
      if (r.verdict === 'drop') { dropped++; return false; }
      if (r.verdict === 'fix') {
        if (q.type !== 'short' && r.answerIndex >= 0 && r.answerIndex < q.options.length) q.answerIndex = r.answerIndex;
        if (r.modelAnswer) q.modelAnswer = r.modelAnswer;
        if (r.explanation) q.explanation = r.explanation;
        q.fixed = r.issue || true;
        fixed++;
      }
      return true;
    });
    questions.forEach((q, i) => { q.id = `q${i + 1}`; });
    if (fixed || dropped) {
      const parts = [fixed && `corrected ${fixed} answer key${fixed === 1 ? '' : 's'}`, dropped && `removed ${dropped} unclear question${dropped === 1 ? '' : 's'}`].filter(Boolean);
      toast(`The checker ${parts.join(' and ')} before you saw them.`, 5000);
    }
  }

  // Keep a bank so exams still work offline and new exams avoid repeats.
  const seen = new Set(course.bank.map((q) => plainText(q.prompt)));
  for (const q of questions) {
    if (!seen.has(plainText(q.prompt))) { course.bank.push({ ...q, id: uid('b') }); seen.add(plainText(q.prompt)); }
  }
  if (course.bank.length > 600) course.bank.splice(0, course.bank.length - 600);
  return questions;
}

// Offline: build an exam from questions Recall already has.
export function bankExam(course, cfg, plan) {
  const allowed = new Set(cfg.types);
  const bank = course.bank.filter((q) => allowed.has(q.type));
  const used = new Set();
  const out = [];
  for (const p of plan) {
    const forTopic = shuffle(bank.filter((q) => q.topicId === p.topicId && !used.has(q)));
    forTopic.slice(0, p.count).forEach((q) => { used.add(q); out.push(q); });
  }
  const want = plan.reduce((s, p) => s + p.count, 0);
  if (out.length < want && cfg.scope !== 'pick') {
    shuffle(bank.filter((q) => !used.has(q))).slice(0, want - out.length).forEach((q) => { used.add(q); out.push(q); });
  }
  return shuffle(out).map((q, i) => ({ ...structuredClone(q), id: `q${i + 1}` }));
}

export function createExam(course, cfg, questions, title) {
  const exam = {
    id: uid('e'),
    title: title || cfg.title || 'Practice exam',
    created: Date.now(),
    config: cfg,
    mode: cfg.mode || 'exam',
    questions,
    answers: {},
    flags: {},
    results: {},
    current: 0,
    startedAt: Date.now(),
    timeLimit: cfg.timer ? cfg.timer * 60 : 0,
    status: 'taking',
  };
  course.exams.push(exam);
  save(true);
  return exam;
}

// ── Marking ─────────────────────────────────────────────────────────
export const answerText = (q, a) => {
  if (!a) return '';
  if (q.type === 'short') return a.text || '';
  return a.choice != null ? q.options[a.choice] : '';
};
export const correctText = (q) => (q.type === 'short' ? q.modelAnswer : q.options[q.answerIndex]);

export function localResult(q, a) {
  if (q.type === 'short') {
    if (!a?.text?.trim()) return { score: 0, verdict: 'incorrect', feedback: 'No answer given.', missing: [] };
    return null; // needs marking
  }
  if (a?.choice == null) return { score: 0, verdict: 'incorrect', feedback: 'Not answered.', missing: [] };
  const ok = a.choice === q.answerIndex;
  return { score: ok ? 1 : 0, verdict: ok ? 'correct' : 'incorrect', feedback: '', missing: [] };
}

// Marks written answers with Claude. Returns ids it could not mark.
export async function markShort(course, exam, qs, { signal } = {}) {
  const items = qs.map((q) => ({ id: q.id, question: q.prompt, modelAnswer: q.modelAnswer, rubric: q.rubric, answer: exam.answers[q.id]?.text || '' }));
  const groups = [];
  for (let i = 0; i < items.length; i += 10) groups.push(items.slice(i, i + 10));
  const res = await pool(groups.map((g) => () => run('grade', { course: courseCtx(course), items: g }, { signal }).then((r) => r.results || [])), 3);
  const unmarked = new Set(qs.map((q) => q.id));
  for (const r of res.flat()) {
    if (!unmarked.has(r.id)) continue;
    exam.results[r.id] = { score: clamp(+r.score || 0), verdict: r.verdict, feedback: r.feedback, missing: r.missing || [], by: 'ai' };
    unmarked.delete(r.id);
  }
  return [...unmarked];
}

export function selfMark(exam, qid, score) {
  exam.results[qid] = { score, verdict: score >= 0.85 ? 'correct' : score > 0.2 ? 'partial' : 'incorrect', feedback: 'Self-marked against the model answer.', missing: [], by: 'self' };
}

export function finalizeExam(course, exam) {
  const qs = exam.questions;
  let total = 0;
  for (const q of qs) {
    const r = exam.results[q.id] || localResult(q, exam.answers[q.id]) || { score: 0, verdict: 'incorrect', feedback: '' };
    exam.results[q.id] = r;
    total += r.score;
    const h = record(course, q.topicId, r.score, q.difficulty, 'exam');
    h.ref = `${exam.id}:${q.id}`;

    const key = plainText(q.prompt);
    const existing = course.mistakes.find((x) => plainText(x.q.prompt) === key);
    if (r.score < 0.85) {
      const entry = { id: existing?.id || uid('m'), examId: exam.id, q: structuredClone(q), answer: answerText(q, exam.answers[q.id]), feedback: r.feedback, at: Date.now(), resolved: false, misses: (existing?.misses || 0) + 1 };
      if (existing) Object.assign(existing, entry); else course.mistakes.push(entry);
      if (state.settings.autoCards && !course.cards.some((k) => plainText(k.front) === key)) {
        const why = String(q.explanation || '').split(/(?<=\.)\s/)[0];
        course.cards.push(newCard(q.topicId, q.prompt, `${correctText(q)}${why ? ' — ' + why : ''}`, 'mistake'));
      }
    } else if (existing && !existing.resolved) {
      existing.resolved = true;
      existing.resolvedAt = Date.now();
    }
  }
  exam.score = qs.length ? total / qs.length : 0;
  exam.status = 'done';
  exam.finished = Date.now();
  exam.elapsed = Math.round((exam.finished - exam.startedAt) / 1000);
  const answered = qs.filter((q) => answerText(q, exam.answers[q.id])).length;
  logActivity('q', answered);

  const today = dateKey();
  course.planDone[`exam:${today}`] = true;
  if (exam.config?.preset === 'mock') course.planDone[`mock:${today}`] = true;
  for (const tid of new Set(qs.map((q) => q.topicId))) course.planDone[`drill:${tid}:${today}`] = true;
  save(true);
}

// After a successful dispute: fix the result, the history entry and the score.
export function applyDispute(course, exam, qid, score) {
  const r = exam.results[qid];
  r.score = clamp(score);
  r.verdict = score >= 0.85 ? 'correct' : score > 0.2 ? 'partial' : 'incorrect';
  r.disputed = true;
  const h = course.history.find((x) => x.ref === `${exam.id}:${qid}`);
  if (h) h.r = r.score;
  exam.score = exam.questions.reduce((s, q) => s + (exam.results[q.id]?.score || 0), 0) / exam.questions.length;
  if (r.score >= 0.85) {
    const q = exam.questions.find((x) => x.id === qid);
    const mk = course.mistakes.find((x) => plainText(x.q.prompt) === plainText(q.prompt));
    if (mk) { mk.resolved = true; mk.resolvedAt = Date.now(); }
  }
  save(true);
}
