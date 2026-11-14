/**
 * ============================================================
 *  JARVIS — the brain (Google Apps Script, free & always on)
 * ============================================================
 *  Your iPad Shortcut calls this web app with what you said.
 *  Gemini decides what to do and calls the tools below.
 *  A 1-minute background timer watches for replies, runs
 *  reminders/background jobs, and pushes results to your iPad.
 *
 *  You should not need to edit this file. Settings live in Config.gs.
 */

const PROPS = PropertiesService.getScriptProperties();
const MAX_TOOL_ROUNDS = 6;
const HISTORY_TURNS = 12;

/* ------------------------------------------------------------------ */
/*  One-time setup — run this from the editor (Run ▶ setup)            */
/* ------------------------------------------------------------------ */

function setup() {
  if (!PROPS.getProperty('JARVIS_SECRET')) {
    PROPS.setProperty('JARVIS_SECRET', Utilities.getUuid().replace(/-/g, '').slice(0, 20));
  }
  if (!PROPS.getProperty('NTFY_TOPIC')) {
    PROPS.setProperty('NTFY_TOPIC', 'jarvis-' + Utilities.getUuid().replace(/-/g, '').slice(0, 16));
  }
  // Touch every service once so Google asks for all permissions now, not mid-game.
  GmailApp.getInboxUnreadCount();
  CalendarApp.getDefaultCalendar();
  ScriptApp.getProjectTriggers();
  UrlFetchApp.fetch('https://ntfy.sh/' + PROPS.getProperty('NTFY_TOPIC'), {
    method: 'post',
    payload: 'Jarvis is connected. You will get replies and updates here.',
    headers: { Title: 'Jarvis online' },
    muteHttpExceptions: true,
  });

  const problems = [];
  if (!cfg_('GEMINI_API_KEY') || cfg_('GEMINI_API_KEY').indexOf('PASTE') === 0) {
    problems.push('GEMINI_API_KEY is missing in Config.gs');
  }
  if (cfg_('DISCORD_BOT_TOKEN')) {
    try { botUserId_(); } catch (err) { problems.push('Discord token did not work: ' + err.message); }
  }

  console.log([
    '================ JARVIS SETUP ================',
    'Your secret:      ' + PROPS.getProperty('JARVIS_SECRET'),
    'Your ntfy topic:  ' + PROPS.getProperty('NTFY_TOPIC'),
    '',
    'Copy both into the steps in SETUP.md.',
    problems.length ? 'PROBLEMS:\n - ' + problems.join('\n - ') : 'Everything looks good.',
    '==============================================',
  ].join('\n'));
}

/** Try Jarvis from the editor without the iPad: Run ▶ testJarvis */
function testJarvis() {
  const out = runAgent_('What time is it and what can you do?', {});
  console.log(JSON.stringify(out, null, 2));
}

/* ------------------------------------------------------------------ */
/*  Web entry points (called by the iPad Shortcut)                     */
/* ------------------------------------------------------------------ */

function doGet(e) {
  return handle_((e && e.parameter) || {});
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (_) { /* ignore */ }
  return handle_(Object.assign({}, (e && e.parameter) || {}, body));
}

function handle_(p) {
  if (!p.secret && !p.text) return ContentService.createTextOutput('Jarvis is online.');
  if (String(p.secret || '') !== PROPS.getProperty('JARVIS_SECRET')) {
    return json_(reply_('Access denied. The secret in your shortcut does not match.'));
  }
  const text = String(p.text || '').trim();
  if (!text) return json_(reply_('Yes?', '', true));
  try {
    return json_(runAgent_(text, {}));
  } catch (err) {
    console.error(err && err.stack || err);
    return json_(reply_('Sorry, something went wrong. ' + friendlyError_(err)));
  }
}

function reply_(speak, url, listenAgain) {
  return { speak: speak || '', url: url || '', listen_again: listenAgain ? 'yes' : 'no' };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function friendlyError_(err) {
  const m = String((err && err.message) || err);
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(m)) return 'The free Gemini limit was hit. Try again in a minute.';
  if (/API key|PERMISSION_DENIED|401|403/i.test(m)) return 'Check your Gemini key in Config dot G S.';
  return m.slice(0, 160);
}

/* ------------------------------------------------------------------ */
/*  The agent loop                                                     */
/* ------------------------------------------------------------------ */

/**
 * @param {string} userText
 * @param {{background?: boolean}} mode
 * @return {{speak:string,url:string,listen_again:string}}
 */
function runAgent_(userText, mode) {
  const background = !!(mode && mode.background);
  const out = reply_('');
  out._background = background;

  const history = background ? [] : loadHistory_();
  const contents = history.concat([{ role: 'user', parts: [{ text: userText }] }]);
  let finalText = '';

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const resp = callGemini_(contents, { tools: true, system: systemPrompt_(background) });
    const cand = (resp.candidates || [])[0];
    const parts = (cand && cand.content && cand.content.parts) || [];
    const calls = parts.filter(function (p) { return p.functionCall; });

    if (!calls.length) {
      finalText = parts.map(function (p) { return p.thought ? '' : (p.text || ''); }).join('').trim();
      break;
    }

    contents.push({ role: 'model', parts: parts }); // keep parts verbatim (thought signatures)
    const responses = calls.map(function (p) {
      const name = p.functionCall.name;
      const args = p.functionCall.args || {};
      let result;
      try {
        if (!TOOLS_[name]) throw new Error('Unknown tool ' + name);
        result = TOOLS_[name](args, out);
      } catch (err) {
        console.error('Tool ' + name + ' failed: ' + (err && err.stack || err));
        result = { ok: false, error: String((err && err.message) || err) };
      }
      return { functionResponse: { name: name, response: { result: result } } };
    });
    contents.push({ role: 'user', parts: responses });
  }

  out.speak = cleanForSpeech_(finalText || out.speak || 'Done.');
  delete out._background;

  if (!background) {
    history.push({ role: 'user', parts: [{ text: userText }] });
    history.push({ role: 'model', parts: [{ text: out.speak }] });
    saveHistory_(history);
  }
  return out;
}

function cleanForSpeech_(t) {
  return String(t).replace(/[*_#`>]/g, '').replace(/\s+/g, ' ').trim();
}

function systemPrompt_(background) {
  const tz = Session.getScriptTimeZone();
  const now = Utilities.formatDate(new Date(), tz, "EEEE yyyy-MM-dd'T'HH:mm:ssXXX");
  const me = cfg_('YOUR_NAME') || 'the user';
  const contacts = Object.keys(CONTACTS).map(function (k) {
    const c = CONTACTS[k] || {};
    const ch = [];
    if (c.discord_id) ch.push('Discord DM');
    if (c.discord_channel) ch.push('Discord channel');
    if (c.email) ch.push('email');
    if (c.phone) ch.push('WhatsApp/iMessage');
    const al = (c.aliases || []).length ? ' (aka ' + c.aliases.join(', ') + ')' : '';
    return '- ' + k + al + ': ' + (ch.length ? ch.join(', ') : 'no details saved yet');
  }).join('\n');

  const events = getState_('events', []).slice(-8).map(function (e) { return '- ' + e.when + ': ' + e.text; }).join('\n') || '- none';
  const watches = getState_('watches', []).map(function (w) {
    return '- waiting for ' + w.contact + ' on ' + w.type + (w.auto ? ' (auto-reply: "' + w.auto + '")' : '');
  }).join('\n') || '- none';

  return [
    'You are Jarvis, a witty, loyal, highly capable personal assistant for ' + me + '.',
    background
      ? 'You are running a BACKGROUND job while ' + me + ' is busy. Do the work with tools, then end with a short spoken-style summary of the result (it will be pushed to their iPad). You cannot open anything on the iPad in this mode.'
      : me + ' talks to you by voice on an iPad, often while gaming. Your final text is read aloud: keep it to one or two short sentences, natural speech, no markdown, no emojis, no URLs read out.',
    'Current time: ' + now + ' (timezone ' + tz + '). Use this to convert phrases like "in 20 minutes" or "tonight at 8".',
    '',
    'CONTACTS:',
    contacts,
    '',
    'RECENT EVENTS (replies that came in, finished jobs):',
    events,
    '',
    'CURRENTLY WATCHING FOR REPLIES:',
    watches,
    '',
    'RULES:',
    '- Act, don\'t ask, when the request is clear. Only ask a follow-up (via ask_follow_up) when you truly cannot guess, e.g. an unknown contact with no address, or a message with no content.',
    '- Messaging: use the app the user names. If none, prefer Discord DM, then Discord channel, then email, then WhatsApp, based on what the contact has.',
    '- When a message expects an answer (questions, invites, plans), set watch_for_reply=true so you can report the reply later. Tell the user you will let them know when they reply.',
    '- If the user says something like "and if they say yes, tell them X" or "handle it", put that in auto_reply_instructions.',
    '- WhatsApp and iMessage open on the iPad with the text filled in; the user must tap send. Say so briefly.',
    '- "Reply to them" / "tell him" refers to the most recent person in RECENT EVENTS.',
    '- For any app on the iPad you have no tool for, use open_ipad_app (URL schemes) or run_ipad_shortcut (Apple Shortcuts can control almost every app).',
    '- For long or slow work ("research", "while I play", "every so often", "later"), use start_background_job or set_reminder so the user is not kept waiting.',
    '- Never claim something was sent or done unless the tool returned ok:true. If a tool fails, say what failed in plain words.',
    '- Use web_search for news, scores, prices, facts after your knowledge cutoff, or anything you are unsure about.',
  ].join('\n');
}

/* ------------------------------------------------------------------ */
/*  Gemini                                                             */
/* ------------------------------------------------------------------ */

function callGemini_(contents, opts) {
  const key = cfg_('GEMINI_API_KEY');
  if (!key || key.indexOf('PASTE') === 0) throw new Error('Missing Gemini API key in Config.gs');
  const model = cfg_('GEMINI_MODEL') || 'gemini-flash-latest';
  const payload = {
    contents: contents,
    generationConfig: { temperature: 0.5, maxOutputTokens: 2048 },
  };
  if (opts && opts.system) payload.systemInstruction = { parts: [{ text: opts.system }] };
  if (opts && opts.tools) payload.tools = [{ functionDeclarations: TOOL_DECLS_ }];
  if (opts && opts.googleSearch) payload.tools = [{ google_search: {} }];

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-goog-api-key': key },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const code = res.getResponseCode();
    const body = res.getContentText();
    if (code === 200) return JSON.parse(body);
    lastErr = new Error('Gemini ' + code + ': ' + body.slice(0, 300));
    if (code !== 429 && code < 500) break;
    Utilities.sleep(1500 * (attempt + 1));
  }
  throw lastErr;
}

/** Plain text in, plain text out (no tools). */
function geminiText_(prompt, opts) {
  const resp = callGemini_([{ role: 'user', parts: [{ text: prompt }] }], opts || {});
  const parts = (((resp.candidates || [])[0] || {}).content || {}).parts || [];
  return parts.map(function (p) { return p.thought ? '' : (p.text || ''); }).join('').trim();
}

/* ------------------------------------------------------------------ */
/*  Tools Gemini can call                                              */
/* ------------------------------------------------------------------ */

const S = 'STRING', B = 'BOOLEAN', I = 'INTEGER', O = 'OBJECT';
function obj_(props, required) { return { type: O, properties: props, required: required || [] }; }

const TOOL_DECLS_ = [
  {
    name: 'send_discord_message',
    description: 'Send a Discord message from the Jarvis bot to a contact (DM) or to a saved server channel (group chat). Can watch for and auto-answer replies.',
    parameters: obj_({
      contact: { type: S, description: 'Contact name from CONTACTS' },
      message: { type: S, description: 'Exact text to send, written as the user would say it' },
      use_channel: { type: B, description: 'true = post in the contact\'s saved channel instead of DM' },
      watch_for_reply: { type: B },
      auto_reply_instructions: { type: S, description: 'Optional: how to answer their reply on the user\'s behalf' },
    }, ['contact', 'message']),
  },
  {
    name: 'send_email',
    description: 'Send an email from the user\'s Gmail. Can watch for and auto-answer replies.',
    parameters: obj_({
      to: { type: S, description: 'Contact name from CONTACTS or a raw email address' },
      subject: { type: S },
      body: { type: S },
      watch_for_reply: { type: B },
      auto_reply_instructions: { type: S },
    }, ['to', 'body']),
  },
  {
    name: 'read_emails',
    description: 'Read the user\'s recent Gmail messages. Uses Gmail search syntax.',
    parameters: obj_({
      query: { type: S, description: 'e.g. "is:unread in:inbox", "from:amazon newer_than:2d"' },
      max: { type: I },
    }),
  },
  {
    name: 'prepare_whatsapp',
    description: 'Open WhatsApp on the iPad with a message ready to send to a contact (user taps send).',
    parameters: obj_({ contact: { type: S }, message: { type: S } }, ['contact', 'message']),
  },
  {
    name: 'prepare_imessage',
    description: 'Open Messages (iMessage) on the iPad with a message ready to send (user taps send).',
    parameters: obj_({ contact: { type: S }, message: { type: S } }, ['contact', 'message']),
  },
  {
    name: 'open_ipad_app',
    description: 'Open an app, web page, search, or deep link on the iPad. Examples: "youtube://results?search_query=fortnite", "spotify:search:lofi", "https://www.google.com/search?q=...", "http://maps.apple.com/?q=pizza", "discord://", "instagram://", "music://", "facetime://", "photos-redirect://", "mobilenotes://", "x-apple-reminderkit://", "calshow://", "App-prefs:", "https://<any website>".',
    parameters: obj_({ url: { type: S } }, ['url']),
  },
  {
    name: 'run_ipad_shortcut',
    description: 'Run one of the user\'s own Apple Shortcuts by name, optionally passing text. This is how Jarvis controls ANY iPad app that supports Shortcuts (Notes, Reminders, Music, Home, Spotify, smart lights, focus modes, etc).',
    parameters: obj_({ name: { type: S }, input_text: { type: S } }, ['name']),
  },
  {
    name: 'set_reminder',
    description: 'Push a spoken reminder to the iPad after N minutes (works while gaming).',
    parameters: obj_({ minutes_from_now: { type: I }, message: { type: S } }, ['minutes_from_now', 'message']),
  },
  {
    name: 'start_background_job',
    description: 'Have Jarvis do a task in the background (now or later) and push the result to the iPad when done. The job has all the same tools except opening things on the iPad. Use for research, checking email periodically, sending a message later, summarising, etc.',
    parameters: obj_({
      instructions: { type: S, description: 'Full, self-contained instructions for the job' },
      minutes_from_now: { type: I, description: '0 = start right away' },
      repeat_every_minutes: { type: I, description: 'Optional: repeat the job this often' },
      repeat_times: { type: I, description: 'Optional: how many times in total (default 1, max 24)' },
    }, ['instructions']),
  },
  {
    name: 'web_search',
    description: 'Search the live web with Google and get a short factual answer.',
    parameters: obj_({ query: { type: S } }, ['query']),
  },
  {
    name: 'calendar',
    description: 'List upcoming events, or create an event in Google Calendar.',
    parameters: obj_({
      action: { type: S, description: '"list" or "create"' },
      days: { type: I, description: 'list: how many days ahead (default 2)' },
      title: { type: S },
      start_iso: { type: S, description: 'create: ISO time with offset, e.g. 2026-11-14T20:00:00-05:00' },
      duration_minutes: { type: I },
    }, ['action']),
  },
  {
    name: 'save_note',
    description: 'Save a note to the "Jarvis Notes" Google Doc.',
    parameters: obj_({ text: { type: S } }, ['text']),
  },
  {
    name: 'manage_watches',
    description: 'List or stop the conversations Jarvis is watching for replies.',
    parameters: obj_({ action: { type: S, description: '"list" or "stop"' }, contact: { type: S, description: 'stop: contact name, or "all"' } }, ['action']),
  },
  {
    name: 'ask_follow_up',
    description: 'Use when you must ask the user a question before acting. Put the question in your final reply; the iPad will listen again automatically.',
    parameters: obj_({ question: { type: S } }, ['question']),
  },
];

const TOOLS_ = {
  send_discord_message: function (a) {
    const c = findContact_(a.contact);
    if (!cfg_('DISCORD_BOT_TOKEN')) return { ok: false, error: 'Discord is not set up (no bot token in Config.gs)' };
    if (!c) return { ok: false, error: 'No contact called ' + a.contact };
    let channelId;
    let watchUser = '';
    if ((a.use_channel || !c.discord_id) && c.discord_channel) {
      channelId = c.discord_channel;
    } else if (c.discord_id) {
      channelId = discord_('post', '/users/@me/channels', { recipient_id: c.discord_id }).id;
      watchUser = c.discord_id;
    } else {
      return { ok: false, error: c.name + ' has no Discord ID saved' };
    }
    const msg = discord_('post', '/channels/' + channelId + '/messages', { content: a.message });
    if (a.watch_for_reply || a.auto_reply_instructions) {
      addWatch_({ type: 'discord', contact: c.name, channelId: channelId, userId: watchUser, afterId: msg.id, auto: a.auto_reply_instructions || '', log: ['Me: ' + a.message] });
    }
    return { ok: true, sent_to: c.name, via: watchUser ? 'Discord DM' : 'Discord channel', watching: !!(a.watch_for_reply || a.auto_reply_instructions) };
  },

  send_email: function (a) {
    const addr = resolveEmail_(a.to);
    if (!addr) return { ok: false, error: 'No email address for ' + a.to };
    const subject = a.subject || 'Quick message';
    const sent = GmailApp.createDraft(addr, subject, a.body).send();
    const thread = sent.getThread();
    if (a.watch_for_reply || a.auto_reply_instructions) {
      addWatch_({ type: 'email', contact: String(a.to), address: addr, threadId: thread.getId(), count: thread.getMessageCount(), auto: a.auto_reply_instructions || '', log: ['Me: ' + a.body] });
    }
    return { ok: true, sent_to: addr, watching: !!(a.watch_for_reply || a.auto_reply_instructions) };
  },

  read_emails: function (a) {
    const threads = GmailApp.search(a.query || 'is:unread in:inbox', 0, Math.min(a.max || 5, 10));
    return threads.map(function (t) {
      const m = t.getMessages().pop();
      return { from: m.getFrom(), subject: m.getSubject(), date: String(m.getDate()), text: stripQuoted_(m.getPlainBody()).slice(0, 400) };
    });
  },

  prepare_whatsapp: function (a, out) {
    if (out._background) return { ok: false, error: 'WhatsApp needs the iPad; cannot send from a background job' };
    const c = findContact_(a.contact);
    const phone = c ? digits_(c.phone) : digits_(a.contact);
    const text = encodeURIComponent(a.message);
    out.url = phone ? 'whatsapp://send?phone=' + phone + '&text=' + text : 'whatsapp://send?text=' + text;
    return { ok: true, note: phone ? 'WhatsApp will open with the message; user taps send' : 'No number saved; WhatsApp will open and the user picks the chat' };
  },

  prepare_imessage: function (a, out) {
    if (out._background) return { ok: false, error: 'iMessage needs the iPad; cannot send from a background job' };
    const c = findContact_(a.contact);
    const target = (c && (c.phone ? '+' + digits_(c.phone) : c.email)) || '';
    out.url = 'sms:' + target + '&body=' + encodeURIComponent(a.message);
    return { ok: true, note: 'Messages will open with the text; user taps send' };
  },

  open_ipad_app: function (a, out) {
    if (out._background) return { ok: false, error: 'Cannot open apps from a background job' };
    out.url = String(a.url);
    return { ok: true };
  },

  run_ipad_shortcut: function (a, out) {
    if (out._background) return { ok: false, error: 'Cannot run iPad shortcuts from a background job' };
    out.url = 'shortcuts://run-shortcut?name=' + encodeURIComponent(a.name) +
      (a.input_text ? '&input=text&text=' + encodeURIComponent(a.input_text) : '');
    return { ok: true, note: 'If the shortcut does not exist on the iPad, Shortcuts will show an error' };
  },

  set_reminder: function (a) {
    const mins = Math.max(1, a.minutes_from_now || 1);
    enqueue_({ kind: 'reminder', due: Date.now() + mins * 60000, text: a.message });
    return { ok: true, due_in_minutes: mins };
  },

  start_background_job: function (a) {
    const times = Math.min(Math.max(a.repeat_times || 1, 1), 24);
    const every = Math.max(a.repeat_every_minutes || 0, 1);
    for (let i = 0; i < times; i++) {
      enqueue_({ kind: 'job', due: Date.now() + ((a.minutes_from_now || 0) + i * every) * 60000, text: a.instructions });
    }
    return { ok: true, scheduled_runs: times, note: 'Result will be pushed to the iPad' };
  },

  web_search: function (a) {
    return { answer: geminiText_('Answer briefly and factually, with key numbers/names: ' + a.query, { googleSearch: true }) };
  },

  calendar: function (a) {
    const cal = CalendarApp.getDefaultCalendar();
    if (a.action === 'create') {
      const start = new Date(a.start_iso);
      if (isNaN(start)) return { ok: false, error: 'Bad start time' };
      const end = new Date(start.getTime() + (a.duration_minutes || 60) * 60000);
      cal.createEvent(a.title || 'Event', start, end);
      return { ok: true };
    }
    const now = new Date();
    const end = new Date(now.getTime() + (a.days || 2) * 86400000);
    return cal.getEvents(now, end).slice(0, 15).map(function (ev) {
      return { title: ev.getTitle(), start: String(ev.getStartTime()) };
    });
  },

  save_note: function (a) {
    let id = PROPS.getProperty('NOTES_DOC_ID');
    let doc;
    try { doc = id && DocumentApp.openById(id); } catch (_) { doc = null; }
    if (!doc) { doc = DocumentApp.create('Jarvis Notes'); PROPS.setProperty('NOTES_DOC_ID', doc.getId()); }
    doc.getBody().appendParagraph(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMM d, HH:mm') + ' — ' + a.text);
    doc.saveAndClose();
    return { ok: true };
  },

  manage_watches: function (a) {
    if (a.action === 'stop') {
      const who = String(a.contact || 'all').toLowerCase();
      const before = getState_('watches', []);
      const keep = who === 'all' ? [] : before.filter(function (w) { return w.contact.toLowerCase().indexOf(who) === -1; });
      setState_('watches', keep);
      return { ok: true, stopped: before.length - keep.length };
    }
    return getState_('watches', []).map(function (w) { return { contact: w.contact, via: w.type, auto_reply: w.auto || 'no' }; });
  },

  ask_follow_up: function (a, out) {
    if (!out._background) out.listen_again = 'yes';
    return { ok: true };
  },
};

/* ------------------------------------------------------------------ */
/*  Contacts                                                           */
/* ------------------------------------------------------------------ */

function findContact_(name) {
  const q = String(name || '').toLowerCase().trim().replace(/^@/, '');
  if (!q) return null;
  const keys = Object.keys(CONTACTS);
  const pick = function (k) { return Object.assign({ name: k }, CONTACTS[k]); };
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const names = [k.toLowerCase()].concat((CONTACTS[k].aliases || []).map(function (s) { return s.toLowerCase(); }));
    if (names.indexOf(q) !== -1) return pick(k);
  }
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].toLowerCase().indexOf(q) !== -1 || q.indexOf(keys[i].toLowerCase()) !== -1) return pick(keys[i]);
  }
  return null;
}

function resolveEmail_(to) {
  const s = String(to || '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return s;
  const c = findContact_(s);
  return (c && c.email) || '';
}

function digits_(s) { return String(s || '').replace(/\D/g, ''); }

/* ------------------------------------------------------------------ */
/*  Discord REST (bot token)                                           */
/* ------------------------------------------------------------------ */

function discord_(method, path, payload) {
  const opts = {
    method: method,
    headers: {
      Authorization: 'Bot ' + cfg_('DISCORD_BOT_TOKEN'),
      'User-Agent': 'DiscordBot (https://github.com, 1.0) JarvisAppsScript',
    },
    muteHttpExceptions: true,
  };
  if (payload) { opts.contentType = 'application/json'; opts.payload = JSON.stringify(payload); }
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = UrlFetchApp.fetch('https://discord.com/api/v10' + path, opts);
    const code = res.getResponseCode();
    const text = res.getContentText();
    if (code >= 200 && code < 300) return text ? JSON.parse(text) : {};
    if (code === 429) {
      let wait = 1;
      try { wait = JSON.parse(text).retry_after || 1; } catch (_) { /* ignore */ }
      Utilities.sleep(Math.min(wait, 5) * 1000 + 200);
      continue;
    }
    if (code === 403 && /50007/.test(text)) throw new Error('That person does not accept DMs from the bot. They must share a server with it and allow DMs.');
    throw new Error('Discord ' + code + ': ' + text.slice(0, 200));
  }
  throw new Error('Discord kept rate-limiting, try again shortly');
}

function botUserId_() {
  let id = PROPS.getProperty('DISCORD_BOT_ID');
  if (!id) { id = discord_('get', '/users/@me').id; PROPS.setProperty('DISCORD_BOT_ID', id); }
  return id;
}

/** Snowflake IDs are big numbers stored as strings; compare without losing precision. */
function snowflakeGt_(a, b) {
  a = String(a); b = String(b);
  return a.length !== b.length ? a.length > b.length : a > b;
}

/* ------------------------------------------------------------------ */
/*  Background: watches, reminders, jobs                               */
/* ------------------------------------------------------------------ */

/** Runs every minute while there is something to do. */
function jarvisTick() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  LOCK_HELD_ = true;
  try {
    processQueue_();
    checkWatches_();
    if (!getState_('watches', []).length && !getState_('queue', []).length) removeTick_();
  } finally {
    LOCK_HELD_ = false;
    lock.releaseLock();
  }
}

function processQueue_() {
  const queue = getState_('queue', []);
  const now = Date.now();
  const due = queue.filter(function (q) { return q.due <= now; });
  if (!due.length) return;
  setState_('queue', queue.filter(function (q) { return q.due > now; }));

  due.forEach(function (item) {
    if (item.kind === 'reminder') {
      push_('Reminder', item.text);
      addEvent_('Reminded the user: ' + item.text);
      return;
    }
    try {
      const res = runAgent_(item.text, { background: true });
      push_('Jarvis finished a job', res.speak);
      addEvent_('Background job "' + item.text.slice(0, 80) + '" → ' + res.speak);
    } catch (err) {
      push_('Jarvis job failed', friendlyError_(err));
    }
  });
}

function checkWatches_() {
  const watches = getState_('watches', []);
  if (!watches.length) return;
  const now = Date.now();
  const keep = [];

  watches.forEach(function (w) {
    if (now > w.expires) { addEvent_('Stopped waiting for ' + w.contact + ' (no reply)'); return; }
    let incoming = [];
    try {
      incoming = w.type === 'discord' ? newDiscordReplies_(w) : newEmailReplies_(w);
    } catch (err) {
      console.error('watch ' + w.contact + ': ' + err);
      keep.push(w);
      return;
    }
    if (!incoming.length) { keep.push(w); return; }

    const said = incoming.join(' / ');
    w.log = (w.log || []).concat(incoming.map(function (t) { return w.contact + ': ' + t; })).slice(-12);
    let note = w.contact + ' replied' + (w.type === 'discord' ? ' on Discord' : ' by email') + ': ' + said;

    if (w.auto && (w.autoCount || 0) < (Number(cfg_('MAX_AUTO_REPLIES')) || 3)) {
      const answer = draftAutoReply_(w, said);
      if (answer) {
        try {
          sendWatchReply_(w, answer);
          w.autoCount = (w.autoCount || 0) + 1;
          w.log.push('Me: ' + answer);
          note += '. I answered: ' + answer;
          w.expires = now + watchMs_();
          keep.push(w); // keep the conversation going
        } catch (err) {
          note += '. I tried to answer but it failed: ' + err.message;
        }
      } else {
        note += '. That needs you, so I did not answer.';
      }
    }
    push_(w.contact + ' replied', note);
    addEvent_(note);
  });

  setState_('watches', keep);
}

function newDiscordReplies_(w) {
  const msgs = discord_('get', '/channels/' + w.channelId + '/messages?after=' + w.afterId + '&limit=50');
  if (!msgs.length) return [];
  const bot = botUserId_();
  msgs.sort(function (x, y) { return snowflakeGt_(x.id, y.id) ? 1 : -1; });
  w.afterId = msgs[msgs.length - 1].id;
  return msgs.filter(function (m) {
    if (m.author.id === bot) return false;
    return w.userId ? m.author.id === w.userId : !m.author.bot;
  }).map(function (m) {
    const who = w.userId ? '' : (m.author.global_name || m.author.username) + ': ';
    return who + (m.content || '[sent an attachment]');
  });
}

function newEmailReplies_(w) {
  const thread = GmailApp.getThreadById(w.threadId);
  if (!thread) return [];
  const msgs = thread.getMessages();
  if (msgs.length <= w.count) return [];
  const fresh = msgs.slice(w.count);
  w.count = msgs.length;
  const mine = Session.getEffectiveUser().getEmail().toLowerCase();
  return fresh.filter(function (m) { return m.getFrom().toLowerCase().indexOf(mine) === -1; })
    .map(function (m) { return stripQuoted_(m.getPlainBody()).slice(0, 600); });
}

function draftAutoReply_(w, said) {
  const me = cfg_('YOUR_NAME') || 'me';
  const prompt = [
    'You are replying on behalf of ' + me + ' in a ' + (w.type === 'discord' ? 'Discord chat' : 'email thread') + ' with ' + w.contact + '.',
    me + '\'s instructions: "' + w.auto + '"',
    'Conversation so far:',
    (w.log || []).join('\n'),
    '',
    'Write ' + me + '\'s next message. Match the tone (casual for chat). Keep it short. No quotes around it.',
    'If the instructions do not cover what they said, or a real decision/commitment/money/personal info is involved, output exactly NO_REPLY.',
  ].join('\n');
  const t = geminiText_(prompt).replace(/^["']|["']$/g, '').trim();
  return (!t || /NO_REPLY/.test(t)) ? '' : t;
}

function sendWatchReply_(w, text) {
  if (w.type === 'discord') {
    const m = discord_('post', '/channels/' + w.channelId + '/messages', { content: text });
    w.afterId = m.id;
  } else {
    const thread = GmailApp.getThreadById(w.threadId);
    thread.getMessages().pop().reply(text);
    w.count = GmailApp.getThreadById(w.threadId).getMessageCount();
  }
}

function stripQuoted_(body) {
  const lines = String(body || '').split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^On .+wrote:\s*$/.test(l) || /^-{2,}\s*Original Message/i.test(l) || /^From: /.test(l)) break;
    if (/^>/.test(l)) continue;
    out.push(l);
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

/* ------------------------------------------------------------------ */
/*  State helpers                                                      */
/* ------------------------------------------------------------------ */

function watchMs_() { return (Number(cfg_('WATCH_MINUTES')) || 180) * 60000; }

function addWatch_(w) {
  w.expires = Date.now() + watchMs_();
  w.autoCount = 0;
  withLock_(function () {
    // One watch per conversation: replace any older one for the same chat.
    const list = getState_('watches', []).filter(function (x) {
      return !(x.type === w.type && (x.channelId || x.threadId) === (w.channelId || w.threadId));
    });
    list.push(w);
    setState_('watches', list.slice(-10));
  });
  ensureTick_();
}

function enqueue_(item) {
  withLock_(function () {
    const q = getState_('queue', []);
    if (q.length >= 30) throw new Error('Too many scheduled jobs; cancel some first');
    q.push(item);
    setState_('queue', q);
  });
  ensureTick_();
}

function addEvent_(text) {
  const ev = getState_('events', []);
  ev.push({ when: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm'), text: text.slice(0, 400) });
  setState_('events', ev.slice(-12));
}

let LOCK_HELD_ = false;
function withLock_(fn) {
  if (LOCK_HELD_) return fn(); // already inside jarvisTick's lock
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function getState_(key, fallback) {
  const v = PROPS.getProperty('state_' + key);
  if (!v) return fallback;
  try { return JSON.parse(v); } catch (_) { return fallback; }
}

function setState_(key, value) {
  PROPS.setProperty('state_' + key, JSON.stringify(value));
}

function loadHistory_() {
  const v = CacheService.getScriptCache().get('history');
  try { return v ? JSON.parse(v) : []; } catch (_) { return []; }
}

function saveHistory_(h) {
  CacheService.getScriptCache().put('history', JSON.stringify(h.slice(-HISTORY_TURNS * 2)), 6 * 3600);
}

function ensureTick_() {
  const exists = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'jarvisTick'; });
  if (!exists) ScriptApp.newTrigger('jarvisTick').timeBased().everyMinutes(1).create();
}

function removeTick_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'jarvisTick') ScriptApp.deleteTrigger(t);
  });
}

/** Push a notification to the iPad via the free ntfy app. */
function push_(title, message) {
  const topic = PROPS.getProperty('NTFY_TOPIC');
  if (!topic) return;
  UrlFetchApp.fetch('https://ntfy.sh/' + topic, {
    method: 'post',
    payload: String(message).slice(0, 3500),
    headers: { Title: String(title).replace(/[^\x20-\x7E]/g, '').slice(0, 120), Priority: 'high', Tags: 'robot' },
    muteHttpExceptions: true,
  });
}

function cfg_(key) {
  const v = (typeof SETTINGS !== 'undefined' && SETTINGS[key] !== undefined && SETTINGS[key] !== '') ? SETTINGS[key] : PROPS.getProperty(key);
  return v === null || v === undefined ? '' : String(v).trim();
}
