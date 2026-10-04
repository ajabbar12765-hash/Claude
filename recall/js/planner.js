// Day-by-day study plan. It is rebuilt from the current state every time it
// is shown, so it adapts as topics get read and mastery changes.
import { dateKey, daysBetween, plural } from './util.js';
import { allTopics, masteryMap, dueCards } from './store.js';

export function buildPlan(course, fallbackDays = 14) {
  const topics = allTopics(course);
  const m = masteryMap(course);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const untilExam = course.examDate ? daysBetween(today, course.examDate) : null;
  const horizon = Math.max(1, Math.min(60, untilExam != null && untilExam > 0 ? untilExam : fallbackDays));

  // Unread topics, the heaviest-weighted first within each unit order.
  const unread = topics.filter((t) => !course.read[t.id]);
  const weak = topics
    .filter((t) => m[t.id]?.n >= 1 && m[t.id].score < 0.75)
    .sort((a, b) => m[a.id].score - m[b.id].score);
  const untested = topics.filter((t) => course.read[t.id] && !(m[t.id]?.n >= 1));
  const drillQueue = [...weak, ...untested];

  const learnDays = Math.max(1, Math.ceil(horizon * 0.7));
  const perDay = Math.ceil(unread.length / learnDays) || 0;
  const minutes = course.dailyMinutes || 45;
  const due = dueCards(course).length;

  const days = [];
  let li = 0;
  for (let i = 0; i < horizon; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const key = dateKey(d);
    const tasks = [];
    const isLast = untilExam != null && i === horizon - 1;

    tasks.push({ id: `cards:${key}`, kind: 'cards', label: i === 0 && due ? `Review ${plural(due, 'due flashcard')}` : 'Review due flashcards', href: `#/c/${course.id}/cards`, min: 10 });

    if (isLast) {
      tasks.push({ id: `mock:${key}`, kind: 'exam', label: 'Full mock exam — whole syllabus, timed', href: `#/c/${course.id}/exams?preset=mock`, min: 60 });
    } else {
      for (let k = 0; k < perDay && li < unread.length; k++, li++) {
        const t = unread[li];
        tasks.push({ id: `learn:${t.id}`, kind: 'learn', label: `Learn: ${t.title}`, href: `#/c/${course.id}/learn/${t.id}`, min: 25, topicId: t.id });
      }
      if (drillQueue.length) {
        const t = drillQueue[i % drillQueue.length];
        tasks.push({ id: `drill:${t.id}:${key}`, kind: 'drill', label: `${m[t.id]?.n >= 1 ? 'Drill your weak spot' : 'Test yourself'}: ${t.title}`, href: `#/c/${course.id}/exams?topic=${t.id}`, min: 15 });
      }
      if (i % 4 === 3 || (i === 0 && !course.history.length)) {
        tasks.push({ id: `exam:${key}`, kind: 'exam', label: i === 0 ? 'Diagnostic exam — find your weak spots' : 'Adaptive practice exam (20 questions)', href: `#/c/${course.id}/exams?preset=${i === 0 ? 'diagnostic' : 'adaptive'}`, min: 30 });
      }
    }
    days.push({ date: d, key, tasks, total: tasks.reduce((s, t) => s + t.min, 0), budget: minutes });
  }
  return { days, untilExam, horizon };
}

export function isDone(course, task) {
  if (task.kind === 'learn') return !!course.read[task.topicId];
  return !!course.planDone[task.id];
}
