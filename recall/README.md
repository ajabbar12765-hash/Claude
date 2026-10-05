# Recall — a study desk for students

Paste a syllabus and the names of your textbooks. Recall maps every topic, teaches each one, writes practice exams, marks them (including written answers), and aims everything at the topics you're struggling with.

- `index.html` + `landing.js` — the landing page, with the scroll-driven book opening.
- `app.html` + `js/` — the study app (course map, lessons, exams, flashcards, tutor, mistakes, study plan, focus timer). Data is saved in the browser (`localStorage`); Settings has backup export and import.
- `api/ai.js` + `lib/tasks.js` + `lib/providers.js` — the one serverless function. It runs each AI job (course map, lesson, exam, answer-key check, marking, dispute, flashcards, tutor) on Gemini or Claude and streams the result back.
- `vendor/` — local copies of marked, DOMPurify and KaTeX, so Markdown and maths render without a CDN.

## Deploy on Vercel

1. Create a Vercel project from this repo and set **Root Directory** to `recall`. No build command is needed.
2. Add the environment variable `GEMINI_API_KEY` (or `ANTHROPIC_API_KEY` for Claude). Optionally set `GEMINI_MODEL` (default `gemini-2.5-pro`).
3. Deploy. The function's `maxDuration` is 300 s (`vercel.json`), so long exams don't time out.

If there's no server key, a student can paste their own key in **Settings**. It is stored in their browser and sent only to this site's `/api/ai`. Keys starting `AIza` use Gemini, keys starting `sk-` use Claude.

## Run locally

```bash
cd recall
npm install
GEMINI_API_KEY=AIza... npm run dev        # http://localhost:3000
MOCK=1 npm run dev                         # canned AI answers for testing the interface
```

The sample course ("Cell biology — Year 10") works fully offline. Exams fall back to the saved question bank, and written answers fall back to self-marking.
