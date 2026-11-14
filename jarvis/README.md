# Jarvis: a free, voice-controlled AI assistant for iPad

Say **"Jarvis"** or **"Hey Jarvis"** in any app, even mid-game. Jarvis can:

- message people on **Discord** or **Gmail**, then **tell you their reply**, and **auto-answer for you** if you tell it how
- open **WhatsApp / iMessage** with your message ready, plus any app, website or deep link
- run **your own Apple Shortcuts** to control almost any other iPad app
- do **background jobs while you play** (research, check email every N minutes, send something later) and push you the result
- handle reminders, Google Calendar, notes and live web search
- ask you a follow-up question when it really needs one

Everything runs free:

| Part | Free service |
|---|---|
| Wake word | iPadOS 18 Vocal Shortcuts |
| Microphone and voice | Apple Shortcuts dictation and speech |
| Brain | Gemini API (free tier) on Google Apps Script |
| Notifications | ntfy, read aloud by Siri Announce Notifications |

**Start here → [SETUP.md](SETUP.md)**

```
apps-script/Code.gs     the brain: agent loop, tools, reply watcher, background jobs
apps-script/Config.gs   your key, name and contacts (the only file you edit)
apps-script/appsscript.json  manifest (optional)
```
