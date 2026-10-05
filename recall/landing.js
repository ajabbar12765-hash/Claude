(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const L = 'ABCD';

  // A tiny multiple-choice widget used by the hero card and the book's quiz page.
  function quiz(el, questions, opts) {
    let i = 0, sel = null, correct = 0, done = false;
    const render = () => {
      if (done) {
        el.innerHTML = opts.done(correct, questions.length);
        el.querySelector('[data-restart]').onclick = () => { i = 0; sel = null; correct = 0; done = false; render(); };
        return;
      }
      const q = questions[i], answered = sel !== null;
      el.innerHTML = opts.head(i, questions.length, q) +
        `<div style="display:flex;flex-direction:column;gap:8px">${q.o.map((label, k) => {
          let cls = 'opt';
          if (answered && k === q.a) cls += ' is-correct';
          else if (answered && k === sel) cls += ' is-wrong';
          return `<button class="${cls}" data-k="${k}" ${answered ? 'disabled' : ''}><span class="letter">${L[k]}</span><span>${esc(label)}</span></button>`;
        }).join('')}</div>` +
        (answered ? opts.feedback(sel === q.a, q, i === questions.length - 1) : opts.idle(q));
      el.querySelectorAll('[data-k]').forEach((b) => {
        b.onclick = () => { if (sel !== null) return; sel = +b.dataset.k; if (sel === q.a) correct++; render(); el.querySelector('[data-next]')?.focus({ preventScroll: true }); };
      });
      const next = el.querySelector('[data-next]');
      if (next) next.onclick = () => { if (i === questions.length - 1) done = true; else { i++; sel = null; } render(); };
    };
    render();
  }

  // ── Hero sample question ──────────────────────────────────────────
  const heroQs = [
    { q: 'Which organelle makes most of a cell’s ATP?', o: ['Ribosome', 'Mitochondrion', 'Golgi apparatus'], a: 1, why: 'Aerobic respiration in the mitochondria releases most of the cell’s ATP.' },
    { q: 'What is the function of the cell membrane?', o: ['Store DNA', 'Control what enters and leaves', 'Make proteins'], a: 1, why: 'It is partially permeable — it controls the movement of substances in and out.' },
    { q: 'Where does photosynthesis occur?', o: ['Nucleus', 'Vacuole', 'Chloroplast'], a: 2, why: 'Chloroplasts contain chlorophyll, which absorbs light for photosynthesis.' },
    { q: 'Which structure contains the genetic material?', o: ['Nucleus', 'Ribosome', 'Cell wall'], a: 0, why: 'In plant and animal cells, the DNA is held in the nucleus.' },
  ];
  quiz($('sample-q'), heroQs, {
    head: (i, n, q) => `<p class="kicker" style="margin:0">Sample question ${i + 1} of ${n}</p><h2 class="sample-q">${esc(q.q)}</h2>`,
    idle: () => `<div class="sample-foot muted">Pick an answer.</div>`,
    feedback: (ok, q, last) => `<div class="sample-foot"><span><b>${ok ? 'Correct.' : 'Not quite.'}</b> ${esc(q.why)}</span><button class="btn btn-ink btn-sm" data-next>${last ? 'Score' : 'Next'} →</button></div>`,
    done: (c, n) => `<p class="kicker" style="margin:0">Your score</p><div style="font-family:var(--font-heading);font-weight:800;font-size:96px;line-height:.9;color:var(--color-accent)">${c}/${n}</div><p style="font-size:18px;margin:8px 0 0">${c === n ? 'Perfect. Now imagine this for your whole syllabus.' : 'Every miss tells Recall what to teach you next.'}</p><div class="btn-row"><a class="btn btn-primary btn-sm" href="app.html#/new">Use my syllabus →</a><button class="btn btn-secondary btn-sm" data-restart>Again ↺</button></div>`,
  });

  // ── Book quiz page ────────────────────────────────────────────────
  const bookQs = [
    { tag: 'Q1 · Location', q: 'Where do the light reactions take place?', o: ['Stroma', 'Thylakoid membranes', 'Mitochondria', 'Cell wall'], a: 1, why: 'Light is captured by chlorophyll in the thylakoids.' },
    { tag: 'Q2 · By-product', q: 'Which gas is released as a by-product?', o: ['Carbon dioxide', 'Nitrogen', 'Oxygen', 'Hydrogen'], a: 2, why: 'Splitting water releases O₂.' },
    { tag: 'Q3 · Output', q: 'What does the Calvin cycle produce?', o: ['Glucose', 'Chlorophyll', 'Water', 'Light'], a: 0, why: 'CO₂ is fixed into sugar using ATP and NADPH.' },
    { tag: 'Q4 · Light', q: 'Which wavelengths does chlorophyll absorb best?', o: ['Green and yellow', 'Red and blue', 'Infrared', 'All equally'], a: 1, why: 'Green is mostly reflected, so leaves look green.' },
  ];
  const btn = 'padding:10px 18px;border:0;font-family:var(--font-heading);font-weight:700;font-size:13px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#fff';
  quiz($('quiz-page'), bookQs, {
    head: (i, n, q) => `<div class="pg-head"><span style="color:var(--color-accent-700)">Practice Test</span><span>Q ${i + 1} / ${n}</span></div>
      <div style="align-self:flex-start;background:var(--color-text);color:#fff;font-family:var(--font-heading);font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:4px 10px;margin:18px 0 14px">${esc(q.tag)}</div>
      <div style="font-family:var(--font-heading);font-size:20px;font-weight:700;line-height:1.2;margin-bottom:14px">${esc(q.q)}</div>`,
    idle: () => '',
    feedback: (ok, q, last) => `<div style="font-size:13px;line-height:1.4;border-top:2px solid var(--color-divider);padding-top:10px;margin-top:14px"><b style="color:var(--color-accent-700)">${ok ? 'Correct.' : 'Not quite.'}</b> ${esc(q.why)}</div>
      <button data-next style="${btn};margin-top:auto;align-self:flex-start;background:var(--color-accent)">${last ? 'Finish' : 'Next'} →</button>`,
    done: (c, n) => `<div class="pg-head"><span style="color:var(--color-accent-700)">Practice Test</span><span>Results</span></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:12px;padding-top:24px">
        <div style="font-family:var(--font-heading);font-size:96px;font-weight:800;line-height:.9;color:var(--color-accent)">${c}/${n}</div>
        <div style="font-family:var(--font-heading);font-size:20px;font-weight:700">${c === n ? 'Perfect score.' : c >= 3 ? 'Strong result — review the misses.' : 'Re-read the left page and retry.'}</div>
        <a href="app.html#/new" style="font-size:14px;font-weight:700">Make a guide like this from your syllabus →</a>
        <button data-restart style="${btn};margin-top:auto;align-self:flex-start;background:var(--color-text)">Retake test ↺</button>
      </div>`,
  });

  // ── Scroll-driven book ────────────────────────────────────────────
  // Progress comes from how far the sticky track has scrolled, eased toward
  // its target every frame so the pages turn smoothly instead of jumping.
  const track = $('book-track');
  const els = { book: $('book'), leaf1: $('leaf1'), leaf2: $('leaf2'), boardL: $('board-l'), shadow: $('book-shadow'), hint: $('book-hint'), bar: $('book-progress'), step: $('book-step'), quiz: $('quiz-page') };
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const ease = (t) => 0.5 - Math.cos(Math.PI * clamp(t)) / 2;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const follower = $('follow-book');
  // Opening takes the first part of the track; the last part carries the book
  // away to the corner (C), so the page never sits still on one screen.
  const OPEN_END = 0.72, CARRY_START = 0.82;
  let P = 0, C = 0, target = 0, cTarget = 0, raf = 0, lastStep = '';

  function draw(p, c) {
    const f1 = ease(p / 0.5), f2 = ease((p - 0.25) / 0.5), z = ease((p - 0.5) / 0.5);
    const W = 420, H = 560, vw = innerWidth, vh = innerHeight;
    const narrow = vw < 760;
    // Narrow screens can't fit the open spread legibly, so the last stage
    // zooms onto the right-hand page (the quiz) instead of the whole book.
    const b = Math.min(vw * (narrow ? 0.9 : 0.62) / (W * 2), vh * 0.62 / H);
    const f = narrow ? Math.min(vw * 0.94 / W, (vh - 90) / H) : Math.min(vw * 0.97 / (W * 2), (vh - 70) / H);
    const s = b + (f - b) * z;
    const tx = -(W / 2) * s * (1 - f1) - (narrow ? (W / 2) * s * z : 0);
    // Carry: shrink the open book and send it to the bottom-right corner,
    // where the little follower book takes over.
    const ce = ease(c);
    const k = 1 - ce * (1 - Math.min(0.2, 90 / (W * 2 * s)));
    const dx = ce * (vw / 2 - 52), dy = ce * (vh / 2 - 62);
    els.book.style.transform = `translate(${dx}px, ${dy}px) scale(${k}) translateX(${tx}px) rotateX(${22 * (1 - z)}deg) rotateZ(${-4 * (1 - f1)}deg) scale(${s})`;
    els.book.style.opacity = 1 - clamp((c - 0.55) / 0.4);
    follower.classList.toggle('on', c > 0.6);
    follower.style.opacity = c > 0.6 ? clamp((c - 0.7) / 0.3) : '';
    // translateZ after the turn, so a turned leaf ends up beneath the next one.
    els.leaf1.style.transform = `rotateY(${-180 * f1}deg) translateZ(3px)`;
    els.leaf2.style.transform = `rotateY(${-180 * f2}deg) translateZ(2px)`;
    els.boardL.style.opacity = f1;
    els.shadow.style.opacity = 1 - z;
    els.hint.style.opacity = 1 - clamp(p / 0.08);
    els.bar.style.width = p * 100 + '%';
    const step = p < 0.05 ? '01 — Cover' : p < 0.4 ? '02 — Contents' : p < 0.8 ? '03 — Learn' : '04 — Practice';
    if (step !== lastStep) { els.step.textContent = step; lastStep = step; }
    els.quiz.style.pointerEvents = p > 0.95 && c < 0.05 ? 'auto' : 'none';
  }

  function measure() {
    const r = track.getBoundingClientRect();
    const range = track.offsetHeight - innerHeight;
    const local = range > 0 ? -r.top / range : 0;
    target = clamp(local / OPEN_END);
    cTarget = clamp((local - CARRY_START) / (1 - CARRY_START));
  }

  function loop() {
    const d = target - P, dc = cTarget - C;
    P = reduced || Math.abs(d) < 0.0005 ? target : P + d * 0.12;
    C = reduced || Math.abs(dc) < 0.0005 ? cTarget : C + dc * 0.18;
    draw(P, C);
    raf = P !== target || C !== cTarget ? requestAnimationFrame(loop) : 0;
  }
  const kick = () => { measure(); if (!raf) raf = requestAnimationFrame(loop); };

  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', () => { measure(); draw(P, C); });
  // Hide the follower while the closing banner (which has its own button) is on screen.
  const banner = document.querySelector('.banner');
  if (banner && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => follower.classList.toggle('off', e.isIntersecting), { threshold: 0.2 }).observe(banner);
  }
  measure();
  P = target; C = cTarget;
  draw(P, C);
})();
