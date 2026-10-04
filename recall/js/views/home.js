import { esc, pct, daysBetween, fmtDate, plural } from '../util.js';
import { state, courseMastery, dueCards, streak } from '../store.js';
import { meter, heatmap } from '../ui.js';

export function homeView({ view }) {
  const s = streak();
  const totalDue = state.courses.reduce((n, c) => n + dueCards(c).length, 0);
  const answered = Object.values(state.activity).reduce((n, a) => n + (a.q || 0), 0);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.';

  view.innerHTML = `
    <div class="page-head">
      <div><p class="kicker">Your study desk</p><h1 class="page-title">${greet}</h1>
      <p>Pick a course, or paste a new syllabus to build one. Everything is saved in this browser.</p></div>
      <a class="btn btn-primary" href="#/new">New course <span class="arrow">→</span></a>
    </div>

    <div class="stats" style="margin-bottom:var(--space-8)">
      <div class="stat"><span class="label">Study streak</span><span class="big accent">${s}</span><small>${s === 1 ? 'day' : 'days'} in a row</small></div>
      <div class="stat"><span class="label">Courses</span><span class="big">${state.courses.length}</span><small>on your desk</small></div>
      <div class="stat"><span class="label">Cards due</span><span class="big">${totalDue}</span><small>flashcards to review</small></div>
      <div class="stat"><span class="label">Questions answered</span><span class="big">${answered}</span><small>all time</small></div>
    </div>

    <h2 class="sub-title">Courses</h2>
    <div class="course-list">
      ${state.courses.map((c) => {
        const cm = courseMastery(c);
        const days = c.examDate ? daysBetween(new Date(), c.examDate) : null;
        return `<a class="course-card" href="#/c/${c.id}">
          <div class="spread"><span class="tag ${c.demo ? 'tag-accent' : 'tag-neutral'}">${c.demo ? 'Sample course' : esc(c.subject || 'Course')}</span>
          ${days != null && days >= 0 ? `<span class="tag tag-ink">Exam in ${plural(days, 'day')}</span>` : ''}</div>
          <h3>${esc(c.title)}</h3>
          <span class="muted" style="font-size:14px">${esc(c.level || '')}</span>
          <div class="meta"><span>${plural(cm.total, 'topic')} · ${dueCards(c).length} cards due</span><span><b style="color:var(--color-text)">${pct(cm.overall)}</b> mastered</span></div>
          ${meter(cm.overall, false, 'Course mastery')}
        </a>`;
      }).join('')}
      <a class="course-card new" href="#/new"><span class="plus">+</span><h3>New course</h3><span class="muted">Paste a syllabus and your book titles.</span></a>
    </div>

    <h2 class="sub-title">Activity</h2>
    <div class="panel panel-pad">
      ${heatmap(20)}
      <p class="hint" style="margin:10px 0 0">Every square is a day. Questions, flashcards, lessons and focus sessions all count. Today is ${fmtDate(Date.now(), { weekday: 'long', day: 'numeric', month: 'long' })}.</p>
    </div>`;
}
