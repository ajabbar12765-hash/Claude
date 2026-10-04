import { $, esc, toast, confirmDialog } from '../util.js';
import { state, save } from '../store.js';
import { outlineEditor, readOutline, bindOutline } from './new-course.js';

export function editCourseView({ view, course, go, refreshChrome }) {
  const units = structuredClone(course.units);

  const paint = () => {
    view.innerHTML = `
      <div class="page-head"><div><p class="kicker">Edit course</p><h1 class="page-title">${esc(course.title)}</h1>
        <p>Rename or reorganise topics. Removing a topic keeps its history but hides it from the map.</p></div></div>
      <div class="cols">
        <div>${outlineEditor(units)}</div>
        <form class="stack" id="meta">
          <div class="field"><label for="t">Course name</label><input class="input" id="t" value="${esc(course.title)}"></div>
          <div class="field"><label for="l">Level</label><input class="input" id="l" value="${esc(course.level)}"></div>
          <div class="field"><label for="b">Textbooks (one per line)</label><textarea class="input" id="b" style="min-height:90px">${esc(course.books.join('\n'))}</textarea></div>
          <div class="field"><label for="d">Exam date</label><input class="input" type="date" id="d" value="${esc(course.examDate)}"></div>
          <div class="field"><label for="f">Exam format</label><input class="input" id="f" value="${esc(course.examFormat)}"></div>
          <div class="field"><label for="s">What you find hard</label><textarea class="input" id="s" style="min-height:80px">${esc(course.struggles)}</textarea></div>
          <button class="btn btn-primary btn-block" type="submit">Save changes</button>
          <a class="btn btn-secondary btn-block" href="#/c/${course.id}">Cancel</a>
          <hr class="hr" style="margin:12px 0">
          <button class="btn btn-ghost" type="button" id="del">Delete this course</button>
        </form>
      </div>`;
    bindOutline(view, units, paint);

    $('#meta').onsubmit = (e) => {
      e.preventDefault();
      readOutline(view, units);
      const clean = units.filter((u) => u.topics.length);
      if (!clean.length) { toast('A course needs at least one topic.'); return; }
      Object.assign(course, {
        title: $('#t').value.trim() || course.title,
        level: $('#l').value.trim(),
        books: $('#b').value.split('\n').map((x) => x.trim()).filter(Boolean),
        examDate: $('#d').value,
        examFormat: $('#f').value.trim(),
        struggles: $('#s').value.trim(),
        units: clean,
      });
      save(true);
      toast('Saved.');
      go(`#/c/${course.id}`);
    };
    $('#del').onclick = async () => {
      if (!(await confirmDialog('Delete this course?', `“${course.title}” and all its lessons, exams and flashcards will be deleted from this browser. This can’t be undone.`))) return;
      state.courses = state.courses.filter((c) => c.id !== course.id);
      save(true);
      toast('Course deleted.');
      go('#/');
    };
  };
  paint();
  refreshChrome();
}
