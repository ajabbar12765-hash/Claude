// Jarvis brain: Gemini (via Vercel AI Gateway free credit) with tools.
// POST { key, text, history?, tz?, now?, name?, gas?: {url, secret}, background? }
const { llm, cors, readBody, authorised, gas } = require('./_lib');

const fn = (name, description, properties, required) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties: properties || {}, required: required || [] } },
});
const S = { type: 'string' }, I = { type: 'integer' }, B = { type: 'boolean' };

const IPAD_TOOLS = [
  fn('open_ipad_app', 'Open an app, website, search or deep link on the iPad, e.g. "youtube://", "spotify:", "instagram://", "discord://", "music://", "facetime://", "mobilenotes://", "calshow://", "photos-redirect://", "App-prefs:", "https://any.site".', { url: S }, ['url']),
  fn('prepare_whatsapp', 'Open WhatsApp with a message ready to send (user taps send). phone: digits with country code if known.', { phone: S, message: S }, ['message']),
  fn('prepare_imessage', 'Open Messages with a text ready (user taps send). to: phone number or email if known.', { to: S, message: S }, ['message']),
  fn('play_music', 'Search and open music. app: "spotify" (default) or "apple".', { query: S, app: S }, ['query']),
  fn('youtube_search', 'Open YouTube search results on the iPad.', { query: S }, ['query']),
  fn('maps_search', 'Open Apple Maps for a place or directions.', { query: S, directions: B }, ['query']),
  fn('run_ipad_shortcut', 'Run one of the user\'s Apple Shortcuts by name (lets Jarvis control any app that supports Shortcuts: lights, focus modes, notes, timers...).', { name: S, input_text: S }, ['name']),
];

const INFO_TOOLS = [
  fn('web_search', 'Look up current information: news headlines, facts, people, places, scores, definitions.', { query: S }, ['query']),
  fn('weather', 'Current weather and forecast for a city or place.', { place: S }, ['place']),
];

const GOOGLE_TOOLS = [
  fn('send_email', 'Send an email from the user\'s Gmail. to: contact name or email address. Can watch for and auto-answer the reply.', { to: S, subject: S, body: S, watch_for_reply: B, auto_reply_instructions: S }, ['to', 'body']),
  fn('find_emails', 'Find/read Gmail (returns thread_id). Gmail search syntax; Jarvis labels: label:jarvis-needs-reply, label:jarvis-important, etc.', { query: S, max: I }),
  fn('inbox_summary', 'Unread counts per category plus emails that are Important or Need a Reply.', {}),
  fn('organize_inbox', 'Sort unsorted Gmail into categories, archive clutter, draft replies.', { days: I }),
  fn('manage_email', 'Act on emails by thread_id or Gmail query. action: open, archive, trash, read, unread, star, unstar, move (needs category), draft (needs instructions), reply (needs text).', { thread_id: S, query: S, action: S, category: S, text: S, instructions: S, max: I }, ['action']),
  fn('add_email_rule', 'Remember a sorting rule, e.g. "Emails from Epic Games go in Updates".', { rule: S }, ['rule']),
  fn('calendar', 'List upcoming Google Calendar events (action "list", days) or create one (action "create", title, start_iso with timezone offset, duration_minutes).', { action: S, days: I, title: S, start_iso: S, duration_minutes: I }, ['action']),
  fn('save_note', 'Save a note to the "Jarvis Notes" Google Doc.', { text: S }, ['text']),
  fn('set_reminder', 'Remind the user after N minutes (spoken by Jarvis).', { minutes_from_now: I, message: S }, ['minutes_from_now', 'message']),
  fn('start_background_job', 'Do a task later or repeatedly in the background (works while the iPad is off) and report the result. Use for "while I play", "every 15 minutes", "in an hour", research, email checks.', { instructions: S, minutes_from_now: I, repeat_every_minutes: I, repeat_times: I }, ['instructions']),
  fn('manage_watches', 'List or stop conversations Jarvis is watching for replies. action "list" or "stop" (contact or "all").', { action: S, contact: S }, ['action']),
];

const CONTROL_TOOLS = [
  fn('ask_follow_up', 'Use only when you truly must ask the user something before acting. Put the question in your reply.', { question: S }, ['question']),
];

const GOOGLE_NAMES = new Set(GOOGLE_TOOLS.map((t) => t.function.name));

function systemPrompt(ctx) {
  const me = ctx.name || 'the user';
  return [
    `You are Jarvis, a witty, loyal, extremely capable personal assistant for ${me} (think Tony Stark's JARVIS: calm, clever, a little dry humour).`,
    ctx.background
      ? `You are running a BACKGROUND job while ${me} is busy. Do the work with tools, then finish with a short summary of the result to be read aloud later. You cannot open anything on the iPad.`
      : `${me} talks to you by voice on an iPad, often while gaming. Your reply is read aloud: one or two short sentences, natural speech, no markdown, no lists, no emojis, never read out URLs.`,
    `Current local time: ${ctx.now || new Date().toISOString()} (timezone ${ctx.tz || 'unknown'}). Convert "in 20 minutes", "tonight at 8" etc. from this.`,
    ctx.google
      ? `Google is connected (Gmail, Calendar, Docs, reminders, background jobs).\nCONTACTS: ${ctx.contacts || 'none saved'}\nRECENT EVENTS (latest last): ${ctx.events || 'none'}\nWATCHING FOR REPLIES: ${ctx.watches || 'none'}`
      : 'Google is NOT connected yet, so email, calendar, reminders and background jobs are unavailable. If asked for them, say so briefly and tell them to tap Connect Google in Settings.',
    '',
    'RULES:',
    '- Act, don\'t ask, when the request is clear. Use ask_follow_up only when you cannot sensibly guess.',
    '- Messages: WhatsApp and iMessage open with the text filled in and the user taps send. Email sends directly. When a message expects an answer, use watch_for_reply=true, and auto_reply_instructions if they said how to answer.',
    '- "Reply to them" / "what did they say" refers to the latest person in RECENT EVENTS.',
    '- Use web_search for anything current or that you are not sure about; weather for weather. Never invent facts, scores or prices.',
    '- Never claim something was done unless the tool returned ok. If a tool fails, say what failed in plain words.',
    '- For slow or later work use start_background_job or set_reminder so the user is not kept waiting.',
    '- Before trashing many emails or sending something that commits the user to money/dates/personal info, confirm with ask_follow_up unless they clearly said so.',
  ].join('\n');
}

/* ---------------- tool implementations ---------------- */

const enc = encodeURIComponent;
const digits = (s) => String(s || '').replace(/\D/g, '');

async function getJSON(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'JarvisAssistant/1.0' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
async function getText(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'JarvisAssistant/1.0' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}

async function webSearch(q) {
  const out = { query: q };
  const tasks = [
    getText('https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q=' + enc(q)).then((xml) => {
      out.news = [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>/g)]
        .slice(0, 6).map((m) => m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"') + ' (' + m[2].slice(0, 16) + ')');
    }),
    getJSON('https://en.wikipedia.org/w/rest.php/v1/search/page?limit=2&q=' + enc(q)).then(async (j) => {
      const page = j.pages && j.pages[0];
      if (!page) return;
      const s = await getJSON('https://en.wikipedia.org/api/rest_v1/page/summary/' + enc(page.key));
      out.wikipedia = { title: s.title, summary: String(s.extract || '').slice(0, 900) };
    }),
    getJSON('https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1&q=' + enc(q)).then((j) => {
      if (j.AbstractText) out.instant_answer = j.AbstractText.slice(0, 600);
      else if (j.Answer) out.instant_answer = String(j.Answer).slice(0, 300);
    }),
  ];
  await Promise.allSettled(tasks.map((p) => Promise.race([p, new Promise((r) => setTimeout(r, 6000))])));
  if (!out.news && !out.wikipedia && !out.instant_answer) out.note = 'No results found.';
  return out;
}

const WMO = { 0: 'clear', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'foggy', 48: 'foggy', 51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle', 61: 'light rain', 63: 'rain', 65: 'heavy rain', 71: 'light snow', 73: 'snow', 75: 'heavy snow', 80: 'rain showers', 81: 'rain showers', 82: 'violent showers', 95: 'thunderstorms', 96: 'thunderstorms with hail', 99: 'thunderstorms with hail' };
async function weather(place) {
  const g = await getJSON('https://geocoding-api.open-meteo.com/v1/search?count=1&name=' + enc(place));
  const p = g.results && g.results[0];
  if (!p) return { ok: false, error: 'Place not found: ' + place };
  const w = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&timezone=auto&forecast_days=3&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max`);
  return {
    place: [p.name, p.admin1, p.country].filter(Boolean).join(', '),
    now: { temp_c: w.current.temperature_2m, feels_like_c: w.current.apparent_temperature, sky: WMO[w.current.weather_code] || 'code ' + w.current.weather_code, wind_kmh: w.current.wind_speed_10m },
    next_days: w.daily.time.map((d, i) => ({ date: d, sky: WMO[w.daily.weather_code[i]] || '', high_c: w.daily.temperature_2m_max[i], low_c: w.daily.temperature_2m_min[i], rain_chance: w.daily.precipitation_probability_max[i] })),
  };
}

async function runTool(name, args, out, ctx) {
  const ipad = (url, note) => {
    if (ctx.background) return { ok: false, error: 'Cannot open things on the iPad from a background job.' };
    out.url = url;
    return { ok: true, note: note || 'Opened on the iPad.' };
  };
  switch (name) {
    case 'open_ipad_app': return ipad(String(args.url));
    case 'prepare_whatsapp': {
      const ph = digits(args.phone);
      return ipad((ph ? 'whatsapp://send?phone=' + ph + '&text=' : 'whatsapp://send?text=') + enc(args.message), ph ? 'WhatsApp opens with the message; user taps send.' : 'WhatsApp opens; user picks the chat and taps send.');
    }
    case 'prepare_imessage': return ipad('sms:' + (args.to ? String(args.to).replace(/[^\d+@.\w-]/g, '') : '') + '&body=' + enc(args.message), 'Messages opens with the text; user taps send.');
    case 'play_music': return ipad(/apple/i.test(args.app || '') ? 'music://music.apple.com/search?term=' + enc(args.query) : 'spotify:search:' + enc(args.query), 'Music app opened with the search; user taps play if it does not start.');
    case 'youtube_search': return ipad('youtube://results?search_query=' + enc(args.query));
    case 'maps_search': return ipad('maps://?' + (args.directions ? 'daddr=' : 'q=') + enc(args.query));
    case 'run_ipad_shortcut': return ipad('shortcuts://run-shortcut?name=' + enc(args.name) + (args.input_text ? '&input=text&text=' + enc(args.input_text) : ''));
    case 'web_search': return webSearch(String(args.query));
    case 'weather': return weather(String(args.place));
    case 'ask_follow_up': if (!ctx.background) out.listen_again = 'yes'; return { ok: true };
    default:
      if (GOOGLE_NAMES.has(name)) {
        const r = await gas(ctx.gas, { action: 'tool', name, args });
        if (r && r.result !== undefined) return r.result;
        return r;
      }
      return { ok: false, error: 'Unknown tool ' + name };
  }
}

/* ---------------- agent loop ---------------- */

async function runAgent(req, body) {
  const ctx = {
    name: String(body.name || '').slice(0, 40),
    tz: String(body.tz || ''),
    now: String(body.now || ''),
    background: !!body.background,
    gas: body.gas && body.gas.url ? body.gas : null,
  };
  if (ctx.gas) {
    const c = await gas(ctx.gas, { action: 'context' }).catch(() => null);
    if (c && !c.error) {
      ctx.google = true;
      ctx.contacts = c.contacts; ctx.events = c.events; ctx.watches = c.watches;
      if (!ctx.name && c.name) ctx.name = c.name;
      if (!ctx.now && c.now) { ctx.now = c.now; ctx.tz = c.tz; }
    }
  }
  const tools = [...INFO_TOOLS, ...CONTROL_TOOLS, ...(ctx.background ? [] : IPAD_TOOLS), ...(ctx.google ? GOOGLE_TOOLS : [])];
  const history = Array.isArray(body.history) ? body.history.slice(-12)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) })) : [];
  const messages = [{ role: 'system', content: systemPrompt(ctx) }, ...history, { role: 'user', content: String(body.text).slice(0, 4000) }];
  const out = { speak: '', url: '', listen_again: 'no', actions: [] };

  for (let round = 0; round < 6; round++) {
    const msg = await llm(req, { messages, tools, tool_choice: 'auto' });
    const calls = msg.tool_calls || [];
    if (!calls.length) { out.speak = String(msg.content || '').trim(); break; }
    messages.push({ role: 'assistant', content: msg.content || '', tool_calls: calls });
    const results = await Promise.all(calls.map(async (c) => {
      let args = {};
      try { args = JSON.parse(c.function.arguments || '{}'); } catch (_) { /* keep {} */ }
      let result;
      try { result = await runTool(c.function.name, args, out, ctx); } catch (e) { result = { ok: false, error: String(e.message || e) }; }
      out.actions.push(c.function.name);
      return { role: 'tool', tool_call_id: c.id, content: JSON.stringify(result).slice(0, 12000) };
    }));
    messages.push(...results);
  }
  out.speak = (out.speak || 'Done.').replace(/[*_#`>]/g, '').replace(/\s+/g, ' ').trim();
  return out;
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const body = await readBody(req);
  if (!authorised(body)) return res.status(401).json({ error: 'auth', speak: 'Access denied.' });
  if (body.ping) return res.status(200).json({ ok: true });
  if (!body.text) return res.status(200).json({ speak: 'Yes?', url: '', listen_again: 'yes' });
  try {
    res.status(200).json(await runAgent(req, body));
  } catch (e) {
    const m = String(e.message || e);
    res.status(200).json({ error: m, speak: /429|quota|credit|limit/i.test(m) ? 'My free AI allowance is used up for now. Try again later.' : 'Sorry, my brain hit a snag: ' + m.slice(0, 120), url: '', listen_again: 'no' });
  }
};

module.exports.runAgent = runAgent; // for tests
