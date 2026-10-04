// Small shared helpers: escaping, ids, dates, Markdown + maths, toasts, dialogs.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const uid = (p = '') => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

export const LETTERS = 'ABCDEFGH';

export function dateKey(d = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
export function parseDateKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function daysBetween(a, b) {
  const A = new Date(a); A.setHours(0, 0, 0, 0);
  const B = new Date(b); B.setHours(0, 0, 0, 0);
  return Math.round((B - A) / 86400000);
}
export function fmtDate(t, opts = { day: 'numeric', month: 'short' }) {
  return new Date(t).toLocaleDateString(undefined, opts);
}
export function fmtAgo(t) {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}
export function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(s).padStart(2, '0')}`;
}
export const pct = (x) => `${Math.round((x || 0) * 100)}%`;
export const plural = (n, w, pl = w + 's') => `${n} ${n === 1 ? w : pl}`;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Markdown + maths ────────────────────────────────────────────────
// Maths is lifted out before Markdown parsing (so underscores and
// backslashes survive), put back escaped, then typeset by KaTeX.
const MATH_RE = /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$(?=\S)[^$\n]*?\S\$(?!\d)|\$\S\$(?!\d)/g;

export function mdToHtml(src) {
  const text = String(src ?? '');
  if (!window.marked || !window.DOMPurify) {
    return `<p>${esc(text).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
  }
  const maths = [];
  const lifted = text.replace(MATH_RE, (m) => {
    maths.push(m);
    return `@@M${maths.length - 1}@@`;
  });
  let html = window.marked.parse(lifted, { gfm: true, breaks: false });
  html = window.DOMPurify.sanitize(html, { ADD_TAGS: ['details', 'summary'], ADD_ATTR: ['open'] });
  return html.replace(/@@M(\d+)@@/g, (_, i) => esc(maths[+i]));
}

export function typeset(el) {
  if (!el || !window.renderMathInElement) return;
  try {
    window.renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false },
        { left: '$', right: '$', display: false },
      ],
      throwOnError: false,
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
    });
  } catch { /* leave raw TeX visible */ }
}

export function renderMd(el, src) {
  el.innerHTML = mdToHtml(src);
  typeset(el);
}

// Inline Markdown for short strings (question prompts, options).
export function mdInline(src) {
  const html = mdToHtml(src);
  return html.replace(/^<p>([\s\S]*)<\/p>\s*$/, '$1');
}

export function plainText(src) {
  return String(src ?? '').replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim();
}

// ── Toasts & dialogs ────────────────────────────────────────────────
export function toast(msg, ms = 3200) {
  let box = $('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.append(box); }
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  box.append(t);
  setTimeout(() => t.remove(), ms);
}

// Opens a dialog. `body` is HTML; `actions` are [{label, cls, value}].
// Resolves with the clicked value (or null), plus the dialog element for reading inputs.
export function dialog({ title, body = '', actions = [{ label: 'OK', cls: 'btn-primary', value: true }], onOpen }) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'dialog-backdrop';
    wrap.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <h3>${esc(title)}</h3><div class="dialog-body">${body}</div>
      <div class="dialog-actions">${actions.map((a, i) => `<button class="btn ${a.cls || 'btn-secondary'}" data-i="${i}">${esc(a.label)}</button>`).join('')}</div></div>`;
    const close = (v) => {
      const data = {};
      wrap.querySelectorAll('[name]').forEach((f) => { data[f.name] = f.type === 'checkbox' ? f.checked : f.value; });
      wrap.remove();
      document.removeEventListener('keydown', onKey, true);
      prev?.focus?.();
      resolve(v === null ? null : { value: v, data });
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(null); } };
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) close(null);
      const b = e.target.closest('[data-i]');
      if (b) close(actions[+b.dataset.i].value);
    });
    document.addEventListener('keydown', onKey, true);
    document.body.append(wrap);
    onOpen?.(wrap, close);
    (wrap.querySelector('input, textarea, select') || wrap.querySelector('.btn'))?.focus();
  });
}

export async function confirmDialog(title, body, label = 'Delete') {
  const r = await dialog({ title, body: `<p>${esc(body)}</p>`, actions: [{ label, cls: 'btn-primary', value: true }, { label: 'Cancel', value: false }] });
  return r?.value === true;
}

export function download(name, text, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.22].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.18);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
  } catch { /* no audio */ }
}
