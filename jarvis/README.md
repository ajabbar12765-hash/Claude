# Jarvis: a free personal assistant and email manager for iPad

A Home Screen app (**https://jarvis-ipad-wheat.vercel.app**) plus a free brain that runs in your own Google account.
It uses no Siri and no notifications.

- **Email manager:** sorts Gmail automatically every 15 minutes into Needs Reply, Important, School and Work, Orders and Receipts, Bills and Money, Personal, Updates, Social, Newsletters, Promotions and Junk.
  - Summarises every email
  - Archives clutter (never deletes it)
  - Writes reply drafts
  - Learns from your corrections
- **Voice:** tap the orb, or turn on hands-free and say "Jarvis…". Jarvis talks back in a non-Siri voice and reads out new replies and updates while the app is open.
- **Messages:** sends Discord and Gmail messages, tells you the reply, and can auto-answer the way you asked. Opens WhatsApp and iMessage with the message ready.
- **Works while you play:** background jobs, reminders, calendar, notes and live web search. An optional "Jarvis" voice shortcut works on top of games.

**Start here → [SETUP.md](SETUP.md)**

```
app/                     the iPad web app (static; hosted on Vercel)
apps-script/Code.gs      brain: agent loop, tools, reply watcher, jobs, app API
apps-script/Email.gs     email manager: AI sorting, learning, drafts, autopilot
apps-script/Config.gs    your key, name, contacts and email rules (the only file you edit)
```
