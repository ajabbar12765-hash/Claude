/* Daily Vocab — app logic. Pure vanilla JS, state in localStorage. */
(function () {
  "use strict";

  var WORDS = window.WORDS || [];
  var STORE_KEY = "dailyVocab.v1";

  /* ---------- date helpers (local time) ---------- */
  function todayKey(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function dayNumber(d) {
    // whole days since epoch in local time
    d = d || new Date();
    var local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.floor(local.getTime() / 86400000);
  }
  function prettyDate(key) {
    var p = key.split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  }

  /* ---------- state ---------- */
  var state = load();
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && typeof s === "object") {
        s.history = s.history || [];
        s.goals = s.goals || [];
        s.notify = s.notify || { enabled: false };
        return s;
      }
    } catch (e) {}
    return { history: [], goals: [], notify: { enabled: false } };
  }
  function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

  /* ---------- word of the day ---------- */
  function wordIndexFor(date) {
    if (WORDS.length === 0) return 0;
    return dayNumber(date) % WORDS.length;
  }
  function wordOfDay() { return WORDS[wordIndexFor(new Date())]; }

  function recordSeen() {
    var idx = wordIndexFor(new Date());
    var key = todayKey();
    var exists = state.history.some(function (h) { return h.date === key; });
    if (!exists) {
      state.history.push({ date: key, index: idx, word: WORDS[idx].word });
      save();
    }
  }

  /* ---------- rendering: TODAY ---------- */
  function explainHTML(w) {
    if (!w.simple) return "";
    return '<button class="explain-btn" data-explain type="button">🧩 Explain simply</button>' +
           '<div class="simple-box" hidden><span class="sb-label">In plain words</span>' + esc(w.simple) + '</div>';
  }
  function synHTML(w) {
    return '<div class="meta-row">' +
      w.synonyms.map(function (s) { return '<span class="syn">' + esc(s) + '</span>'; }).join("") +
      '</div>';
  }

  // Static stacked layout — used in the history detail modal.
  function cardHTML(w) {
    return (
      '<div class="wc-top">' +
        '<span class="word">' + esc(w.word) + '</span>' +
        '<span class="pos-badge">' + esc(w.pos) + '</span>' +
      '</div>' +
      '<div class="ipa">' + esc(w.ipa) + '</div>' +
      '<p class="definition">' + esc(w.definition) + '</p>' +
      explainHTML(w) +
      '<p class="example">"' + esc(w.example) + '"</p>' +
      synHTML(w) +
      '<div class="tip"><span class="tip-ico">💡</span><span>' + esc(w.tip) + '</span></div>'
    );
  }

  function renderToday() {
    var w = wordOfDay();
    document.getElementById("dateLine").textContent = "Word of the day · " + prettyDate(todayKey());
    document.getElementById("wordCard").innerHTML = cardHTML(w);
    buildLetter3D((w.word[0] || "A").toUpperCase());

    renderStreak();

    // if there's an active goal for today's word, show a check-in box under it
    var box = document.getElementById("todayGoalBox");
    var goal = state.goals.filter(function (g) { return g.word === w.word && !isComplete(g); })[0];
    box.innerHTML = "";
    if (goal) box.appendChild(goalNode(goal, true));
  }

  /* ---------- 3D extruded letter hero ---------- */
  function buildLetter3D(ch) {
    var host = document.getElementById("letter3d");
    if (!host) return;
    host.innerHTML = "";
    var depth = 14;
    for (var i = depth; i >= 0; i--) {
      var s = document.createElement("span");
      s.className = "l3d-layer" + (i === 0 ? " l3d-front" : "");
      s.textContent = ch;
      s.style.transform = "translateZ(" + (-i * 2) + "px)";
      if (i > 0) {
        var t = i / depth; // 0 = near front, 1 = deepest
        var c = mixRGB([217, 164, 65], [72, 52, 16], t);
        s.style.color = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
      }
      host.appendChild(s);
    }
  }
  function mixRGB(a, b, t) {
    return [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); });
  }

  /* ---------- scattered words wallpaper ---------- */
  function buildWordBg() {
    var host = document.getElementById("wordBg");
    if (!host || !WORDS.length) return;
    var pos = [[6,8],[70,6],[40,15],[86,20],[15,26],[55,32],[81,42],[7,46],[34,54],[64,60],
               [90,66],[19,72],[47,78],[75,84],[4,88],[60,90],[29,95],[88,93],[43,40],[12,62]];
    host.innerHTML = "";
    pos.forEach(function (p, i) {
      var w = WORDS[(i * 7) % WORDS.length].word;
      var s = document.createElement("span");
      s.textContent = w;
      if (i % 3 === 0) s.className = "gold";
      s.style.left = p[0] + "vw";
      s.style.top = p[1] + "vh";
      s.style.fontSize = (14 + (i % 5) * 4) + "px";
      s.style.transform = "rotate(" + (((i * 37) % 40) - 20) + "deg)";
      s.style.animationDelay = (i % 6) + "s";
      host.appendChild(s);
    });
  }

  /* ---------- streak ---------- */
  function computeStreak() {
    if (!state.history.length) return 0;
    var days = {};
    state.history.forEach(function (h) { days[h.date] = true; });
    var streak = 0;
    var d = new Date();
    // allow the streak to count from today or yesterday (so it doesn't break before you open it)
    if (!days[todayKey(d)]) d.setDate(d.getDate() - 1);
    while (days[todayKey(d)]) { streak++; d.setDate(d.getDate() - 1); }
    return streak;
  }
  function renderStreak() {
    var el = document.getElementById("streak");
    if (!el) return;
    var s = computeStreak();
    if (s >= 2) {
      el.innerHTML = '<span class="flame">🔥</span> ' + s + '-day streak';
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }

  /* ---------- goals ---------- */
  function isComplete(g) { return g.checkins.length >= g.targetDays; }

  function createGoal(word, days) {
    var w = WORDS.filter(function (x) { return x.word === word; })[0];
    if (!w) return;
    // avoid duplicate active goal for the same word
    var existing = state.goals.filter(function (g) { return g.word === word && !isComplete(g); })[0];
    if (existing) { toast("You already have an active goal for “" + word + "”."); switchView("goals"); return; }
    state.goals.unshift({
      id: "g" + Date.now(),
      word: word,
      def: w.definition,
      targetDays: days,
      startDate: todayKey(),
      checkins: []
    });
    save();
    toast("Goal set — use “" + word + "” every day for " + days + " days!");
    renderAll();
    switchView("goals");
  }

  function checkInToday(id) {
    var g = state.goals.filter(function (x) { return x.id === id; })[0];
    if (!g) return;
    var key = todayKey();
    if (g.checkins.indexOf(key) !== -1) { toast("Already checked in today ✓"); return; }
    g.checkins.push(key);
    save();
    if (isComplete(g)) {
      toast("🎉 Goal complete! You practiced “" + g.word + "” for " + g.targetDays + " days.");
    } else {
      toast("Nice — " + g.checkins.length + " / " + g.targetDays + " days done.");
    }
    renderAll();
  }

  function deleteGoal(id) {
    state.goals = state.goals.filter(function (x) { return x.id !== id; });
    save();
    renderAll();
  }

  function goalNode(g, compact) {
    var done = isComplete(g);
    var checkedToday = g.checkins.indexOf(todayKey()) !== -1;
    var pct = Math.min(100, Math.round((g.checkins.length / g.targetDays) * 100));

    var el = document.createElement("div");
    el.className = "goal" + (done ? " done" : "");

    var dots = "";
    for (var i = 0; i < g.targetDays; i++) {
      var filled = i < g.checkins.length;
      var isTodaySlot = i === g.checkins.length && !done;
      dots += '<div class="dot' + (filled ? " filled" : "") + (isTodaySlot && checkedToday ? "" : (isTodaySlot ? " today" : "")) + '">' + (filled ? "✓" : (i + 1)) + "</div>";
    }

    var actions;
    if (done) {
      actions = '<span class="check-done">🏆 Mastered — practiced ' + g.targetDays + ' days</span>' +
                '<button class="link-btn" data-del="' + g.id + '">Remove</button>';
    } else if (checkedToday) {
      actions = '<span class="check-done">✓ Checked in today</span>' +
                '<button class="link-btn" data-del="' + g.id + '">Give up</button>';
    } else {
      actions = '<button class="btn btn-good" data-checkin="' + g.id + '">I used it today</button>' +
                '<button class="link-btn" data-del="' + g.id + '">Give up</button>';
    }

    el.innerHTML =
      '<div class="goal-top">' +
        '<div class="goal-word">' + esc(g.word) + (compact ? ' <small>your active goal</small>' : "") + '</div>' +
        '<div class="goal-status ' + (done ? "done" : "active") + '">' + (done ? "Complete" : g.checkins.length + "/" + g.targetDays + " days") + '</div>' +
      '</div>' +
      (compact ? "" : '<div class="goal-def">' + esc(g.def) + '</div>') +
      '<div class="progress"><span style="width:' + pct + '%"></span></div>' +
      '<div class="dots">' + dots + '</div>' +
      '<div class="goal-actions">' + actions + '</div>';

    return el;
  }

  function renderGoals() {
    var list = document.getElementById("goalsList");
    var active = state.goals.filter(function (g) { return !isComplete(g); });
    var done = state.goals.filter(isComplete);
    document.getElementById("goalCount").textContent =
      state.goals.length ? (active.length + " active · " + done.length + " done") : "";

    list.innerHTML = "";
    if (state.goals.length === 0) {
      list.innerHTML = '<div class="empty"><span class="big">🎯</span>No goals yet.<br>Open <b>Today</b> and tap “Set a practice goal.”</div>';
      return;
    }
    state.goals.forEach(function (g) { list.appendChild(goalNode(g, false)); });
  }

  /* ---------- history ---------- */
  function renderHistory() {
    var list = document.getElementById("historyList");
    document.getElementById("historyCount").textContent = state.history.length ? state.history.length + " words" : "";
    var items = state.history.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    list.innerHTML = "";
    if (items.length === 0) {
      list.innerHTML = '<div class="empty"><span class="big">📖</span>No words yet — check back tomorrow!</div>';
      return;
    }
    items.forEach(function (h) {
      var w = WORDS[h.index];
      if (!w) return;
      var node = document.createElement("div");
      node.className = "hist-item" + (h.date === todayKey() ? " is-today" : "");
      node.innerHTML =
        '<div><div class="hw">' + esc(w.word) + '</div><div class="hd">' + esc(w.definition) + '</div></div>' +
        '<div class="hdate">' + (h.date === todayKey() ? "Today" : shortDate(h.date)) + '</div>';
      node.addEventListener("click", function () { openDetail(w); });
      list.appendChild(node);
    });
  }
  function shortDate(key) {
    var p = key.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function renderAll() { renderToday(); renderGoals(); renderHistory(); }

  /* ---------- views / tabs ---------- */
  var TAB_ORDER = ["today", "goals", "history"];
  function switchView(name) {
    document.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("is-active", t.dataset.view === name); });
    document.querySelectorAll(".view").forEach(function (v) { v.classList.toggle("is-active", v.id === "view-" + name); });
    moveTabGlow(name);
  }
  function moveTabGlow(name) {
    var glow = document.getElementById("tabGlow");
    if (!glow) return;
    var i = TAB_ORDER.indexOf(name);
    if (i < 0) i = 0;
    glow.style.transform = "translateX(" + (i * 100) + "%)";
  }

  /* ---------- 3D tilt on the word card (combines with flip) ---------- */
  function setupTilt(el) {
    if (!el) return;
    function onMove(e) {
      if (e.pointerType === "touch") return; // don't fight taps on touch
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      applyCardTransform(-py * 6, px * 6);
    }
    function reset() { applyCardTransform(0, 0); }
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", reset);
    el.addEventListener("pointercancel", reset);
  }

  /* ---------- modals ---------- */
  var pendingGoalWord = null, chosenDays = 5;
  function openGoalModal(word) {
    pendingGoalWord = word;
    document.getElementById("goalModalWord").textContent = word;
    document.getElementById("goalModal").hidden = false;
  }
  function closeGoalModal() { document.getElementById("goalModal").hidden = true; }

  function openDetail(w) {
    detailWord = w;
    document.getElementById("detailBody").innerHTML = cardHTML(w);
    document.getElementById("detailModal").hidden = false;
  }
  var detailWord = null;
  function closeDetail() { document.getElementById("detailModal").hidden = true; }

  /* ---------- pronunciation ---------- */
  var voicesReady = false;
  function primeVoices() {
    if (!("speechSynthesis" in window)) return;
    try {
      speechSynthesis.getVoices();
      speechSynthesis.onvoiceschanged = function () { voicesReady = true; };
    } catch (e) {}
  }
  function pickEnglishVoice() {
    try {
      var vs = speechSynthesis.getVoices() || [];
      return vs.filter(function (v) { return /^en(\b|[-_])/i.test(v.lang); })[0] ||
             vs.filter(function (v) { return /en/i.test(v.lang); })[0] || null;
    } catch (e) { return null; }
  }
  function speak(text) {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      toast("Your browser can't read words aloud. Try Chrome or Safari.");
      return;
    }
    try {
      // iOS/Safari sometimes gets stuck paused — nudge it awake.
      if (speechSynthesis.paused) speechSynthesis.resume();
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US"; u.rate = 0.92; u.pitch = 1;
      var v = pickEnglishVoice();
      if (v) u.voice = v;
      u.onerror = function () { toast("Couldn't play audio on this device."); };
      // If voices aren't loaded yet, wait once for them then speak.
      if (!v && !voicesReady) {
        speechSynthesis.onvoiceschanged = function () {
          voicesReady = true;
          var vv = pickEnglishVoice(); if (vv) u.voice = vv;
          speechSynthesis.speak(u);
        };
        // Fallback: speak anyway shortly, in case the event never fires.
        setTimeout(function () { if (speechSynthesis.speaking === false) speechSynthesis.speak(u); }, 250);
      } else {
        speechSynthesis.speak(u);
      }
      toast("🔊 " + text);
    } catch (e) {
      toast("Couldn't play audio on this device.");
    }
  }

  /* ---------- notifications ---------- */
  function isStandalone() {
    return window.matchMedia && window.matchMedia("(display-mode: standalone)").matches ||
           window.navigator.standalone === true;
  }
  function isIOS() { return /iP(hone|ad|od)/.test(navigator.userAgent); }

  function updateNotifyBtn() {
    var btn = document.getElementById("notifyBtn");
    var on = state.notify.enabled && ("Notification" in window) && Notification.permission === "granted";
    btn.classList.toggle("is-on", on);
    btn.textContent = on ? "🔔" : "🔕";
    renderNotifyHint();
  }

  function renderNotifyHint() {
    var box = document.getElementById("notifyHint");
    if (!box) return;
    if (state.notifyHintClosed) { box.hidden = true; return; }
    var on = state.notify.enabled && ("Notification" in window) && Notification.permission === "granted";
    if (on) { box.hidden = true; return; }

    var msg;
    if (!("Notification" in window)) {
      msg = "<b>Tip:</b> This browser can't send reminders. On iPhone, add this app to your Home Screen first, then open it from there.";
    } else if (isIOS() && !isStandalone()) {
      msg = "<b>Turn on daily reminders:</b> tap the <b>Share</b> button → <b>Add to Home Screen</b>, open the app from that icon, then tap the 🔔 bell up top.";
    } else {
      msg = "<b>Want a daily nudge?</b> Tap the 🔔 bell in the top-right and choose <b>Allow</b> to get a new word every day.";
    }
    box.innerHTML = '<span>💡</span><span>' + msg + '</span><button class="nh-close" id="nhClose" aria-label="Dismiss">×</button>';
    box.hidden = false;
    var c = document.getElementById("nhClose");
    if (c) c.addEventListener("click", function () { state.notifyHintClosed = true; save(); box.hidden = true; });
  }

  async function toggleNotify() {
    if (!("Notification" in window)) { toast("Notifications aren't supported in this browser."); return; }
    if (state.notify.enabled && Notification.permission === "granted") {
      state.notify.enabled = false; save(); updateNotifyBtn();
      toast("Daily reminders turned off.");
      return;
    }
    var perm = Notification.permission;
    if (perm !== "granted") perm = await Notification.requestPermission();
    if (perm !== "granted") { toast("Reminders need notification permission."); updateNotifyBtn(); return; }

    state.notify.enabled = true; save();
    await tryRegisterPeriodicSync();
    // fire one now so the user sees it works
    var w = wordOfDay();
    showLocalNotification("📖 You're in! Today's word: " + w.word,
      "Challenge: slip “" + w.word + "” into a real sentence today 🔥  Tap to see what it means.");
    updateNotifyBtn();
    toast("Daily reminders on ✨ A new word will find you each day.");
  }

  async function tryRegisterPeriodicSync() {
    try {
      var reg = await navigator.serviceWorker.ready;
      if ("periodicSync" in reg) {
        var status = await navigator.permissions.query({ name: "periodic-background-sync" });
        if (status.state === "granted") {
          await reg.periodicSync.register("daily-word", { minInterval: 20 * 60 * 60 * 1000 });
        }
      }
    } catch (e) { /* not supported — fine */ }
  }

  async function showLocalNotification(title, body) {
    try {
      var reg = await navigator.serviceWorker.ready;
      reg.showNotification(title, {
        body: body,
        icon: "icons/icon-192.png",
        badge: "icons/icon-192.png",
        tag: "daily-vocab"
      });
    } catch (e) {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body: body });
      }
    }
  }

  /* ---------- toast ---------- */
  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* ---------- misc ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- wire up ---------- */
  function init() {
    if (WORDS.length === 0) {
      document.getElementById("wordCard").innerHTML = '<p class="empty">Word list failed to load.</p>';
      return;
    }
    recordSeen();
    renderAll();
    updateNotifyBtn();
    primeVoices();
    buildWordBg();
    moveTabGlow("today");

    document.querySelectorAll(".tab").forEach(function (t) {
      t.addEventListener("click", function () { switchView(t.dataset.view); });
    });

    document.getElementById("setGoalBtn").addEventListener("click", function () { openGoalModal(wordOfDay().word); });
    document.getElementById("speakBtn").addEventListener("click", function () { speak(wordOfDay().word); });
    document.getElementById("notifyBtn").addEventListener("click", toggleNotify);

    // goal modal day chips
    document.getElementById("dayChoices").addEventListener("click", function (e) {
      var chip = e.target.closest(".chip"); if (!chip) return;
      document.querySelectorAll("#dayChoices .chip").forEach(function (c) { c.classList.remove("is-active"); });
      chip.classList.add("is-active");
      chosenDays = +chip.dataset.days;
    });
    document.getElementById("goalCancel").addEventListener("click", closeGoalModal);
    document.getElementById("goalConfirm").addEventListener("click", function () {
      if (pendingGoalWord) createGoal(pendingGoalWord, chosenDays);
      closeGoalModal();
    });
    document.getElementById("goalModal").addEventListener("click", function (e) {
      if (e.target.id === "goalModal") closeGoalModal();
    });

    // detail modal
    document.getElementById("detailClose").addEventListener("click", closeDetail);
    document.getElementById("detailGoal").addEventListener("click", function () {
      if (detailWord) { closeDetail(); openGoalModal(detailWord.word); }
    });
    document.getElementById("detailModal").addEventListener("click", function (e) {
      if (e.target.id === "detailModal") closeDetail();
    });

    // event delegation for goal check-ins / deletes / explain (works everywhere)
    document.body.addEventListener("click", function (e) {
      var ex = e.target.closest("[data-explain]");
      if (ex) {
        var box = ex.nextElementSibling;
        if (box && box.classList.contains("simple-box")) {
          var show = box.hidden;
          box.hidden = !show;
          ex.classList.toggle("is-open", show);
          ex.textContent = show ? "🧩 Hide simple version" : "🧩 Explain simply";
        }
        return;
      }
      var ci = e.target.closest("[data-checkin]");
      if (ci) { checkInToday(ci.getAttribute("data-checkin")); return; }
      var del = e.target.closest("[data-del]");
      if (del) { if (confirm("Remove this goal?")) deleteGoal(del.getAttribute("data-del")); return; }
    });

    // re-render if the day changed while the app stays open
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) { recordSeen(); renderAll(); }
    });

    // service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
