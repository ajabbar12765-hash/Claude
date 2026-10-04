import { $, $$, esc, mdInline, typeset, fmtAgo, plural, shuffle, LETTERS } from '../util.js';
import { save, findTopic } from '../store.js';
import { createExam, correctText } from '../exam-engine.js';

export function mistakesView({ view, course, go, refreshChrome }) {
  let showResolved = false;

  const paint = () => {
    const open = course.mistakes.filter((x) => !x.resolved);
    const list = (showResolved ? course.mistakes : open).slice().sort((a, b) => b.at - a.at);
    const groups = new Map();
    for (const x of list) {
      const g = groups.get(x.q.topicId) || [];
      g.push(x);
      groups.set(x.q.topicId, g);
    }
    view.innerHTML = `
      <div class="page-head"><div><p class="kicker">Mistakes notebook</p><h1 class="page-title">Wrong answers are data.</h1>
        <p>Every question you missed, with the right answer and why. Get one right in a later exam and it’s crossed off automatically.</p></div>
        <div class="btn-row">
          <button class="btn btn-primary" id="retest" ${open.length ? '' : 'disabled'}>Retest all ${open.length} →</button>
          <label class="check"><input type="checkbox" id="resolved" ${showResolved ? 'checked' : ''}>Show fixed ones</label>
        </div></div>
      ${list.length ? [...groups.entries()].map(([tid, items]) => `
        <section style="margin-bottom:var(--space-8)">
          <div class="spread" style="border-bottom:var(--rule);padding-bottom:8px;margin-bottom:0">
            <h2 style="font-size:22px;margin:0">${esc(findTopic(course, tid)?.title || 'Topic')}</h2>
            <div class="btn-row"><span class="muted" style="font-size:14px">${plural(items.length, 'question')}</span><a class="btn btn-ghost btn-sm" href="#/c/${course.id}/learn/${tid}">Re-learn</a></div>
          </div>
          ${items.map((x) => `<article class="review-item" style="${x.resolved ? 'opacity:.6' : ''}">
            <div class="qmeta"><span class="row" style="gap:6px">${x.resolved ? '<span class="tag tag-neutral">Fixed ✓</span>' : `<span class="tag tag-accent">Missed ${x.misses > 1 ? x.misses + '×' : ''}</span>`}<span class="muted" style="font-size:13px">${fmtAgo(x.at)}</span></span>
              ${x.resolved ? '' : `<button class="btn btn-ghost btn-sm" data-fix="${x.id}">I’ve got it now</button>`}</div>
            <div class="qtext" style="font-size:18px;margin-bottom:10px">${mdInline(x.q.prompt)}</div>
            <div class="answer-line"><span class="k">You said</span><span>${x.answer ? mdInline(x.answer) : '<span class="muted">No answer</span>'}</span></div>
            <div class="answer-line"><span class="k">Correct</span><span><b>${x.q.type === 'short' ? '' : LETTERS[x.q.answerIndex] + ' — '}${mdInline(correctText(x.q))}</b></span></div>
            ${x.q.explanation ? `<div class="answer-line"><span class="k">Why</span><span>${mdInline(x.q.explanation)}</span></div>` : ''}
          </article>`).join('')}
        </section>`).join('')
      : `<div class="empty"><h3>${course.mistakes.length ? 'All fixed. ' : ''}Nothing here${course.mistakes.length ? ' right now' : ' yet'}.</h3><p>Questions you get wrong in exams land here, so you can see exactly what to fix.</p><a class="btn btn-primary" href="#/c/${course.id}/exams">Take an exam</a></div>`}`;
    typeset(view);

    $('#resolved').onchange = (e) => { showResolved = e.target.checked; paint(); };
    $$('[data-fix]').forEach((b) => b.onclick = () => {
      const x = course.mistakes.find((y) => y.id === b.dataset.fix);
      x.resolved = true; x.resolvedAt = Date.now();
      save(); refreshChrome(); paint();
    });
    $('#retest').onclick = () => {
      const qs = shuffle(open).slice(0, 40).map((x, i) => ({ ...structuredClone(x.q), id: `q${i + 1}` }));
      const exam = createExam(course, { title: 'Mistakes retest', scope: 'mistakes', count: qs.length, types: ['mcq', 'tf', 'short'], timer: 0, mode: 'practice' }, qs, 'Mistakes retest');
      go(`#/c/${course.id}/exam/${exam.id}`);
    };
  };
  paint();
}
