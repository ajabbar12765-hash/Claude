/* Jarvis — iPad web app. Talks to your Google Apps Script brain. */
(function () {
  'use strict';

  /* ------------------------------------------------------------ */
  /*  Small helpers                                                */
  /* ------------------------------------------------------------ */
  const $ = (s) => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem('jarvis.' + k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem('jarvis.' + k, JSON.stringify(v)); } catch (_) { /* private mode */ } },
    del(k) { try { localStorage.removeItem('jarvis.' + k); } catch (_) { /* ignore */ } },
  };
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    kids.flat().forEach((c) => { if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : String(c)); });
    return el;
  }
  let toastTimer;
  function toast(text) {
    const t = $('#toast');
    t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
  }
  function timeAgo(ms) {
    const d = (Date.now() - ms) / 60000;
    if (d < 1) return 'now';
    if (d < 60) return Math.round(d) + 'm';
    if (d < 1440) return Math.round(d / 60) + 'h';
    return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  function timeUntil(ms) {
    const d = Math.round((ms - Date.now()) / 60000);
    if (d <= 0) return 'any moment';
    if (d < 60) return 'in ' + d + ' min';
    return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  /* ------------------------------------------------------------ */
  /*  Connection                                                   */
  /* ------------------------------------------------------------ */
  function parseLink(str) {
    try {
      const hash = String(str).split('#')[1] || '';
      const p = new URLSearchParams(hash);
      if (p.get('u') && p.get('s')) return { url: p.get('u'), secret: p.get('s') };
    } catch (_) { /* ignore */ }
    return null;
  }
  const fromHash = parseLink(location.href);
  if (fromHash) { store.set('url', fromHash.url); store.set('secret', fromHash.secret); }
  const isStandalone = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  // Keep the hash in Safari so "Add to Home Screen" carries the connection; drop it inside the app.
  if (fromHash && isStandalone) history.replaceState(null, '', location.pathname);

  const connected = () => !!(store.get('url', '') && store.get('secret', ''));

  async function api(action, data) {
    const url = store.get('url', '');
    if (!url) throw new Error('Not connected');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 120000);
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        // text/plain keeps this a "simple" request, so Google needs no CORS preflight.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({}, data || {}, { action, secret: store.get('secret', ''), client: 'app' })),
        redirect: 'follow',
        signal: ctrl.signal,
      });
    } catch (err) {
      setStatus(false);
      throw new Error(err.name === 'AbortError' ? 'Jarvis took too long to answer.' : 'Cannot reach Jarvis. Check your internet.');
    } finally { clearTimeout(timer); }
    const text = await res.text();
    let j;
    try { j = JSON.parse(text); } catch (_) {
      setStatus(false);
      throw new Error('Jarvis backend gave a strange answer. Make sure the web app access is set to "Anyone".');
    }
    setStatus(true);
    if (j.error === 'auth') { showSetup('That secret did not match. Run appLink again and paste the new link.'); throw new Error('Not authorised'); }
    if (j.error && action !== 'chat') throw new Error(j.error);
    return j;
  }
  function setStatus(ok) { $('#statusDot').className = 'dot ' + (ok ? 'on' : 'off'); }

  /* ------------------------------------------------------------ */
  /*  Setup screen                                                 */
  /* ------------------------------------------------------------ */
  function showSetup(msg) {
    $('#app').hidden = true; $('#setup').hidden = false;
    if (msg) $('#setupMsg').textContent = msg;
    $('#setupUrl').value = store.get('url', '');
    $('#setupSecret').value = store.get('secret', '');
    $('#installHint').hidden = isStandalone;
  }
  $('#setupGo').addEventListener('click', async () => {
    const link = parseLink($('#setupLink').value.trim());
    const url = link ? link.url : $('#setupUrl').value.trim();
    const secret = link ? link.secret : $('#setupSecret').value.trim();
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url) || !secret) {
      $('#setupMsg').textContent = 'That does not look right. The URL should start with https://script.google.com/macros/s/ and end with /exec.';
      return;
    }
    store.set('url', url); store.set('secret', secret);
    $('#setupGo').disabled = true; $('#setupGo').textContent = 'Connecting…';
    try {
      await api('updates');
      startApp();
    } catch (err) {
      $('#setupMsg').textContent = 'Could not connect: ' + err.message;
    } finally {
      $('#setupGo').disabled = false; $('#setupGo').textContent = 'Connect';
    }
  });

  /* ------------------------------------------------------------ */
  /*  Tabs                                                         */
  /* ------------------------------------------------------------ */
  let currentTab = 'jarvis';
  document.querySelectorAll('.tabbar button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
  function showTab(name) {
    currentTab = name;
    document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + name));
    if (name === 'inbox') loadInbox();
    if (name === 'activity') poll();
  }

  /* ------------------------------------------------------------ */
  /*  Voice out (no Siri voices)                                   */
  /* ------------------------------------------------------------ */
  const synth = window.speechSynthesis;
  let voices = [];
  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices().filter((v) => /^en/i.test(v.lang) && !/siri/i.test(v.name));
    const sel = $('#setVoice');
    sel.innerHTML = '';
    voices.forEach((v) => sel.append(h('option', { value: v.name }, v.name + ' (' + v.lang + ')')));
    sel.value = pickVoice() ? pickVoice().name : '';
  }
  function pickVoice() {
    const saved = store.get('voice', '');
    return voices.find((v) => v.name === saved) ||
      voices.find((v) => /daniel/i.test(v.name)) || // British, very Jarvis
      voices.find((v) => /en-GB/i.test(v.lang)) ||
      voices[0] || null;
  }
  if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; }

  let speaking = false;
  function speak(text) {
    return new Promise((resolve) => {
      if (!synth || !store.get('voiceOn', true) || !text) return resolve();
      const u = new SpeechSynthesisUtterance(String(text).replace(/https?:\/\/\S+/g, 'the link'));
      const v = pickVoice(); if (v) { u.voice = v; u.lang = v.lang; }
      u.rate = Number(store.get('rate', 1.05));
      let done = false;
      const finish = () => { if (done) return; done = true; speaking = false; setOrb(handsFree ? 'wake' : 'idle'); resolve(); resumeWake(); };
      u.onend = finish; u.onerror = finish;
      setTimeout(finish, 4000 + text.length * 120); // never hang if iOS drops the event
      speaking = true; pauseWake(); setOrb('speaking');
      synth.speak(u);
    });
  }
  // iOS only allows speech after a first tap; unlock it quietly.
  document.addEventListener('pointerdown', function unlock() {
    if (synth) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); }
    document.removeEventListener('pointerdown', unlock);
  }, { once: true });

  /* ------------------------------------------------------------ */
  /*  Voice in: tap-to-talk + hands-free "Jarvis" wake word        */
  /* ------------------------------------------------------------ */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  let mode = 'off'; // off | command | wake
  let handsFree = false;
  const WAKE = /\b(?:hey|hi|ok|okay|yo)?\s*,?\s*jarvis\b[\s,.!?]*/i;

  function setOrb(state) {
    const orb = $('#orb');
    orb.className = 'orb ' + state;
    const labels = { idle: 'Tap to talk', listening: 'Listening…', thinking: 'Working on it…', speaking: 'Speaking…', wake: 'Say "Jarvis…"' };
    $('#orbLabel').textContent = labels[state] || '';
  }

  function stopRec() {
    mode = 'off';
    if (rec) { try { rec.onend = null; rec.abort(); } catch (_) { /* ignore */ } rec = null; }
  }

  function listen(newMode) {
    if (!SR) { toast('Voice input is not supported here. Use the keyboard mic button instead.'); return; }
    stopRec();
    mode = newMode;
    rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = newMode === 'wake';
    rec.maxAlternatives = 1;
    let finalText = '';
    let silenceTimer;

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript + ' ';
        else interim += r[0].transcript;
      }
      const heard = (finalText + interim).trim();
      if (mode === 'command') {
        $('#chatInput').value = heard;
        // Safari sometimes never fires a final result; treat a pause as the end.
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => { try { rec && rec.stop(); } catch (_) { /* ignore */ } }, 1600);
      } else if (mode === 'wake') {
        const m = heard.match(WAKE);
        if (m) {
          const rest = heard.slice(m.index + m[0].length).trim();
          clearTimeout(silenceTimer);
          silenceTimer = setTimeout(() => {
            stopRec();
            if (rest.split(/\s+/).length >= 2) send(rest);
            else { beep(); listen('command'); }
          }, rest ? 1400 : 700);
        } else if (finalText.length > 300) {
          finalText = ''; // keep the buffer small while waiting
        }
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        toast('Allow microphone access for Jarvis in Settings → Safari → Microphone.');
        setHandsFree(false);
      }
    };
    rec.onend = () => {
      clearTimeout(silenceTimer);
      const was = mode;
      rec = null; mode = 'off';
      if (was === 'command') {
        const text = $('#chatInput').value.trim();
        if (text) send(text); else setOrb(handsFree ? 'wake' : 'idle');
        if (!text) resumeWake();
      } else if (was === 'wake') {
        resumeWake(); // Safari stops continuous listening every so often; restart it
      }
    };
    try { rec.start(); } catch (_) { /* already started */ }
    setOrb(newMode === 'command' ? 'listening' : 'wake');
  }

  function pauseWake() { if (mode === 'wake') stopRec(); }
  function resumeWake() {
    if (handsFree && !speaking && !busy && mode === 'off' && !document.hidden) {
      setTimeout(() => { if (handsFree && !speaking && !busy && mode === 'off' && !document.hidden) listen('wake'); }, 350);
    }
  }
  function setHandsFree(on) {
    handsFree = on;
    const b = $('#handsFreeBtn');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.textContent = on ? 'Hands-free on' : 'Hands-free off';
    if (on) { if (mode === 'off') listen('wake'); } else { if (mode === 'wake') stopRec(); setOrb('idle'); }
  }
  $('#handsFreeBtn').addEventListener('click', () => setHandsFree(!handsFree));

  $('#orb').addEventListener('click', () => {
    if (speaking && synth) { synth.cancel(); return; }
    if (mode === 'command') { try { rec.stop(); } catch (_) { /* ignore */ } return; }
    $('#chatInput').value = '';
    listen('command');
  });

  let audioCtx;
  function beep() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
      o.frequency.value = 880; g.gain.value = 0.08;
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + 0.12);
    } catch (_) { /* ignore */ }
  }

  /* ------------------------------------------------------------ */
  /*  Chat                                                         */
  /* ------------------------------------------------------------ */
  const feed = $('#feed');
  let busy = false;
  const feedLog = store.get('feed', []);

  function addMsg(who, text, opts) {
    opts = opts || {};
    const empty = feed.querySelector('.empty'); if (empty) empty.remove();
    const el = h('div', { class: 'msg ' + who + (opts.update ? ' update' : '') + (opts.thinking ? ' thinking' : '') },
      opts.update ? h('span', { class: 'tag' }, 'Update') : null,
      text);
    if (opts.url) el.append(h('div', {}, h('button', { class: 'btn primary open-btn', onclick: () => openUrl(opts.url) }, 'Open')));
    feed.append(el);
    feed.scrollTop = feed.scrollHeight;
    if (!opts.thinking && !opts.noSave) {
      feedLog.push({ who, text, update: !!opts.update, url: opts.url || '' });
      store.set('feed', feedLog.slice(-60));
    }
    return el;
  }
  function renderHistory() {
    feed.innerHTML = '';
    if (!feedLog.length) {
      feed.append(h('div', { class: 'empty' },
        h('p', {}, 'Good to see you. Tap the orb, or turn on ', h('b', {}, 'Hands-free'), ' and say ', h('b', {}, '"Jarvis…"'), '.'),
        h('p', { class: 'small' }, 'Try: "Organize my inbox" · "Who needs a reply?" · "Message Sam on Discord asking if he wants to play" · "Remind me in 20 minutes to stretch"')));
      return;
    }
    feedLog.forEach((m) => addMsg(m.who, m.text, { update: m.update, url: m.url, noSave: true }));
  }

  function openUrl(url) {
    if (/^https?:/i.test(url)) window.open(url, '_blank', 'noopener');
    else window.location.href = url;
  }

  async function send(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    busy = true; stopRec();
    $('#chatInput').value = '';
    addMsg('me', text);
    const thinking = addMsg('jarvis', 'Thinking', { thinking: true });
    setOrb('thinking');
    try {
      const r = await api('chat', { text });
      thinking.remove();
      addMsg('jarvis', r.speak || 'Done.', { url: r.url });
      busy = false;
      await speak(r.speak);
      if (r.url && !/^https?:/i.test(r.url)) openUrl(r.url);
      if (r.listen_again === 'yes') listen('command');
      if (currentTab === 'inbox' || /email|inbox|mail/i.test(text)) inboxDirty = true;
    } catch (err) {
      thinking.remove();
      addMsg('jarvis', 'Sorry, ' + err.message, { noSave: true });
    } finally {
      busy = false;
      if (mode === 'off') { setOrb(handsFree ? 'wake' : 'idle'); resumeWake(); }
    }
  }
  $('#chatForm').addEventListener('submit', (e) => { e.preventDefault(); send($('#chatInput').value); });

  /* ------------------------------------------------------------ */
  /*  Live updates (replies, finished jobs) — spoken automatically */
  /* ------------------------------------------------------------ */
  let polling = false;
  async function poll() {
    if (polling || document.hidden || !connected()) return;
    polling = true;
    try {
      const u = await api('updates');
      renderActivity(u);
      for (const ev of u.updates || []) {
        addMsg('jarvis', ev.text, { update: true });
        if (/email/i.test(ev.text)) inboxDirty = true;
        await speak(ev.text);
      }
    } catch (_) { /* offline; try again next time */ }
    polling = false;
  }
  setInterval(poll, 15000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { pauseWake(); return; }
    poll(); resumeWake();
    if (currentTab === 'inbox') loadInbox(true);
  });

  function renderActivity(u) {
    const none = (t) => h('div', { class: 'none' }, t);
    const wl = $('#watchList'); wl.innerHTML = '';
    (u.watches || []).forEach((w) => wl.append(h('div', { class: 'card' },
      h('div', { class: 'top' }, h('span', { class: 'from' }, w.contact), h('span', { class: 'time' }, w.via)),
      w.auto ? h('div', { class: 'sum' }, 'Auto-reply: ' + w.auto) : h('div', { class: 'sum' }, 'I will tell you when they reply.'))));
    if (!wl.children.length) wl.append(none('Not waiting on anyone.'));

    const ql = $('#queueList'); ql.innerHTML = '';
    (u.queue || []).sort((a, b) => a.due - b.due).forEach((q) => ql.append(h('div', { class: 'card' },
      h('div', { class: 'top' }, h('span', { class: 'from' }, q.kind === 'reminder' ? 'Reminder' : 'Background job'), h('span', { class: 'time' }, timeUntil(q.due))),
      h('div', { class: 'sum' }, q.text))));
    if (!ql.children.length) ql.append(none('Nothing scheduled.'));

    const el = $('#eventList'); el.innerHTML = '';
    (u.events || []).forEach((e) => el.append(h('div', { class: 'card' },
      h('div', { class: 'top' }, h('span', { class: 'sum' }, e.text), h('span', { class: 'time' }, e.when)))));
    if (!el.children.length) el.append(none('Nothing yet.'));
  }

  /* ------------------------------------------------------------ */
  /*  Inbox                                                        */
  /* ------------------------------------------------------------ */
  const CATS = ['Inbox', 'Needs Reply', 'Important', 'Personal', 'School and Work', 'Orders and Receipts', 'Bills and Money', 'Updates', 'Social', 'Newsletters', 'Promotions', 'Junk', 'Unsorted'];
  let activeCat = store.get('cat', 'Inbox');
  let overview = null;
  let threads = [];
  let inboxDirty = true;
  let lastInboxLoad = 0;

  async function loadInbox(force) {
    if (!force && !inboxDirty && Date.now() - lastInboxLoad < 60000) return;
    inboxDirty = false; lastInboxLoad = Date.now();
    renderChips();
    const list = $('#mailList');
    list.innerHTML = '';
    for (let i = 0; i < 4; i++) list.append(h('div', { class: 'skeleton' }));
    try {
      const [ov, th] = await Promise.all([api('inbox'), api('inbox', { category: activeCat })]);
      overview = ov; threads = th.threads || [];
      renderChips(); renderStats(); renderThreads();
    } catch (err) {
      list.innerHTML = '';
      list.append(h('div', { class: 'none' }, 'Could not load email: ' + err.message));
    }
  }
  function countFor(cat) {
    if (!overview) return 0;
    if (cat === 'Inbox') return overview.inbox_unread;
    if (cat === 'Unsorted') return overview.unsorted;
    const c = (overview.categories || []).find((x) => x.name === cat);
    return c ? c.unread : 0;
  }
  function renderChips() {
    const wrap = $('#chips'); wrap.innerHTML = '';
    CATS.forEach((c) => {
      const n = countFor(c);
      wrap.append(h('button', { class: 'chip' + (c === activeCat ? ' active' : ''), onclick: () => { activeCat = c; store.set('cat', c); loadInbox(true); } },
        c, n ? h('span', { class: 'n' }, n) : null));
    });
  }
  function renderStats() {
    if (!overview) return;
    const nr = countFor('Needs Reply');
    $('#inboxStats').textContent = overview.inbox_unread + ' unread · ' + overview.unsorted + ' unsorted · Autopilot ' + (overview.autopilot ? 'on' : 'off');
    const b = $('#inboxBadge'); b.hidden = !nr; b.textContent = nr;
  }
  function renderThreads() {
    const list = $('#mailList'); list.innerHTML = '';
    if (!threads.length) { list.append(h('div', { class: 'none' }, 'Nothing here. Nice.')); return; }
    threads.forEach((t) => list.append(threadCard(t)));
  }
  function threadCard(t) {
    return h('button', { class: 'card' + (t.unread ? ' unread' : ''), onclick: () => openThread(t) },
      h('div', { class: 'top' }, h('span', { class: 'from' }, t.from), h('span', { class: 'time' }, timeAgo(t.date))),
      h('div', { class: 'subj' }, t.subject),
      h('div', { class: 'sum' }, t.summary),
      t.category && activeCat !== t.category ? h('span', { class: 'cat ' + t.category.split(' ')[0] }, t.category) : null);
  }
  function dropThread(id) {
    threads = threads.filter((t) => t.id !== id);
    renderThreads(); inboxDirty = true;
  }

  $('#organizeBtn').addEventListener('click', async () => {
    const b = $('#organizeBtn');
    b.disabled = true; b.textContent = 'Organizing…';
    try {
      const r = await api('organize');
      toast(r.summary);
      addMsg('jarvis', r.summary + (r.highlights && r.highlights.length ? '\n• ' + r.highlights.join('\n• ') : ''));
      speak(r.summary);
      await loadInbox(true);
    } catch (err) { toast('Could not organize: ' + err.message); }
    b.disabled = false; b.textContent = 'Organize now';
  });

  /* ---------- email sheet ---------- */
  const sheet = $('#sheet');
  function closeSheet() { sheet.hidden = true; }
  $('#sheetClose').addEventListener('click', closeSheet);
  sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });

  async function openThread(t) {
    sheet.hidden = false;
    $('#sheetTitle').textContent = t.subject;
    const body = $('#sheetBody'); body.innerHTML = '';
    body.append(h('div', { class: 'skeleton' }));
    const actions = $('#sheetActions'); actions.innerHTML = '';
    let full;
    try { full = (await api('email', { id: t.id, op: 'open' })).thread; } catch (err) { body.innerHTML = ''; body.append(h('div', { class: 'none' }, err.message)); return; }
    t.unread = false;
    body.innerHTML = '';
    if (t.summary) body.append(h('div', { class: 'msg jarvis update', style: 'max-width:100%;margin-bottom:10px' }, h('span', { class: 'tag' }, 'Jarvis summary'), t.summary));
    full.messages.forEach((m) => body.append(h('div', { class: 'mail-msg' },
      h('div', { class: 'mail-meta' }, h('b', {}, m.from), ' · ' + new Date(m.date).toLocaleString()),
      h('div', { class: 'mail-text' }, m.body || '(no text)'))));

    const act = async (op, extra, label) => {
      try { await api('email', Object.assign({ id: t.id, op }, extra || {})); toast(label); } catch (err) { toast(err.message); return false; }
      return true;
    };
    const moveSel = h('select', { 'aria-label': 'Move to category' },
      h('option', { value: '' }, 'Move to…'), CATS.filter((c) => c !== 'Inbox' && c !== 'Unsorted').map((c) => h('option', { value: c }, c)));
    moveSel.addEventListener('change', async () => {
      if (!moveSel.value) return;
      if (await act('move', { category: moveSel.value }, 'Moved. I will remember this sender.')) { closeSheet(); if (activeCat !== moveSel.value) dropThread(t.id); }
    });
    actions.append(
      h('button', { class: 'btn primary', onclick: () => showReply(t) }, 'Reply with Jarvis'),
      h('button', { class: 'btn', onclick: async () => { if (await act('archive', null, 'Archived')) { closeSheet(); dropThread(t.id); } } }, 'Archive'),
      h('button', { class: 'btn', onclick: () => act(t.starred ? 'unstar' : 'star', null, t.starred ? 'Unstarred' : 'Starred').then((ok) => { if (ok) t.starred = !t.starred; }) }, t.starred ? 'Unstar' : 'Star'),
      h('button', { class: 'btn danger', onclick: async () => { if (await act('trash', null, 'Moved to trash')) { closeSheet(); dropThread(t.id); } } }, 'Trash'),
      moveSel);
  }

  async function showReply(t) {
    const body = $('#sheetBody');
    let box = body.querySelector('.reply-box');
    if (!box) {
      const ta = h('textarea', { placeholder: 'Jarvis is writing a reply…' });
      const instr = h('input', { type: 'text', placeholder: 'Tell Jarvis what to say (optional), e.g. "say yes, Friday works"' });
      const sendBtn = h('button', { class: 'btn primary' }, 'Send reply');
      const redo = h('button', { class: 'btn' }, 'Rewrite');
      box = h('div', { class: 'reply-box' }, h('h3', {}, 'Your reply'), instr, h('div', { style: 'height:8px' }), ta, h('div', { class: 'row-btns' }, sendBtn, redo));
      body.append(box);
      const draft = async () => {
        ta.value = ''; ta.placeholder = 'Jarvis is writing…'; redo.disabled = true;
        try { ta.value = (await api('email', { id: t.id, op: 'draft', instructions: instr.value })).text; } catch (err) { toast(err.message); }
        redo.disabled = false;
      };
      redo.addEventListener('click', draft);
      sendBtn.addEventListener('click', async () => {
        if (!ta.value.trim()) return;
        sendBtn.disabled = true; sendBtn.textContent = 'Sending…';
        try { await api('email', { id: t.id, op: 'reply', text: ta.value }); toast('Reply sent'); closeSheet(); inboxDirty = true; loadInbox(true); } catch (err) { toast(err.message); }
        sendBtn.disabled = false; sendBtn.textContent = 'Send reply';
      });
      draft();
    }
    box.scrollIntoView({ behavior: 'smooth' });
  }

  /* ------------------------------------------------------------ */
  /*  Settings                                                     */
  /* ------------------------------------------------------------ */
  const settings = $('#settings');
  $('#settingsBtn').addEventListener('click', () => {
    $('#setVoiceOn').checked = store.get('voiceOn', true);
    $('#setRate').value = store.get('rate', 1.05);
    $('#setHandsFree').checked = store.get('handsFreeDefault', false);
    const u = store.get('url', '');
    $('#connInfo').textContent = 'Connected to …' + u.slice(-24);
    loadVoices();
    settings.hidden = false;
  });
  $('#settingsClose').addEventListener('click', () => { settings.hidden = true; });
  settings.addEventListener('click', (e) => { if (e.target === settings) settings.hidden = true; });
  $('#setVoiceOn').addEventListener('change', (e) => store.set('voiceOn', e.target.checked));
  $('#setVoice').addEventListener('change', (e) => store.set('voice', e.target.value));
  $('#setRate').addEventListener('input', (e) => store.set('rate', Number(e.target.value)));
  $('#setHandsFree').addEventListener('change', (e) => store.set('handsFreeDefault', e.target.checked));
  $('#testVoice').addEventListener('click', () => speak('At your service. All systems are online.'));
  $('#disconnect').addEventListener('click', () => {
    if (!confirm('Disconnect this iPad from Jarvis?')) return;
    store.del('url'); store.del('secret'); settings.hidden = true; showSetup('Disconnected.');
  });

  /* ------------------------------------------------------------ */
  /*  Start                                                        */
  /* ------------------------------------------------------------ */
  function startApp() {
    $('#setup').hidden = true; $('#app').hidden = false;
    renderHistory();
    setOrb('idle');
    poll();
    api('inbox').then((ov) => { overview = ov; renderStats(); }).catch(() => {});
    if (store.get('handsFreeDefault', false)) setHandsFree(true);
  }

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (connected()) startApp(); else showSetup();
})();
