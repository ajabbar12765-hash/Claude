import { $, $$, esc, plural, fmtDate, toast } from '../util.js';
import { save } from '../store.js';
import { buildPlan, isDone } from '../planner.js';

export function planView({ view, course, refreshChrome }) {
  const paint = () => {
    const { days, untilExam } = buildPlan(course);
    view.innerHTML = `
      <div class="page-head"><div><p class="kicker">Study plan</p><h1 class="page-title">${untilExam != null && untilExam > 0 ? `${plural(untilExam, 'day')} to the exam.` : 'One day at a time.'}</h1>
        <p>New topics first, your weakest topics drilled every day, flashcards daily and a practice exam every few days. It rebuilds itself as you learn — miss a day and it simply re-plans.</p></div></div>
      <form id="settings" class="panel panel-pad row" style="align-items:flex-end;margin-bottom:var(--space-8)">
        <div class="field"><label for="exam">Exam date</label><input class="input" type="date" id="exam" value="${esc(course.examDate || '')}"></div>
        <div class="field"><label for="mins">Minutes per day</label><input class="input" type="number" id="mins" min="10" max="480" step="5" value="${course.dailyMinutes || 45}" style="width:140px"></div>
        <button class="btn btn-ink" type="submit">Update plan</button>
      </form>
      <div class="stack-lg">
        ${days.map((d, i) => {
          const over = d.total > d.budget;
          return `<section>
            <div class="spread" style="border-bottom:var(--rule);padding-bottom:8px">
              <h2 style="font-size:20px;margin:0">${i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : fmtDate(d.date, { weekday: 'long', day: 'numeric', month: 'short' })}</h2>
              <span class="muted" style="font-size:13px${over ? ';color:var(--color-accent-700)' : ''}">${d.total} min planned${over ? ` · over your ${d.budget} min — do the top ones first` : ''}</span>
            </div>
            <ul class="list" style="border-top:0">${d.tasks.map((t) => {
              const done = isDone(course, t);
              return `<li class="task${done ? ' done' : ''}">
                <input type="checkbox" data-task="${esc(t.id)}" ${done ? 'checked' : ''} ${t.kind === 'learn' ? 'disabled title="Ticks itself when you finish the lesson"' : ''} aria-label="Mark done: ${esc(t.label)}">
                <a class="list-link" href="${t.href}" style="flex:1"><span class="title">${esc(t.label)}</span><span class="muted" style="margin-left:auto;font-size:13px;white-space:nowrap">${t.min} min</span></a></li>`;
            }).join('')}</ul></section>`;
        }).join('')}
      </div>`;

    $('#settings').onsubmit = (e) => {
      e.preventDefault();
      course.examDate = $('#exam').value;
      course.dailyMinutes = Math.max(10, Math.min(480, +$('#mins').value || 45));
      save();
      toast('Plan updated.');
      paint();
    };
    $$('[data-task]').forEach((cb) => cb.onchange = () => {
      if (cb.checked) course.planDone[cb.dataset.task] = true; else delete course.planDone[cb.dataset.task];
      cb.closest('.task').classList.toggle('done', cb.checked);
      save();
    });
  };
  paint();
  refreshChrome();
}
