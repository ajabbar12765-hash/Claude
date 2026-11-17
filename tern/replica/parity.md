# Parity

Run 2026-11-17 with `parity.py replica/features.csv`.

**Feature score: 98.6 / 100.** 27 features counted, and all 19 must-haves are done. The only gap is Workspaces (a could-have). Three features are left out on purpose: X real-time data, Companions and video generation.

How much to trust it: the `clone` column is marked from the e2e suite, which runs against a fake model and fake Google APIs. Real Gemini function calling, real Google OAuth and real MCP OAuth have not been exercised yet (see the hand checklist in `test-plan.md`). Until those pass, read "yes" for app features as "built and tested against fakes".

## Layout diff

Not run. Recon could not capture screenshots of the original: the session's network blocks its domains, and a clean-room build does not need them. The clone's screens are in `clone-screens/` for later comparison. Parity here means doing the same job, not looking the same.

## Behaviour diff

| Flow | Original does (from sources) | Clone does | Fix or keep |
|---|---|---|---|
| F05 connect | One OAuth flow per connector (Gmail and Calendar separately) | One Google sign-in, with each app added by incremental consent | keep: fewer clicks |
| F06 triage | Reads and summarises | Same, with each read shown as a step row | keep |
| F07 send | Write access reported by third parties only | Every send, change or delete waits for an editable approval card | keep: safer, and the user can fix the draft |
| F09 any app | Fixed connector list plus custom connectors | Presets plus any MCP URL; Zapier covers the long tail | keep |
| F10 tasks | Scheduled prompts with notification or email | Scheduled, local-time, emailed; read-only unless "can act" | keep |
| F10 trigger | Reported: email-matching triggers on the paid tier | Schedules only | build next (M) |

## Verdict

**Shippable for personal use**, once the hand checklist passes with real accounts: all must-haves are built, the score is 80+, and there are no open S1 or S2 bugs. Not yet "better than the original" by evidence, because the review research could not be done from this session (see `feedback.md`).

## Top five to build next

1. Run the hand checklist with real Google and Gemini (S)
2. Email-triggered tasks: "when an email from my bank arrives…" (M)
3. Keep a partly streamed reply after a reload (B4) (S)
4. Workspaces: saved instructions and files per project (M)
5. Export and import of chats (S)
