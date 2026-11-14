# Jarvis on your iPad: setup guide (free)

Total time: about 30–40 minutes, done once.
Cost: $0. You need a Google account, a Gemini API key, and an iPad on **iPadOS 18 or newer**.
**No Siri is used anywhere.** You can turn Siri off completely.

```
 You: "Jarvis… message Sam on Discord asking if he wants to play"
   │  (Vocal Shortcut wake word, works on top of any app or game)
   ▼
 iPad Shortcut "Jarvis": listens → sends your words to ↓ → speaks the answer
   ▼
 Jarvis brain (Google Apps Script: free, always on, runs in Google's cloud)
   ├─ Gemini decides what to do
   ├─ sends Discord / Gmail, reads email, calendar, notes, web search
   ├─ opens WhatsApp / iMessage / any app on the iPad
   └─ checks for replies every minute, can auto-answer, runs jobs while you play
   ▼
 ntfy push notification on your iPad:
 "Sam replied on Discord: yeah sure. I answered: cool, join at 8."
```

> **Tip:** Steps 1–3 are easiest on any computer, but they also work in iPad Safari. In Safari, tap **aA → Request Desktop Website** on script.google.com.

---

## Step 1: Get your free Gemini key (2 min)

1. Go to **https://aistudio.google.com/apikey** and sign in.
2. Tap **Create API key** and copy it. You'll paste it in Step 2.

## Step 2: Create the Jarvis brain (10 min)

1. Go to **https://script.google.com** and tap **New project**. Rename it to `Jarvis`.
2. The editor already has a file called `Code.gs`. Delete everything in it, then paste in the whole contents of
   [`apps-script/Code.gs`](apps-script/Code.gs) from this repo.
3. Tap **＋ (Add a file) → Script** and name it `Config` (it becomes `Config.gs`). Paste in
   [`apps-script/Config.gs`](apps-script/Config.gs).
4. In `Config.gs`:
   - Put your Gemini key in `GEMINI_API_KEY`.
   - Set `YOUR_NAME`.
   - Add your people to `CONTACTS`. You can come back and add more any time.
5. Open **⚙ Project Settings** and set **Time zone** to yours.
6. Tap **💾 Save**.

## Step 3: Run setup and deploy (5 min)

1. At the top, pick the function **`setup`** and tap **▶ Run**.
2. Google asks for permissions. Tap **Review permissions**, choose your account, then **Advanced → Go to Jarvis (unsafe) → Allow**.
   It says "unsafe" only because you wrote the app yourself and Google hasn't reviewed it. It runs only in your own Google account.
3. Open the **Execution log** and copy two values from it:
   - **Your secret**: a password so only your iPad can control Jarvis.
   - **Your ntfy topic**: your private notification channel.
4. Tap **Deploy → New deployment → ⚙ → Web app**, then set:
   - Execute as: **Me**
   - Who has access: **Anyone**. This is safe because every request must include your secret.
5. Tap **Deploy** and copy the **Web app URL**. It ends in `/exec`.
6. Optional check: pick `testJarvis`, tap **▶ Run**, and look at the log. You should see Jarvis answer.

> If you edit the code later, use **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.
> That way the URL stays the same.

## Step 4: Build the "Jarvis" Shortcut on the iPad (8 min)

Open the **Shortcuts** app, tap **＋**, and name the shortcut **Jarvis**. Add these actions in order:

| # | Action (search for it) | Set it to |
|---|---|---|
| 1 | **Dictate Text** | Stop Listening: **After Pause** |
| 2 | **URL Encode** | Input: *Dictated Text* |
| 3 | **Text** | `YOUR_WEB_APP_URL?secret=YOUR_SECRET&text=`, then insert the variable *URL Encoded Text* right after `text=` |
| 4 | **Get Contents of URL** | URL: *Text* (method GET is fine) |
| 5 | **Get Dictionary Value** | Get **Value** for key `speak` in *Contents of URL* |
| 6 | **Speak Text** | *Dictionary Value*. Tap **Show More → Voice** and pick any voice that isn't a "Siri" voice, e.g. *Daniel* or *Samantha* |
| 7 | **Get Dictionary Value** | Get **Value** for key `url` in *Contents of URL* |
| 8 | **If** | *Dictionary Value* **has any value** → inside: **Open URLs** (*Dictionary Value*) → **End If** |
| 9 | **Get Dictionary Value** | Get **Value** for key `listen_again` in *Contents of URL* |
| 10 | **If** | *Dictionary Value* **is** `yes` → inside: **Run Shortcut** → *Jarvis* → **End If** |

Tap **▶** to test it. Say "what time is it?" and Jarvis should answer out loud.
Shortcuts may ask "Allow Jarvis to connect to script.google.com?" Tap **Always Allow**.
It may ask a similar question the first time Jarvis opens an app. Tap **Always Allow** there too.

## Step 5: The "Jarvis" / "Hey Jarvis" wake word (3 min)

1. Open **Settings → Accessibility → Vocal Shortcuts → Set Up Vocal Shortcuts**.
2. Choose **Shortcut → Jarvis**.
3. Type the phrase **Jarvis** and say it 3 times when asked.
4. Tap **Add Action** again. Pick the same Jarvis shortcut, give it the phrase **Hey Jarvis**, and train it the same way.

Now you can say "Jarvis" at any time, even inside a game, to start it. Vocal Shortcuts is an Accessibility feature, not Siri, so it works with Siri turned off.

## Step 6: Get replies and updates while you game (2 min)

1. Install **ntfy** from the App Store (free).
2. Open it, tap **＋**, and paste **your ntfy topic** (server: `ntfy.sh`). Allow notifications.
3. Replies and job results now show up as notification banners on top of your game.
   *(Hands-free spoken replies without Siri are coming in the next update.)*

## Step 7 (optional): Discord (10 min)

Jarvis messages your friends through **your own free Discord bot**. Discord doesn't allow automating your personal account, and doing it can get the account banned.

1. Go to **https://discord.com/developers/applications** and tap **New Application**. Call it `Jarvis`.
2. Open **Bot**:
   - Tap **Reset Token**, copy the token, and paste it into `DISCORD_BOT_TOKEN` in `Config.gs`.
   - On the same page, turn on **Message Content Intent**.
3. Open **OAuth2 → URL Generator**:
   - Under scopes, tick **bot**.
   - Under permissions, tick **View Channels**, **Send Messages** and **Read Message History**.
   - Open the generated link and add the bot to **your server**.
4. In the Discord app, open **Settings → Advanced** and turn on **Developer Mode**. Then long-press:
   - a friend → **Copy User ID** → put it in their `discord_id`
   - a server channel → **Copy Channel ID** → put it in `discord_channel` (good for your squad's group chat)
5. Your friends must be **in a server with the bot** for it to DM them.
6. Save, then redeploy a **New version** (see the tip at the end of Step 3).

## Step 8 (optional): Teach Jarvis any other app

Jarvis can run **any Shortcut you make**, and Apple Shortcuts can control most iPad apps.
For example, make a shortcut called **Lights Off** that turns off your HomeKit lights. Then say "Jarvis, run lights off".
It also opens apps and deep links directly, such as YouTube searches, Spotify, Maps and websites.

---

## Things to say

- "Jarvis, message Sam on Discord asking if he's free to play at 8. If he says yes, tell him to join my party."
- "Hey Jarvis, tell the squad I'll be on in 10." (Discord channel)
- "Jarvis, WhatsApp mom that I'm running late." (WhatsApp opens with the message filled in. Tap send.)
- "Jarvis, email my teacher that I'll submit the assignment tonight, and tell me when they reply."
- "Jarvis, what did he say?" / "Jarvis, reply that I'm in."
- "Jarvis, check my email every 15 minutes for the next hour and tell me if anything from Amazon arrives."
- "Jarvis, while I play, research the best budget gaming headsets and email me a summary."
- "Jarvis, remind me in 30 minutes to stretch."
- "Jarvis, what's on my calendar tomorrow?" / "Jarvis, add football practice Saturday at 10."
- "Jarvis, open YouTube and search Fortnite season tips."
- "Jarvis, stop watching for replies."

## Honest limits, and how this setup works around them

| Limit | Why | Workaround used |
|---|---|---|
| Normal apps can't listen in the background on an iPad | Apple blocks it | Vocal Shortcuts (Accessibility) gives you a custom "Jarvis" wake word that works system-wide |
| WhatsApp / iMessage need one tap to send | Apple and WhatsApp block silent sending on iPad | Jarvis opens the chat with the text filled in. Their replies show in WhatsApp/Messages notifications |
| Discord messages come from your bot, not your account | Automating a personal account breaks Discord's rules and gets accounts banned | A free bot on your server |
| No tapping around inside apps that don't support Shortcuts | Apple doesn't let apps control other apps | URL deep links, plus any Shortcut you build |
| Replies can arrive up to about 1 minute late | Google's free timer runs once a minute | Good enough for chats |
| Free limits | Gemini free tier has daily/minute caps. Gmail allows 100 sends a day | Plenty for personal use. Jarvis tells you if you hit a limit |

## Troubleshooting

- **"Access denied"**: the secret in Shortcut step 3 doesn't match the one in the log. Run `setup` again to see it.
- **The shortcut says nothing or shows an HTML page**: the deployment access isn't set to **Anyone**, or you used a URL that doesn't end in `/exec`.
- **"The free Gemini limit was hit"**: wait a minute. Gemini's free tier limits requests per minute.
- **Discord "does not accept DMs"**: that friend isn't in a server with the bot, or has DMs from server members turned off.
- **Changes don't take effect**: you need to deploy a **New version** (see the tip at the end of Step 3).
- **Logs**: open script.google.com → your project → **Executions**.
