import { $, $$, esc, pct, plural, fmtAgo, fmtClock, mdInline, renderMd, typeset, LETTERS, toast, dialog, confirmDialog, shuffle } from '../util.js';
import { state, save, allTopics, findTopic, masteryMap, courseCtx, level } from '../store.js';
import { run, explainError } from '../ai.js';
import { working, setWorking, errorNotice, meter, levelTag, difficultyDots, typeLabel } from '../ui.js';
import { planExam, writeExam, bankExam, createExam, localResult, markShort, selfMark, finalizeExam, applyDispute, answerText, correctText } from '../exam-engine.js';

const PRESETS = {
  diagnostic: { title: 'Diagnostic exam', scope: 'all', count: 20, difficulty: 2, types: ['mcq', 'tf'], timer: 0, mode: 'exam' },
  adaptive: { title: 'Adaptive practice exam', scope: 'adaptive', count: 20, difficulty: 'adaptive', types: ['mcq', 'tf', 'short'], timer: 0, mode: 'exam' },
  mock: { title: 'Full mock exam', scope: 'all', count: 40, difficulty: 'mixed', types: ['mcq', 'tf', 'short'], timer: 60, mode: 'exam' },
};

// ════════════════════ Exams: set up a new one, list old ones ════════════════════
export function examsView({ view, course, q, onLeave, go, refreshChrome }) {
  const topics = allTopics(course);
  const m = masteryMap(course);
  const cfg = {
    title: '', scope: 'adaptive', topicIds: [], count: 20, types: ['mcq', 'tf', 'short'], difficulty: 'adaptive', timer: 0, mode: 'exam',
    ...(PRESETS[q.preset] || {}),
  };
  if (q.preset) cfg.preset = q.preset;
  if (q.topic && findTopic(course, q.topic)) Object.assign(cfg, { scope: 'pick', topicIds: [q.topic], count: 10, mode: 'practice', title: `Drill: ${findTopic(course, q.topic).title}` });
  let ctrl;
  onLeave(() => ctrl?.abort());

  const seg = (name, opts, cur) => `<div class="seg" role="radiogroup">${opts.map(([v, l]) => `<label class="seg-opt"><input type="radio" name="${name}" value="${v}" ${String(cur) === String(v) ? 'checked' : ''}>${l}</label>`).join('')}</div>`;

  const paint = (err) => {
    const past = [...course.exams].reverse();
    view.innerHTML = `
      <div class="page-head"><div><p class="kicker">Practice exams</p><h1 class="page-title">Get tested.</h1>
        <p>Every exam is written for your syllabus, checked, then marked — and the next one aims at what you got wrong.</p></div></div>
      <div class="cols">
        <form id="cfg" class="stack-lg panel panel-pad" novalidate>
          <div class="field"><span class="label">What should it cover?</span>
            ${seg('scope', [['adaptive', 'Focus on my weak spots'], ['all', 'Whole syllabus'], ['pick', 'Choose topics']], cfg.scope)}
            <span class="hint" id="scope-hint"></span>
          </div>
          <div id="pick" ${cfg.scope === 'pick' ? '' : 'hidden'} class="stack" style="max-height:340px;overflow:auto;border:var(--rule);padding:12px;background:var(--color-paper)">
            ${course.units.map((u) => `<div><div class="label" style="margin-bottom:6px">${esc(u.title)}</div>
              ${u.topics.map((t) => `<label class="check" style="display:flex;padding:3px 0"><input type="checkbox" name="topic" value="${t.id}" ${cfg.topicIds.includes(t.id) ? 'checked' : ''}><span style="flex:1">${esc(t.title)}</span>${levelTag(level(m[t.id]))}</label>`).join('')}</div>`).join('')}
          </div>
          <div class="field"><span class="label">Length</span>${seg('count', [[5, '5'], [10, '10'], [20, '20'], [30, '30'], [40, '40']], cfg.count)}</div>
          <div class="field"><span class="label">Question types</span>
            <div class="row">
              <label class="check"><input type="checkbox" name="types" value="mcq" ${cfg.types.includes('mcq') ? 'checked' : ''}>Multiple choice</label>
              <label class="check"><input type="checkbox" name="types" value="tf" ${cfg.types.includes('tf') ? 'checked' : ''}>True / false</label>
              <label class="check"><input type="checkbox" name="types" value="short" ${cfg.types.includes('short') ? 'checked' : ''}>Written answers</label>
            </div></div>
          <div class="field"><span class="label">Difficulty</span>${seg('difficulty', [['adaptive', 'Adaptive'], [1, 'Foundation'], [2, 'Standard'], [3, 'Challenging'], ['mixed', 'Mixed']], cfg.difficulty)}</div>
          <div class="field"><span class="label">Mode</span>${seg('mode', [['exam', 'Exam — mark at the end'], ['practice', 'Practice — feedback after each']], cfg.mode)}</div>
          <div class="field"><span class="label">Time limit</span>${seg('timer', [[0, 'None'], [15, '15 min'], [30, '30 min'], [60, '1 hour'], [90, '90 min'], [120, '2 hours']], cfg.timer)}</div>
          <div id="err">${err ? errorNotice(err, 'retry') : ''}</div>
          <div class="btn-row">
            <button class="btn btn-primary" type="submit">Write my exam <span class="arrow">→</span></button>
            ${course.bank.length ? `<button class="btn btn-secondary" type="button" id="offline" title="Uses questions Recall has already written or saved — works without AI">Use my question bank (${course.bank.length})</button>` : ''}
          </div>
        </form>
        <aside>
          <h2 class="sub-title" style="margin-top:0">Your exams</h2>
          ${past.length ? `<ul class="list">${past.map((e) => `<li><a class="list-link" href="#/c/${course.id}/exam/${e.id}">
              <span style="flex:1;min-width:0"><span class="title" style="display:block">${esc(e.title)}</span><span class="muted" style="font-size:13px">${plural(e.questions.length, 'question')} · ${fmtAgo(e.created)}</span></span>
              ${e.status === 'done' ? `<b style="color:var(--color-accent);font-size:20px">${pct(e.score)}</b>` : '<span class="tag tag-accent">In progress</span>'}</a></li>`).join('')}</ul>`
            : `<div class="empty" style="padding:24px"><p style="margin:0">No exams yet. Your first one sets the baseline for everything Recall teaches you next.</p></div>`}
        </aside>
      </div>`;

    const f = $('#cfg');
    const hint = () => {
      const s = f.scope.value;
      $('#scope-hint').textContent = s === 'adaptive' ? 'More questions on topics you’re weak at or haven’t been tested on; harder questions where you’re strong.' : s === 'all' ? 'Questions spread across every unit, weighted by how heavily each topic is examined.' : 'Only the topics you tick.';
      $('#pick').hidden = s !== 'pick';
    };
    hint();
    f.addEventListener('change', hint);
    const read = () => {
      cfg.scope = f.scope.value;
      cfg.count = +f.count.value;
      cfg.types = $$('[name=types]:checked', f).map((i) => i.value);
      cfg.difficulty = isNaN(+f.difficulty.value) ? f.difficulty.value : +f.difficulty.value;
      cfg.mode = f.mode.value;
      cfg.timer = +f.timer.value;
      cfg.topicIds = $$('[name=topic]:checked', f).map((i) => i.value);
      if (!cfg.title || !q.topic) {
        cfg.title = cfg.preset && PRESETS[cfg.preset] ? PRESETS[cfg.preset].title
          : cfg.scope === 'pick' && cfg.topicIds.length === 1 ? `Drill: ${findTopic(course, cfg.topicIds[0]).title}`
          : cfg.scope === 'adaptive' ? 'Adaptive practice exam' : cfg.scope === 'all' ? 'Whole-syllabus exam' : 'Topic exam';
      }
      if (!cfg.types.length) { toast('Pick at least one question type.'); return false; }
      if (cfg.scope === 'pick' && !cfg.topicIds.length) { toast('Tick at least one topic.'); return false; }
      return true;
    };
    f.onsubmit = (e) => { e.preventDefault(); if (read()) generate(); };
    $('#retry')?.addEventListener('click', () => { if (read()) generate(); });
    $('#offline')?.addEventListener('click', () => {
      if (!read()) return;
      const qs = bankExam(course, cfg, planExam(course, cfg));
      if (!qs.length) { toast('No saved questions match those settings yet.'); return; }
      if (qs.length < cfg.count) toast(`Your bank had ${qs.length} matching questions.`);
      const exam = createExam(course, { ...cfg }, qs, `${cfg.title} (from bank)`);
      go(`#/c/${course.id}/exam/${exam.id}`);
    });
  };

  const generate = async () => {
    const plan = planExam(course, cfg);
    if (!plan.length) { toast('No topics to test.'); return; }
    ctrl = new AbortController();
    view.innerHTML = `<div class="page-head"><div><p class="kicker">${esc(cfg.title)}</p><h1 class="page-title">Writing your exam.</h1>
      <p>${plural(cfg.count, 'question')} across ${plural(plan.length, 'topic')}${state.settings.verify ? ', each one solved a second time by an independent checker before you see it' : ''}.</p></div></div>
      ${working('Writing your exam', 'Usually 30–90 seconds.')}
      <div class="panel panel-pad" style="margin-top:16px"><div class="label" style="margin-bottom:8px">The plan</div>
        <div class="stack" style="font-size:14px">${plan.map((p) => `<div class="spread"><span>${esc(p.title)}</span><span class="muted">${plural(p.count, 'question')} · difficulty ${esc(p.difficulty)}</span></div>`).join('')}</div></div>
      <div class="btn-row" style="margin-top:16px"><button class="btn btn-secondary" id="cancel">Cancel</button></div>`;
    $('#cancel').onclick = () => { ctrl.abort(); paint(); };
    const w = $('#work');
    try {
      const qs = await writeExam(course, cfg, plan, { signal: ctrl.signal, onProgress: (sub, p) => setWorking(w, { title: p >= 0.72 ? 'Checking the answer key' : 'Writing your exam', sub, progress: p }) });
      if (!qs.length) throw Object.assign(new Error('No usable questions came back. Please try again.'), { code: 'empty' });
      const exam = createExam(course, { ...cfg }, shuffle(qs).map((x, i) => ({ ...x, id: `q${i + 1}` })), cfg.title);
      go(`#/c/${course.id}/exam/${exam.id}`);
    } catch (err) {
      if (err.name === 'AbortError') return;
      paint(err);
      const e = explainError(err);
      if ((e.offline || e.needsKey) && course.bank.length) $('#err').insertAdjacentHTML('beforeend', `<p class="hint" style="margin-top:8px">No AI right now — “Use my question bank” still works.</p>`);
    }
  };

  paint();
  refreshChrome();
}

// ════════════════════ One exam: take it, then review it ════════════════════
export function examView(ctx, examId) {
  const { course } = ctx;
  const exam = course.exams.find((e) => e.id === examId);
  if (!exam) { ctx.view.innerHTML = `<div class="empty"><h3>Exam not found</h3><a class="btn btn-primary" href="#/c/${course.id}/exams">Back to exams</a></div>`; return; }
  if (exam.status === 'done') return resultsView(ctx, exam);
  if (exam.status === 'marking') return markingView(ctx, exam);
  takeView(ctx, exam);
}

function takeView(ctx, exam) {
  const { view, course, onLeave } = ctx;
  const qs = exam.questions;
  const N = qs.length;
  const practice = exam.mode === 'practice';
  let checking = null;

  const timeLeft = () => exam.timeLimit ? exam.timeLimit - (Date.now() - exam.startedAt) / 1000 : null;

  const paint = () => {
    const i = Math.min(exam.current, N - 1);
    const q = qs[i];
    const a = exam.answers[q.id];
    const r = exam.results[q.id];
    const locked = practice && !!r;
    const topic = findTopic(course, q.topicId);
    const answeredCount = qs.filter((x) => answerText(x, exam.answers[x.id])).length;

    let body;
    if (q.type === 'short') {
      body = `<label class="sr-only" for="ans">Your answer</label>
        <textarea class="input" id="ans" placeholder="Write your answer…" ${locked ? 'readonly' : ''} style="min-height:160px;font-size:16px">${esc(a?.text || '')}</textarea>
        ${practice && !r ? `<div class="btn-row" style="margin-top:10px"><button class="btn btn-ink btn-sm" id="check" ${checking ? 'disabled' : ''}>${checking ? 'Marking…' : 'Check my answer'}</button></div>` : ''}`;
    } else {
      body = `<div class="choices" role="radiogroup" aria-label="Answer options">${q.options.map((o, k) => {
        let cls = 'opt';
        if (locked) { if (k === q.answerIndex) cls += ' is-correct'; else if (a?.choice === k) cls += ' is-wrong'; }
        else if (a?.choice === k) cls += ' is-selected';
        return `<button class="${cls}" data-k="${k}" role="radio" aria-checked="${a?.choice === k}" ${locked ? 'disabled' : ''}><span class="letter">${LETTERS[k]}</span><span>${mdInline(o)}</span><span class="kbd" aria-hidden="true">${k + 1}</span></button>`;
      }).join('')}</div>`;
    }

    const fb = locked ? `<div class="feedback" aria-live="polite"><span class="verdict ${r.verdict}">${r.verdict === 'correct' ? 'Correct.' : r.verdict === 'partial' ? 'Partly right.' : 'Not quite.'}</span>
      ${r.feedback ? `<p style="margin:6px 0">${esc(r.feedback)}</p>` : ''}
      ${q.type === 'short' ? `<p style="margin:6px 0"><b>Model answer:</b> <span class="md">${mdInline(q.modelAnswer)}</span></p>` : r.verdict !== 'correct' ? `<p style="margin:6px 0"><b>Answer:</b> ${LETTERS[q.answerIndex]} — ${mdInline(correctText(q))}</p>` : ''}
      <div class="prose md-expl" style="font-size:15px"></div></div>` : '';

    view.innerHTML = `
      <div class="exam-shell">
        <div>
          <div class="spread" style="margin-bottom:14px"><div><p class="kicker" style="margin:0">${esc(exam.title)}</p></div>
            <span class="row" style="gap:12px"><span class="timer show-sm" id="clock-m">${exam.timeLimit ? fmtClock(timeLeft()) + ' left' : fmtClock((Date.now() - exam.startedAt) / 1000)}</span><span class="muted" style="font-size:14px">${answeredCount} of ${N} answered</span></span></div>
          <article class="qcard">
            <div class="qmeta"><span class="tag tag-ink">Question ${i + 1} of ${N}</span>
              <span class="row" style="gap:6px"><span class="tag tag-neutral">${esc(topic?.title || '')}</span>${difficultyDots(q.difficulty)}<span class="tag tag-outline">${typeLabel(q.type)}</span></span></div>
            <div class="qtext prose" style="max-width:none">${mdInline(q.prompt)}</div>
            ${body}
            ${fb}
          </article>
          <div class="qnav">
            <div class="btn-row">
              <button class="btn btn-secondary" id="prev" ${i === 0 ? 'disabled' : ''}>← Previous</button>
              <button class="btn btn-ghost" id="flag">${exam.flags[q.id] ? '■ Flagged' : '□ Flag for review'}</button>
            </div>
            ${i < N - 1 ? `<button class="btn btn-ink" id="next">Next →</button>` : `<button class="btn btn-primary" id="submit">${practice ? 'Finish' : 'Submit exam'} →</button>`}
          </div>
          <p class="hint no-print" style="margin-top:14px">Keys: 1–4 to answer · ← → to move · F to flag${practice ? '' : ' · nothing is marked until you submit'}.</p>
        </div>
        <aside class="exam-side stack">
          ${exam.timeLimit ? `<div class="panel panel-pad clock-panel"><span class="label" style="display:block">Time left</span><div class="timer" id="clock" style="font-size:34px">${fmtClock(timeLeft())}</div></div>` : `<div class="panel panel-pad clock-panel"><span class="label" style="display:block">Time</span><div class="timer" id="clock" style="font-size:34px">${fmtClock((Date.now() - exam.startedAt) / 1000)}</div></div>`}
          <div class="navgrid" aria-label="Questions">${qs.map((x, k) => {
            const rr = exam.results[x.id];
            const cls = [practice && rr ? `r-${rr.verdict}` : answerText(x, exam.answers[x.id]) ? 'answered' : '', k === i ? 'current' : '', exam.flags[x.id] ? 'flagged' : ''].join(' ');
            return `<button class="${cls}" data-go="${k}" aria-label="Question ${k + 1}${exam.flags[x.id] ? ', flagged' : ''}">${k + 1}</button>`;
          }).join('')}</div>
          <button class="btn btn-secondary btn-block" id="submit2">${practice ? 'Finish now' : 'Submit exam'}</button>
          <button class="btn btn-ghost btn-sm" id="print">Print this exam</button>
        </aside>
      </div>`;

    typeset(view);
    if (locked && q.explanation) renderMd($('.md-expl', view), `**Why:** ${q.explanation}${q.source ? `\n\n*Revise:* ${q.source}` : ''}`);

    $$('[data-k]', view).forEach((b) => b.onclick = () => choose(+b.dataset.k));
    $$('[data-go]', view).forEach((b) => b.onclick = () => { exam.current = +b.dataset.go; save(); paint(); });
    $('#prev').onclick = () => move(-1);
    $('#next')?.addEventListener('click', () => move(1));
    $('#submit')?.addEventListener('click', submit);
    $('#submit2').onclick = submit;
    $('#flag').onclick = () => { exam.flags[q.id] = !exam.flags[q.id]; save(); paint(); };
    $('#print').onclick = () => printExam(exam, course, false);
    const ta = $('#ans', view);
    if (ta) {
      ta.addEventListener('input', () => { exam.answers[q.id] = { text: ta.value }; save(); });
      if (!locked) ta.focus({ preventScroll: true });
    }
    $('#check')?.addEventListener('click', () => checkShort(q));
  };

  const choose = (k) => {
    const q = qs[exam.current];
    if (practice && exam.results[q.id]) return;
    exam.answers[q.id] = { choice: k };
    if (practice) exam.results[q.id] = localResult(q, exam.answers[q.id]);
    save();
    paint();
  };
  const move = (d) => {
    const n = exam.current + d;
    if (n < 0 || n >= N) return;
    exam.current = n;
    save();
    paint();
  };

  const checkShort = async (q) => {
    if (!exam.answers[q.id]?.text?.trim()) { toast('Write an answer first.'); return; }
    checking = q.id;
    paint();
    try {
      const left = await markShort(course, exam, [q]);
      if (left.length) throw new Error('Not marked');
    } catch (err) {
      const e = explainError(err);
      if (!e) { checking = null; return; }
      const choice = await selfMarkDialog(q, exam.answers[q.id].text);
      if (choice != null) selfMark(exam, q.id, choice);
    }
    checking = null;
    save();
    paint();
  };

  const submit = async () => {
    const unanswered = qs.filter((x) => !answerText(x, exam.answers[x.id])).length;
    const flagged = qs.filter((x) => exam.flags[x.id]).length;
    if (!exam._timeUp && (unanswered || flagged)) {
      const ok = await confirmDialog(practice ? 'Finish practice?' : 'Submit your exam?',
        `${unanswered ? `${plural(unanswered, 'question')} unanswered. ` : ''}${flagged ? `${plural(flagged, 'question')} flagged for review. ` : ''}Unanswered questions score zero.`, practice ? 'Finish' : 'Submit');
      if (!ok) return;
    }
    exam.status = 'marking';
    save(true);
    markingView(ctx, exam);
  };

  const onKey = (e) => {
    if (e.target.closest('textarea, input, .dialog')) return;
    if (/^[1-8]$/.test(e.key) && qs[exam.current].type !== 'short') {
      const k = +e.key - 1;
      if (k < qs[exam.current].options.length) { e.preventDefault(); choose(k); }
    } else if (/^[a-d]$/i.test(e.key) && !e.metaKey && !e.ctrlKey && qs[exam.current].type !== 'short') {
      const k = e.key.toLowerCase().charCodeAt(0) - 97;
      if (k < qs[exam.current].options.length) { e.preventDefault(); choose(k); }
    } else if (e.key === 'ArrowRight') move(1);
    else if (e.key === 'ArrowLeft') move(-1);
    else if (e.key.toLowerCase() === 'f') { exam.flags[qs[exam.current].id] = !exam.flags[qs[exam.current].id]; save(); paint(); }
  };
  document.addEventListener('keydown', onKey);
  onLeave(() => document.removeEventListener('keydown', onKey));

  const clock = setInterval(() => {
    const el = $('#clock');
    if (!el) return;
    const m = $('#clock-m');
    if (exam.timeLimit) {
      const t = timeLeft();
      el.textContent = fmtClock(t);
      el.style.color = t < 60 ? 'var(--color-accent)' : '';
      if (m) { m.textContent = `${fmtClock(t)} left`; m.style.color = el.style.color; }
      if (t <= 0 && exam.status === 'taking') {
        clearInterval(clock);
        exam._timeUp = true;
        toast('Time’s up — your exam has been submitted.', 5000);
        submit();
      }
    } else {
      el.textContent = fmtClock((Date.now() - exam.startedAt) / 1000);
      if (m) m.textContent = el.textContent;
    }
  }, 1000);
  onLeave(() => clearInterval(clock));

  if (exam.timeLimit && timeLeft() <= 0) { exam._timeUp = true; submit(); return; }
  paint();
}

function selfMarkDialog(q, answer) {
  return dialog({
    title: 'Mark this one yourself',
    body: `<p class="hint">Claude isn’t available to mark written answers right now, so compare your answer with the model answer.</p>
      <div class="answer-line"><span class="k">Question</span><span>${mdInline(q.prompt)}</span></div>
      <div class="answer-line"><span class="k">Your answer</span><span>${esc(answer)}</span></div>
      <div class="answer-line"><span class="k">Model answer</span><span>${mdInline(q.modelAnswer)}</span></div>
      ${q.rubric ? `<div class="answer-line"><span class="k">Marking points</span><span>${esc(q.rubric)}</span></div>` : ''}`,
    actions: [{ label: 'I got it right', cls: 'btn-primary', value: 1 }, { label: 'Partly', value: 0.5 }, { label: 'I missed it', value: 0 }],
    onOpen: (w) => typeset(w),
  }).then((r) => (r ? r.value : null));
}

// Marks anything still unmarked (written answers), then finalises.
async function markingView(ctx, exam) {
  const { view, course, onLeave, go } = ctx;
  const ctrl = new AbortController();
  onLeave(() => ctrl.abort());
  for (const q of exam.questions) {
    if (exam.results[q.id]) continue;
    const r = localResult(q, exam.answers[q.id]);
    if (r) exam.results[q.id] = r;
  }
  const pending = exam.questions.filter((q) => !exam.results[q.id]);
  if (pending.length) {
    view.innerHTML = `<div class="page-head"><div><p class="kicker">${esc(exam.title)}</p><h1 class="page-title">Marking your answers.</h1></div></div>${working('Marking your written answers', `${plural(pending.length, 'written answer')} — checked against the rubric.`)}`;
    let left = pending.map((q) => q.id);
    try {
      left = await markShort(course, exam, pending, { signal: ctrl.signal });
    } catch (err) {
      if (err.name === 'AbortError') return;
      toast(explainError(err).msg || 'Could not mark written answers.', 5000);
    }
    for (const id of left) {
      const q = exam.questions.find((x) => x.id === id);
      const v = await selfMarkDialog(q, exam.answers[id]?.text || '');
      selfMark(exam, id, v ?? 0);
    }
  }
  finalizeExam(course, exam);
  if (location.hash.endsWith(exam.id)) resultsView(ctx, exam); else go(`#/c/${course.id}/exam/${exam.id}`);
}

// ════════════════════ Results & review ════════════════════
function resultsView(ctx, exam) {
  const { view, course, go, refreshChrome } = ctx;
  const qs = exam.questions;
  const byTopic = new Map();
  for (const q of qs) {
    const t = byTopic.get(q.topicId) || { n: 0, s: 0 };
    t.n++; t.s += exam.results[q.id]?.score || 0;
    byTopic.set(q.topicId, t);
  }
  const m = masteryMap(course);
  const missed = qs.filter((q) => (exam.results[q.id]?.score ?? 0) < 0.85);
  const marks = qs.reduce((s, q) => s + (exam.results[q.id]?.score || 0), 0);
  const note = exam.score >= 0.9 ? 'Excellent. Push the difficulty up next time.' : exam.score >= 0.7 ? 'Strong result — review the misses below.' : exam.score >= 0.5 ? 'Getting there. Re-learn the weak topics, then retest.' : 'Tough one — that’s useful. Start with the lessons for the red topics.';

  view.innerHTML = `
    <div class="score-hero">
      <div class="score-big">${pct(exam.score)}</div>
      <div><p class="kicker">${esc(exam.title)} · ${new Date(exam.finished).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
        <h1 class="page-title" style="font-size:clamp(26px,3.4vw,40px)">${note}</h1>
        <p class="muted" style="margin:0">${Math.round(marks * 10) / 10} of ${qs.length} marks · ${missed.length} to review · ${exam.elapsed ? fmtClock(exam.elapsed) + ' taken' : ''}</p></div>
    </div>
    <div class="cols">
      <div>
        <div class="btn-row no-print" style="margin-bottom:var(--space-6)">
          ${missed.length ? `<button class="btn btn-primary" id="retry-missed">Retry the ${plural(missed.length, 'miss', 'misses')}</button>` : ''}
          <a class="btn btn-ink" href="#/c/${course.id}/exams?preset=adaptive">Next adaptive exam →</a>
          <button class="btn btn-secondary" id="print">Print with answers</button>
        </div>
        <h2 class="sub-title" style="margin-top:0">Review</h2>
        <div id="review">${qs.map((q, i) => reviewItem(course, exam, q, i)).join('')}</div>
      </div>
      <aside class="stack-lg">
        <div class="panel panel-pad stack"><h3 style="margin:0;font-size:20px">By topic</h3>
          <div class="bars">${[...byTopic.entries()].sort((a, b) => a[1].s / a[1].n - b[1].s / b[1].n).map(([tid, t]) => {
            const topic = findTopic(course, tid);
            return `<div class="b"><a href="#/c/${course.id}/learn/${tid}" style="color:inherit;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(topic?.title || 'Topic')}</a>${meter(t.s / t.n, t.s / t.n < 0.6)}<span class="n">${Math.round((t.s / t.n) * 100)}%</span></div>`;
          }).join('')}</div>
        </div>
        <div class="panel panel-pad stack"><h3 style="margin:0;font-size:20px">Mastery now</h3>
          ${[...byTopic.keys()].map((tid) => `<div class="spread" style="font-size:14px"><span>${esc(findTopic(course, tid)?.title || '')}</span>${levelTag(level(m[tid]))}</div>`).join('')}
          <p class="hint" style="margin:0">${state.settings.autoCards && missed.length ? `Your misses were added to your flashcards and the Mistakes notebook.` : ''}</p>
        </div>
      </aside>
    </div>`;
  typeset(view);
  $$('.md-expl', view).forEach((el) => renderMd(el, el.dataset.src));

  $('#print').onclick = () => printExam(exam, course, true);
  $('#retry-missed')?.addEventListener('click', () => {
    const again = createExam(course, { ...exam.config, mode: 'practice', timer: 0 }, shuffle(missed).map((q, i) => ({ ...structuredClone(q), id: `q${i + 1}` })), `Retry: ${exam.title}`);
    go(`#/c/${course.id}/exam/${again.id}`);
  });
  $$('[data-dispute]', view).forEach((b) => b.onclick = () => dispute(ctx, exam, b.dataset.dispute));
  refreshChrome();
}

function reviewItem(course, exam, q, i) {
  const r = exam.results[q.id] || { score: 0, verdict: 'incorrect' };
  const a = answerText(q, exam.answers[q.id]);
  const topic = findTopic(course, q.topicId);
  const verdict = r.verdict === 'correct' ? 'Correct' : r.verdict === 'partial' ? `Partly right · ${pct(r.score)}` : 'Incorrect';
  return `<article class="review-item" id="r-${q.id}">
    <div class="qmeta"><span class="row" style="gap:6px"><span class="tag tag-ink">Q${i + 1}</span><span class="verdict ${r.verdict}" style="font-family:var(--font-heading);font-weight:800">${verdict}</span>${r.disputed ? '<span class="tag tag-accent">Re-marked</span>' : ''}</span>
      <span class="tag tag-neutral">${esc(topic?.title || '')}</span></div>
    <div class="qtext" style="font-size:19px;margin-bottom:12px">${mdInline(q.prompt)}</div>
    <div class="answer-line"><span class="k">Your answer</span><span>${a ? (q.type === 'short' ? esc(a) : `${LETTERS[exam.answers[q.id].choice]} — ${mdInline(a)}`) : '<span class="muted">No answer</span>'}</span></div>
    ${r.verdict !== 'correct' || q.type === 'short' ? `<div class="answer-line"><span class="k">${q.type === 'short' ? 'Model answer' : 'Correct answer'}</span><span><b>${q.type === 'short' ? '' : LETTERS[q.answerIndex] + ' — '}${mdInline(correctText(q))}</b></span></div>` : ''}
    ${r.feedback && r.by !== 'self' ? `<div class="answer-line"><span class="k">Feedback</span><span>${esc(r.feedback)}${r.missing?.length ? `<br><span class="muted">Missing: ${esc(r.missing.join('; '))}</span>` : ''}</span></div>` : ''}
    ${q.explanation ? `<div class="answer-line"><span class="k">Why</span><div class="prose md-expl" style="font-size:15px" data-src="${esc(q.explanation)}"></div></div>` : ''}
    ${q.source ? `<div class="answer-line"><span class="k">Revise</span><span>${esc(q.source)}</span></div>` : ''}
    <div class="btn-row no-print" style="margin-top:12px">
      <a class="btn btn-ghost btn-sm" href="#/c/${course.id}/learn/${q.topicId}">Teach me this topic</a>
      ${!r.disputed && r.score < 1 ? `<button class="btn btn-ghost btn-sm" data-dispute="${q.id}">I think I was right — re-check</button>` : ''}
      ${q.fixed ? `<span class="hint">Answer key corrected by the checker.</span>` : ''}
    </div>
  </article>`;
}

async function dispute(ctx, exam, qid) {
  const { course } = ctx;
  const q = exam.questions.find((x) => x.id === qid);
  const res = await dialog({
    title: 'Re-check this question',
    body: `<p class="hint">Claude re-solves the question from scratch and looks at your answer again. If the key or the marking was wrong, your score is fixed.</p>
      <div class="field"><label for="arg">Why do you think you were right? (optional)</label><textarea class="input" id="arg" name="arg" placeholder="e.g. My textbook defines it as…"></textarea></div>`,
    actions: [{ label: 'Re-check', cls: 'btn-primary', value: true }, { label: 'Cancel', value: false }],
  });
  if (!res?.value) return;
  const item = $(`#r-${qid}`);
  item.insertAdjacentHTML('beforeend', `<div class="feedback" id="dsp"><span class="spinner" style="display:inline-block;vertical-align:-3px;margin-right:8px"></span>Re-checking…</div>`);
  try {
    const out = await run('dispute', {
      course: courseCtx(course),
      question: { prompt: q.prompt, type: q.type, options: q.options, keyedAnswer: correctText(q), modelAnswer: q.modelAnswer, rubric: q.rubric, explanation: q.explanation },
      answer: answerText(q, exam.answers[qid]) || '(no answer)',
      argument: res.data.arg,
    });
    const before = exam.results[qid].score;
    if (out.score > before || out.studentCorrect) {
      applyDispute(course, exam, qid, out.studentCorrect ? 1 : out.score);
      toast(`Re-marked: ${pct(before)} → ${pct(exam.results[qid].score)} on that question.`, 5000);
    } else {
      exam.results[qid].disputed = true;
      save();
    }
    if (out.questionFlawed) {
      const bq = course.bank.find((b) => b.prompt === q.prompt);
      if (bq) course.bank.splice(course.bank.indexOf(bq), 1);
      save();
    }
    examView(ctx, exam.id);
    const again = $(`#r-${qid}`);
    again?.insertAdjacentHTML('beforeend', `<div class="feedback"><span class="verdict ${out.studentCorrect ? 'correct' : 'incorrect'}">${out.studentCorrect ? 'You were right.' : out.score > before ? 'Partly right.' : 'The original mark stands.'}</span><div class="prose" id="dsp-r" style="font-size:15px;margin-top:6px"></div></div>`);
    if (again) { renderMd($('#dsp-r'), `${out.reply}\n\n**Correct answer:** ${out.correctedAnswer}`); again.scrollIntoView({ block: 'center' }); }
  } catch (err) {
    $('#dsp')?.remove();
    const e = explainError(err);
    if (e) toast(e.msg, 5000);
  }
}

function printExam(exam, course, withAnswers) {
  const w = window.open('', '_blank');
  const asset = (p) => new URL(p, location.href).href;
  if (!w) { toast('Allow pop-ups to print.'); return; }
  const body = exam.questions.map((q, i) => `
    <li><p class="q">${mdInline(q.prompt)}</p>
      ${q.type === 'short' ? '<div class="lines"></div>' : `<ol type="A">${q.options.map((o, k) => `<li${withAnswers && k === q.answerIndex ? ' class="ans"' : ''}>${mdInline(o)}</li>`).join('')}</ol>`}
      ${withAnswers ? `<p class="key"><b>Answer:</b> ${mdInline(correctText(q))}${q.explanation ? ` — ${esc(q.explanation)}` : ''}</p>` : ''}
    </li>`).join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(exam.title)}</title>
    <link rel="stylesheet" href="${asset('vendor/katex/katex.min.css')}">
    <style>body{font-family:Archivo,system-ui,sans-serif;max-width:760px;margin:32px auto;padding:0 16px;color:#201e1d;line-height:1.5}
    h1{font-size:28px;margin:0 0 4px}.meta{color:#666;border-bottom:2px solid #999;padding-bottom:12px;margin-bottom:20px}
    ol.qs>li{margin:0 0 22px;break-inside:avoid}.q{font-weight:700;margin:0 0 6px}.ans{font-weight:700;color:#ae1800}
    .lines{height:110px;background:repeating-linear-gradient(transparent,transparent 26px,#ccc 27px)}.key{font-size:14px;color:#333}</style></head>
    <body><h1>${esc(exam.title)}</h1><div class="meta">${esc(course.title)} · ${exam.questions.length} questions${exam.timeLimit ? ` · ${exam.timeLimit / 60} minutes` : ''}${withAnswers ? ' · with answers' : ''}<br>Name: ______________________</div>
    <ol class="qs">${body}</ol>
    <script src="${asset('vendor/katex/katex.min.js')}"><\/script>
    <script src="${asset('vendor/katex/contrib/auto-render.min.js')}"><\/script>
    <script>addEventListener('load',()=>{try{renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}]})}catch(e){}setTimeout(()=>print(),400)})<\/script>
    </body></html>`);
  w.document.close();
}
