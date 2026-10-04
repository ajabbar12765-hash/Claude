// Recall's study desk: a hash router, the header (crumbs, course tabs, focus
// timer) and a view per screen.
import { $, esc, fmtClock, toast, beep } from './util.js';
import { state, save, getCourse, dueCards, logActivity } from './store.js';
import { homeView } from './views/home.js';
import { newCourseView } from './views/new-course.js';
import { overviewView } from './views/overview.js';
import { learnView } from './views/learn.js';
import { examsView, examView } from './views/exams.js';
import { cardsView } from './views/cards.js';
import { tutorView } from './views/tutor.js';
import { mistakesView } from './views/mistakes.js';
import { planView } from './views/plan.js';
import { settingsView } from './views/settings.js';
import { editCourseView } from './views/edit-course.js';

const view = $('#view');
let cleanup = [];

// Views register teardown work (timers, aborts, key handlers) here.
export const onLeave = (fn) => cleanup.push(fn);

function setTabs(course, active) {
  const tabs = $('#tabs');
  if (!course) { tabs.hidden = true; tabs.innerHTML = ''; return; }
  const due = dueCards(course).length;
  const open = course.mistakes.filter((m) => !m.resolved).length;
  const items = [
    ['', 'Overview'],
    ['learn', 'Learn'],
    ['exams', 'Exams'],
    ['cards', 'Flashcards', due],
    ['tutor', 'Tutor'],
    ['mistakes', 'Mistakes', open],
    ['plan', 'Study plan'],
  ];
  tabs.hidden = false;
  tabs.innerHTML = items
    .map(([k, label, n]) => `<a href="#/c/${course.id}${k ? '/' + k : ''}"${k === active ? ' aria-current="page"' : ''}>${label}${n ? `<span class="count">${n}</span>` : ''}</a>`)
    .join('');
}

function setCrumb(html) { $('#crumb').innerHTML = html; }

export function refreshChrome() {
  const m = location.hash.match(/^#\/c\/([^/]+)\/?([^/?]*)/);
  const course = m && getCourse(m[1]);
  if (course) setTabs(course, m[2] === 'exam' ? 'exams' : m[2]);
}

function route() {
  cleanup.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
  cleanup = [];
  const hash = location.hash || '#/';
  const [path, query = ''] = hash.slice(1).split('?');
  const q = Object.fromEntries(new URLSearchParams(query));
  const parts = path.split('/').filter(Boolean);
  const ctx = { view, q, onLeave, refreshChrome, go: (h) => { location.hash = h; } };

  window.scrollTo(0, 0);
  view.innerHTML = '';

  if (parts[0] === 'c') {
    const course = getCourse(parts[1]);
    if (!course) {
      setTabs(null); setCrumb('');
      view.innerHTML = `<div class="empty"><h3>Course not found</h3><p>It may have been deleted.</p><a class="btn btn-primary" href="#/">Back to your courses</a></div>`;
      return;
    }
    ctx.course = course;
    const sub = parts[2] || '';
    setTabs(course, sub === 'exam' ? 'exams' : sub === 'edit' ? '' : sub);
    setCrumb(`<a href="#/c/${course.id}">${esc(course.title)}</a>`);
    document.title = `${course.title} — Recall`;
    const handlers = {
      '': () => overviewView(ctx),
      learn: () => learnView(ctx, parts[3]),
      exams: () => examsView(ctx),
      exam: () => examView(ctx, parts[3]),
      cards: () => cardsView(ctx),
      tutor: () => tutorView(ctx),
      mistakes: () => mistakesView(ctx),
      plan: () => planView(ctx),
      edit: () => editCourseView(ctx),
    };
    (handlers[sub] || handlers[''])();
    return;
  }

  setTabs(null);
  setCrumb('');
  document.title = 'Recall — Study desk';
  if (parts[0] === 'new') { setCrumb('New course'); newCourseView(ctx); }
  else if (parts[0] === 'settings') { setCrumb('Settings'); settingsView(ctx); }
  else homeView(ctx);
}

addEventListener('hashchange', route);
route();

// ── Focus timer (Pomodoro) ─────────────────────────────────────────
const timerBtn = $('#timer');
const T = state.timer;

function remaining() {
  return T.running ? Math.max(0, (T.endsAt - Date.now()) / 1000) : T.remaining;
}
function paintTimer() {
  const r = remaining();
  timerBtn.classList.toggle('is-running', T.running);
  timerBtn.innerHTML = `<span aria-hidden="true">${T.mode === 'focus' ? '■' : '□'}</span> ${T.mode === 'focus' ? 'Focus' : 'Break'} ${fmtClock(r)}`;
  timerBtn.setAttribute('aria-label', `${T.mode === 'focus' ? 'Focus' : 'Break'} timer, ${fmtClock(r)} left, ${T.running ? 'running — click to pause' : 'paused — click to start'}`);
  document.title = document.title.replace(/^\(\d+:\d+(:\d+)?\) /, '');
  if (T.running) document.title = `(${fmtClock(r)}) ${document.title}`;
}
function tick() {
  if (T.running && remaining() <= 0) {
    const wasFocus = T.mode === 'focus';
    if (wasFocus) logActivity('m', state.settings.focusMin);
    T.mode = wasFocus ? 'break' : 'focus';
    T.running = false;
    T.remaining = (wasFocus ? state.settings.breakMin : state.settings.focusMin) * 60;
    save();
    beep();
    toast(wasFocus ? `Nice work — ${state.settings.focusMin} focused minutes. Take a ${state.settings.breakMin}-minute break.` : 'Break over. Ready for another focus session?', 6000);
  }
  paintTimer();
}
timerBtn.addEventListener('click', () => {
  if (T.running) { T.remaining = remaining(); T.running = false; }
  else { T.endsAt = Date.now() + remaining() * 1000; T.running = true; }
  save();
  paintTimer();
});
timerBtn.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  T.running = false; T.mode = 'focus'; T.remaining = state.settings.focusMin * 60;
  save(); paintTimer();
  toast('Timer reset.');
});
setInterval(tick, 1000);
paintTimer();
