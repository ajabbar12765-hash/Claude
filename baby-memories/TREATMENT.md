# Why can't you remember being a baby? — Treatment

Style: **Whiteboard Explainer** (library `whiteboard`), with one addition the brief asks for: the host, a cartoon
**magnet-sticker** of the creator (curly dark hair, warm brown skin, plain grey tee, no logos). He is a prop on the
board, like every magnet in the style: he slides, drops, lifts and talks (mouth swap). No hands draw anything; markers float.
Length ≈ 4.5–5 min, 1920×1080, 24 fps. English voice (ElevenLabs, "Clamon"), burned subtitles + `.srt`.

## Three candidate structures

1. **The detective board** — three "suspects" pinned on the board like a case file, the host as detective; ends with the
   case closed. Clear, but the twist (memories may still exist) fights the "case closed" shape.
2. **A timeline of one life** — one long line from birth (left) to age 10 (right), ridden by the camera; every idea hangs
   off the age where it happens (kick test at 3 months, mirror at 18 months, the big forgetting at 7). Distance on the
   board = time in a life.
3. **The missing pages** — the board opens as a "notebook of your life" with the first 1,000 days blank; each section
   tries to fill a page and fails, until the twist shows the pages are locked, not torn.

**Chosen: 2 + the detective's suspects hung off the timeline.** The timeline gives the camera a real route (ride left
to right), turns the twist ("the forgetting happens at 7, not at 1") into a camera move — a whip *forward* along the
line — and lets the ending be a full-board pull-back where the whole life is one picture.

## Logline and arc

A kid asks the camera for their first memory, then hunts down where the first thousand days went — and finds they
weren't deleted, just locked.

- Setup (0:00–0:50): the question; a huge "?" ; the blank 1,000 days on the timeline; title written on the board.
- Turn 1 (0:50–2:40): babies DO remember (kick + ribbon mobile); three suspects: construction-site hippocampus,
  no words, no "me".
- Turn 2 (2:40–3:50): the forgetting happens at ~7 (Bauer), and the memories may still be there (mice + light, Yale scans).
- Ending (3:50–end): your first memory may be fake; recap circled; full-board pull-back; comments CTA.

## Benchmark — learn / don't learn

- Learn: one sentence = one drawing (minutephysics grammar); a single board travelled by camera (RSA grammar).
- Don't learn: their drawings, hands, characters, music. Our host is our own magnet-sticker character.

## Board layout (8000 × 4500 board units)

Timeline runs along y≈2600 from x 600 (birth) to x 7400 (age 10). Regions above/below:

| Region | Where | Content |
|---|---|---|
| A Hook | centre, big "?" | question mark that shrinks into the "birth" dot |
| B Blank days | x 600–2100 | dashed "1,000 days" bracket, "???" |
| C Title | top band | "Why can't you remember being a baby?" |
| D Kick test | above x 900–1500 | crib, mobile, ribbon to ankle, "1 week later → still kicks!" |
| E Suspects | below the line, three cards | #1 hippocampus + notebook pages, #2 file with "???" label, #3 mirror at 18 months |
| F Age 7 | x 4400–5600 | Bauer bar chart: 3y → 5–7y most, 8–9y ≈ 1/3; eraser wipes |
| G Locked | x 5800–7300 | mouse + light beam; brain with padlock; "Yale 2025: ~1 year" |
| H Fake | top right | photo frame + speech bubbles stitched → "memory" ; "≈ 40 %" |
| I End | full board | recap circled, CTA written |

## Shot list (camera moves over one board; no cuts)

| # | Section | Framing / move | Why |
|---|---|---|---|
| 1 | Hook | close on host magnet dropping in, then pull back to the huge "?" | the host addresses the viewer first; pull-back = "this is bigger than you think" |
| 2 | Blank days | track along timeline birth → age 3 as the dashed bracket draws | time = distance |
| 3 | Title | crane up to title band, hold | read now |
| 4 | Kick test | push in on crib drawing; hold as ribbon + mobile draw | the experiment is the evidence |
| 5 | Name | whip down to the suspects row, wide | a new idea after a pause |
| 6–8 | Suspects 1–3 | medium on each card, slide right between cards; host magnet slides along | a list that turns |
| 9 | Age 7 | whip forward along the timeline to age 7 | the twist IS moving forward in time |
| 10 | Locked | track right; slow push into the padlock | this is the point |
| 11 | Fake | whip up to photo frame | a "but" |
| 12 | End | return to suspects (callback), then pull back past the board edge to the wall | the whole lesson as one picture |

## Beat sheet

Locked to the measured voice: each section starts 0.6 s after the previous section's audio ends (1.2 s before the twist
and the ending for a breath). Writing finishes on the spoken word; times live in `timeline.js`, generated from the
word timestamps (`words.json`).

## Cue map / score

Clockwork minimalism, synthesised (marimba-like FM pluck, pizzicato, woodblock, glockenspiel), 96 bpm, 4/4.
- Hook: woodblock tick alone (the "clock" of a life).
- Title: marimba figure enters.
- Kick test: + pizzicato; glock "ping" on "still remembered".
- Suspects: one instrument added per suspect.
- Age 7: full stop into silence before "It happens around age seven", then a low hit.
- Locked: two copies of the marimba figure phasing; they snap into unison on "The memory was still there."
- Fake: figure reversed/squeezed under "stitched together".
- End: full ensemble, resolve on the CTA, then marker cap click.

## Sound design

| Section | Bed | Foley | Music |
|---|---|---|---|
| all | low room tone | every stroke: felt hiss + nib tick, squeak on long strokes; magnet clicks | under voice, ducked |
| Hook | room tone + wall-clock tick | magnet drop clack | woodblock |
| Age 7 | — | eraser rub | stop → hit |
| End | room | cap click | resolve |

## Titles and subtitles

Board text: single-line handwriting written stroke by stroke (title ~150 px cap height, labels 40–70 px).
Ink: black `#23262c` (things), blue `#2a5cb3` (process, time, measurement), orange `#d97757` (the one thing that
matters per region). Subtitles: off-white rounded label, Architects Daughter ~44 px, orange dash, ≤ 44 chars/line,
bottom 12 % kept clear.
