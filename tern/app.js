/* Tern: chat client. Plain JS, no build step. */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const icon = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${window.ICONS[name] || ''}</svg>`;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('tern.' + k); return v === null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('tern.' + k, v); } catch {} },
  };

  const el = {
    app: $('#app'), main: $('.main'), thread: $('#thread'), history: $('#history'), title: $('#chatTitle'),
    form: $('#composer'), input: $('#input'), send: $('#sendBtn'), attach: $('#attachBtn'), file: $('#fileInput'),
    attachments: $('#attachments'), search: $('#searchBtn'), think: $('#thinkBtn'), image: $('#imageBtn'), mic: $('#micBtn'),
    jump: $('#jumpBtn'), settings: $('#settings'), toast: $('#toast'), drop: $('#dropHint'), historySearch: $('#historySearch'),
  };
  if (!/Mac|iPhone|iPad/.test(navigator.platform)) document.querySelectorAll('.kbd').forEach((k) => { k.textContent = 'Ctrl⇧O'; });
  document.querySelectorAll('[data-icon]').forEach((n) => { n.insertAdjacentHTML('afterbegin', icon(n.dataset.icon)); });

  /* ---------- Storage: IndexedDB, so images fit ---------- */
  const db = {
    _p: null,
    open() {
      if (!this._p) this._p = new Promise((res, rej) => {
        const r = indexedDB.open('tern', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('chats', { keyPath: 'id' });
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      return this._p;
    },
    async tx(mode, fn) {
      const d = await this.open();
      return new Promise((res, rej) => {
        const t = d.transaction('chats', mode);
        const out = fn(t.objectStore('chats'));
        t.oncomplete = () => res(out && 'result' in out ? out.result : undefined);
        t.onerror = () => rej(t.error);
      });
    },
    all() { return this.tx('readonly', (s) => s.getAll()); },
    put(c) { return this.tx('readwrite', (s) => s.put(c)); },
    del(id) { return this.tx('readwrite', (s) => s.delete(id)); },
    clear() { return this.tx('readwrite', (s) => s.clear()); },
  };
  let memoryOnly = false;
  const persist = (chat) => { if (!memoryOnly) db.put(chat).catch(() => { memoryOnly = true; toast('Chats will not be saved in this browser'); }); };

  /* ---------- State ---------- */
  const state = {
    chats: [],
    current: null,
    pending: [],
    busy: false,
    controller: null,
    serverHasKey: true,
    stick: true,
  };
  const prefs = {
    get key() { return store.get('key', ''); },
    get instructions() { return store.get('instructions', ''); },
    get theme() { return store.get('theme', 'system'); },
  };

  /* ---------- Markdown + maths ---------- */
  marked.use({ gfm: true, breaks: false });
  function renderMarkdown(src) {
    const math = [];
    // Leave code alone; pull maths out of everything else before Markdown can mangle it.
    const parts = src.split(/(```[\s\S]*?(?:```|$)|`[^`\n]+`)/g);
    const prepared = parts.map((p, i) => {
      if (i % 2 === 1) return p;
      return p
        .replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g, (_, a, b) => { math.push({ tex: a ?? b, display: true }); return `\n\n%%M${math.length - 1}%%\n\n`; })
        .replace(/\\\(([\s\S]+?)\\\)|(?<![\\$\w])\$(?=\S)([^$\n]+?)(?<=\S)\$(?![\w$])/g, (m, a, b) => {
          const tex = a ?? b;
          if (b !== undefined && /^\d+([.,]\d+)?$/.test(tex.trim())) return m; // "$5" is money, not maths
          math.push({ tex, display: false }); return `%%M${math.length - 1}%%`;
        });
    }).join('');
    let html = DOMPurify.sanitize(marked.parse(prepared), { ADD_ATTR: ['target'] });
    html = html.replace(/(<p>)?%%M(\d+)%%(<\/p>)?/g, (m, open, n, close) => {
      const item = math[Number(n)];
      if (!item) return m;
      let out;
      try { out = katex.renderToString(item.tex, { displayMode: item.display, throwOnError: false, output: 'html' }); }
      catch { out = esc(item.tex); }
      return item.display ? out : (open || '') + out + (close || '');
    });
    return html;
  }
  function enhance(container) {
    container.querySelectorAll('pre > code').forEach((code) => {
      const pre = code.parentElement;
      if (pre.parentElement.classList.contains('codeblock')) return;
      const lang = (code.className.match(/language-([\w+#.-]+)/) || [])[1] || 'text';
      const wrap = document.createElement('div');
      wrap.className = 'codeblock';
      wrap.innerHTML = `<div class="codeblock-head"><span>${esc(lang)}</span><button type="button" data-copy-code>${icon('copy')}<span>Copy</span></button></div>`;
      pre.replaceWith(wrap);
      wrap.appendChild(pre);
    });
    container.querySelectorAll('a[href]').forEach((a) => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
  }

  /* ---------- Chats ---------- */
  function newChat() {
    return { id: uid(), title: '', created: Date.now(), updated: Date.now(), messages: [] };
  }
  function titleFrom(text) {
    const t = text.replace(/\s+/g, ' ').trim().replace(/^\/imagine\s+/i, '');
    if (!t) return 'Image';
    return t.length > 48 ? t.slice(0, 46).replace(/\s\S*$/, '') + '…' : t;
  }
  function openChat(id, push = true) {
    if (state.busy) stop();
    const chat = state.chats.find((c) => c.id === id);
    state.current = chat || newChat();
    if (push) history.pushState({ id: chat ? chat.id : null }, '', chat ? `/c/${chat.id}` : '/');
    renderThread();
    renderHistory();
    closeSidebarOnMobile();
    el.input.focus({ preventScroll: true });
  }
  function startNew() {
    openChat(null);
    clearPending();
  }

  /* ---------- Sidebar ---------- */
  function groupLabel(ts) {
    const d = new Date(ts); const now = new Date();
    const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = (day(now) - day(d)) / 864e5;
    if (diff < 1) return 'Today';
    if (diff < 2) return 'Yesterday';
    if (diff < 7) return 'Previous 7 days';
    if (diff < 30) return 'Previous 30 days';
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  function renderHistory() {
    const q = el.historySearch.value.trim().toLowerCase();
    const list = state.chats
      .filter((c) => c.messages.length)
      .filter((c) => !q || c.title.toLowerCase().includes(q) || c.messages.some((m) => (m.text || '').toLowerCase().includes(q)))
      .sort((a, b) => b.updated - a.updated);
    if (!list.length) {
      el.history.innerHTML = `<p class="history-empty">${q ? 'No chats match' : 'Your chats will show up here'}</p>`;
      return;
    }
    let html = ''; let last = '';
    for (const c of list) {
      const g = groupLabel(c.updated);
      if (g !== last) { html += `<p class="history-label">${g}</p>`; last = g; }
      const active = state.current && state.current.id === c.id ? ' active' : '';
      html += `<div class="history-item${active}" data-id="${c.id}">
        <a href="/c/${c.id}" data-open>${esc(c.title || 'Untitled')}</a>
        <span class="row-actions">
          <button type="button" data-rename aria-label="Rename">${icon('pencil')}</button>
          <button type="button" data-delete aria-label="Delete">${icon('trash-2')}</button>
        </span></div>`;
    }
    el.history.innerHTML = html;
  }
  el.history.addEventListener('click', async (e) => {
    const item = e.target.closest('.history-item');
    if (!item) return;
    const id = item.dataset.id;
    const chat = state.chats.find((c) => c.id === id);
    if (e.target.closest('[data-open]')) { e.preventDefault(); openChat(id); }
    else if (e.target.closest('[data-delete]')) {
      state.chats = state.chats.filter((c) => c.id !== id);
      if (!memoryOnly) db.del(id).catch(() => {});
      if (state.current && state.current.id === id) startNew(); else renderHistory();
      toast('Chat deleted');
    } else if (e.target.closest('[data-rename]') && chat) {
      const input = document.createElement('input');
      input.value = chat.title; input.setAttribute('aria-label', 'Chat name');
      item.innerHTML = ''; item.appendChild(input); input.focus(); input.select();
      const done = (save) => {
        if (save && input.value.trim()) { chat.title = input.value.trim().slice(0, 80); persist(chat); }
        renderHistory(); if (state.current === chat) el.title.textContent = chat.title;
      };
      input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') done(true); if (ev.key === 'Escape') done(false); });
      input.addEventListener('blur', () => done(true), { once: true });
    }
  });
  el.historySearch.addEventListener('input', renderHistory);

  const mobile = () => matchMedia('(max-width: 860px)').matches;
  function toggleSidebar(force) {
    if (mobile()) el.app.classList.toggle('side-open', force);
    else { el.app.classList.toggle('side-hidden', force === undefined ? undefined : !force); store.set('side', el.app.classList.contains('side-hidden') ? '0' : '1'); }
  }
  function closeSidebarOnMobile() { if (mobile()) el.app.classList.remove('side-open'); }
  $('#collapseBtn').addEventListener('click', () => toggleSidebar(false));
  $('#openSideBtn').addEventListener('click', () => toggleSidebar(true));
  $('#scrim').addEventListener('click', () => toggleSidebar(false));
  $('#newChatBtn').addEventListener('click', startNew);
  $('#topNewBtn').addEventListener('click', startNew);
  $('#homeLink').addEventListener('click', (e) => { e.preventDefault(); startNew(); });
  if (store.get('side', '1') === '0') el.app.classList.add('side-hidden');

  /* ---------- Thread rendering ---------- */
  function renderThread() {
    const chat = state.current;
    const empty = !chat.messages.length;
    el.main.classList.toggle('empty', empty);
    el.title.textContent = empty ? '' : chat.title;
    document.title = empty ? 'Tern' : `${chat.title} · Tern`;
    el.thread.innerHTML = '<div class="thread-inner"></div>';
    const inner = el.thread.firstChild;
    chat.messages.forEach((m, i) => inner.appendChild(renderMessage(m, i === chat.messages.length - 1)));
    state.stick = true;
    scrollToEnd(true);
  }
  function renderMessage(m) {
    const node = document.createElement('article');
    node.className = `msg ${m.role}`;
    node.dataset.id = m.id;
    fillMessage(node, m);
    return node;
  }
  function fillMessage(node, m) {
    if (m.role === 'user') {
      const imgs = (m.images || []).map((im) => `<img src="data:${im.mime};base64,${im.data}" alt="Attached image" />`).join('');
      node.innerHTML = `${imgs ? `<div class="msg-images">${imgs}</div>` : ''}${m.text ? `<div class="bubble">${esc(m.text)}</div>` : ''}
        <div class="actions">
          <button type="button" data-act="copy" aria-label="Copy">${icon('copy')}</button>
          <button type="button" data-act="edit" aria-label="Edit">${icon('pencil')}</button>
        </div>`;
      return;
    }
    let html = '';
    if (m.thought || (m.streaming && m.mode === 'think')) {
      const label = m.streaming && !m.text ? 'Thinking' : `Thought for ${Math.max(1, Math.round((m.thoughtMs || 0) / 1000))}s`;
      const live = m.streaming && !m.text;
      html += `<details class="thinking"${live || openThoughts.has(m.id) ? ' open' : ''}>
        <summary><span class="dot ${live ? 'live' : 'done'}"></span><span>${label}</span>${icon('chevron-right')}</summary>
        <div class="thought md">${m.thought ? renderMarkdown(m.thought) : ''}</div></details>`;
    }
    if (m.steps && m.steps.length) {
      html += `<ol class="steps">${m.steps.map((st) => `<li class="step ${st.status}"><span class="dot ${st.status === 'running' ? 'live' : st.status === 'done' ? 'done' : ''}"></span><span class="step-label">${esc(st.label)}</span>${st.detail ? `<span class="step-detail">${esc(st.detail)}</span>` : ''}</li>`).join('')}</ol>`;
    }
    if (m.confirm) html += confirmCard(m.confirm);
    if (m.kind === 'image') {
      if (m.streaming && !(m.genImages || []).length) html += `<div class="gen"><figure class="loading" aria-label="Drawing"></figure></div><p class="gen-note">Drawing</p>`;
      else if ((m.genImages || []).length) {
        html += `<div class="gen">${m.genImages.map((g) => `<figure><img src="${esc(g.src)}" alt="${esc(m.prompt || 'Generated image')}" loading="lazy" /></figure>`).join('')}</div>`;
      }
    }
    if (m.text) html += `<div class="md${m.streaming ? ' cursor-host' : ''}">${renderMarkdown(m.text)}</div>`;
    else if (m.streaming && m.mode !== 'think' && m.kind !== 'image' && !(m.steps || []).some((x) => x.status === 'running') && !m.confirm) html += `<div class="status-line"><span class="dot live"></span><span>${m.search ? 'Searching the web' : (m.steps || []).length ? 'Working' : 'Writing'}</span></div>`;
    if (m.sources && m.sources.length) {
      html += `<div class="sources"><p class="sources-label">Sources</p><ol>${m.sources.map((s, i) => {
        let host = s.title; try { host = s.title || new URL(s.url).hostname; } catch {}
        return `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><span class="n">${i + 1}</span><span class="t">${esc(host)}</span></a></li>`;
      }).join('')}</ol></div>`;
    }
    if (m.error) {
      html += `<div class="error-line"><span>${esc(m.error)}</span>${m.errorCode === 'no_key' ? '<button type="button" data-act="settings">Open settings</button>' : '<button type="button" data-act="retry">Try again</button>'}</div>`;
    }
    if (!m.streaming && !m.confirm) {
      html += `<div class="actions">
        ${m.text ? `<button type="button" data-act="copy" aria-label="Copy">${icon('copy')}</button>` : ''}
        <button type="button" data-act="retry" aria-label="Regenerate">${icon('refresh-cw')}</button>
        ${m.text && 'speechSynthesis' in window ? `<button type="button" data-act="speak" aria-label="Read aloud">${icon('volume-2')}</button>` : ''}
        ${(m.genImages || []).length ? `<button type="button" data-act="download" aria-label="Download image">${icon('download')}</button>` : ''}
        ${m.meta ? `<span class="meta">${esc(m.meta)}</span>` : ''}
      </div>`;
    }
    node.innerHTML = html;
    const md = node.querySelector('.md:not(.thought)');
    if (md) {
      enhance(md);
      if (m.streaming) { const last = deepestLast(md); if (last) last.classList.add('cursor'); }
    }
  }
  const openThoughts = new Set();
  el.thread.addEventListener('toggle', (e) => {
    const d = e.target; if (!d.classList || !d.classList.contains('thinking')) return;
    const id = d.closest('.msg').dataset.id;
    const m = state.current.messages.find((x) => x.id === id);
    if (m && m.streaming && !m.text) return; // auto-opened while thinking
    if (d.open) openThoughts.add(id); else openThoughts.delete(id);
  }, true);
  const FIELD_LABEL = { to: 'To', cc: 'Cc', subject: 'Subject', body: 'Message', title: 'Title', start: 'Starts', end: 'Ends', location: 'Where', attendees: 'Guests', prompt: 'What it does', when: 'When' };
  function confirmCard(c) {
    const p = c.preview || {}; const editable = p.editable || [];
    const rows = Object.entries(p.fields || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null).map(([k, v]) => {
      const label = FIELD_LABEL[k] || k;
      const val = typeof v === 'string' ? v : JSON.stringify(v);
      if (editable.includes(k) && !c.state) {
        const big = k === 'body' || k === 'prompt' || val.length > 80;
        return `<label class="cf-row"><span>${esc(label)}</span>${big ? `<textarea data-edit="${esc(k)}" rows="${Math.min(10, Math.max(3, val.split('\n').length + 1))}">${esc(val)}</textarea>` : `<input data-edit="${esc(k)}" value="${esc(val)}" />`}</label>`;
      }
      return `<div class="cf-row"><span>${esc(label)}</span><p>${esc(val)}</p></div>`;
    }).join('');
    const head = c.state === 'approved' ? 'Approved' : c.state === 'cancelled' ? 'Cancelled' : 'Needs your OK';
    return `<div class="confirm${c.state ? ' settled' : ''}" role="group" aria-label="${esc(c.label)}">
      <div class="cf-head"><span class="cf-app">${esc(appName(c.app))}</span><span class="cf-title">${esc(c.label)}</span><span class="cf-state">${head}</span></div>
      ${c.state ? '' : `<div class="cf-body">${rows}</div><div class="cf-actions"><button type="button" class="btn ghost" data-act="deny">Cancel</button><button type="button" class="btn primary" data-act="approve">${p.kind === 'email' ? 'Send' : 'Approve'}</button></div>`}
    </div>`;
  }
  const APP_NAMES = { gmail: 'Gmail', calendar: 'Calendar', drive: 'Drive', tasks: 'Tasks', web: 'Web' };
  const appName = (a) => APP_NAMES[a] || a;

  function deepestLast(root) {
    let n = root.lastElementChild;
    while (n && n.lastElementChild && !['PRE', 'TABLE', 'SPAN'].includes(n.tagName) && !n.classList.contains('katex-display') && !n.classList.contains('codeblock')) n = n.lastElementChild;
    return n && n.tagName !== 'PRE' && !n.classList.contains('codeblock') ? n : null;
  }
  function nodeFor(m) { return el.thread.querySelector(`.msg[data-id="${m.id}"]`); }

  let frame = 0;
  function scheduleUpdate(m) {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const n = nodeFor(m);
      if (n) { fillMessage(n, m); scrollToEnd(); }
    });
  }
  function scrollToEnd(force) {
    if (force || state.stick) el.thread.scrollTop = el.thread.scrollHeight;
  }
  el.thread.addEventListener('scroll', () => {
    const gap = el.thread.scrollHeight - el.thread.scrollTop - el.thread.clientHeight;
    state.stick = gap < 80;
    el.jump.hidden = gap < 240;
  }, { passive: true });
  el.jump.addEventListener('click', () => { el.thread.scrollTo({ top: el.thread.scrollHeight, behavior: 'smooth' }); });

  /* ---------- Message actions ---------- */
  el.thread.addEventListener('click', async (e) => {
    const img = e.target.closest('.msg-images img, .gen img');
    if (img) { lightbox(img.src); return; }
    const copyCode = e.target.closest('[data-copy-code]');
    if (copyCode) {
      const code = copyCode.closest('.codeblock').querySelector('code').innerText;
      await copy(code); copyCode.querySelector('span').textContent = 'Copied';
      setTimeout(() => { copyCode.querySelector('span').textContent = 'Copy'; }, 1500);
      return;
    }
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const node = btn.closest('.msg');
    const chat = state.current;
    const idx = chat.messages.findIndex((x) => x.id === node.dataset.id);
    const m = chat.messages[idx];
    const act = btn.dataset.act;
    if (act === 'copy') { await copy(m.text || ''); btn.innerHTML = icon('check'); setTimeout(() => { btn.innerHTML = icon('copy'); }, 1500); }
    if (act === 'settings') openSettings();
    if ((act === 'approve' || act === 'deny') && m.confirm && !state.busy) {
      const edits = {};
      node.querySelectorAll('[data-edit]').forEach((f) => { edits[f.dataset.edit] = f.value; });
      resumeAction(m, act === 'approve', edits);
    }
    if (act === 'speak') speak(m.text, btn);
    if (act === 'download') {
      const src = m.genImages[0].src;
      const a = document.createElement('a'); a.href = src; a.download = 'tern-image.png'; a.target = '_blank'; a.rel = 'noopener'; a.click();
    }
    if (act === 'retry' && !state.busy) {
      const userIdx = m.role === 'assistant' ? idx - 1 : idx;
      chat.messages.splice(userIdx + 1);
      renderThread();
      respond();
    }
    if (act === 'edit' && !state.busy) editMessage(node, m, idx);
  });
  function editMessage(node, m, idx) {
    node.innerHTML = `<div class="edit-box"><textarea aria-label="Edit message"></textarea><div class="row">
      <button type="button" class="btn ghost" data-cancel>Cancel</button><button type="button" class="btn primary" data-save>Send</button></div></div>`;
    const ta = node.querySelector('textarea'); ta.value = m.text || ''; ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
    node.querySelector('[data-cancel]').onclick = () => fillMessage(node, m);
    const save = () => {
      const text = ta.value.trim();
      if (!text && !(m.images || []).length) return;
      m.text = text;
      state.current.messages.splice(idx + 1);
      renderThread();
      respond();
    };
    node.querySelector('[data-save]').onclick = save;
    ta.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); save(); } if (ev.key === 'Escape') fillMessage(node, m); });
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); }
    catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
  }
  function speak(text, btn) {
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
    const plain = text.replace(/```[\s\S]*?```/g, ' code block ').replace(/[#*_`>|$\\]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    const u = new SpeechSynthesisUtterance(plain);
    btn.classList.add('listening');
    u.onend = u.onerror = () => btn.classList.remove('listening');
    speechSynthesis.speak(u);
  }
  function lightbox(src) {
    const box = document.createElement('div');
    box.className = 'lightbox'; box.innerHTML = `<img src="${esc(src)}" alt="" />`;
    box.tabIndex = -1;
    const close = () => { box.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    box.addEventListener('click', close); document.addEventListener('keydown', onKey);
    document.body.appendChild(box); box.focus();
  }

  /* ---------- Composer ---------- */
  function autosize() {
    el.input.style.height = 'auto';
    el.input.style.height = Math.min(el.input.scrollHeight, innerHeight * 0.4) + 'px';
  }
  function syncSend() {
    if (state.busy) {
      el.send.disabled = false; el.send.classList.add('stop'); el.send.innerHTML = icon('square'); el.send.setAttribute('aria-label', 'Stop');
    } else {
      el.send.classList.remove('stop'); el.send.innerHTML = icon('arrow-up'); el.send.setAttribute('aria-label', 'Send');
      el.send.disabled = !el.input.value.trim() && !state.pending.length;
    }
  }
  el.input.addEventListener('input', () => { autosize(); syncSend(); });
  el.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !(mobile() && 'ontouchstart' in window)) { e.preventDefault(); el.form.requestSubmit(); }
  });
  el.form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.busy) { stop(); return; }
    submit();
  });

  const toggles = { search: el.search, think: el.think, image: el.image };
  function setToggle(name, on) {
    toggles[name].setAttribute('aria-pressed', String(on));
    store.set('t.' + name, on ? '1' : '0');
    if (name === 'image') el.input.placeholder = on ? 'Describe an image' : 'Ask anything';
  }
  for (const name of Object.keys(toggles)) {
    if (name !== 'image') setToggle(name, store.get('t.' + name, '0') === '1');
    toggles[name].addEventListener('click', () => {
      const on = toggles[name].getAttribute('aria-pressed') !== 'true';
      setToggle(name, on);
      if (on && name === 'image') { setToggle('search', false); }
      if (on && name === 'search') setToggle('image', false);
      el.input.focus();
    });
  }
  const on = (name) => toggles[name].getAttribute('aria-pressed') === 'true';

  /* Attachments */
  el.attach.addEventListener('click', () => el.file.click());
  el.file.addEventListener('change', () => { addFiles(el.file.files); el.file.value = ''; });
  el.input.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
    if (files.length) { e.preventDefault(); addFiles(files); }
  });
  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => { if ([...e.dataTransfer.types].includes('Files')) { dragDepth++; el.drop.hidden = false; } });
  window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; el.drop.hidden = true; } });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => { e.preventDefault(); dragDepth = 0; el.drop.hidden = true; addFiles(e.dataTransfer.files); });

  async function addFiles(list) {
    const files = [...list].filter((f) => /^image\/(png|jpeg|webp|gif|heic|heif)$/.test(f.type));
    if (!files.length) { toast('Only images can be attached'); return; }
    for (const f of files) {
      if (state.pending.length >= 4) { toast('Up to 4 images per message'); break; }
      try { state.pending.push(await shrink(f)); } catch { toast(`Could not read ${f.name}`); }
    }
    renderPending(); syncSend(); el.input.focus();
  }
  function shrink(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 1536;
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        const dataUrl = c.toDataURL('image/jpeg', 0.86);
        resolve({ mime: 'image/jpeg', data: dataUrl.split(',')[1] });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }
  function renderPending() {
    el.attachments.hidden = !state.pending.length;
    el.attachments.innerHTML = state.pending.map((p, i) => `<div class="thumb"><img src="data:${p.mime};base64,${p.data}" alt="Attachment ${i + 1}" /><button type="button" data-remove="${i}" aria-label="Remove attachment ${i + 1}">${icon('x')}</button></div>`).join('');
  }
  el.attachments.addEventListener('click', (e) => {
    const b = e.target.closest('[data-remove]');
    if (b) { state.pending.splice(Number(b.dataset.remove), 1); renderPending(); syncSend(); }
  });
  function clearPending() { state.pending = []; renderPending(); syncSend(); }

  /* Dictation */
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (Rec) {
    el.mic.hidden = false;
    let rec = null;
    el.mic.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      rec = new Rec(); rec.interimResults = true; rec.continuous = false; rec.lang = navigator.language || 'en-US';
      const base = el.input.value ? el.input.value.replace(/\s*$/, ' ') : '';
      rec.onresult = (ev) => { el.input.value = base + [...ev.results].map((r) => r[0].transcript).join(''); autosize(); syncSend(); };
      rec.onend = () => { rec = null; el.mic.classList.remove('listening'); el.mic.setAttribute('aria-label', 'Dictate'); el.input.focus(); };
      rec.onerror = (ev) => { if (ev.error === 'not-allowed') toast('Microphone access is blocked'); };
      el.mic.classList.add('listening'); el.mic.setAttribute('aria-label', 'Stop dictation');
      rec.start();
    });
  }

  /* ---------- Sending ---------- */
  const IMAGE_INTENT = /^(\/imagine\b|\/image\b|(please\s+)?(draw|paint|sketch|illustrate)\b|(generate|create|make|render|design)\s+(me\s+)?(an?\s+)?(image|picture|photo|drawing|illustration|logo|icon|wallpaper|poster)\b)/i;

  function submit() {
    const text = el.input.value.trim();
    if (!text && !state.pending.length) return;
    const chat = state.current;
    const isNew = !chat.messages.length;
    chat.messages.push({ id: uid(), role: 'user', text, images: state.pending.slice(), ts: Date.now() });
    if (isNew) {
      chat.title = titleFrom(text);
      if (!state.chats.includes(chat)) state.chats.push(chat);
      history.pushState({ id: chat.id }, '', `/c/${chat.id}`);
    }
    el.input.value = ''; autosize(); clearPending();
    const wantImage = on('image') || IMAGE_INTENT.test(text);
    if (on('image')) setToggle('image', false);
    renderThread();
    renderHistory();
    respond({ image: wantImage });
  }

  function headers() {
    const h = { 'content-type': 'application/json' };
    if (prefs.key) h['x-gemini-key'] = prefs.key;
    return h;
  }

  async function respond(opts = {}) {
    const chat = state.current;
    const lastUser = [...chat.messages].reverse().find((x) => x.role === 'user');
    const image = opts.image ?? (lastUser && IMAGE_INTENT.test(lastUser.text || ''));
    const m = {
      id: uid(), role: 'assistant', text: '', thought: '', streaming: true, ts: Date.now(),
      mode: on('think') && !image ? 'think' : 'fast', search: on('search') && !image, kind: image ? 'image' : 'text',
    };
    chat.messages.push(m);
    chat.updated = Date.now();
    el.thread.firstChild.appendChild(renderMessage(m));
    state.stick = true; scrollToEnd(true);
    state.busy = true; state.controller = new AbortController(); syncSend();
    const started = performance.now();
    try {
      if (image) await drawImage(m, lastUser);
      else await streamChat(m, chat, started);
    } catch (e) {
      if (e.name !== 'AbortError') m.error = m.error || 'Something went wrong. Try again.';
    } finally {
      if (m.mode === 'think' && !m.thoughtMs) m.thoughtMs = performance.now() - started;
      m.streaming = false;
      if (!m.text && !m.error && !(m.genImages || []).length && state.controller?.signal.aborted) m.text = '_Stopped_';
      state.busy = false; state.controller = null; syncSend();
      const n = nodeFor(m); if (n) fillMessage(n, m);
      chat.updated = Date.now();
      persist(chat); renderHistory();
    }
  }

  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; } })();
  function historyText(x) {
    if (x.kind === 'image') return `[Generated an image for: ${x.prompt || ''}]`;
    const acts = (x.steps || []).map((s) => `${s.label}${s.detail ? ` (${s.detail})` : ''}${s.status === 'denied' ? ' — not done' : s.status === 'error' ? ' — failed' : ''}`);
    return (acts.length ? `[Actions taken: ${acts.join('; ')}]\n` : '') + (x.text || '');
  }
  async function streamChat(m, chat, started) {
    const messages = chat.messages.filter((x) => x !== m && !x.error).map((x) => ({ role: x.role, text: x.role === 'assistant' ? historyText(x) : x.text, images: x.images }));
    const res = await fetch('/api/chat', {
      method: 'POST', headers: headers(), signal: state.controller.signal,
      body: JSON.stringify({ messages, mode: m.mode, search: m.search, instructions: prefs.instructions, timezone: tz }),
    });
    await readStream(res, m, started);
  }
  async function resumeAction(m, approve, edits) {
    const chat = state.current;
    const c = m.confirm;
    c.state = approve ? 'approved' : 'cancelled';
    m.streaming = true; state.busy = true; state.controller = new AbortController(); syncSend();
    fillMessage(nodeFor(m), m);
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: headers(), signal: state.controller.signal, body: JSON.stringify({ resume: { id: c.pendingId, approve, edits }, timezone: tz }) });
      m.confirm = null;
      await readStream(res, m, performance.now());
    } catch (e) { if (e.name !== 'AbortError') m.error = 'Lost the connection. Try again.'; }
    finally {
      m.streaming = false; state.busy = false; state.controller = null; syncSend();
      const n = nodeFor(m); if (n) fillMessage(n, m);
      chat.updated = Date.now(); persist(chat); renderHistory();
      if (approve) refreshMe();
    }
  }
  async function readStream(res, m, started) {
    if (!res.ok) {
      let data = {}; try { data = await res.json(); } catch {}
      m.error = data.error || `Request failed (${res.status})`; m.errorCode = data.code;
      return;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 2);
        if (!line.startsWith('data: ')) continue;
        let ev; try { ev = JSON.parse(line.slice(6)); } catch { continue; }
        if (ev.t === 'thought') m.thought += ev.v;
        else if (ev.t === 'text') { if (!m.text && m.mode === 'think') m.thoughtMs = performance.now() - started; m.text += ev.v; }
        else if (ev.t === 'sources') m.sources = ev.v;
        else if (ev.t === 'error') m.error = ev.v;
        else if (ev.t === 'step') { m.steps = m.steps || []; const k = m.steps.findIndex((x) => x.id === ev.v.id); if (k >= 0) m.steps[k] = ev.v; else m.steps.push(ev.v); }
        else if (ev.t === 'confirm') m.confirm = ev.v;
        scheduleUpdate(m);
      }
    }
    if (m.mode === 'think' && !m.thought) m.mode = 'fast';
    m.meta = m.mode === 'think' ? 'Think' : '';
    if (m.confirm) requestAnimationFrame(() => nodeFor(m)?.querySelector('.confirm [data-act="approve"]')?.focus({ preventScroll: true }));
  }

  async function drawImage(m, user) {
    const prompt = (user.text || '').replace(/^\/(imagine|image)\s*/i, '').trim() || 'Reimagine this image';
    m.prompt = prompt;
    scheduleUpdate(m);
    const res = await fetch('/api/image', {
      method: 'POST', headers: headers(), signal: state.controller.signal,
      body: JSON.stringify({ prompt, images: user.images || [] }),
    });
    let data = {}; try { data = await res.json(); } catch {}
    if (data.images && data.images.length) {
      m.genImages = data.images.map((im) => ({ src: `data:${im.mime};base64,${im.data}` }));
      m.text = (data.text || '').trim();
      m.meta = 'Gemini';
    } else if (data.fallback || res.ok) {
      // Free, keyless image service so drawing works on any Gemini tier.
      const seed = Math.floor(Math.random() * 1e9);
      const src = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 900))}?width=1024&height=1024&nologo=true&seed=${seed}`;
      await new Promise((resolve) => {
        const probe = new Image();
        const t = setTimeout(resolve, 90_000);
        probe.onload = () => { clearTimeout(t); m.genImages = [{ src }]; resolve(); };
        probe.onerror = () => { clearTimeout(t); m.error = 'The image service did not answer. Try again.'; resolve(); };
        state.controller.signal.addEventListener('abort', () => { clearTimeout(t); probe.src = ''; resolve(); });
        probe.src = src;
      });
      m.meta = m.genImages ? 'Pollinations' : '';
    } else {
      m.error = data.error || 'Could not make that image.';
    }
  }

  function stop() {
    if (state.controller) state.controller.abort();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  /* ---------- Settings ---------- */
  const keyInput = $('#keyInput'); const instr = $('#instructionsInput'); const themeSel = $('#themeSelect');
  function openSettings() {
    keyInput.value = prefs.key; instr.value = prefs.instructions; themeSel.value = prefs.theme;
    $('#keyHelp').textContent = state.serverHasKey
      ? 'Optional. This site already has a key; add your own free one from aistudio.google.com/apikey to use your quota instead. Kept in this browser only.'
      : 'Needed to chat. Get a free key at aistudio.google.com/apikey. Kept in this browser only and sent only to this site’s server.';
    el.settings.showModal();
    closeSidebarOnMobile();
  }
  $('#settingsBtn').addEventListener('click', openSettings);
  el.settings.addEventListener('close', () => {
    if (el.settings.returnValue !== 'save') return;
    store.set('key', keyInput.value.trim());
    store.set('instructions', instr.value.trim());
    store.set('theme', themeSel.value);
    applyTheme();
    toast('Saved');
  });
  $('#clearAllBtn').addEventListener('click', async () => {
    if (!confirm('Delete every chat in this browser? This cannot be undone.')) return;
    state.chats = [];
    if (!memoryOnly) await db.clear().catch(() => {});
    el.settings.close('cancel');
    startNew();
    toast('All chats deleted');
  });
  function applyTheme() {
    const t = prefs.theme;
    if (t === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  }

  /* ---------- Account, apps, tasks ---------- */
  async function api(path, opts = {}) {
    const res = await fetch(path, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) } });
    let data = null; try { data = res.status === 204 ? {} : await res.json(); } catch { data = {}; }
    if (!res.ok) { const e = new Error(data.error || `Request failed (${res.status})`); e.code = data.code; throw e; }
    return data;
  }
  async function refreshMe() {
    try {
      const me = await api('/api/me');
      state.user = me.user;
      $('#account').hidden = !me.user;
      if (me.user) {
        $('#accountName').textContent = me.user.name || me.user.email.split('@')[0];
        $('#accountEmail').textContent = me.user.email;
        $('#avatar').textContent = (me.user.name || me.user.email).trim()[0].toUpperCase();
      }
      $('#tasksDot').hidden = !me.unread;
    } catch { state.user = null; }
  }
  $('#signOutBtn').addEventListener('click', async () => {
    await api('/api/auth?step=logout', { method: 'POST' }).catch(() => {});
    await refreshMe(); toast('Signed out');
  });
  document.querySelectorAll('dialog [data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
  document.querySelectorAll('dialog.modal').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

  const appsDialog = $('#appsDialog'); const appsBody = $('#appsBody');
  const signInBlock = (why) => state.auth
    ? `<div class="empty-block"><p>${why}</p><a class="btn primary" href="/api/auth?step=start">${icon('log-in')}<span>Sign in with Google</span></a></div>`
    : `<div class="empty-block"><p>${why}</p><p class="muted">Sign-in is not set up on this server yet. The README’s “Connect apps” section takes about ten minutes.</p></div>`;
  async function openApps() {
    closeSidebarOnMobile();
    if (!appsDialog.open) appsDialog.showModal();
    if (!state.user) { appsBody.innerHTML = signInBlock('Sign in with Google to let Tern work in your email, calendar, files and other apps.'); return; }
    appsBody.innerHTML = '<p class="muted">Loading</p>';
    try { renderApps(await api('/api/apps')); } catch (e) { appsBody.innerHTML = `<p class="error-text">${esc(e.message)}</p>`; }
  }
  const GICON = { gmail: 'mail', calendar: 'calendar', drive: 'hard-drive' };
  function statusText(st) { return { connected: 'Connected', needs_auth: 'Sign in needed', expired: 'Expired', error: 'Error', disconnected: '' }[st] || ''; }
  function renderApps(d) {
    const g = d.google.map((a) => `<li class="app-row">
      <span class="app-icon">${icon(GICON[a.id])}</span>
      <span class="app-text"><span class="app-name">${esc(a.name)}</span><span class="muted">${esc(a.blurb)}</span></span>
      ${a.status === 'connected' ? `<span class="app-state ok">Connected</span><button class="btn ghost sm" data-g-off="${a.id}">Disconnect</button>`
        : `<a class="btn ${a.status === 'disconnected' ? 'primary' : 'ghost'} sm" href="/api/auth?step=start&apps=${a.id}">${a.status === 'disconnected' ? 'Connect' : 'Reconnect'}</a>`}
    </li>`).join('');
    const c = d.custom.map((a) => `<li class="app-row">
      <span class="app-icon">${icon('plug')}</span>
      <span class="app-text"><span class="app-name">${esc(a.name)}</span><span class="muted mono">${esc(a.host)}${a.tools ? ` · ${a.tools} actions` : ''}</span></span>
      ${a.status === 'connected' ? '<span class="app-state ok">Connected</span>' : `<a class="btn primary sm" href="/api/apps?step=oauth&id=${a.id}">Sign in</a>`}
      <button class="icon-btn" data-c-off="${a.id}" aria-label="Remove ${esc(a.name)}">${icon('trash-2')}</button>
    </li>`).join('');
    const presets = d.presets.map((p) => `<button type="button" class="preset" data-preset='${esc(JSON.stringify(p))}'>${esc(p.name)}</button>`).join('');
    appsBody.innerHTML = `
      <p class="panel-lead">Tern acts in these apps for you. It reads on its own; anything that sends, changes or deletes waits for your OK.</p>
      <h3 class="panel-h">Google</h3><ul class="app-list">${g}</ul>
      <h3 class="panel-h">Your other apps</h3>
      ${c ? `<ul class="app-list">${c}</ul>` : '<p class="muted">None yet. Add the apps you use; most offer one-click sign-in.</p>'}
      <div class="presets">${presets}<button type="button" class="preset" data-preset='{"name":"","url":"","auth":"any"}'>${icon('plus')}<span>Any app</span></button></div>
      <form class="add-app" id="addApp" hidden>
        <p class="muted" id="addNote"></p>
        <label class="field"><span>Name</span><input name="name" required maxlength="40" /></label>
        <label class="field"><span>Server URL</span><input name="url" type="url" required placeholder="https://…/mcp" /></label>
        <label class="field" id="tokenField"><span>Access token</span><input name="token" type="password" autocomplete="off" placeholder="Only if the app gave you one" /></label>
        <div class="row-end"><button type="button" class="btn ghost" data-cancel-add>Cancel</button><button class="btn primary">Connect</button></div>
      </form>
      <p class="fine">Other apps connect through the open Model Context Protocol (MCP). Zapier’s server alone reaches thousands of apps.</p>`;
  }
  appsBody.addEventListener('click', async (e) => {
    const off = e.target.closest('[data-g-off]');
    const coff = e.target.closest('[data-c-off]');
    const pre = e.target.closest('[data-preset]');
    try {
      if (off) renderApps(await api(`/api/apps?google=${off.dataset.gOff}`, { method: 'DELETE' }));
      if (coff) renderApps(await api(`/api/apps?id=${coff.dataset.cOff}`, { method: 'DELETE' }));
    } catch (err) { toast(err.message); }
    if (pre) {
      const p = JSON.parse(pre.dataset.preset);
      const f = $('#addApp'); f.hidden = false;
      f.name.value = p.name; f.url.value = p.url || '';
      $('#addNote').textContent = p.note || (p.auth === 'oauth' ? 'You will be sent to the app to sign in.' : p.auth === 'any' ? 'Paste the MCP server URL the app gives you.' : '');
      $('#tokenField').hidden = p.auth === 'oauth' || p.auth === 'url';
      (p.url ? f.querySelector('button.primary') : f.url).focus();
    }
    if (e.target.closest('[data-cancel-add]')) $('#addApp').hidden = true;
  });
  appsBody.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target; const btn = f.querySelector('button.primary');
    btn.disabled = true; btn.textContent = 'Connecting';
    try {
      const r = await api('/api/apps', { method: 'POST', body: JSON.stringify({ name: f.name.value, url: f.url.value, token: f.token.value }) });
      if (r.needsAuth) { location.href = r.authUrl; return; }
      toast(`${f.name.value} connected${r.tools ? ` with ${r.tools} actions` : ''}`);
      renderApps(await api('/api/apps'));
    } catch (err) { toast(err.message); btn.disabled = false; btn.textContent = 'Connect'; }
  });
  $('#appsBtn').addEventListener('click', openApps);

  /* Tasks */
  const tasksDialog = $('#tasksDialog'); const tasksBody = $('#tasksBody');
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const fmtWhen = (iso, zone) => { try { return new Date(iso).toLocaleString(undefined, { timeZone: zone, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };
  async function openTasks() {
    closeSidebarOnMobile();
    if (!tasksDialog.open) tasksDialog.showModal();
    if (!state.user) { tasksBody.innerHTML = signInBlock('Sign in to set up tasks that run on their own, like a 7am inbox digest emailed to you.'); return; }
    tasksBody.innerHTML = '<p class="muted">Loading</p>';
    try {
      const [{ tasks, serverKey }, { runs }] = await Promise.all([api('/api/tasks'), api('/api/tasks?step=runs')]);
      renderTasks(tasks, runs, serverKey);
      api('/api/tasks?step=read', { method: 'POST' }).then(() => { $('#tasksDot').hidden = true; }).catch(() => {});
    } catch (e) { tasksBody.innerHTML = `<p class="error-text">${esc(e.message)}</p>`; }
  }
  function renderTasks(tasks, runs, serverKey) {
    const list = tasks.map((t) => `<li class="task-row${t.enabled ? '' : ' paused'}" data-id="${t.id}">
      <span class="dot ${t.last_status === 'error' ? 'bad' : t.enabled ? 'done' : ''}"></span>
      <span class="app-text"><span class="app-name">${esc(t.title)}</span><span class="muted">${esc(t.when)} · ${esc(t.timezone)}</span>
        <span class="muted mono">${t.enabled && t.next_run_at ? `Next ${esc(fmtWhen(t.next_run_at, t.timezone))}` : 'Paused'}${t.can_act ? ' · can act' : ''}</span></span>
      <label class="switch" title="${t.enabled ? 'Pause' : 'Resume'}"><input type="checkbox" data-toggle ${t.enabled ? 'checked' : ''} aria-label="Task on" /><span></span></label>
      <button class="icon-btn" data-run aria-label="Run now">${icon('play')}</button>
      <button class="icon-btn" data-del aria-label="Delete task">${icon('trash-2')}</button>
    </li>`).join('');
    const results = runs.slice(0, 8).map((r, i) => `<details class="run"${!r.read || i === 0 ? ' open' : ''}><summary><span class="dot ${r.status === 'ok' ? 'done' : 'bad'}"></span><span class="app-name">${esc(r.title || 'Task')}</span><span class="muted mono">${esc(fmtWhen(r.started_at))}${r.emailed ? ' · emailed' : ''}</span></summary><div class="md run-out">${renderMarkdown(r.output || '')}</div></details>`).join('');
    tasksBody.innerHTML = `
      <p class="panel-lead">Tasks run on their own on a schedule, even with Tern closed, and email you what they find. You can also just ask in chat: “every weekday at 7, summarise my inbox”.</p>
      ${serverKey ? '' : '<p class="error-text">Tasks need a Gemini key set on the server (GEMINI_API_KEY); a key saved only in this browser cannot run while it is closed.</p>'}
      ${list ? `<ul class="app-list">${list}</ul>` : ''}
      <button type="button" class="btn ghost" id="newTaskBtn">${icon('plus')}<span>New task</span></button>
      <form class="task-form" id="taskForm" hidden>
        <label class="field"><span>Name</span><input name="title" maxlength="80" placeholder="Morning inbox digest" required /></label>
        <label class="field"><span>What should Tern do</span><textarea name="prompt" rows="3" required placeholder="Summarise unread email from the last day, flag anything that needs a reply today, and list my meetings"></textarea></label>
        <div class="field-row">
          <label class="field"><span>Repeat</span><select name="freq"><option value="weekdays">Weekdays</option><option value="daily">Every day</option><option value="weekly">Weekly</option><option value="hourly">Every hour</option><option value="once">Once</option></select></label>
          <label class="field" data-for="time"><span>Time</span><input name="time" type="time" value="07:00" /></label>
          <label class="field" data-for="at" hidden><span>Date and time</span><input name="at" type="datetime-local" /></label>
        </div>
        <fieldset class="days" data-for="days" hidden><legend>Days</legend>${DAYS.map((d, i) => `<label><input type="checkbox" name="days" value="${i + 1}" ${i === 0 ? 'checked' : ''} />${d}</label>`).join('')}</fieldset>
        <label class="check"><input type="checkbox" name="deliver_email" checked /> Email me the result (needs Gmail connected)</label>
        <label class="check"><input type="checkbox" name="can_act" /> Can act without asking (send, change, delete). Off means it only reads and reports</label>
        <p class="muted">Times use ${esc(tz)}.</p>
        <div class="row-end"><button type="button" class="btn ghost" data-cancel-task>Cancel</button><button class="btn primary">Create task</button></div>
      </form>
      ${results ? `<h3 class="panel-h">Recent results</h3><div class="runs">${results}</div>` : ''}`;
    tasksBody.querySelectorAll('.run-out').forEach(enhance);
  }
  tasksBody.addEventListener('change', async (e) => {
    if (e.target.name === 'freq') {
      const v = e.target.value; const f = $('#taskForm');
      f.querySelector('[data-for="time"]').hidden = v === 'once';
      f.querySelector('[data-for="at"]').hidden = v !== 'once';
      f.querySelector('[data-for="days"]').hidden = v !== 'weekly';
      f.querySelector('[data-for="time"] span').textContent = v === 'hourly' ? 'Minute past the hour' : 'Time';
    }
    if (e.target.matches('[data-toggle]')) {
      const id = e.target.closest('[data-id]').dataset.id;
      try { await api('/api/tasks', { method: 'PATCH', body: JSON.stringify({ id, enabled: e.target.checked, timezone: undefined }) }); openTasks(); } catch (err) { toast(err.message); }
    }
  });
  tasksBody.addEventListener('click', async (e) => {
    const row = e.target.closest('[data-id]');
    if (e.target.closest('#newTaskBtn')) { $('#taskForm').hidden = false; $('#newTaskBtn').hidden = true; $('#taskForm').title.focus(); }
    if (e.target.closest('[data-cancel-task]')) { $('#taskForm').hidden = true; $('#newTaskBtn').hidden = false; }
    if (row && e.target.closest('[data-del]')) {
      if (!confirm('Delete this task and its results?')) return;
      await api(`/api/tasks?id=${row.dataset.id}`, { method: 'DELETE' }).catch((err) => toast(err.message)); openTasks();
    }
    if (row && e.target.closest('[data-run]')) {
      const b = e.target.closest('[data-run]'); b.disabled = true; b.classList.add('busy');
      toast('Running');
      try { const r = await api(`/api/tasks?step=run&id=${row.dataset.id}`, { method: 'POST' }); toast(r.run.status === 'ok' ? (r.run.emailed ? 'Done, and emailed to you' : 'Done') : 'The run failed'); }
      catch (err) { toast(err.message); }
      openTasks();
    }
  });
  tasksBody.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target; const freq = f.freq.value;
    const schedule = { freq, time: freq === 'hourly' ? `00:${(f.time.value || '00:00').slice(3)}` : f.time.value };
    if (freq === 'weekly') schedule.days = [...f.querySelectorAll('[name="days"]:checked')].map((x) => Number(x.value));
    if (freq === 'once') { if (!f.at.value) { toast('Pick a date and time'); return; } schedule.at = new Date(f.at.value).toISOString(); }
    try {
      await api('/api/tasks', { method: 'POST', body: JSON.stringify({ title: f.title.value, prompt: f.prompt.value, schedule, timezone: tz, deliver_email: f.deliver_email.checked, can_act: f.can_act.checked }) });
      toast('Task created'); openTasks();
    } catch (err) { toast(err.message); }
  });
  $('#tasksBtn').addEventListener('click', openTasks);

  let toastTimer;
  function toast(msg) {
    el.toast.textContent = msg; el.toast.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.toast.hidden = true; }, 2200);
  }

  /* ---------- Keyboard ---------- */
  document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault(); startNew(); }
    else if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); if (mobile()) toggleSidebar(true); else toggleSidebar(true); el.historySearch.focus(); }
    else if (e.key === 'Escape' && state.busy) stop();
    else if (e.key === '/' && document.activeElement === document.body) { e.preventDefault(); el.input.focus(); }
  });
  window.addEventListener('popstate', () => {
    const id = location.pathname.match(/^\/c\/([\w-]+)/)?.[1];
    openChat(id || null, false);
  });

  /* ---------- Boot ---------- */
  async function boot() {
    try { state.chats = await db.all(); } catch { memoryOnly = true; state.chats = []; }
    const id = location.pathname.match(/^\/c\/([\w-]+)/)?.[1];
    const chat = state.chats.find((c) => c.id === id);
    if (id && !chat) history.replaceState({}, '', '/');
    openChat(chat ? chat.id : null, false);
    syncSend();
    const params = new URLSearchParams(location.search);
    try {
      const s = await (await fetch('/api/status')).json();
      state.serverHasKey = !!s.hasKey; state.auth = !!s.auth;
      if (!s.hasKey && !prefs.key) toast('Add a free Gemini key in Settings to start');
    } catch {}
    await refreshMe();
    if (params.get('error')) toast(params.get('error'));
    if (params.has('apps') || params.has('error')) history.replaceState(history.state, '', location.pathname);
    if (params.has('apps')) openApps();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  boot();
})();
