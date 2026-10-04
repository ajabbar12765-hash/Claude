import { $, $$, esc, renderMd, confirmDialog } from '../util.js';
import { save, findTopic, weakest, courseCtx } from '../store.js';
import { run, explainError } from '../ai.js';
import { errorNotice } from '../ui.js';

export function tutorView({ view, course, q, onLeave }) {
  const focus = q.topic ? findTopic(course, q.topic) : null;
  const weak = weakest(course, 4).filter((t) => t.m.score < 0.75);
  let busy = false;
  let ctrl;
  onLeave(() => ctrl?.abort());

  const ideas = [
    focus ? `Explain ${focus.title} like I’m new to it` : weak[0] ? `Help me understand ${weak[0].title}` : 'What are the most important ideas in this course?',
    focus ? `Give me 3 exam-style questions on ${focus.title} and check my answers` : 'Quiz me with 3 questions on my weakest topic',
    'What topics are most likely to come up in the exam?',
    'Make me a one-page summary of the first unit',
  ];

  view.innerHTML = `
    <div class="page-head"><div><p class="kicker">Tutor${focus ? ` · ${esc(focus.title)}` : ''}</p><h1 class="page-title">Ask anything.</h1>
      <p>Your tutor knows your syllabus, your textbooks and what you’re struggling with. Ask for explanations, examples, or to be quizzed.</p></div>
      <button class="btn btn-secondary btn-sm" id="clear">Clear chat</button></div>
    <div class="chat">
      <div class="chat-log" id="log"></div>
      <div id="err"></div>
      <div class="suggestions no-print" id="ideas">${ideas.map((t) => `<button class="btn btn-secondary btn-sm" data-idea>${esc(t)}</button>`).join('')}</div>
      <form class="composer" id="composer">
        <label class="sr-only" for="msg">Message</label>
        <textarea class="input" id="msg" rows="1" placeholder="Ask your tutor…  (Enter to send, Shift+Enter for a new line)"></textarea>
        <button class="btn btn-primary" type="submit" id="send">Send →</button>
      </form>
    </div>`;

  const log = $('#log');
  const msg = $('#msg');

  const bubble = (m) => {
    const el = document.createElement('div');
    el.className = `msg ${m.role}`;
    if (m.role === 'user') el.textContent = m.content;
    else { el.innerHTML = '<div class="prose"></div>'; renderMd(el.firstChild, m.content); }
    log.append(el);
    return el;
  };
  const paintAll = () => {
    log.innerHTML = '';
    if (!course.chat.length) {
      log.innerHTML = `<div class="msg assistant"><div class="prose"><p>Hi! I’m your tutor for <b>${esc(course.title)}</b>. ${weak.length ? `I can see <b>${esc(weak[0].title)}</b> has been tricky — want to start there?` : 'What would you like to work on?'}</p></div></div>`;
    }
    course.chat.forEach(bubble);
    $('#ideas').hidden = course.chat.length > 0;
  };
  paintAll();

  const send = async (text) => {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    $('#send').disabled = true;
    $('#err').innerHTML = '';
    $('#ideas').hidden = true;
    course.chat.push({ role: 'user', content: text });
    bubble({ role: 'user', content: text });
    msg.value = '';
    msg.style.height = '';
    const el = bubble({ role: 'assistant', content: '' });
    const prose = el.firstChild;
    prose.innerHTML = '<p class="caret"></p>';
    el.scrollIntoView({ block: 'end', behavior: 'smooth' });
    ctrl = new AbortController();
    let raf = 0, latest = '';
    try {
      const reply = await run('tutor', {
        course: courseCtx(course),
        weak: weak.map((t) => t.title),
        focus: focus?.title,
        history: course.chat,
      }, {
        signal: ctrl.signal,
        onDelta: (_, all) => {
          latest = all;
          if (!raf) raf = requestAnimationFrame(() => { raf = 0; renderMd(prose, latest); prose.lastElementChild?.classList.add('caret'); });
        },
      });
      cancelAnimationFrame(raf);
      course.chat.push({ role: 'assistant', content: reply });
      if (course.chat.length > 80) course.chat.splice(0, course.chat.length - 80);
      save();
      renderMd(prose, reply);
    } catch (err) {
      cancelAnimationFrame(raf);
      if (err.name === 'AbortError') return;
      el.remove();
      course.chat.pop();
      save();
      msg.value = text;
      $('#err').innerHTML = errorNotice(err, 'retry-chat');
      $('#retry-chat')?.addEventListener('click', () => send(msg.value));
    } finally {
      busy = false;
      $('#send') && ($('#send').disabled = false);
    }
  };

  $('#composer').onsubmit = (e) => { e.preventDefault(); send(msg.value); };
  msg.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(msg.value); } });
  msg.addEventListener('input', () => { msg.style.height = 'auto'; msg.style.height = Math.min(220, msg.scrollHeight + 4) + 'px'; });
  $$('[data-idea]').forEach((b) => b.onclick = () => send(b.textContent));
  $('#clear').onclick = async () => {
    if (!course.chat.length) return;
    if (await confirmDialog('Clear this chat?', 'The conversation will be deleted.', 'Clear')) { course.chat = []; save(); paintAll(); }
  };
  if (course.chat.length) log.lastElementChild?.scrollIntoView({ block: 'end' });
  msg.focus({ preventScroll: true });
}
