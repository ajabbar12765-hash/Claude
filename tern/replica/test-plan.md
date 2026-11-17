# Test plan

All automated tests run against the local server in mock mode (`TERN_MOCK=1`), with a fake model, inbox, calendar and MCP app. Nothing was run against the original's servers.

Automated: `tests/unit.test.mjs` (12 tests) and `tests/e2e.test.mjs` (6 browser tests: role and label selectors, failing on console errors, page errors or 5xx, with an axe scan on S01, S05, S06 and S07). Last run 2026-11-17: **18 pass, 0 fail**.

| ID | Case | How | Result |
|---|---|---|---|
| F01-H1 | Ask, see a streamed answer | e2e F01 | pass |
| F01-E1 | Enter while a reply streams stops it | found while testing; by design | pass |
| F01-E2 | Mobile width, no sideways scroll | e2e phone | pass |
| F01-N1 | Signed out, ask for apps → sign-in prompt | e2e F01 | pass |
| F05-H1 | Sign in with Google, connect Gmail | e2e F05 (mock OAuth) | pass |
| F05-N1 | OAuth state mismatch or expired → error toast, no session | code path, `api/auth.js` | manual |
| F06-H1 | "Summarise my unread" → Gmail search step, summary | e2e F06 | pass |
| F07-H1 | Reply → approval card → edit body → Send → sent | e2e F07 | pass |
| F07-N1 | Cancel at approval → denied step, nothing sent | e2e F07 | pass |
| F07-E1 | Replay the same approval → refused | curl, 2026-11-17 | pass |
| F07-E2 | Other user's approval id → refused | unit: store contract | pass |
| F07-E3 | Reload after answering → action row persists | e2e F07 | pass |
| F09-H1 | Add an app by MCP URL → actions listed → use with approval | e2e F09 | pass |
| F09-N1 | Non-https or private-network URL → refused | code path, `mcp.js checkUrl` | manual |
| F10-H1 | Create a task from chat | e2e F10 | pass |
| F10-H2 | Create a weekly task from the form | e2e F10 | pass |
| F10-H3 | Run now → result listed, emailed | e2e F10 | pass |
| F10-H4 | Pause a task | e2e F10 | pass |
| F10-E1 | Two cron calls at once → task runs once | unit claim + curl | pass |
| F10-E2 | DST: 07:00 local stays 07:00 across the change | unit | pass |
| F10-E3 | Weekend skipped for weekday tasks | unit | pass |
| F10-N1 | Task tries to write without "can act" → refused, explained | code path, `agent.js` | manual |
| X-1 | Second user sees no connections, tasks or runs | unit, file + Postgres | pass |
| X-2 | Cross-origin POST → 403 | curl | pass |
| X-3 | Tokens encrypted at rest; tampering detected | unit | pass |
| X-4 | Account deletion removes everything | unit | pass |

## Still to click through by hand (needs real accounts, so the user runs these)

- [ ] Real Google sign-in, consent for Gmail, Calendar and Drive, refresh after an hour
- [ ] Real Gemini function calling: "summarise my unread", "reply to X", "book 30 minutes tomorrow afternoon"
- [ ] Sent email arrives in the right thread (replies keep In-Reply-To)
- [ ] A one-click MCP preset (for example Notion or Linear) through its real OAuth
- [ ] A task emailed at its real scheduled time via the GitHub Actions schedule
- [ ] Install to the home screen on iPhone and Android
- [ ] Revoke Tern in Google Account → Security, then confirm the app asks you to reconnect
