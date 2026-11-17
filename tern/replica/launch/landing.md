# Landing page copy

Not built as a separate page yet. For personal use, the app's own home screen is the front door. Build this page only if Tern goes public, and run `contrast.py` on it then.

**Hero:** Your assistant that does the errands, and asks first
Sub: Tern reads your inbox, finds time on your calendar, works in your apps and runs jobs on a schedule. Free, on your own Gemini key.
Button: Open Tern · Screenshot: `clone-screens/S06-confirm.png` (a real approval card)

**The problem**, paraphrasing themes from `feedback.md` (unverified):
- Assistants whose limits shift from day to day, with upgrades pushed at the moment you hit them
- Assistants that act in your accounts without showing what they did

**How it works**
1. Sign in with Google and pick the apps: Gmail, Calendar, Drive, plus anything with an MCP server or on Zapier
2. Ask in plain words: "summarise my unread and draft replies"
3. Approve what it wants to send or change. Edit it first if you like

**Features, led by the fixes**
- Free: bring a free Gemini key; no plan, no upsell, no card
- Asks first: every send, change or delete waits for your OK
- Shows its work: each action appears as a line you can read
- Tasks: "every weekday at 7, tell me what needs a reply", emailed to you
- Any app: one-click Notion, Linear, Canva, Vercel, Jira; Zapier for the rest
- Think, Search and Image when you need them

**Pricing:** free. You use Google's free Gemini quota, or your own paid key if you want more.

**FAQ**
- *Is my email stored?* No. Tern reads it when you ask and keeps only your sign-in tokens, encrypted. Chats stay in your browser.
- *Can it send without me?* Not unless you turn on "can act" for a specific task.
- *Why does Google warn the app is unverified?* Gmail access needs Google's review for public apps; personal installs run in Testing mode.
- *Which apps?* Gmail, Calendar and Drive built in; any app with an MCP server; thousands more through Zapier.

**Final call to action:** Open Tern
