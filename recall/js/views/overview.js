import { esc, pct, plural, daysBetween, fmtDate, fmtAgo } from '../util.js';
import { save, courseMastery, weakest, allTopics, dueCards } from '../store.js';
import { meter, legend, topicTile, levelTag } from '../ui.js';
import { buildPlan, isDone } from '../planner.js';

export function overviewView({ view, course, refreshChrome }) {
  const cm = courseMastery(course);
  const m = cm.m;
  const topics = allTopics(course);
  const due = dueCards(course).length;
  const weak = weakest(course, 3).filter((t) => t.m.score < 0.75);
  const nextUnread = topics.find((t) => !course.read[t.id]);
  const days = course.examDate ? daysBetween(new Date(), course.examDate) : null;
  const plan = buildPlan(course);
  const today = plan.days[0];
  const done = course.exams.filter((e) => e.status === 'done').slice(-4).reverse();

  const recs = [];
  if (!course.history.length) recs.push({ k: 'Start here', t: 'Take a diagnostic exam', d: 'A short exam across the whole syllabus shows where you stand, so everything after it can aim at your weak spots.', a: [['Start diagnostic', `#/c/${course.id}/exams?preset=diagnostic`, 'btn-primary']] });
  for (const t of weak.slice(0, recs.length ? 1 : 2)) {
    recs.push({ k: `${t.m.score < 0.5 ? 'Struggling' : 'Shaky'} · ${pct(t.m.score)}`, t: t.title, d: 'Your weakest topic right now. Re-learn it, then drill it until it sticks.', a: [['Re-learn', `#/c/${course.id}/learn/${t.id}?style=simpler`, 'btn-secondary'], ['Drill it', `#/c/${course.id}/exams?topic=${t.id}`, 'btn-primary']] });
  }
  if (nextUnread && recs.length < 3) recs.push({ k: 'Next lesson', t: nextUnread.title, d: nextUnread.summary || nextUnread.unit, a: [['Start lesson', `#/c/${course.id}/learn/${nextUnread.id}`, 'btn-primary']] });
  if (due && recs.length < 3) recs.push({ k: 'Flashcards', t: `${plural(due, 'card')} due`, d: 'A few minutes of review now keeps them from slipping.', a: [['Review now', `#/c/${course.id}/cards`, 'btn-primary']] });
  if (recs.length < 3) recs.push({ k: 'Ask anything', t: 'Talk to your tutor', d: 'It knows your syllabus, your books and your weak spots.', a: [['Open tutor', `#/c/${course.id}/tutor`, 'btn-secondary']] });

  view.innerHTML = `
    <div class="page-head">
      <div>
        <p class="kicker">${esc(course.level || 'Course')}${course.books.length ? ` · ${esc(course.books.join(' · '))}` : ''}</p>
        <h1 class="page-title">${esc(course.title)}</h1>
        ${course.summary ? `<p>${esc(course.summary)}</p>` : ''}
      </div>
      <div class="btn-row">
        <a class="btn btn-secondary btn-sm" href="#/c/${course.id}/edit">Edit course</a>
        <a class="btn btn-primary" href="#/c/${course.id}/exams">Practice exam <span class="arrow">→</span></a>
      </div>
    </div>

    <div class="stats">
      <div class="stat"><span class="label">Mastery</span><span class="big accent">${pct(cm.overall)}</span><small>${cm.tested} of ${cm.total} topics tested</small></div>
      <div class="stat"><span class="label">Mastered</span><span class="big">${cm.counts.mastered || 0}<span style="font-size:.5em;color:var(--color-muted)">/${cm.total}</span></span><small>${cm.counts.weak || 0} struggling</small></div>
      <div class="stat"><span class="label">Exam</span><span class="big">${days == null ? '—' : days < 0 ? 'Done' : days}</span><small>${days == null ? '<a href="#/c/' + course.id + '/plan">Set your exam date</a>' : days < 0 ? 'exam date has passed' : `${days === 1 ? 'day' : 'days'} to go · ${fmtDate(course.examDate + 'T00:00')}`}</small></div>
      <div class="stat"><span class="label">Cards due</span><span class="big">${due}</span><small>${course.cards.length} cards in the deck</small></div>
    </div>

    <h2 class="sub-title">Up next</h2>
    <div class="grid3" style="border-width:2px">
      ${recs.slice(0, 3).map((r) => `<div class="cell" style="display:flex;flex-direction:column;gap:10px">
        <p class="kicker" style="margin:0">${esc(r.k)}</p>
        <h3 style="margin:0">${esc(r.t)}</h3>
        <p style="font-size:15px">${esc(r.d || '')}</p>
        <div class="btn-row" style="margin-top:auto">${r.a.map(([l, h, c]) => `<a class="btn ${c} btn-sm" href="${h}">${esc(l)}</a>`).join('')}</div>
      </div>`).join('')}
    </div>

    <div class="cols" style="margin-top:var(--space-8)">
      <div>
        <div class="spread" style="margin-bottom:12px"><h2 class="sub-title" style="margin:0">Mastery map</h2>${legend()}</div>
        ${course.units.map((u) => {
          const ts = u.topics;
          const avg = ts.reduce((s, t) => s + (m[t.id]?.n >= 1 ? m[t.id].score : 0), 0) / (ts.length || 1);
          return `<div class="unit"><div class="unit-head"><h3>${esc(u.title)}</h3><span class="muted" style="font-size:13px">${pct(avg)}</span></div>
            <div class="topic-grid">${ts.map((t) => topicTile(course, t, m[t.id])).join('')}</div></div>`;
        }).join('')}
      </div>
      <aside class="stack-lg">
        <div class="panel">
          <div class="panel-pad spread" style="border-bottom:var(--rule)"><h3 style="margin:0;font-size:20px">Today’s plan</h3><a href="#/c/${course.id}/plan" style="font-size:14px">Full plan →</a></div>
          <ul class="list" style="border-top:0;padding:0 var(--space-4)">
            ${today.tasks.map((t) => {
              const d = isDone(course, t);
              return `<li class="task${d ? ' done' : ''}"><input type="checkbox" data-task="${esc(t.id)}" ${d ? 'checked' : ''} ${t.kind === 'learn' ? 'disabled title="Ticks itself when you read the lesson"' : ''} aria-label="Mark done: ${esc(t.label)}">
                <a class="list-link" href="${t.href}" style="flex:1"><span class="title">${esc(t.label)}</span><span class="muted" style="margin-left:auto;font-size:13px;white-space:nowrap">${t.min} min</span></a></li>`;
            }).join('')}
          </ul>
        </div>
        <div class="panel">
          <div class="panel-pad spread" style="border-bottom:var(--rule)"><h3 style="margin:0;font-size:20px">Recent exams</h3><a href="#/c/${course.id}/exams" style="font-size:14px">All →</a></div>
          ${done.length ? `<ul class="list" style="border-top:0;padding:0 var(--space-4)">${done.map((e) => `<li><a class="list-link" href="#/c/${course.id}/exam/${e.id}"><span class="title">${esc(e.title)}</span><span class="muted" style="font-size:13px">${fmtAgo(e.finished)}</span><b style="margin-left:auto;color:var(--color-accent)">${pct(e.score)}</b></a></li>`).join('')}</ul>`
            : `<p class="panel-pad muted" style="margin:0">No exams yet.</p>`}
        </div>
        ${weak.length ? `<div class="panel panel-pad stack"><h3 style="margin:0;font-size:20px">Struggling with</h3>
          ${weak.map((t) => `<div><div class="spread" style="font-size:14px;margin-bottom:4px"><a href="#/c/${course.id}/learn/${t.id}" style="color:inherit;font-weight:600">${esc(t.title)}</a>${levelTag(t.m.score < 0.5 ? 'weak' : 'learning')}</div>${meter(t.m.score, true)}</div>`).join('')}
        </div>` : ''}
      </aside>
    </div>`;

  view.querySelectorAll('[data-task]').forEach((cb) => cb.addEventListener('change', () => {
    if (cb.checked) course.planDone[cb.dataset.task] = true; else delete course.planDone[cb.dataset.task];
    cb.closest('.task').classList.toggle('done', cb.checked);
    save();
  }));
  refreshChrome();
}
