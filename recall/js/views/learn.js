import { $, esc, pct, renderMd, toast, plainText } from '../util.js';
import { save, allTopics, findTopic, masteryMap, level, courseCtx, logActivity, newCard } from '../store.js';
import { run, explainError } from '../ai.js';
import { levelTag, errorNotice } from '../ui.js';
import { planExam, writeExam, createExam, bankExam } from '../exam-engine.js';

const STYLE_LABEL = { normal: 'Standard', simpler: 'Simpler', deeper: 'Deeper', examples: 'Worked examples' };

export function learnView(ctx, topicId) {
  const { view, course, q, onLeave, go, refreshChrome } = ctx;
  const topics = allTopics(course);
  if (!topics.length) { view.innerHTML = `<div class="empty"><h3>No topics yet</h3><a class="btn btn-primary" href="#/c/${course.id}/edit">Add topics</a></div>`; return; }
  const m = masteryMap(course);
  const topic = findTopic(course, topicId) || topics.find((t) => !course.read[t.id]) || topics[0];
  if (!topicId) { history.replaceState(null, '', `#/c/${course.id}/learn/${topic.id}`); }
  const idx = topics.findIndex((t) => t.id === topic.id);
  const prev = topics[idx - 1], next = topics[idx + 1];
  const me = m[topic.id];
  let ctrl;
  onLeave(() => ctrl?.abort());

  view.innerHTML = `
    <div class="learn">
      <nav class="toc" aria-label="Topics">
        ${course.units.map((u) => `<h4>${esc(u.title)}</h4>${u.topics.map((t) => `<a href="#/c/${course.id}/learn/${t.id}"${t.id === topic.id ? ' aria-current="page"' : ''}><i class="bg-${level(m[t.id])}"></i>${esc(t.title)}</a>`).join('')}`).join('')}
      </nav>
      <div>
        <p class="kicker">${esc(topic.unit)} · Topic ${idx + 1} of ${topics.length}</p>
        <h1 class="page-title">${esc(topic.title)}</h1>
        <div class="row" style="margin:12px 0 18px">${levelTag(level(me))}${me?.n >= 1 ? `<span class="muted" style="font-size:14px">${pct(me.score)} mastery from ${Math.round(me.n)} answers</span>` : ''}</div>
        ${topic.objectives?.length ? `<div class="panel panel-pad" style="margin-bottom:var(--space-6)"><span class="label">By the end you should be able to</span>
          <ul style="margin:8px 0 0;padding-left:1.2em">${topic.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>` : ''}
        <div class="lesson-actions no-print">
          <div class="btn-row">
            <button class="btn btn-secondary btn-sm" data-style="simpler">Explain it simpler</button>
            <button class="btn btn-secondary btn-sm" data-style="deeper">Go deeper</button>
            <button class="btn btn-secondary btn-sm" data-style="examples">More worked examples</button>
            <button class="btn btn-ink btn-sm" id="quick">Quick check · 5 questions</button>
            <button class="btn btn-ghost btn-sm" id="mkcards">Make flashcards</button>
            <a class="btn btn-ghost btn-sm" href="#/c/${course.id}/tutor?topic=${topic.id}">Ask the tutor</a>
          </div>
        </div>
        <div id="lesson-meta" class="hint" style="margin-bottom:12px"></div>
        <article class="prose" id="lesson" aria-live="polite"></article>
        <div id="lesson-err"></div>
        <div class="spread no-print" style="margin-top:var(--space-8);padding-top:var(--space-4);border-top:var(--rule)">
          ${prev ? `<a class="btn btn-secondary" href="#/c/${course.id}/learn/${prev.id}">← ${esc(prev.title)}</a>` : '<span></span>'}
          <div class="btn-row">
            <button class="btn btn-primary" id="done">${course.read[topic.id] ? 'Learned ✓' : 'I’ve learned this'}</button>
            ${next ? `<a class="btn btn-ink" href="#/c/${course.id}/learn/${next.id}">${esc(next.title)} →</a>` : ''}
          </div>
        </div>
      </div>
    </div>`;

  const lessonEl = $('#lesson');
  const meta = $('#lesson-meta');

  const show = (L) => {
    renderMd(lessonEl, L.md);
    meta.textContent = `${STYLE_LABEL[L.style] || 'Standard'} lesson · written ${new Date(L.created).toLocaleDateString()}`;
  };

  const write = async (style = 'normal') => {
    ctrl?.abort();
    ctrl = new AbortController();
    $('#lesson-err').innerHTML = '';
    meta.textContent = `Writing a${style === 'normal' ? '' : ' ' + STYLE_LABEL[style].toLowerCase()} lesson for you…`;
    lessonEl.innerHTML = '<p class="caret"></p>';
    const recent = course.mistakes.filter((x) => x.q.topicId === topic.id && !x.resolved).slice(-6).map((x) => `${plainText(x.q.prompt)} (they answered: ${x.answer || 'nothing'}; correct: ${x.q.type === 'short' ? x.q.modelAnswer : x.q.options[x.q.answerIndex]})`);
    let raf = 0, latest = '';
    try {
      const md = await run('lesson', {
        course: courseCtx(course),
        topic: { title: topic.title, unit: topic.unit, summary: topic.summary, objectives: topic.objectives },
        mastery: me?.n >= 1 ? pct(me.score) : 'not tested yet',
        mistakes: recent,
        style,
      }, {
        signal: ctrl.signal,
        onReset: () => { latest = ''; },
        onDelta: (_, all) => {
          latest = all;
          if (!raf) raf = requestAnimationFrame(() => { raf = 0; renderMd(lessonEl, latest); lessonEl.lastElementChild?.classList.add('caret'); });
        },
      });
      cancelAnimationFrame(raf);
      const L = { md, style, created: Date.now() };
      course.lessons[topic.id] = L;
      logActivity('l');
      save();
      show(L);
      if (q.style) history.replaceState(null, '', `#/c/${course.id}/learn/${topic.id}`);
    } catch (err) {
      cancelAnimationFrame(raf);
      if (err.name === 'AbortError') return;
      const old = course.lessons[topic.id];
      if (old) show(old); else { lessonEl.innerHTML = ''; meta.textContent = ''; }
      $('#lesson-err').innerHTML = errorNotice(err, 'retry-lesson');
      $('#retry-lesson')?.addEventListener('click', () => write(style));
    }
  };

  const existing = course.lessons[topic.id];
  const wantStyle = q.style;
  if (existing && !wantStyle) show(existing);
  else write(wantStyle || 'normal');

  view.querySelectorAll('[data-style]').forEach((b) => b.onclick = () => { write(b.dataset.style); lessonEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); });

  $('#done').onclick = () => {
    course.read[topic.id] = true;
    save();
    toast(next ? 'Nice. Quick check to lock it in, or on to the next topic.' : 'That’s the last topic. Time for a practice exam.');
    $('#done').textContent = 'Learned ✓';
    refreshChrome();
  };

  $('#quick').onclick = async () => {
    course.read[topic.id] = true;
    const cfg = { title: `Quick check: ${topic.title}`, scope: 'pick', topicIds: [topic.id], count: 5, types: ['mcq', 'tf', 'short'], difficulty: 'adaptive', timer: 0, mode: 'practice' };
    const plan = planExam(course, cfg);
    const btn = $('#quick');
    btn.disabled = true; btn.textContent = 'Writing 5 questions…';
    try {
      const qs = await writeExam(course, cfg, plan, { onProgress: (s) => { btn.textContent = s; } });
      if (!qs.length) throw new Error('No questions came back.');
      const exam = createExam(course, cfg, qs, cfg.title);
      go(`#/c/${course.id}/exam/${exam.id}`);
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Quick check · 5 questions';
      const fromBank = bankExam(course, cfg, plan);
      if (fromBank.length) {
        toast('Claude isn’t available — using saved questions for this topic.');
        const exam = createExam(course, cfg, fromBank, `${cfg.title} (from bank)`);
        go(`#/c/${course.id}/exam/${exam.id}`);
      } else {
        const e = explainError(err);
        if (e) $('#lesson-err').innerHTML = errorNotice(err);
      }
    }
  };

  $('#mkcards').onclick = async () => {
    const btn = $('#mkcards');
    btn.disabled = true; btn.textContent = 'Making flashcards…';
    try {
      const recent = course.mistakes.filter((x) => x.q.topicId === topic.id && !x.resolved).slice(-4).map((x) => plainText(x.q.prompt));
      const out = await run('cards', { course: courseCtx(course), topic, mistakes: recent, count: 12 });
      const have = new Set(course.cards.map((k) => plainText(k.front)));
      let added = 0;
      for (const c of out.cards || []) {
        if (!c.front || have.has(plainText(c.front))) continue;
        course.cards.push(newCard(topic.id, c.front, c.back, 'ai'));
        added++;
      }
      save();
      refreshChrome();
      toast(`${added} flashcards added for ${topic.title}.`);
      btn.textContent = 'Flashcards added ✓';
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Make flashcards';
      const e = explainError(err);
      if (e) $('#lesson-err').innerHTML = errorNotice(err);
    }
  };

  refreshChrome();
}
