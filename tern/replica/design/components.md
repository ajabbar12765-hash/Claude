# Components

All colours come from the role tokens in `tokens.json` (dark) and `tokens.light.json`, exposed as CSS custom properties in `styles.css`. Icons are Lucide at 16–18px, stroke 1.5. Motion uses one curve, `--ease`.

## Composer
- Variants: default, image mode (placeholder "Describe an image")
- States: empty (send disabled), typing, with attachments, busy (send becomes stop), focus (border brightens)
- Tokens: surface, border-input/line-strong, radius xl (20)
- A11y: labelled textarea; Enter sends, Shift+Enter adds a line; the stop button is labelled "Stop"

## Toggle chip (Search, Think, Image)
- States: off, on (`aria-pressed=true`, accent hairline and icon), hover, focus-visible
- On phones only the icon shows; the title attribute carries the meaning

## Message
- User: raised bubble aligned right, with images above. States: default, editing (textarea with Cancel and Send)
- Assistant: plain text on the page. States: streaming (accent dot cursor), done (actions row), error (danger hairline row with a retry), stopped
- Actions: copy, regenerate, read aloud, download (images), meta label in mono

## Thinking panel
- States: live (open, breathing accent dot), done ("Thought for Ns", closed unless the user opened it)

## Tool step row (new)
- One row per app action: app name, a plain-language verb ("Searched Gmail for unread"), and a status on the right
- States: running (live dot), done (muted dot), failed (danger text), denied
- Collapsible details show the arguments and a short result
- A11y: a list with `aria-live=polite` on the running row

## Confirm card (new)
- For every write: shows exactly what will happen (an email preview with To, Subject and Body; an event with time and attendees; a generic tool with its arguments)
- Buttons: primary "Approve", ghost "Cancel"
- States: pending, approving (button busy), approved (collapses to a step row), cancelled
- Keyboard: focus moves to Approve; Esc cancels

## App row (new, Apps panel)
- Built-in (Gmail, Calendar, Drive) or custom (MCP)
- States: disconnected (Connect button), connecting, connected (account, tool count, Disconnect), needs sign-in, error (message and Retry)

## Task row (new, Tasks panel)
- Title, schedule in words ("Weekdays at 07:00, Europe/London"), next run in mono, enabled switch
- States: active, paused, last run failed (danger dot), unread result (accent dot)
- Actions: run now, edit, delete, history

## Modal / panel
- Settings, Apps and Tasks share the dialog shell: surface, line-strong hairline, radius 18, backdrop scrim
- Apps and Tasks open as wider panels (max 640px) with a scrollable body

## Toast
- Primary fill with on-primary text, bottom centre, about 2s
