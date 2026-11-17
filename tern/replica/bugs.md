# Bugs

Only bugs that were reproduced are listed.

| ID | Sev | Steps | Expected | Actual | Evidence | Status |
|---|---|---|---|---|---|---|
| B1 | S3 | Dark theme, open an approval card, run axe | Labels at least 4.5:1 | 4.34:1 on `.cf-app` and the row labels | e2e axe output | fixed: muted ramp #7a8296 → #858da0 (5.5:1) |
| B2 | S2 | Send a chat without a `timezone` field while signed in | User's zone unchanged | Zone saved as empty, so `/api/me` dropped it | curl, 2026-11-17 | fixed: `validZone` rejects non-strings, unit tested |
| B3 | S3 | Mock sign-in without apps | Lands on the chat | Opened the Apps panel, which blocked the page | e2e F09 timeout | fixed: Apps opens only after connecting apps |
| B4 | S3 | Reload the page while a reply is still streaming | The partial reply is kept | The in-progress reply is lost (finished ones are kept) | manual | open: chats save when a reply ends |
| B5 | S4 | Disconnect only Gmail | Google forgets Gmail access | Tern stops using Gmail, but Google keeps the grant until the last Google app is disconnected, which revokes all of it | by design: Google cannot partly revoke | open (documented) |

No open S1 or S2.
