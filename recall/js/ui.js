// Reusable bits of interface shared by the views.
import { esc, pct, dateKey } from './util.js';
import { level, LEVEL_LABEL, state, activityScore } from './store.js';
import { explainError } from './ai.js';

export const meter = (x, accent = false, label = '') =>
  `<div class="meter${accent ? ' accent' : ''}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round((x || 0) * 100)}"${label ? ` aria-label="${esc(label)}"` : ''}><span style="width:${Math.round((x || 0) * 100)}%"></span></div>`;

export const levelTag = (lv) => `<span class="lvl lvl-${lv}"><i></i>${LEVEL_LABEL[lv]}</span>`;

export const legend = () => `<div class="legend">${['new', 'weak', 'learning', 'good', 'mastered'].map(levelTag).join('')}</div>`;

export function topicTile(course, t, m) {
  const lv = level(m);
  return `<a class="topic-tile" href="#/c/${course.id}/learn/${t.id}" title="${esc(t.summary || '')}">
    <span class="t">${esc(t.title)}</span>
    <span class="s"><span>${m?.n >= 1 ? LEVEL_LABEL[lv] : course.read[t.id] ? 'Lesson read' : 'Not started'}</span><span>${m?.n >= 1 ? pct(m.score) : '—'}</span></span>
    <span class="bar bg-${lv}"></span></a>`;
}

export function working(title, sub = '', id = 'work') {
  return `<div class="working" id="${id}" aria-live="polite">
    <h3><span class="spinner" aria-hidden="true"></span><span data-title>${esc(title)}</span></h3>
    <p class="muted" data-sub>${esc(sub)}</p>
    <div class="meter accent indeterminate" data-meter><span></span></div>
  </div>`;
}
export function setWorking(root, { title, sub, progress } = {}) {
  if (!root) return;
  if (title != null) root.querySelector('[data-title]').textContent = title;
  if (sub != null) root.querySelector('[data-sub]').textContent = sub;
  if (progress != null) {
    const m = root.querySelector('[data-meter]');
    m.classList.remove('indeterminate');
    m.firstElementChild.style.width = `${Math.round(Math.min(1, progress) * 100)}%`;
  }
}

export function errorNotice(err, retryId = '') {
  const e = explainError(err);
  if (!e) return '';
  return `<div class="notice stack" role="alert">
    <p style="margin:0"><b>That didn’t work.</b> ${esc(e.msg)}</p>
    <div class="btn-row">
      ${retryId ? `<button class="btn btn-primary btn-sm" id="${retryId}">Try again</button>` : ''}
      ${e.needsKey ? '<a class="btn btn-secondary btn-sm" href="#/settings">Add your API key</a>' : ''}
    </div></div>`;
}

export function heatmap(weeks = 18) {
  const days = weeks * 7;
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - days + 1);
  start.setDate(start.getDate() - start.getDay()); // start on a Sunday so rows line up with weekdays
  const cells = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const a = state.activity[dateKey(d)];
    const s = activityScore(a);
    const l = s === 0 ? '' : s < 5 ? 'l1' : s < 15 ? 'l2' : s < 35 ? 'l3' : 'l4';
    const tip = a ? `${dateKey(d)}: ${a.q || 0} questions, ${a.c || 0} cards, ${a.l || 0} lessons, ${a.m || 0} focus min` : `${dateKey(d)}: no study`;
    cells.push(`<i class="${l}" title="${tip}"></i>`);
  }
  return `<div class="heat" aria-label="Study activity over the last ${weeks} weeks">${cells.join('')}</div>`;
}

export const difficultyDots = (d) => `<span class="tag tag-outline" title="Difficulty ${d} of 3">${['Foundation', 'Standard', 'Challenging'][d - 1] || 'Standard'}</span>`;
export const typeLabel = (t) => ({ mcq: 'Multiple choice', tf: 'True / false', short: 'Written answer' }[t] || t);
