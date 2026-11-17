// Fake Gmail and Calendar data, used only when TERN_MOCK=1 (local tests). Never used in production.
const inbox = [
  { id: 'm1', threadId: 't1', from: 'Priya Shah <priya@northwind.io>', to: 'you@example.com', subject: 'Contract draft for review', date: 'Mon, 16 Nov 2026 09:12:00 +0000', snippet: 'Attached is the revised contract. Can you confirm by Thursday?', labels: ['INBOX', 'UNREAD'], body: 'Hi,\n\nAttached is the revised contract. Can you confirm the payment terms by Thursday?\n\nPriya' },
  { id: 'm2', threadId: 't2', from: 'Lena Ortiz <lena@gmail.com>', to: 'you@example.com', subject: 'Dinner Saturday?', date: 'Mon, 16 Nov 2026 18:40:00 +0000', snippet: 'Are you free Saturday around 7?', labels: ['INBOX', 'UNREAD'], body: 'Are you free Saturday around 7? Thinking of the Thai place on Mill Street.' },
  { id: 'm3', threadId: 't3', from: 'Northline Air <no-reply@northline.example>', to: 'you@example.com', subject: 'Your receipt NL-48210', date: 'Sun, 15 Nov 2026 07:02:00 +0000', snippet: 'Thanks for flying with us. Total paid $248.60', labels: ['INBOX'], body: 'Receipt NL-48210. Total paid $248.60.' },
];
export const sent = [];

const out = (m) => ({ id: m.id, threadId: m.threadId, from: m.from, to: m.to, subject: m.subject, date: m.date, snippet: m.snippet, unread: m.labels.includes('UNREAD'), labels: m.labels });

export function search(q = '', max = 10) {
  let list = inbox.filter((m) => !m.labels.includes('TRASH'));
  if (/is:unread/.test(q)) list = list.filter((m) => m.labels.includes('UNREAD'));
  if (/in:inbox/.test(q)) list = list.filter((m) => m.labels.includes('INBOX'));
  const words = q.replace(/\b\w+:\S+/g, '').trim().toLowerCase();
  if (words) list = list.filter((m) => `${m.from} ${m.subject} ${m.body}`.toLowerCase().includes(words));
  return { count: list.length, estimatedTotal: list.length, messages: list.slice(0, max || 10).map(out) };
}
export function read(id) {
  const m = inbox.find((x) => x.id === id || x.threadId === id);
  if (!m) throw new Error('No such message');
  return { ...out(m), body: m.body, attachments: m.id === 'm1' ? ['contract-v3.pdf'] : [] };
}
export function send(a) { sent.push(a); return { sent: true, id: `s${sent.length}` }; }
export function draft(a) { return { drafted: true, draftId: 'd1', to: a.to }; }
export function modify(ids = [], add = [], remove = []) {
  for (const m of inbox) if (ids.includes(m.id)) { m.labels = [...new Set([...m.labels.filter((l) => !(remove || []).map(String).map((x) => x.toUpperCase()).includes(l)), ...(add || [])])]; }
  return { updated: ids.length };
}
export function events() {
  return { timeZone: 'UTC', events: [
    { id: 'e1', title: 'Design review', start: '2026-11-18T10:00:00Z', end: '2026-11-18T11:00:00Z', attendees: ['priya@northwind.io'] },
    { id: 'e2', title: 'Dentist', start: '2026-11-19T15:30:00Z', end: '2026-11-19T16:15:00Z', attendees: [] },
  ] };
}
export const busy = () => [{ start: '2026-11-18T10:00:00Z', end: '2026-11-18T11:00:00Z' }];
