import { $, $$, esc, uid, toast } from '../util.js';
import { state, save, newCourse } from '../store.js';
import { run, explainError } from '../ai.js';
import { working, setWorking, errorNotice } from '../ui.js';

const LEVELS = ['Middle school', 'High school', 'University', 'Professional / other'];

// Shared with the edit view: editable outline of units and topics.
export function outlineEditor(units) {
  return `<div id="outline" class="stack">
    ${units.map((u, ui) => `
      <div class="panel panel-pad" data-unit="${ui}">
        <div class="topic-edit" style="margin-bottom:10px">
          <input class="input" data-unit-title value="${esc(u.title)}" aria-label="Unit ${ui + 1} title" style="font-weight:700">
          <button class="icon-btn" data-del-unit="${ui}" title="Remove unit" aria-label="Remove unit">×</button>
        </div>
        ${u.topics.map((t, ti) => `
          <div class="topic-edit" data-topic="${ti}">
            <input class="input" data-topic-title value="${esc(t.title)}" aria-label="Topic title">
            <button class="icon-btn" data-del-topic="${ui}:${ti}" title="Remove topic" aria-label="Remove topic">×</button>
          </div>`).join('')}
        <button class="btn btn-ghost btn-sm" data-add-topic="${ui}" style="margin-top:8px">+ Add topic</button>
      </div>`).join('')}
    <button class="btn btn-secondary btn-sm" id="add-unit">+ Add unit</button>
  </div>`;
}

// Reads edited titles back into the units array (in place).
export function readOutline(root, units) {
  $$('[data-unit]', root).forEach((el) => {
    const u = units[+el.dataset.unit];
    u.title = $('[data-unit-title]', el).value.trim() || u.title;
    $$('[data-topic]', el).forEach((tEl) => {
      const t = u.topics[+tEl.dataset.topic];
      t.title = $('[data-topic-title]', tEl).value.trim() || t.title;
    });
  });
}

export function bindOutline(root, units, rerender) {
  root.querySelectorAll('[data-del-unit]').forEach((b) => b.onclick = () => { readOutline(root, units); units.splice(+b.dataset.delUnit, 1); rerender(); });
  root.querySelectorAll('[data-del-topic]').forEach((b) => b.onclick = () => {
    readOutline(root, units);
    const [ui, ti] = b.dataset.delTopic.split(':').map(Number);
    units[ui].topics.splice(ti, 1);
    rerender();
  });
  root.querySelectorAll('[data-add-topic]').forEach((b) => b.onclick = () => {
    readOutline(root, units);
    units[+b.dataset.addTopic].topics.push({ id: uid('t'), title: 'New topic', summary: '', objectives: [], weight: 2 });
    rerender();
    const inputs = $$(`[data-unit="${b.dataset.addTopic}"] [data-topic-title]`, root);
    inputs.at(-1)?.select();
  });
  const add = $('#add-unit', root);
  if (add) add.onclick = () => { readOutline(root, units); units.push({ id: uid('u'), title: `Unit ${units.length + 1}`, topics: [] }); rerender(); };
}

// Offline fallback: turn syllabus lines into units/topics without AI.
export function outlineFromText(text) {
  const units = [];
  let cur = null;
  const isHeading = (l) => /^(unit|module|chapter|week|part|section|topic area|term)\b/i.test(l) || /:$/.test(l) || /^[A-Z][A-Z\s&,-]{4,}$/.test(l);
  for (let raw of text.split(/\r?\n/)) {
    let l = raw.replace(/^[\s\-*•·\d.)]+/, '').trim();
    if (!l || l.length < 3) continue;
    if (isHeading(raw.trim())) {
      const [head, rest] = l.split(/:\s*/, 2);
      cur = { id: uid('u'), title: head.replace(/:$/, '').slice(0, 80), topics: [] };
      units.push(cur);
      if (rest) rest.split(/[;,]\s*/).filter((x) => x.length > 2).forEach((x) => cur.topics.push(mkTopic(x)));
      continue;
    }
    if (!cur) { cur = { id: uid('u'), title: 'Unit 1', topics: [] }; units.push(cur); }
    l.split(/;\s*/).filter((x) => x.length > 2).forEach((x) => cur.topics.push(mkTopic(x)));
  }
  return units.filter((u) => u.topics.length);
}
const mkTopic = (title) => ({ id: uid('t'), title: title.replace(/\.$/, '').slice(0, 100), summary: '', objectives: [], weight: 2 });

export function newCourseView({ view, onLeave, go }) {
  const draft = { title: '', level: 'High school', syllabus: '', books: ['', ''], examDate: '', examFormat: '', struggles: '', pdf: null, pdfName: '' };
  let ctrl;
  onLeave(() => ctrl?.abort());

  const form = () => {
    view.innerHTML = `
      <div class="page-head"><div><p class="kicker">New course</p><h1 class="page-title">Paste your syllabus.</h1>
        <p>Recall reads it, maps every unit and topic, and builds your lessons and exams from it. The more detail you give, the more accurate it gets.</p></div></div>
      <form id="nc" class="cols" novalidate>
        <div class="stack-lg">
          <div class="field"><label for="title">Course name</label>
            <input class="input" id="title" name="title" placeholder="e.g. AP Chemistry, Psych 101, GCSE History" value="${esc(draft.title)}" autocomplete="off"></div>
          <div class="field"><span class="label">Level</span>
            <div class="seg" role="radiogroup" aria-label="Level">${LEVELS.map((l) => `<label class="seg-opt"><input type="radio" name="level" value="${l}" ${draft.level === l ? 'checked' : ''}>${l}</label>`).join('')}</div></div>
          <div class="field"><label for="syllabus">Syllabus</label>
            <textarea class="input" id="syllabus" name="syllabus" style="min-height:260px" placeholder="Paste the course outline, list of topics, learning outcomes or exam specification…">${esc(draft.syllabus)}</textarea>
            <div class="dropzone" id="drop">
              <span>…or attach the syllabus as a <b>PDF</b> or <b>.txt</b> file.</span>
              <label class="btn btn-secondary btn-sm" style="cursor:pointer">Choose file<input type="file" id="file" accept=".pdf,.txt,.md,text/plain,application/pdf" hidden></label>
              <span id="file-name" class="muted">${esc(draft.pdfName)}</span>
            </div>
          </div>
          <div class="field"><span class="label">Your textbooks</span>
            <div id="books" class="stack" style="--gap:6px">${draft.books.map((b, i) => `<input class="input" data-book="${i}" value="${esc(b)}" placeholder="${i === 0 ? 'e.g. Campbell Biology, 12th edition' : 'Another book (optional)'}">`).join('')}</div>
            <button type="button" class="btn btn-ghost btn-sm" id="add-book" style="align-self:flex-start">+ Add another book</button>
          </div>
        </div>
        <div class="stack-lg">
          <div class="panel panel-pad stack">
            <h3 style="font-size:20px;margin:0">Make it yours</h3>
            <p class="hint" style="margin:0">Optional, but it helps Recall cater to you.</p>
            <div class="field"><label for="examDate">Exam date</label><input class="input" type="date" id="examDate" value="${esc(draft.examDate)}"></div>
            <div class="field"><label for="examFormat">Exam format</label><input class="input" id="examFormat" value="${esc(draft.examFormat)}" placeholder="e.g. 2 hours, MCQ + essays"></div>
            <div class="field"><label for="struggles">What do you find hard?</label><textarea class="input" id="struggles" style="min-height:90px" placeholder="e.g. anything with equations, remembering dates">${esc(draft.struggles)}</textarea></div>
          </div>
          <div id="err"></div>
          <button class="btn btn-primary btn-block" type="submit">Build my course <span class="arrow">→</span></button>
          <button class="btn btn-secondary btn-block" type="button" id="manual">Build it without AI (from the text)</button>
        </div>
      </form>`;

    const f = $('#nc');
    const read = () => {
      draft.title = $('#title').value.trim();
      draft.level = f.level.value;
      draft.syllabus = $('#syllabus').value.trim();
      draft.books = $$('[data-book]').map((i) => i.value.trim());
      draft.examDate = $('#examDate').value;
      draft.examFormat = $('#examFormat').value.trim();
      draft.struggles = $('#struggles').value.trim();
    };
    $('#add-book').onclick = () => {
      read();
      draft.books.push('');
      const inp = document.createElement('input');
      inp.className = 'input'; inp.dataset.book = draft.books.length - 1; inp.placeholder = 'Another book (optional)';
      $('#books').append(inp); inp.focus();
    };

    const takeFile = async (file) => {
      if (!file) return;
      if (file.size > 3_000_000) { toast('That file is over 3 MB. Paste the text instead.'); return; }
      if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
        const buf = new Uint8Array(await file.arrayBuffer());
        let bin = '';
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        draft.pdf = btoa(bin);
        draft.pdfName = file.name;
        $('#file-name').textContent = `Attached: ${file.name}`;
      } else {
        $('#syllabus').value = (await file.text()).slice(0, 60000);
        draft.pdf = null; draft.pdfName = '';
        $('#file-name').textContent = `Loaded text from ${file.name}`;
      }
    };
    $('#file').onchange = (e) => takeFile(e.target.files[0]);
    const drop = $('#drop');
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('drag'); };
    drop.ondragleave = () => drop.classList.remove('drag');
    drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('drag'); takeFile(e.dataTransfer.files[0]); };

    const valid = () => {
      if (!draft.syllabus && !draft.pdf) { $('#err').innerHTML = `<div class="notice" role="alert">Paste your syllabus (or attach it) first.</div>`; $('#syllabus').focus(); return false; }
      return true;
    };
    f.onsubmit = (e) => { e.preventDefault(); read(); if (valid()) generate(); };
    $('#manual').onclick = () => {
      read();
      if (!draft.syllabus) { $('#err').innerHTML = `<div class="notice" role="alert">Paste the syllabus text first — building without AI needs the text, not a PDF.</div>`; return; }
      const units = outlineFromText(draft.syllabus);
      if (!units.length) { $('#err').innerHTML = `<div class="notice" role="alert">Couldn’t find any topics in that text. Put one topic per line.</div>`; return; }
      review({ title: draft.title || 'My course', subject: '', level: draft.level, summary: '', units });
    };
  };

  const generate = async () => {
    ctrl = new AbortController();
    view.innerHTML = `<div class="page-head"><div><p class="kicker">New course</p><h1 class="page-title">${esc(draft.title || 'Building your course')}</h1></div></div>
      ${working('Reading your syllabus', 'The AI is mapping every unit and topic. This usually takes 20–60 seconds.')}
      <div class="btn-row" style="margin-top:16px"><button class="btn btn-secondary" id="cancel">Cancel</button></div>`;
    $('#cancel').onclick = () => { ctrl.abort(); form(); };
    const w = $('#work');
    try {
      const books = draft.books.filter(Boolean);
      const data = await run('course', {
        title: draft.title, level: draft.level, syllabus: draft.syllabus, pdf: draft.pdf, books,
        examFormat: draft.examFormat, struggles: draft.struggles,
      }, {
        signal: ctrl.signal,
        onStatus: (m) => setWorking(w, { title: m }),
        onProgress: (n) => setWorking(w, { sub: `${n} topics mapped so far…` }),
      });
      const units = (data.units || []).map((u) => ({
        id: uid('u'), title: u.title,
        topics: (u.topics || []).map((t) => ({ id: uid('t'), title: t.title, summary: t.summary, objectives: t.objectives || [], weight: Math.min(3, Math.max(1, t.weight || 2)) })),
      })).filter((u) => u.topics.length);
      if (!units.length) throw Object.assign(new Error('No topics were found in that syllabus.'), { code: 'empty' });
      review({ title: draft.title || data.title, subject: data.subject, level: data.level || draft.level, summary: data.summary, units });
    } catch (err) {
      if (err.name === 'AbortError') return;
      form();
      const e = explainError(err);
      $('#err').innerHTML = errorNotice(err, 'retry') + (e.offline || e.needsKey ? `<p class="hint" style="margin-top:8px">You can still use “Build it without AI”, then add your key later for lessons and exams.</p>` : '');
      $('#retry')?.addEventListener('click', () => generate());
    }
  };

  const review = (data) => {
    const units = data.units;
    const paint = () => {
      const n = units.reduce((s, u) => s + u.topics.length, 0);
      view.innerHTML = `
        <div class="page-head"><div><p class="kicker">Check your course map</p><h1 class="page-title">${esc(data.title)}</h1>
          <p>${esc(data.summary || '')} ${units.length} units, ${n} topics. Rename, remove or add anything that’s off — then save.</p></div></div>
        <div class="cols">
          <div>${outlineEditor(units)}</div>
          <div class="stack">
            <div class="field"><label for="ctitle">Course name</label><input class="input" id="ctitle" value="${esc(data.title)}"></div>
            <button class="btn btn-primary btn-block" id="save">Save course <span class="arrow">→</span></button>
            <button class="btn btn-secondary btn-block" id="back">Back to the syllabus</button>
          </div>
        </div>`;
      bindOutline(view, units, paint);
      $('#back').onclick = form;
      $('#save').onclick = () => {
        readOutline(view, units);
        const clean = units.filter((u) => u.topics.length);
        if (!clean.length) { toast('Add at least one topic.'); return; }
        const c = newCourse({
          title: $('#ctitle').value.trim() || data.title || 'My course',
          subject: data.subject || '', level: data.level || draft.level, summary: data.summary || '',
          syllabus: draft.syllabus, books: draft.books.filter(Boolean), examDate: draft.examDate,
          examFormat: draft.examFormat, struggles: draft.struggles, units: clean,
        });
        state.courses.unshift(c);
        save(true);
        toast('Course saved. Start with any topic — or take a diagnostic exam to find your weak spots.', 5000);
        go(`#/c/${c.id}`);
      };
    };
    paint();
  };

  form();
}
