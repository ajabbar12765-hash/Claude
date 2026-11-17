// Gmail, Google Calendar and Google Drive tools for the agent.
import { gfetch, AppError } from './google.js';
import { MOCK } from './http.js';
import * as fake from './mock-google.js';

const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me';
const CAL = 'https://www.googleapis.com/calendar/v3';
const DRIVE = 'https://www.googleapis.com/drive/v3';

const S = (type, description, extra = {}) => ({ type, description, ...extra });
const obj = (properties, required = []) => ({ type: 'object', properties, required });
const clip = (s, n) => (s && s.length > n ? s.slice(0, n) + '…' : s || '');

const header = (msg, name) => (msg.payload?.headers || []).find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
function bodyText(payload) {
  if (!payload) return '';
  const dec = (d) => Buffer.from(d, 'base64url').toString('utf8');
  if (payload.mimeType === 'text/plain' && payload.body?.data) return dec(payload.body.data);
  for (const p of payload.parts || []) { const t = bodyText(p); if (t) return t; }
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return dec(payload.body.data).replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, '').replace(/<br\s*\/?>|<\/p>|<\/div>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n');
  }
  return '';
}
const summary = (m) => ({
  id: m.id, threadId: m.threadId, from: header(m, 'From'), to: header(m, 'To'), subject: header(m, 'Subject'),
  date: header(m, 'Date'), snippet: m.snippet, unread: (m.labelIds || []).includes('UNREAD'), labels: m.labelIds || [],
});

function rawEmail({ to, cc, subject, body, inReplyTo, references, from }) {
  const enc = (s) => (/[^\x20-\x7e]/.test(s) ? `=?UTF-8?B?${Buffer.from(s).toString('base64')}?=` : s);
  const lines = [
    from ? `From: ${from}` : null, `To: ${to}`, cc ? `Cc: ${cc}` : null, `Subject: ${enc(subject || '')}`,
    inReplyTo ? `In-Reply-To: ${inReplyTo}` : null, references ? `References: ${references}` : null,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '',
    Buffer.from(body || '').toString('base64').replace(/(.{76})/g, '$1\r\n'),
  ].filter((l) => l !== null);
  return Buffer.from(lines.join('\r\n')).toString('base64url');
}
async function replyHeaders(conn, messageId) {
  const m = await gfetch(conn, `${GMAIL}/messages/${messageId}?format=metadata&metadataHeaders=Message-ID&metadataHeaders=References&metadataHeaders=Subject`);
  const mid = header(m, 'Message-ID');
  return { threadId: m.threadId, inReplyTo: mid, references: [header(m, 'References'), mid].filter(Boolean).join(' '), subject: header(m, 'Subject') };
}
const validEmails = (s) => typeof s === 'string' && s.split(',').every((x) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$|<[^\s@<>]+@[^\s@<>]+>$/.test(x.trim()));

export const gmailTools = [
  {
    name: 'gmail_search', app: 'gmail',
    description: 'Search the user\'s Gmail with Gmail search syntax (e.g. "is:unread", "from:alex newer_than:7d", "has:attachment invoice"). Returns message summaries.',
    parameters: obj({ query: S('string', 'Gmail search query'), max: S('integer', 'Max results, 1-25, default 10') }, ['query']),
    label: (a) => `Searched Gmail for “${a.query}”`,
    async run(a, { conn }) {
      if (MOCK) return fake.search(a.query, a.max);
      const max = Math.min(Math.max(Number(a.max) || 10, 1), 25);
      const list = await gfetch(conn, `${GMAIL}/messages?${new URLSearchParams({ q: a.query || '', maxResults: String(max) })}`);
      const ids = (list.messages || []).map((m) => m.id);
      const msgs = await Promise.all(ids.map((id) => gfetch(conn, `${GMAIL}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`)));
      return { count: msgs.length, estimatedTotal: list.resultSizeEstimate || msgs.length, messages: msgs.map(summary) };
    },
  },
  {
    name: 'gmail_read', app: 'gmail',
    description: 'Read one email in full by message id, or a whole conversation by thread id.',
    parameters: obj({ message_id: S('string', 'Message id'), thread_id: S('string', 'Thread id, to read the whole conversation') }),
    label: () => 'Read an email',
    async run(a, { conn }) {
      if (MOCK) return fake.read(a.message_id || a.thread_id);
      if (a.thread_id) {
        const t = await gfetch(conn, `${GMAIL}/threads/${encodeURIComponent(a.thread_id)}?format=full`);
        return { threadId: t.id, messages: t.messages.map((m) => ({ ...summary(m), body: clip(bodyText(m.payload), 6000) })) };
      }
      const m = await gfetch(conn, `${GMAIL}/messages/${encodeURIComponent(a.message_id)}?format=full`);
      const attachments = [];
      const walk = (p) => { if (p.filename) attachments.push(p.filename); (p.parts || []).forEach(walk); };
      walk(m.payload || {});
      return { ...summary(m), cc: header(m, 'Cc'), body: clip(bodyText(m.payload), 12000), attachments };
    },
  },
  {
    name: 'gmail_send', app: 'gmail', write: true,
    description: 'Send an email from the user\'s Gmail. To reply in a thread, pass reply_to_message_id. The user sees and approves the exact email before it goes.',
    parameters: obj({
      to: S('string', 'Recipient addresses, comma separated'), cc: S('string', 'Cc addresses, comma separated'),
      subject: S('string', 'Subject (ignored when replying; the thread subject is used)'), body: S('string', 'Plain-text body'),
      reply_to_message_id: S('string', 'Message id being replied to'),
    }, ['to', 'body']),
    label: (a) => `Send email to ${a.to}`,
    preview: (a) => ({ kind: 'email', editable: ['to', 'cc', 'subject', 'body'], fields: { to: a.to, cc: a.cc || '', subject: a.subject || '', body: a.body || '' } }),
    async run(a, { conn }) {
      if (!validEmails(a.to) || (a.cc && !validEmails(a.cc))) throw new AppError('One of the email addresses is not valid');
      if (MOCK) return fake.send(a);
      let thread = {};
      if (a.reply_to_message_id) thread = await replyHeaders(conn, a.reply_to_message_id);
      const subject = thread.subject ? (/^re:/i.test(thread.subject) ? thread.subject : `Re: ${thread.subject}`) : a.subject;
      const sent = await gfetch(conn, `${GMAIL}/messages/send`, { method: 'POST', body: JSON.stringify({ raw: rawEmail({ ...a, subject, ...thread }), threadId: thread.threadId }) });
      return { sent: true, id: sent.id, threadId: sent.threadId };
    },
  },
  {
    name: 'gmail_create_draft', app: 'gmail',
    description: 'Save an email as a draft in Gmail without sending it. Safe: nothing leaves the account.',
    parameters: obj({ to: S('string', 'Recipients'), cc: S('string', 'Cc'), subject: S('string', 'Subject'), body: S('string', 'Plain-text body'), reply_to_message_id: S('string', 'Message id being replied to') }, ['body']),
    label: (a) => `Drafted an email${a.to ? ` to ${a.to}` : ''}`,
    async run(a, { conn }) {
      if (MOCK) return fake.draft(a);
      let thread = {};
      if (a.reply_to_message_id) thread = await replyHeaders(conn, a.reply_to_message_id);
      const subject = thread.subject ? `Re: ${thread.subject.replace(/^re:\s*/i, '')}` : a.subject;
      const d = await gfetch(conn, `${GMAIL}/drafts`, { method: 'POST', body: JSON.stringify({ message: { raw: rawEmail({ ...a, to: a.to || '', subject, ...thread }), threadId: thread.threadId } }) });
      return { drafted: true, draftId: d.id };
    },
  },
  {
    name: 'gmail_modify', app: 'gmail', write: true,
    description: 'Archive, mark read or unread, star, or label emails. To archive remove INBOX; to mark read remove UNREAD; to star add STARRED. Label names are resolved to ids.',
    parameters: obj({
      message_ids: { type: 'array', items: { type: 'string' }, description: 'Message ids' },
      add_labels: { type: 'array', items: { type: 'string' }, description: 'Labels to add' },
      remove_labels: { type: 'array', items: { type: 'string' }, description: 'Labels to remove' },
    }, ['message_ids']),
    label: (a) => describeModify(a),
    preview: (a) => ({ kind: 'generic', fields: { Action: describeModify(a), Emails: String((a.message_ids || []).length) } }),
    async run(a, { conn }) {
      const ids = (a.message_ids || []).slice(0, 500);
      if (MOCK) return fake.modify(ids, a.add_labels, a.remove_labels);
      const labels = await gfetch(conn, `${GMAIL}/labels`);
      const toId = (n) => (labels.labels.find((l) => l.id === n || l.name.toLowerCase() === String(n).toLowerCase()) || {}).id;
      const add = (a.add_labels || []).map(toId).filter(Boolean);
      const remove = (a.remove_labels || []).map(toId).filter(Boolean);
      await gfetch(conn, `${GMAIL}/messages/batchModify`, { method: 'POST', body: JSON.stringify({ ids, addLabelIds: add, removeLabelIds: remove }) });
      return { updated: ids.length };
    },
  },
  {
    name: 'gmail_trash', app: 'gmail', write: true,
    description: 'Move emails to the trash (recoverable for 30 days).',
    parameters: obj({ message_ids: { type: 'array', items: { type: 'string' }, description: 'Message ids' } }, ['message_ids']),
    label: (a) => `Move ${(a.message_ids || []).length} email(s) to trash`,
    preview: (a) => ({ kind: 'generic', fields: { Action: 'Move to trash', Emails: String((a.message_ids || []).length) } }),
    async run(a, { conn }) {
      if (MOCK) return fake.modify(a.message_ids, ['TRASH'], ['INBOX']);
      for (const id of (a.message_ids || []).slice(0, 100)) await gfetch(conn, `${GMAIL}/messages/${encodeURIComponent(id)}/trash`, { method: 'POST' });
      return { trashed: (a.message_ids || []).length };
    },
  },
  {
    name: 'gmail_labels', app: 'gmail',
    description: 'List the user\'s Gmail labels.',
    parameters: obj({}),
    label: () => 'Listed Gmail labels',
    async run(_, { conn }) {
      if (MOCK) return { labels: ['INBOX', 'UNREAD', 'STARRED', 'Receipts', 'Travel'] };
      const l = await gfetch(conn, `${GMAIL}/labels`);
      return { labels: l.labels.map((x) => x.name) };
    },
  },
];
function describeModify(a) {
  const n = (a.message_ids || []).length;
  const rm = (a.remove_labels || []).map((x) => String(x).toUpperCase());
  const add = (a.add_labels || []).map((x) => String(x));
  const parts = [];
  if (rm.includes('INBOX')) parts.push('archive');
  if (rm.includes('UNREAD')) parts.push('mark as read');
  if (add.map((x) => x.toUpperCase()).includes('UNREAD')) parts.push('mark as unread');
  if (add.map((x) => x.toUpperCase()).includes('STARRED')) parts.push('star');
  const other = add.filter((x) => !['UNREAD', 'STARRED'].includes(x.toUpperCase()));
  if (other.length) parts.push(`label “${other.join(', ')}”`);
  const verb = parts.length ? parts.join(', ') : 'update';
  return `${verb[0].toUpperCase()}${verb.slice(1)} ${n} email${n === 1 ? '' : 's'}`;
}

const when = (e) => e?.dateTime || e?.date || '';
const evSummary = (e) => ({ id: e.id, title: e.summary || '(no title)', start: when(e.start), end: when(e.end), location: e.location || '', attendees: (e.attendees || []).map((x) => x.email), link: e.htmlLink, calendar: e.organizer?.email });
const timeArg = (v, tz) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? { date: v } : { dateTime: v, timeZone: tz });

export const calendarTools = [
  {
    name: 'calendar_events', app: 'calendar',
    description: 'List events between two times (RFC 3339 with offset, e.g. 2026-11-18T00:00:00+00:00). Optionally filter by text.',
    parameters: obj({ time_min: S('string', 'Start, RFC 3339'), time_max: S('string', 'End, RFC 3339'), query: S('string', 'Text to match'), calendar_id: S('string', 'Calendar id, default primary') }, ['time_min', 'time_max']),
    label: (a) => `Checked calendar ${a.time_min?.slice(0, 10)}${a.time_max && a.time_max.slice(0, 10) !== a.time_min?.slice(0, 10) ? ` to ${a.time_max.slice(0, 10)}` : ''}`,
    async run(a, { conn }) {
      if (MOCK) return fake.events();
      const p = new URLSearchParams({ timeMin: a.time_min, timeMax: a.time_max, singleEvents: 'true', orderBy: 'startTime', maxResults: '50' });
      if (a.query) p.set('q', a.query);
      const r = await gfetch(conn, `${CAL}/calendars/${encodeURIComponent(a.calendar_id || 'primary')}/events?${p}`);
      return { timeZone: r.timeZone, events: (r.items || []).map(evSummary) };
    },
  },
  {
    name: 'calendar_free_time', app: 'calendar',
    description: 'Find free slots of a given length between two times on the primary calendar.',
    parameters: obj({ time_min: S('string', 'Start, RFC 3339'), time_max: S('string', 'End, RFC 3339'), duration_minutes: S('integer', 'Slot length in minutes') }, ['time_min', 'time_max', 'duration_minutes']),
    label: (a) => `Looked for ${a.duration_minutes}-minute free slots`,
    async run(a, { conn }) {
      const busy = MOCK ? fake.busy() : ((await gfetch(conn, `${CAL}/freeBusy`, { method: 'POST', body: JSON.stringify({ timeMin: a.time_min, timeMax: a.time_max, items: [{ id: 'primary' }] }) })).calendars?.primary?.busy || []);
      const need = (Number(a.duration_minutes) || 30) * 60e3;
      const slots = []; let cursor = new Date(a.time_min).getTime(); const end = new Date(a.time_max).getTime();
      for (const b of busy.map((x) => [new Date(x.start).getTime(), new Date(x.end).getTime()]).sort((x, y) => x[0] - y[0])) {
        if (b[0] - cursor >= need) slots.push({ start: new Date(cursor).toISOString(), end: new Date(b[0]).toISOString() });
        cursor = Math.max(cursor, b[1]);
      }
      if (end - cursor >= need) slots.push({ start: new Date(cursor).toISOString(), end: new Date(end).toISOString() });
      return { busy, free: slots.slice(0, 20) };
    },
  },
  {
    name: 'calendar_create_event', app: 'calendar', write: true,
    description: 'Create a calendar event. Times as RFC 3339 with offset, or YYYY-MM-DD for all-day. Attendees get an invitation.',
    parameters: obj({
      title: S('string', 'Event title'), start: S('string', 'Start'), end: S('string', 'End'), description: S('string', 'Notes'),
      location: S('string', 'Location'), attendees: { type: 'array', items: { type: 'string' }, description: 'Guest emails' }, time_zone: S('string', 'IANA zone'),
    }, ['title', 'start', 'end']),
    label: (a) => `Create “${a.title}”`,
    preview: (a) => ({ kind: 'event', editable: ['title', 'start', 'end', 'location'], fields: { title: a.title, start: a.start, end: a.end, location: a.location || '', attendees: (a.attendees || []).join(', ') } }),
    async run(a, { conn, user }) {
      if (MOCK) return { created: true, id: 'evt_new', link: 'https://calendar.google.com/' };
      const tz = a.time_zone || user.timezone;
      const e = await gfetch(conn, `${CAL}/calendars/primary/events?sendUpdates=all`, { method: 'POST', body: JSON.stringify({ summary: a.title, description: a.description, location: a.location, start: timeArg(a.start, tz), end: timeArg(a.end, tz), attendees: (a.attendees || []).map((email) => ({ email })) }) });
      return { created: true, event: evSummary(e) };
    },
  },
  {
    name: 'calendar_update_event', app: 'calendar', write: true,
    description: 'Change an existing event: title, times, location or notes.',
    parameters: obj({ event_id: S('string', 'Event id'), title: S('string', 'New title'), start: S('string', 'New start'), end: S('string', 'New end'), location: S('string', 'New location'), description: S('string', 'New notes') }, ['event_id']),
    label: (a) => `Update event${a.title ? ` “${a.title}”` : ''}`,
    preview: (a) => ({ kind: 'event', fields: Object.fromEntries(Object.entries({ event: a.event_id, title: a.title, start: a.start, end: a.end, location: a.location }).filter(([, v]) => v)) }),
    async run(a, { conn, user }) {
      if (MOCK) return { updated: true };
      const patch = {};
      if (a.title) patch.summary = a.title;
      if (a.start) patch.start = timeArg(a.start, user.timezone);
      if (a.end) patch.end = timeArg(a.end, user.timezone);
      if (a.location) patch.location = a.location;
      if (a.description) patch.description = a.description;
      const e = await gfetch(conn, `${CAL}/calendars/primary/events/${encodeURIComponent(a.event_id)}?sendUpdates=all`, { method: 'PATCH', body: JSON.stringify(patch) });
      return { updated: true, event: evSummary(e) };
    },
  },
  {
    name: 'calendar_delete_event', app: 'calendar', write: true,
    description: 'Delete (cancel) an event. Guests are notified.',
    parameters: obj({ event_id: S('string', 'Event id'), title: S('string', 'Event title, for the confirmation') }, ['event_id']),
    label: (a) => `Delete event${a.title ? ` “${a.title}”` : ''}`,
    preview: (a) => ({ kind: 'generic', fields: { Action: 'Delete event', Event: a.title || a.event_id } }),
    async run(a, { conn }) {
      if (MOCK) return { deleted: true };
      await gfetch(conn, `${CAL}/calendars/primary/events/${encodeURIComponent(a.event_id)}?sendUpdates=all`, { method: 'DELETE' });
      return { deleted: true };
    },
  },
];

export const driveTools = [
  {
    name: 'drive_search', app: 'drive',
    description: 'Search Google Drive by words in the file name or content.',
    parameters: obj({ query: S('string', 'Words to search for'), max: S('integer', 'Max results, default 10') }, ['query']),
    label: (a) => `Searched Drive for “${a.query}”`,
    async run(a, { conn }) {
      if (MOCK) return { files: [{ id: 'doc1', name: 'Q4 plan', mimeType: 'application/vnd.google-apps.document', modifiedTime: '2026-11-10T10:00:00Z' }] };
      const q = `fullText contains '${String(a.query).replace(/['\\]/g, '\\$&')}' and trashed = false`;
      const r = await gfetch(conn, `${DRIVE}/files?${new URLSearchParams({ q, pageSize: String(Math.min(Number(a.max) || 10, 25)), fields: 'files(id,name,mimeType,modifiedTime,webViewLink,owners(emailAddress))', orderBy: 'modifiedTime desc' })}`);
      return { files: r.files || [] };
    },
  },
  {
    name: 'drive_read', app: 'drive',
    description: 'Read the text of a Drive file (Docs as text, Sheets as CSV, Slides as text, plain text files).',
    parameters: obj({ file_id: S('string', 'File id') }, ['file_id']),
    label: () => 'Read a Drive file',
    async run(a, { conn }) {
      if (MOCK) return { name: 'Q4 plan', text: 'Ship Tern connectors. Hire one designer.' };
      const id = encodeURIComponent(a.file_id);
      const meta = await gfetch(conn, `${DRIVE}/files/${id}?fields=id,name,mimeType,size`);
      const exportAs = { 'application/vnd.google-apps.document': 'text/plain', 'application/vnd.google-apps.spreadsheet': 'text/csv', 'application/vnd.google-apps.presentation': 'text/plain' }[meta.mimeType];
      let text = '';
      if (exportAs) text = await gfetch(conn, `${DRIVE}/files/${id}/export?mimeType=${encodeURIComponent(exportAs)}`);
      else if (/^text\/|json|csv|xml/.test(meta.mimeType) && Number(meta.size || 0) < 2e6) text = await gfetch(conn, `${DRIVE}/files/${id}?alt=media`);
      else return { name: meta.name, mimeType: meta.mimeType, note: 'This file type cannot be read as text' };
      return { name: meta.name, text: clip(typeof text === 'string' ? text : JSON.stringify(text), 30000) };
    },
  },
];

export const googleToolsFor = (apps) => [
  ...(apps.includes('gmail') ? gmailTools : []),
  ...(apps.includes('calendar') ? calendarTools : []),
  ...(apps.includes('drive') ? driveTools : []),
];
