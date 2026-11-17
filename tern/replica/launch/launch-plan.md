# Launch plan

Start personal: you, then up to 99 people you add as Google test users. Go public only after Google's verification for Gmail and Drive scopes, which takes weeks.

1. **Beta list:** the Google test-user list is the beta list. Add people one by one.
2. **Analytics and errors:** Vercel Analytics (free) for page views; Vercel's function logs for errors; an uptime check on `/api/status` (for example a free UptimeRobot monitor) with alerts to your email.
3. **Where unhappy users talk:** r/grok and r/xAI threads about limits, the App Store reviews of assistant apps, and Hacker News threads on AI assistants with email access. Read them first, then rerun stage 8 with those hosts allowed.
4. **Launch post:** lead with the fix, not the comparison. "An assistant that does your inbox and calendar, asks before it sends anything, and costs nothing." Show the approval card. Don't name the original in the post, ads or listing.
5. **First 10 users to talk to by hand:** people who already asked for an email or calendar assistant and stopped paying for one. Watch them connect Gmail and run one task; note every place they hesitate.

Store apps: Tern ships as an installable web app. A store build (a wrapper such as Capacitor) needs an Apple Developer account ($99/yr) and a Google Play account ($25 once), both owned by you. `listing.json` passes `listing.py` and is ready if you go that way. Apple's rule 4.2 (minimum functionality) is the main review risk for wrappers.
