// Everything Recall knows lives in one object saved to localStorage.
import { uid, dateKey, clamp, toast } from './util.js';
import { demoCourse } from './demo.js';

const KEY = 'recall.v1';

function fresh() {
  return {
    v: 1,
    courses: [],
    settings: { apiKey: '', verify: true, autoCards: true, focusMin: 25, breakMin: 5, demoAdded: false },
    activity: {},
    timer: { mode: 'focus', running: false, endsAt: 0, remaining: 25 * 60 },
  };
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 1) {
      const base = fresh();
      return { ...base, ...s, settings: { ...base.settings, ...s.settings }, timer: { ...base.timer, ...s.timer } };
    }
  } catch { /* corrupted or blocked storage: start fresh */ }
  return fresh();
}

export const state = load();

if (!state.settings.demoAdded) {
  state.courses.push(demoCourse());
  state.settings.demoAdded = true;
}

let saveTimer = 0;
export function save(now = false) {
  clearTimeout(saveTimer);
  const write = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { toast('Could not save — your browser storage is full or blocked. Export your data in Settings.'); }
  };
  if (now) write(); else saveTimer = setTimeout(write, 150);
}
addEventListener('pagehide', () => save(true));

export function replaceState(next) {
  const base = fresh();
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, base, next, { settings: { ...base.settings, ...next.settings, demoAdded: true } });
  save(true);
}
export function resetState() {
  replaceState({ ...fresh(), courses: [demoCourse()] });
}

// ── Courses ────────────────────────────────────────────────────────
export const getCourse = (id) => state.courses.find((c) => c.id === id);

export function newCourse(fields) {
  return {
    id: uid('c'),
    created: Date.now(),
    title: 'Untitled course',
    subject: '',
    level: '',
    summary: '',
    syllabus: '',
    books: [],
    examDate: '',
    examFormat: '',
    struggles: '',
    units: [],
    lessons: {},
    read: {},
    history: [],
    exams: [],
    cards: [],
    mistakes: [],
    bank: [],
    chat: [],
    planDone: {},
    dailyMinutes: 45,
    ...fields,
  };
}

export function allTopics(course) {
  const out = [];
  course.units.forEach((u, ui) => u.topics.forEach((t, ti) => out.push({ ...t, unit: u.title, unitId: u.id, ui, ti })));
  return out;
}
export const findTopic = (course, tid) => allTopics(course).find((t) => t.id === tid);

// Text outline sent to Claude so every answer stays inside the syllabus.
export function outline(course) {
  return course.units.map((u, i) => `Unit ${i + 1}: ${u.title}\n${u.topics.map((t) => `  - ${t.title}`).join('\n')}`).join('\n');
}
export function courseCtx(course) {
  return {
    title: course.title,
    level: course.level,
    books: course.books,
    examFormat: course.examFormat,
    struggles: course.struggles,
    outline: outline(course),
  };
}

// ── Mastery ────────────────────────────────────────────────────────
// Mastery is recomputed from the history of results, so a disputed mark can
// be corrected after the fact. Recent results count most.
const DIFF_W = { 1: 0.8, 2: 1, 3: 1.2 };

export function masteryMap(course) {
  const m = {};
  for (const h of course.history) {
    const e = (m[h.topicId] ||= { score: 0.5, n: 0, correct: 0, last: 0 });
    const w = (h.w ?? 1) * (DIFF_W[h.d] || 1);
    const a = clamp(Math.max(0.2, 1 / (e.n + 1)) * w, 0.05, 1);
    e.score += (h.r - e.score) * a;
    e.n += h.w != null && h.w < 1 ? h.w : 1;
    if (h.r >= 0.85) e.correct++;
    e.last = Math.max(e.last, h.t);
  }
  return m;
}

export function level(m) {
  if (!m || m.n < 1) return 'new';
  if (m.score < 0.5) return 'weak';
  if (m.score < 0.75) return 'learning';
  if (m.score < 0.9 || m.n < 4) return 'good';
  return 'mastered';
}
export const LEVEL_LABEL = { new: 'Not tested', weak: 'Struggling', learning: 'Learning', good: 'Good', mastered: 'Mastered' };

export function courseMastery(course) {
  const m = masteryMap(course);
  const topics = allTopics(course);
  if (!topics.length) return { overall: 0, counts: {}, tested: 0, total: 0, m };
  let sum = 0, wsum = 0, tested = 0;
  const counts = { new: 0, weak: 0, learning: 0, good: 0, mastered: 0 };
  for (const t of topics) {
    const e = m[t.id], w = t.weight || 2;
    counts[level(e)]++;
    if (e && e.n >= 1) tested++;
    sum += (e && e.n >= 1 ? e.score : 0) * w;
    wsum += w;
  }
  return { overall: sum / wsum, counts, tested, total: topics.length, m };
}

// Topics ordered from most to least in need of work.
export function weakest(course, n = 3) {
  const m = masteryMap(course);
  return allTopics(course)
    .filter((t) => m[t.id]?.n >= 1)
    .sort((a, b) => m[a.id].score - m[b.id].score || (b.weight || 2) - (a.weight || 2))
    .slice(0, n)
    .map((t) => ({ ...t, m: m[t.id] }));
}

export function record(course, topicId, r, d = 2, src = 'exam', w) {
  const h = { topicId, r: clamp(r), d, t: Date.now(), src };
  if (w != null) h.w = w;
  course.history.push(h);
  return h;
}

// ── Activity & streak ─────────────────────────────────────────────
export function logActivity(kind, n = 1) {
  const k = dateKey();
  const a = (state.activity[k] ||= { q: 0, c: 0, m: 0, l: 0 });
  a[kind] = (a[kind] || 0) + n;
  save();
}
export function activityScore(a) {
  return a ? (a.q || 0) + (a.c || 0) * 0.5 + (a.m || 0) / 5 + (a.l || 0) * 3 : 0;
}
export function streak() {
  let s = 0;
  const d = new Date();
  if (!activityScore(state.activity[dateKey(d)])) d.setDate(d.getDate() - 1);
  while (activityScore(state.activity[dateKey(d)]) > 0) { s++; d.setDate(d.getDate() - 1); }
  return s;
}

// ── Flashcards (SM-2, simplified) ─────────────────────────────────
const DAY = 86400000;
export function newCard(topicId, front, back, src = 'ai') {
  return { id: uid('k'), topicId, front, back, src, created: Date.now(), due: Date.now(), interval: 0, ease: 2.5, reps: 0, lapses: 0 };
}
export function dueCards(course, now = Date.now()) {
  return course.cards.filter((k) => k.due <= now).sort((a, b) => a.due - b.due);
}
export function nextIntervals(k) {
  const g = schedule({ ...k }, 'good', true), e = schedule({ ...k }, 'easy', true), h = schedule({ ...k }, 'hard', true);
  return { again: '10 min', hard: fmtInt(h.interval), good: fmtInt(g.interval), easy: fmtInt(e.interval) };
}
const fmtInt = (d) => (d < 1 ? '<1 day' : d < 30 ? `${Math.round(d)} d` : `${Math.round(d / 30)} mo`);
export function schedule(k, rating, dry = false) {
  if (rating === 'again') {
    k.reps = 0; k.lapses++; k.interval = 0; k.ease = Math.max(1.3, k.ease - 0.2);
    k.due = Date.now() + 10 * 60000;
    return k;
  }
  if (rating === 'hard') { k.interval = Math.max(1, (k.interval || 1) * 1.2); k.ease = Math.max(1.3, k.ease - 0.15); }
  if (rating === 'good') k.interval = k.reps === 0 ? 1 : k.reps === 1 ? 3 : Math.round(k.interval * k.ease);
  if (rating === 'easy') { k.interval = k.reps === 0 ? 3 : Math.round(Math.max(k.interval, 1) * k.ease * 1.3); k.ease += 0.15; }
  k.reps++;
  k.due = Date.now() + k.interval * DAY;
  if (!dry) k.last = Date.now();
  return k;
}
