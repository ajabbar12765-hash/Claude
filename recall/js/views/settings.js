import { $, esc, toast, download, confirmDialog, dateKey } from '../util.js';
import { state, save, replaceState, resetState } from '../store.js';
import { run, explainError } from '../ai.js';
import { demoCourse } from '../demo.js';

export function settingsView({ view }) {
  const s = state.settings;
  const hasDemo = state.courses.some((c) => c.id === 'demo');
  view.innerHTML = `
    <div class="page-head"><div><p class="kicker">Settings</p><h1 class="page-title">Settings.</h1></div></div>
    <div class="cols">
      <div class="stack-lg">
        <section class="panel panel-pad stack">
          <h2 style="font-size:22px;margin:0">AI key</h2>
          <p style="margin:0">Lessons, exams, marking and the tutor are written by AI (Gemini or Claude). If whoever deployed Recall set up a server key, you don’t need to do anything. Otherwise, paste your own key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a> (Gemini) or the <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener">Claude Console</a>.</p>
          <div class="field"><label for="key">Your API key (optional)</label>
            <input class="input" id="key" type="password" autocomplete="off" spellcheck="false" placeholder="AIza… (Gemini) or sk-ant-… (Claude)" value="${esc(s.apiKey)}">
            <span class="hint">Stored only in this browser and sent only to this site’s server, which passes it to the AI provider for your requests.</span></div>
          <div class="btn-row"><button class="btn btn-primary" id="save-key">Save key</button><button class="btn btn-secondary" id="test">Test connection</button><span id="test-out" class="hint"></span></div>
          <label class="check"><input type="checkbox" id="verify" ${s.verify ? 'checked' : ''}>Double-check every exam’s answer key with an independent second pass (slower, more accurate)</label>
          <label class="check"><input type="checkbox" id="autocards" ${s.autoCards ? 'checked' : ''}>Turn exam mistakes into flashcards automatically</label>
        </section>
        <section class="panel panel-pad stack">
          <h2 style="font-size:22px;margin:0">Focus timer</h2>
          <div class="row">
            <div class="field"><label for="fm">Focus minutes</label><input class="input" type="number" id="fm" min="5" max="120" value="${s.focusMin}" style="width:120px"></div>
            <div class="field"><label for="bm">Break minutes</label><input class="input" type="number" id="bm" min="1" max="60" value="${s.breakMin}" style="width:120px"></div>
          </div>
          <p class="hint" style="margin:0">Click the timer in the header to start or pause; right-click it to reset.</p>
        </section>
      </div>
      <aside class="stack-lg">
        <section class="panel panel-pad stack">
          <h2 style="font-size:22px;margin:0">Your data</h2>
          <p style="margin:0;font-size:15px">Everything lives in this browser. Export a backup to move it to another device.</p>
          <button class="btn btn-secondary btn-block" id="export">Export backup (.json)</button>
          <label class="btn btn-secondary btn-block" style="cursor:pointer">Import backup<input type="file" id="import" accept=".json,application/json" hidden></label>
          ${hasDemo ? '' : '<button class="btn btn-ghost btn-block" id="demo">Bring back the sample course</button>'}
          <button class="btn btn-ghost btn-block" id="reset">Erase everything</button>
        </section>
      </aside>
    </div>`;

  const persist = () => {
    s.verify = $('#verify').checked;
    s.autoCards = $('#autocards').checked;
    s.focusMin = Math.max(5, Math.min(120, +$('#fm').value || 25));
    s.breakMin = Math.max(1, Math.min(60, +$('#bm').value || 5));
    if (!state.timer.running) state.timer.remaining = (state.timer.mode === 'focus' ? s.focusMin : s.breakMin) * 60;
    save();
  };
  ['verify', 'autocards', 'fm', 'bm'].forEach((id) => $('#' + id).addEventListener('change', () => { persist(); toast('Saved.'); }));

  $('#save-key').onclick = () => {
    const k = $('#key').value.trim();
    if (k && !/^(AIza|sk-)/.test(k)) { toast('That doesn’t look like an API key — Gemini keys start with “AIza”, Claude keys with “sk-”.'); return; }
    s.apiKey = k;
    save(true);
    toast(k ? 'Key saved in this browser.' : 'Key removed.');
  };
  $('#test').onclick = async () => {
    const out = $('#test-out');
    s.apiKey = $('#key').value.trim();
    save();
    out.textContent = 'Testing…';
    try {
      await run('tutor', { course: { title: 'Connection test' }, history: [{ role: 'user', content: 'Reply with just the word OK.' }] });
      out.textContent = 'Connected ✓ — the AI is ready.';
    } catch (err) {
      out.textContent = explainError(err)?.msg || 'Failed.';
    }
  };
  $('#export').onclick = () => download(`recall-backup-${dateKey()}.json`, JSON.stringify({ ...state, settings: { ...state.settings, apiKey: '' } }, null, 1));
  $('#import').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data?.v !== 1 || !Array.isArray(data.courses)) throw new Error('bad');
      if (!(await confirmDialog('Replace your data?', `This replaces everything in this browser with the backup (${data.courses.length} courses).`, 'Import'))) return;
      replaceState({ ...data, settings: { ...data.settings, apiKey: state.settings.apiKey } });
      toast('Backup imported.');
      location.hash = '#/';
    } catch {
      toast('That file isn’t a Recall backup.');
    }
  };
  $('#demo')?.addEventListener('click', () => { state.courses.push(demoCourse()); save(true); toast('Sample course added.'); location.hash = '#/c/demo'; });
  $('#reset').onclick = async () => {
    if (!(await confirmDialog('Erase everything?', 'All courses, lessons, exams, flashcards and settings in this browser will be deleted. Export a backup first if you might want them.', 'Erase'))) return;
    resetState();
    toast('Everything erased.');
    location.hash = '#/';
  };
}
