# Build log

| Screen | Date | Status | Missing | Harder than expected |
|---|---|---|---|---|
| S01 Home | 2026-11-17 | done | — | — |
| S02 Conversation | 2026-11-17 | done | — | Keeping answer text, action rows and approval cards in one message across resumes |
| S03 Image result | 2026-11-17 | done | Video | Free Gemini keys often have no image quota, so a keyless fallback was needed |
| S04 Settings | 2026-11-17 | done | — | — |
| S05 Apps | 2026-11-17 | done | Per-app scopes cannot be partly revoked at Google; "Disconnect" on one Google app hides it, and disconnecting the last one revokes the token | MCP OAuth differs between servers: three discovery fallbacks |
| S06 Tool activity and approval | 2026-11-17 | done | — | Gemini can't mix built-in search with function calling, so web search became a tool that makes its own call |
| S07 Tasks | 2026-11-17 | done | Push notifications (email only for now) | Free Vercel cron is daily only, so a GitHub Actions schedule drives the 15-minute runs |
| S08 Task result | 2026-11-17 | done | — | — |
| S09 Sign in | 2026-11-17 | done | — | — |

Bigger than it looked: "every app I already use". There is no single API for that. Tern covers it with built-in Google tools plus the MCP standard. Notion, Linear, Vercel, Canva, Atlassian, GitHub and Apify publish MCP servers, and Zapier's MCP server reaches the long tail, including Spotify, Zoho Books, Slack and Sheets. Apps with no MCP server and no Zapier integration cannot be reached.
