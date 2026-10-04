# Recall — a study desk for students

Paste a syllabus and the names of your textbooks. Recall maps every topic, teaches each one, writes practice exams, marks them (including written answers), and aims everything at the topics you're struggling with.

- `index.html` + `landing.js` — the landing page, with the scroll-driven book opening.
- `app.html` + `js/` — the study app (course map, lessons, exams, flashcards, tutor, mistakes, study plan, focus timer). Data is saved in the browser (`localStorage`); Settings has backup export and import.
- `api/claude.js` + `lib/tasks.js` — the one serverless function. It runs each AI job (course map, lesson, exam, answer-key check, marking, dispute, flashcards, tutor) on `claude-opus-5-5` and streams the result back.
- `vendor/` — local copies of marked, DOMPurify and KaTeX, so Markdown and maths render without a CDN.

## Deploy on Vercel

1. Create a Vercel project from this repo and set **Root Directory** to `recall`. No build command is needed.
2. Add the environment variable `ANTHROPIC_API_KEY`.
3. Deploy. The function's `maxDuration` is 300 s (`vercel.json`), so long exams don't time out.

If there's no server key, a student can paste their own key in **Settings**. It is stored in their browser and sent only to this site's `/api/claude`.

## Run locally

```bash
cd recall
npm install
ANTHROPIC_API_KEY=sk-ant-... npm run dev   # http://localhost:3000
MOCK=1 npm run dev                         # canned AI answers for testing the interface
```

The sample course ("Cell biology — Year 10") works fully offline. Exams fall back to the saved question bank, and written answers fall back to self-marking.
