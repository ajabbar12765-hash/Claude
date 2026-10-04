import { $, $$, esc, mdInline, typeset, toast, plural, fmtDate, plainText, dialog } from '../util.js';
import { save, allTopics, findTopic, dueCards, schedule, nextIntervals, newCard, record, logActivity, courseCtx } from '../store.js';
import { run, explainError } from '../ai.js';
import { errorNotice } from '../ui.js';

const R_SCORE = { again: 0, hard: 0.5, good: 0.85, easy: 1 };

export function cardsView({ view, course, onLeave, refreshChrome }) {
  let filter = '';
  let session = null; // { queue, i, flipped, reviewed }

  const onKey = (e) => {
    if (!session || e.target.closest('textarea, input, select, .dialog')) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
    else if (session.flipped && /^[1-4]$/.test(e.key)) rate(['again', 'hard', 'good', 'easy'][+e.key - 1]);
  };
  document.addEventListener('keydown', onKey);
  onLeave(() => document.removeEventListener('keydown', onKey));

  const deck = () => course.cards.filter((k) => !filter || k.topicId === filter);

  const home = (err) => {
    session = null;
    const due = dueCards(course).filter((k) => !filter || k.topicId === filter);
    const all = deck();
    const fresh = all.filter((k) => k.reps === 0).length;
    view.innerHTML = `
      <div class="page-head"><div><p class="kicker">Flashcards</p><h1 class="page-title">Flip through.</h1>
        <p>Question first, answer on a click. Rate how well you knew it and each card comes back right before you’d forget it.</p></div>
        <label class="field" style="min-width:240px"><span class="label">Topic</span><select class="input" id="filter"><option value="">All topics</option>
          ${allTopics(course).map((t) => `<option value="${t.id}" ${filter === t.id ? 'selected' : ''}>${esc(t.title)} (${course.cards.filter((k) => k.topicId === t.id).length})</option>`).join('')}</select></label>
      </div>
      <div class="stats" style="margin-bottom:var(--space-6)">
        <div class="stat"><span class="label">Due now</span><span class="big accent">${due.length}</span></div>
        <div class="stat"><span class="label">New</span><span class="big">${fresh}</span></div>
        <div class="stat"><span class="label">In deck</span><span class="big">${all.length}</span></div>
        <div class="stat"><span class="label">From mistakes</span><span class="big">${all.filter((k) => k.src === 'mistake').length}</span></div>
      </div>
      <div class="btn-row" style="margin-bottom:var(--space-6)">
        <button class="btn btn-primary" id="study" ${due.length ? '' : 'disabled'}>${due.length ? `Study ${plural(due.length, 'due card')} →` : 'Nothing due — nice'}</button>
        <button class="btn btn-secondary" id="cram" ${all.length ? '' : 'disabled'}>Cram all ${all.length}</button>
        ${filter ? `<button class="btn btn-ink" id="gen">Make 12 more for this topic</button>` : ''}
        <button class="btn btn-ghost" id="add">+ Add a card</button>
      </div>
      <div id="err">${err ? errorNotice(err) : ''}</div>
      <h2 class="sub-title">The deck</h2>
      ${all.length ? `<ul class="list">${all.slice().sort((a, b) => a.due - b.due).map((k) => `<li class="spread" style="align-items:flex-start;flex-wrap:nowrap">
          <div style="min-width:0"><div class="title">${mdInline(k.front)}</div><div class="muted" style="font-size:14px">${mdInline(k.back)}</div>
          <div class="hint" style="margin-top:4px">${esc(findTopic(course, k.topicId)?.title || '')} · ${k.due <= Date.now() ? 'due now' : 'due ' + fmtDate(k.due)}${k.src === 'mistake' ? ' · from a mistake' : ''}</div></div>
          <button class="icon-btn" data-del="${k.id}" aria-label="Delete card" title="Delete card">×</button></li>`).join('')}</ul>`
        : `<div class="empty"><h3>No cards yet</h3><p>Open any lesson and press “Make flashcards”, or get something wrong in an exam — misses become cards automatically.</p></div>`}`;
    typeset(view);

    $('#filter').onchange = (e) => { filter = e.target.value; home(); };
    $('#study').onclick = () => start(due);
    $('#cram').onclick = () => start([...all].sort(() => Math.random() - 0.5));
    $('#add').onclick = addCard;
    $('#gen')?.addEventListener('click', generate);
    $$('[data-del]').forEach((b) => b.onclick = () => {
      course.cards = course.cards.filter((k) => k.id !== b.dataset.del);
      save(); refreshChrome(); home();
    });
  };

  const start = (queue) => {
    if (!queue.length) return;
    session = { queue: [...queue], i: 0, flipped: false, reviewed: 0, again: 0 };
    paint();
  };

  const paint = () => {
    const s = session;
    if (s.i >= s.queue.length) {
      view.innerHTML = `<div class="empty"><p class="kicker">Session complete</p><h3 style="font-size:40px">${plural(s.reviewed, 'card')} reviewed.</h3>
        <p>${s.again ? `${plural(s.again, 'card')} will come back in 10 minutes.` : 'Every card is scheduled for later.'}</p>
        <div class="btn-row"><button class="btn btn-primary" id="back">Back to the deck</button><a class="btn btn-secondary" href="#/c/${course.id}">Course overview</a></div></div>`;
      $('#back').onclick = () => home();
      return;
    }
    const k = s.queue[s.i];
    const iv = nextIntervals(k);
    view.innerHTML = `
      <div class="spread" style="margin-bottom:12px"><p class="kicker" style="margin:0">Card ${s.i + 1} of ${s.queue.length} · ${esc(findTopic(course, k.topicId)?.title || '')}</p>
        <button class="btn btn-ghost btn-sm" id="end">End session</button></div>
      <div class="meter accent" style="max-width:720px;margin-bottom:16px"><span style="width:${(s.i / s.queue.length) * 100}%"></span></div>
      <div class="flash-wrap">
        <div class="flash${s.flipped ? ' flipped' : ''}" id="flash" role="button" tabindex="0" aria-label="${s.flipped ? 'Answer side. Press space to flip back.' : 'Question side. Press space to show the answer.'}">
          <div class="flash-face"><span class="label">Question</span><div class="content">${mdInline(k.front)}</div><span class="hint">Click or press space to reveal</span></div>
          <div class="flash-face back"><span class="label">Answer</span><div class="content">${mdInline(k.back)}</div></div>
        </div>
      </div>
      <div class="rate" ${s.flipped ? '' : 'hidden'}>
        <button class="btn btn-secondary" data-r="again">Again<small>${iv.again} · 1</small></button>
        <button class="btn btn-secondary" data-r="hard">Hard<small>${iv.hard} · 2</small></button>
        <button class="btn btn-ink" data-r="good">Good<small>${iv.good} · 3</small></button>
        <button class="btn btn-secondary" data-r="easy">Easy<small>${iv.easy} · 4</small></button>
      </div>`;
    typeset(view);
    $('#flash').onclick = flip;
    $('#end').onclick = () => home();
    $$('[data-r]').forEach((b) => b.onclick = () => rate(b.dataset.r));
  };

  const flip = () => {
    if (!session) return;
    session.flipped = !session.flipped;
    $('#flash').classList.toggle('flipped', session.flipped);
    $('.rate').hidden = !session.flipped;
  };

  const rate = (r) => {
    const s = session;
    const k = s.queue[s.i];
    schedule(k, r);
    record(course, k.topicId, R_SCORE[r], 2, 'card', 0.35);
    logActivity('c');
    s.reviewed++;
    if (r === 'again') { s.again++; s.queue.push(k); }
    s.i++;
    s.flipped = false;
    save();
    refreshChrome();
    paint();
  };

  const addCard = async () => {
    const res = await dialog({
      title: 'Add a flashcard',
      body: `<div class="stack"><div class="field"><label for="f">Front (question)</label><textarea class="input" id="f" name="front" style="min-height:80px"></textarea></div>
        <div class="field"><label for="b">Back (answer)</label><textarea class="input" id="b" name="back" style="min-height:80px"></textarea></div>
        <div class="field"><label for="t">Topic</label><select class="input" id="t" name="topic">${allTopics(course).map((t) => `<option value="${t.id}" ${filter === t.id ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</select></div></div>`,
      actions: [{ label: 'Add card', cls: 'btn-primary', value: true }, { label: 'Cancel', value: false }],
    });
    if (!res?.value || !res.data.front.trim() || !res.data.back.trim()) return;
    course.cards.push(newCard(res.data.topic, res.data.front.trim(), res.data.back.trim(), 'manual'));
    save(); refreshChrome(); toast('Card added.'); home();
  };

  const generate = async () => {
    const topic = findTopic(course, filter);
    const btn = $('#gen');
    btn.disabled = true; btn.textContent = 'Making flashcards…';
    try {
      const out = await run('cards', { course: courseCtx(course), topic, count: 12 });
      const have = new Set(course.cards.map((k) => plainText(k.front)));
      let n = 0;
      for (const c of out.cards || []) {
        if (!c.front || have.has(plainText(c.front))) continue;
        course.cards.push(newCard(topic.id, c.front, c.back, 'ai')); n++;
      }
      save(); refreshChrome(); toast(`${n} cards added.`); home();
    } catch (err) {
      if (explainError(err)) home(err);
    }
  };

  home();
}
