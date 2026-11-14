/**
 * ============================================================
 *  JARVIS — Email manager
 * ============================================================
 *  Sorts Gmail into Jarvis/<Category> labels using Gemini, learns from your
 *  corrections, archives clutter, flags what matters, and writes reply drafts.
 *  It never deletes on its own. Trash happens only when you ask.
 */

const CATEGORIES_ = [
  'Important', 'Needs Reply', 'Personal', 'School and Work', 'Orders and Receipts',
  'Bills and Money', 'Newsletters', 'Promotions', 'Social', 'Updates', 'Junk',
];

const CATEGORY_HELP_ = {
  'Important': 'time-sensitive or high-stakes for the user personally: security alerts, account problems, deadlines, acceptances/offers, anything that could cost money or access if ignored',
  'Needs Reply': 'a real person (not a company or no-reply address) wrote to the user personally and is waiting for an answer, and the last message is not from the user',
  'Personal': 'friends/family/personal conversations that do not need a reply',
  'School and Work': 'school, teachers, classes, assignments, grades, jobs, colleagues, clubs/teams',
  'Orders and Receipts': 'purchases, receipts, order confirmations, shipping and delivery',
  'Bills and Money': 'bills, invoices, bank, payments, refunds, subscription charges',
  'Newsletters': 'content the user signed up for: blogs, digests, creators, news',
  'Promotions': 'marketing, sales, discounts, coupons, ads, "we miss you"',
  'Social': 'notifications from social apps: Discord, Instagram, TikTok, YouTube, X, Reddit, Snapchat, Twitch',
  'Updates': 'other automated notices: account/app/game updates, sign-in codes, confirmations, policy changes',
  'Junk': 'scams, phishing, fake prizes, obvious spam',
};

const LABEL_ROOT_ = 'Jarvis';
const SORTED_LABEL_ = 'Jarvis/Sorted';

/* --------------------------- labels -------------------------------- */

function labelFor_(cat) { return LABEL_ROOT_ + '/' + cat; }

function getLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

function ensureLabels_() {
  getLabel_(LABEL_ROOT_);
  CATEGORIES_.forEach(function (c) { getLabel_(labelFor_(c)); });
  getLabel_(SORTED_LABEL_);
}

function threadCategory_(t) {
  const names = t.getLabels().map(function (l) { return l.getName(); });
  for (let i = 0; i < CATEGORIES_.length; i++) {
    if (names.indexOf(labelFor_(CATEGORIES_[i])) !== -1) return CATEGORIES_[i];
  }
  return '';
}

function setCategory_(t, cat, learn) {
  if (CATEGORIES_.indexOf(cat) === -1) throw new Error('Unknown category ' + cat + '. Use one of: ' + CATEGORIES_.join(', '));
  t.getLabels().forEach(function (l) {
    if (l.getName().indexOf(LABEL_ROOT_ + '/') === 0 && l.getName() !== SORTED_LABEL_) l.removeFromThread(t);
  });
  getLabel_(labelFor_(cat)).addToThread(t);
  getLabel_(SORTED_LABEL_).addToThread(t);
  if (autoArchiveList_().indexOf(cat) !== -1) t.moveToArchive(); else t.moveToInbox();
  if (learn) {
    const sender = emailAddress_(t.getMessages()[0].getFrom());
    if (sender) learnRule_(sender, 'Emails from ' + sender + ' go in ' + cat + '.');
  }
}

/* --------------------------- rules --------------------------------- */

function emailRules_() {
  const fixed = (typeof SETTINGS !== 'undefined' && SETTINGS.EMAIL_RULES) || [];
  return fixed.concat(getState_('rules', []).map(function (r) { return r.text; }));
}

function learnRule_(key, text) {
  withLock_(function () {
    const rules = getState_('rules', []).filter(function (r) { return r.key !== key; });
    rules.push({ key: key, text: text });
    setState_('rules', rules.slice(-60));
  });
}

function autoArchiveList_() {
  return (typeof SETTINGS !== 'undefined' && SETTINGS.AUTO_ARCHIVE) || ['Promotions', 'Junk'];
}

/* --------------------------- sorting ------------------------------- */

/**
 * Sort recent unsorted inbox mail.
 * @return {{ok:boolean, sorted:number, counts:Object, drafts:number, highlights:string[], summary:string}}
 */
function organizeInbox_(opts) {
  const max = Math.min((opts && opts.max) || 30, 50);
  const days = (opts && opts.days) || 14;
  const me = myEmail_();
  const threads = GmailApp.search('in:inbox -label:jarvis-sorted newer_than:' + days + 'd', 0, max);
  if (!threads.length) return { ok: true, sorted: 0, counts: {}, drafts: 0, highlights: [], summary: 'Your inbox is already organized.' };

  const items = threads.map(function (t, i) {
    const msgs = t.getMessages();
    const m = msgs[msgs.length - 1];
    const from = m.getFrom();
    return {
      i: i,
      from: from,
      to_me_directly: String(m.getTo()).toLowerCase().indexOf(me) !== -1,
      subject: t.getFirstMessageSubject(),
      messages_in_thread: msgs.length,
      last_message_is_from_me: from.toLowerCase().indexOf(me) !== -1,
      has_unsubscribe_link: !!safeHeader_(m, 'List-Unsubscribe'),
      text: stripQuoted_(m.getPlainBody()).slice(0, 500),
    };
  });

  const results = classifyEmails_(items);
  const byCat = {};
  const highlights = [];
  const archive = autoArchiveList_();
  const draftOn = String(cfg_('AUTO_DRAFT_REPLIES')) !== 'false';
  let drafts = 0;

  results.forEach(function (r) {
    const t = threads[r.i];
    if (!t || CATEGORIES_.indexOf(r.category) === -1) return;
    (byCat[r.category] = byCat[r.category] || []).push(t);
    cacheSummary_(t.getId(), r.summary);
    const who = shortName_(items[r.i].from);
    if (r.category === 'Important' || r.urgent) {
      t.markImportant();
      highlights.push('Important email from ' + who + ': ' + r.summary);
    }
    if (r.category === 'Needs Reply') {
      highlights.push(who + ' is waiting for a reply: ' + r.summary);
      if (draftOn && drafts < 3) {
        try { t.createDraftReply(writeReply_(t, '')); drafts++; } catch (err) { console.error('draft: ' + err); }
      }
    }
  });

  const sortedLabel = getLabel_(SORTED_LABEL_);
  const counts = {};
  Object.keys(byCat).forEach(function (cat) {
    const list = byCat[cat];
    counts[cat] = list.length;
    getLabel_(labelFor_(cat)).addToThreads(list);
    sortedLabel.addToThreads(list);
    if (archive.indexOf(cat) !== -1) GmailApp.moveThreadsToArchive(list);
  });

  const n = Object.keys(counts).reduce(function (s, k) { return s + counts[k]; }, 0);
  const parts = Object.keys(counts).map(function (k) { return counts[k] + ' ' + k; });
  return {
    ok: true,
    sorted: n,
    counts: counts,
    drafts: drafts,
    highlights: highlights,
    summary: 'Sorted ' + n + ' email' + (n === 1 ? '' : 's') + (parts.length ? ': ' + parts.join(', ') : '') + '.' +
      (drafts ? ' I wrote ' + drafts + ' reply draft' + (drafts === 1 ? '' : 's') + ' for you to check.' : ''),
  };
}

function classifyEmails_(items) {
  const me = cfg_('YOUR_NAME') || 'the user';
  const rules = emailRules_();
  const prompt = [
    'You are an expert, careful email organizer for ' + me + '. Put each email in exactly ONE category.',
    '',
    'CATEGORIES:',
    CATEGORIES_.map(function (c) { return '- ' + c + ': ' + CATEGORY_HELP_[c]; }).join('\n'),
    '',
    rules.length ? me + '\'S PERSONAL RULES (these override everything else):\n' + rules.map(function (r) { return '- ' + r; }).join('\n') : '',
    '',
    'HOW TO DECIDE:',
    '- Apply personal rules first.',
    '- has_unsubscribe_link=true almost always means Newsletters, Promotions, Social or Updates, never Needs Reply or Personal.',
    '- Needs Reply only when a human personally wrote and expects an answer, and last_message_is_from_me is false.',
    '- Important is for things with real consequences. Do not mark marketing "urgent!!" subjects as Important.',
    '- Security alerts about the user\'s accounts ("new sign-in", "password changed") are Important. Routine verification codes are Updates.',
    '- Scams that impersonate brands (odd sender domain, prize, urgent payment) are Junk.',
    '- summary: at most 14 plain words saying what it is about and any action/date/amount.',
    '- urgent: true only if it needs attention today.',
    '',
    'EMAILS (JSON):',
    JSON.stringify(items),
  ].join('\n');

  const schema = {
    type: 'ARRAY',
    items: {
      type: 'OBJECT',
      properties: {
        i: { type: 'INTEGER' },
        category: { type: 'STRING', enum: CATEGORIES_ },
        summary: { type: 'STRING' },
        urgent: { type: 'BOOLEAN' },
      },
      required: ['i', 'category', 'summary'],
    },
  };
  const text = geminiText_(prompt, { schema: schema });
  let parsed;
  try { parsed = JSON.parse(text); } catch (err) { throw new Error('Could not read the sorting result, try again'); }
  return Array.isArray(parsed) ? parsed : [];
}

/** Runs every 15 minutes when autopilot is on. */
function jarvisEmailTick() {
  try {
    const res = organizeInbox_({ max: 30, days: 3 });
    const h = res.highlights || [];
    h.slice(0, 3).forEach(function (line) { addEvent_(line, true); });
    if (h.length > 3) addEvent_('Plus ' + (h.length - 3) + ' more emails that need you. Check the Inbox tab.', true);
  } catch (err) {
    console.error('email tick: ' + (err && err.stack || err));
  }
}

function setEmailAutopilot_(on) {
  const existing = ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'jarvisEmailTick'; });
  if (on && !existing.length) ScriptApp.newTrigger('jarvisEmailTick').timeBased().everyMinutes(15).create();
  if (!on) existing.forEach(function (t) { ScriptApp.deleteTrigger(t); });
  PROPS.setProperty('EMAIL_AUTOPILOT', on ? 'on' : 'off');
}

/* --------------------------- replies ------------------------------- */

function writeReply_(t, instructions) {
  const me = cfg_('YOUR_NAME') || 'me';
  const convo = t.getMessages().slice(-4).map(function (m) {
    return 'From: ' + m.getFrom() + '\n' + stripQuotedLines_(m.getPlainBody()).slice(0, 1500);
  }).join('\n---\n');
  const prompt = [
    'Write ' + me + '\'s reply to the latest email in this thread.',
    instructions ? 'What ' + me + ' wants to say: ' + instructions : 'Write a sensible, polite reply that answers what was asked. Where ' + me + ' must decide something, leave a clear [placeholder].',
    'Match the tone (casual for friends, polite for teachers/companies). Keep it short. No subject line. End with: ' + me,
    '',
    'THREAD:',
    convo,
  ].join('\n');
  return geminiText_(prompt);
}

/* --------------------------- app API ------------------------------- */

function inboxOverview_(p) {
  if (p.category) {
    let threads;
    if (p.category === 'Inbox') threads = GmailApp.getInboxThreads(0, 30);
    else if (p.category === 'Unsorted') threads = GmailApp.search('in:inbox -label:jarvis-sorted', 0, 30);
    else {
      const l = GmailApp.getUserLabelByName(labelFor_(p.category));
      threads = l ? l.getThreads(0, 30) : [];
    }
    return { threads: threads.map(threadCard_) };
  }
  return {
    inbox_unread: GmailApp.getInboxUnreadCount(),
    unsorted: GmailApp.search('in:inbox -label:jarvis-sorted', 0, 50).length,
    autopilot: PROPS.getProperty('EMAIL_AUTOPILOT') !== 'off',
    categories: CATEGORIES_.map(function (c) {
      const l = GmailApp.getUserLabelByName(labelFor_(c));
      return { name: c, unread: l ? l.getUnreadCount() : 0 };
    }),
  };
}

function threadCard_(t) {
  const id = t.getId();
  let summary = CacheService.getScriptCache().get('sum_' + id);
  if (!summary) summary = stripQuoted_(t.getMessages().pop().getPlainBody()).slice(0, 140);
  const last = t.getMessages().pop();
  return {
    id: id,
    from: shortName_(last.getFrom()),
    subject: t.getFirstMessageSubject() || '(no subject)',
    summary: summary,
    date: t.getLastMessageDate().getTime(),
    unread: t.isUnread(),
    starred: t.hasStarredMessages(),
    in_inbox: t.isInInbox(),
    category: threadCategory_(t),
  };
}

function emailAction_(p) {
  const t = GmailApp.getThreadById(String(p.id || ''));
  if (!t) return { error: 'Email not found' };
  return applyEmailOp_(t, String(p.op || ''), p);
}

function applyEmailOp_(t, op, p) {
  switch (op) {
    case 'open':
      t.markRead();
      return {
        ok: true,
        thread: Object.assign(threadCard_(t), {
          messages: t.getMessages().slice(-5).map(function (m) {
            return { from: m.getFrom(), to: m.getTo(), date: m.getDate().getTime(), body: stripQuotedLines_(m.getPlainBody()).slice(0, 6000) };
          }),
        }),
      };
    case 'archive': t.moveToArchive(); return { ok: true };
    case 'inbox': t.moveToInbox(); return { ok: true };
    case 'trash': t.moveToTrash(); return { ok: true };
    case 'read': t.markRead(); return { ok: true };
    case 'unread': t.markUnread(); return { ok: true };
    case 'star': t.getMessages().pop().star(); return { ok: true };
    case 'unstar': t.getMessages().forEach(function (m) { m.unstar(); }); return { ok: true };
    case 'move': setCategory_(t, p.category, true); return { ok: true, learned: true };
    case 'draft': {
      const text = writeReply_(t, p.instructions || '');
      if (p.save_draft) t.createDraftReply(text);
      return { ok: true, text: text };
    }
    case 'reply': {
      if (!p.text) return { error: 'No reply text' };
      t.getMessages().pop().reply(String(p.text));
      const nr = GmailApp.getUserLabelByName(labelFor_('Needs Reply'));
      if (nr) { nr.removeFromThread(t); getLabel_(labelFor_('Personal')).addToThread(t); }
      return { ok: true };
    }
    default:
      return { error: 'Unknown email action ' + op };
  }
}

/* --------------------------- chat tools ---------------------------- */

/** A function (not a constant) so file load order in Apps Script never matters. */
function emailToolDecls_() {
  return [
  {
    name: 'organize_inbox',
    description: 'Sort the user\'s unsorted Gmail into categories (Important, Needs Reply, Personal, School and Work, Orders and Receipts, Bills and Money, Newsletters, Promotions, Social, Updates, Junk), archive clutter, and draft replies.',
    parameters: obj_({ days: { type: I, description: 'How far back to look (default 14, max 90)' } }),
  },
  {
    name: 'inbox_summary',
    description: 'Get unread counts per category plus the emails that are Important or Need a Reply (with thread_id and summary).',
    parameters: obj_({}),
  },
  {
    name: 'manage_email',
    description: 'Act on emails. Give thread_id (from find_emails/inbox_summary) OR a Gmail search query. Actions: open, archive, trash, read, unread, star, unstar, move (needs category; Jarvis remembers it for that sender), draft (writes a reply and saves it as a Gmail draft), reply (sends text, single email only).',
    parameters: obj_({
      thread_id: { type: S },
      query: { type: S, description: 'Gmail search, e.g. "from:roblox.com" or "label:jarvis-promotions older_than:7d"' },
      action: { type: S },
      category: { type: S },
      text: { type: S, description: 'reply: the exact reply text' },
      instructions: { type: S, description: 'draft: what the reply should say' },
      max: { type: I, description: 'query: max emails to act on (default 10, max 50)' },
    }, ['action']),
  },
  {
    name: 'add_email_rule',
    description: 'Remember a standing sorting rule, e.g. "Emails from Epic Games go in Updates" or "Anything from coach@school.org is Important".',
    parameters: obj_({ rule: { type: S } }, ['rule']),
  },
  {
    name: 'set_email_autopilot',
    description: 'Turn automatic sorting (every 15 minutes) on or off.',
    parameters: obj_({ on: { type: B } }, ['on']),
  },
  ];
}

const EMAIL_TOOLS_ = {
  organize_inbox: function (a) {
    const r = organizeInbox_({ max: 50, days: Math.min(a.days || 14, 90) });
    return { summary: r.summary, highlights: r.highlights.slice(0, 6) };
  },

  inbox_summary: function () {
    const o = inboxOverview_({});
    const pick = function (cat) {
      const l = GmailApp.getUserLabelByName(labelFor_(cat));
      return l ? l.getThreads(0, 5).filter(function (t) { return t.isInInbox(); }).map(function (t) {
        const c = threadCard_(t); return { thread_id: c.id, from: c.from, subject: c.subject, summary: c.summary, unread: c.unread };
      }) : [];
    };
    return {
      inbox_unread: o.inbox_unread,
      not_yet_sorted: o.unsorted,
      unread_by_category: o.categories.filter(function (c) { return c.unread; }),
      important: pick('Important'),
      needs_reply: pick('Needs Reply'),
    };
  },

  manage_email: function (a) {
    let threads;
    if (a.thread_id) {
      const t = GmailApp.getThreadById(a.thread_id);
      threads = t ? [t] : [];
    } else if (a.query) {
      threads = GmailApp.search(a.query, 0, Math.min(a.max || 10, 50));
    } else {
      return { ok: false, error: 'Need thread_id or query' };
    }
    if (!threads.length) return { ok: false, error: 'No matching emails' };
    if ((a.action === 'reply' || a.action === 'open') && threads.length > 1) threads = threads.slice(0, 1);
    const results = threads.map(function (t) {
      const r = applyEmailOp_(t, a.action, { category: a.category, text: a.text, instructions: a.instructions, save_draft: true });
      if (a.action === 'open' && r.thread) {
        r.thread.messages = r.thread.messages.map(function (m) { m.body = m.body.slice(0, 1500); return m; });
      }
      return r;
    });
    const failed = results.filter(function (r) { return r.error; });
    return { ok: failed.length === 0, done: results.length - failed.length, errors: failed.map(function (r) { return r.error; }).slice(0, 3), details: a.action === 'open' || a.action === 'draft' ? results : undefined };
  },

  add_email_rule: function (a) {
    learnRule_('rule:' + String(a.rule).toLowerCase().slice(0, 60), String(a.rule));
    return { ok: true };
  },

  set_email_autopilot: function (a) {
    setEmailAutopilot_(!!a.on);
    return { ok: true, autopilot: !!a.on };
  },
};

/* --------------------------- helpers ------------------------------- */

function myEmail_() { return Session.getEffectiveUser().getEmail().toLowerCase(); }

function shortName_(from) {
  const m = String(from || '').match(/^\s*"?([^"<]+?)"?\s*</);
  return m ? m[1].trim() : String(from || '').replace(/[<>]/g, '').trim();
}

function emailAddress_(from) {
  const m = String(from || '').match(/[^\s<>"]+@[^\s<>"]+/);
  return m ? m[0].toLowerCase() : '';
}

function safeHeader_(m, name) {
  try { return m.getHeader(name) || ''; } catch (_) { return ''; }
}

function cacheSummary_(id, summary) {
  if (summary) CacheService.getScriptCache().put('sum_' + id, String(summary).slice(0, 200), 21600);
}

function stripQuotedLines_(body) {
  const lines = String(body || '').split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^On .+wrote:\s*$/.test(l) || /^-{2,}\s*Original Message/i.test(l)) break;
    if (/^>/.test(l)) continue;
    out.push(l);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
