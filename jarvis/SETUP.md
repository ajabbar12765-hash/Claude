# Jarvis on your iPad: setup guide (free)

You set this up once, in about 25 minutes. It costs $0.
You need a Google account, a free Gemini API key, and an iPad.
Jarvis uses **no Siri and no notifications.**

```
 Jarvis app (on your Home Screen)        Optional voice shortcut (works inside games)
   voice · chat · Inbox · Activity          "Jarvis…" → Shortcut → speaks the answer
                 \                           /
                  ▼                         ▼
     Jarvis brain: Google Apps Script (free, always on, in your Google account)
       ├─ Gemini AI decides what to do
       ├─ Email manager: sorts Gmail every 15 min, flags what matters,
       │    archives clutter, writes reply drafts, learns from your fixes
       ├─ Discord / Gmail messages, watches for replies, can auto-answer
       ├─ reminders, background jobs, calendar, notes, web search
       └─ opens WhatsApp / iMessage / any app on the iPad
```

App: **https://jarvis-ipad-wheat.vercel.app**. It only works after you connect it to your own brain in Step 4.

> **Tip:** Steps 1–3 are easiest on any computer, but they also work in iPad Safari.
> In Safari, tap **aA → Request Desktop Website** on script.google.com.

---

## Step 1: Get a free Gemini key (2 min)

1. Go to **https://aistudio.google.com/apikey** and sign in.
2. Tap **Create API key** and copy it.

## Step 2: Create the Jarvis brain (10 min)

1. Go to **https://script.google.com** and tap **New project**. Rename it to `Jarvis`.
2. In the file called `Code.gs`, delete everything. Paste in the whole of [`apps-script/Code.gs`](apps-script/Code.gs).
3. Tap **＋ → Script**, name it `Email`, and paste in [`apps-script/Email.gs`](apps-script/Email.gs).
4. Tap **＋ → Script**, name it `Config`, and paste in [`apps-script/Config.gs`](apps-script/Config.gs). Then fill in:
   - `GEMINI_API_KEY`
   - `YOUR_NAME`
   - your people in `CONTACTS`
   - optional: your own email sorting rules in `EMAIL_RULES`
5. Open **⚙ Project Settings** and set your **Time zone**.
6. Tap **💾 Save**.

## Step 3: Run setup and deploy (5 min)

1. Pick the function **`setup`** at the top and tap **▶ Run**.
2. Google asks for permissions. Tap **Review permissions**, choose your account, then **Advanced → Go to Jarvis (unsafe) → Allow**.
   It says "unsafe" only because you wrote the app yourself and Google hasn't reviewed it. It runs only inside your own Google account.
   Setup also creates your Gmail labels and turns on email autopilot.
3. Tap **Deploy → New deployment → ⚙ → Web app**, then set:
   - Execute as: **Me**
   - Who has access: **Anyone**. This is safe because every request needs your secret.
4. Tap **Deploy**.
5. Pick the function **`appLink`** and tap **▶ Run**. The log shows:
   - your **Web app URL** and **Secret** (you need these for the Shortcut in Step 5)
   - your personal **connect link**

> If you edit the code later, use **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.
> That way your link stays the same.

## Step 4: Put the Jarvis app on your Home Screen (2 min)

1. On the iPad, open your **connect link** in **Safari**. You can email it to yourself, or copy it from the log.
2. Tap **Share → Add to Home Screen → Add**.
3. Open **Jarvis** from the Home Screen. It opens full-screen, like a normal app.
   If it asks you to connect, paste the connect link into the box and tap **Connect**.
4. Tap the glowing orb and allow the **microphone**.

That's it. Try "Organize my inbox".

### Using the app
- **Orb:** tap it, then talk. Tap it again to stop. Tap it while Jarvis is talking to make it stop.
- **Hands-free:** turn it on (top right) and Jarvis listens for **"Jarvis…"** or **"Hey Jarvis…"** while the app is open.
- **Spoken updates:** while the app is open, Jarvis reads out new replies, finished jobs, reminders and important new emails by itself.
  Anything that arrives while the app is closed is read out the next time you open it.
- **Inbox tab:**
  - Every email is sorted into a category: Needs Reply, Important, School and Work, Orders and Receipts, Bills and Money, Personal, Updates, Social, Newsletters, Promotions or Junk.
  - Open an email to see Jarvis's summary.
  - **Reply with Jarvis** writes the reply for you. You can tell it what to say, edit the text, then tap Send.
  - **Move to…** fixes a wrong category. Jarvis remembers that sender from then on.
- **Activity tab:** who Jarvis is waiting on, scheduled reminders and jobs, and recent events.
- **⚙ Settings:** choose Jarvis's voice (Siri voices are hidden), set the speaking speed, and choose whether the app starts in hands-free mode.

### What the email manager does automatically
- **Every 15 minutes** it sorts new mail into `Jarvis/…` labels in Gmail, so they show up on every device.
- **Promotions** and **Junk** are labelled and moved out of your inbox. They are **never deleted**.
  You can change which categories get archived in `AUTO_ARCHIVE` in Config.gs.
- For emails that **need a reply**, it writes a draft in Gmail for you to check. It never sends anything on its own.
- It learns whenever you move an email, or when you say something like "always put Roblox emails in Updates".
- It only deletes or sends email when you ask it to.

## Step 5 (optional): Say "Jarvis" from inside a game (10 min)

A web app can only listen while it's open on screen. To talk to Jarvis from inside Fortnite or any other app, add this voice shortcut.
It uses Vocal Shortcuts, an Accessibility feature, not Siri.

**Build the shortcut:** open **Shortcuts**, tap **＋**, name it **Jarvis**, and add these actions in order:

| # | Action (search for it) | Set it to |
|---|---|---|
| 1 | **Dictate Text** | Stop Listening: **After Pause** |
| 2 | **URL Encode** | Input: *Dictated Text* |
| 3 | **Text** | `YOUR_WEB_APP_URL?secret=YOUR_SECRET&text=`, then insert the variable *URL Encoded Text* right after `text=` |
| 4 | **Get Contents of URL** | URL: *Text* |
| 5 | **Get Dictionary Value** | Get **Value** for key `speak` in *Contents of URL* |
| 6 | **Speak Text** | *Dictionary Value*. Tap **Show More → Voice** and pick a non-Siri voice, e.g. *Daniel* |
| 7 | **Get Dictionary Value** | Get **Value** for key `url` in *Contents of URL* |
| 8 | **If** | *Dictionary Value* **has any value** → **Open URLs** (*Dictionary Value*) → **End If** |
| 9 | **Get Dictionary Value** | Get **Value** for key `listen_again` in *Contents of URL* |
| 10 | **If** | *Dictionary Value* **is** `yes` → **Run Shortcut** → *Jarvis* → **End If** |

**Set up the wake word:**
1. Open **Settings → Accessibility → Vocal Shortcuts → Set Up**.
2. Choose **Shortcut → Jarvis**, type the phrase **Jarvis**, and say it 3 times.
3. Repeat with the phrase **Hey Jarvis**.

Now saying "Jarvis, message the squad I'll be on in 5" works on top of your game.
**Replies while you game:** every time you talk to Jarvis this way, it first tells you anything new.
For example: "Update: Sam replied: yeah sure. I answered: cool, join at 8."

## Step 6 (optional): Discord (10 min)

Jarvis messages friends through **your own free Discord bot**. Automating your personal account breaks Discord's rules and can get it banned.

1. Go to **https://discord.com/developers/applications** and tap **New Application**.
2. Open **Bot**:
   - Tap **Reset Token**, copy it, and paste it into `DISCORD_BOT_TOKEN` in Config.gs.
   - Turn on **Message Content Intent**.
3. Open **OAuth2 → URL Generator**:
   - Under scopes, tick **bot**.
   - Under permissions, tick **View Channels**, **Send Messages** and **Read Message History**.
   - Open the generated link and add the bot to your server.
4. In Discord, open **Settings → Advanced** and turn on **Developer Mode**. Then long-press:
   - a friend → **Copy User ID** → put it in their `discord_id`
   - a channel → **Copy Channel ID** → put it in `discord_channel`
5. Friends must share a server with the bot. Deploy a **New version** afterwards (see the tip at the end of Step 3).

---

## Things to say

**Email**
- "Organize my inbox." / "Who needs a reply?" / "Anything important today?"
- "Read me the email from Coach." / "Reply to Coach saying Friday at 4 works."
- "Archive all the Fortnite emails." / "Always put Roblox emails in Updates."
- "Draft replies for everything that needs one."
- "Check my email every 15 minutes for the next hour and tell me if anything from Amazon comes."

**Messages**
- "Message Sam on Discord asking if he's free at 8. If he says yes, tell him to join my party."
- "Tell the squad I'll be on in 10." / "What did he say?" / "Reply that I'm in."
- "WhatsApp mom that I'm running late." (WhatsApp opens with the message ready. Tap send.)

**Other**
- "Remind me in 30 minutes to stretch." / "What's on my calendar tomorrow?"
- "While I play, research the best budget gaming headsets and email me a summary."
- "Open YouTube and search Fortnite tips." / "Run my Lights Off shortcut."

## Honest limits

| Limit | Why | What Jarvis does instead |
|---|---|---|
| The app can only listen and talk while it's open on screen | iPadOS pauses web apps in the background | It catches you up the moment you open it, and the voice shortcut (Step 5) works inside games |
| Voice input inside the Home Screen app can be unreliable on some iPadOS versions | An Apple Safari limitation | Use the keyboard's 🎤 key, or open the app in a Safari tab |
| WhatsApp / iMessage need one tap to send | Apple and WhatsApp block silent sending | The chat opens with the message ready |
| Discord messages come from your bot | Automating a personal account breaks Discord's rules | A free bot on your server |
| Replies and sorting can lag by about 1 / 15 minutes | Google's free timers | Fine for chats and email |
| Free limits | Gemini free tier daily caps. Gmail allows 100 sends a day | Plenty for personal use |

## Troubleshooting
- **"Access denied" / "secret did not match":** run `appLink` again and use the new link.
- **"Strange answer… set access to Anyone":** redeploy with **Who has access: Anyone**, and use the URL that ends in `/exec`.
- **Changes don't take effect:** deploy a **New version** (see the tip at the end of Step 3).
- **Microphone not working:** turn microphone access on for the site in **Settings → Apps → Safari → Microphone**, or use the keyboard 🎤.
- **Logs:** open script.google.com → Jarvis → **Executions**.
