// "Why can't you remember being a baby?" — Whiteboard Explainer with a sticker-magnet host.
// One continuous board (10200 × 5400). Visual beats hang off spoken words via at(id, word).
import * as W from './engine/wb.js';
import { clamp, lerp, TAU, mulberry } from '/core/lib.js';
import { drawHost, hostState } from './host.js';

const { INK } = W;
const BW = 10200, BH = 5400;
// gap (s) before each line; s08 is split before its last sentence to leave a silence before the reveal
const GAP = { s01_hook: 1.8, s02_title: 1.4, s03_babies: 3.6, s04_name: 1.5, s05_hippo: 1.7, s06_words: 1.5, s07_me: 1.5, s08_seven: 1.8, s09_locked: 2.0, s10_fake: 1.6, s11_end: 2.0 };
const SPLIT = { id: 's08_seven', word: 'it', k: 1, gap: 1.6 };
const TAIL = 6.5;

export async function build() {
  await W.loadFont('tech', 'fonts/EMSTech.json');
  const words = await (await fetch('voices/words.json')).json();
  const dur = await (await fetch('voices/dur.json')).json();
  const env = await (await fetch('voices/env.json')).json();
  const lines = await (await fetch('script/lines.json')).json();
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  // ── VO placement
  const VO = {}; let t = 0;
  // split point inside s08 (between the previous word's end and the split word's start)
  const sw = words[SPLIT.id]; let si = -1, n = 0;
  for (let i = 0; i < sw.length; i++) if (norm(sw[i][0]) === SPLIT.word && n++ === SPLIT.k) { si = i; break; }
  const splitAt = (sw[si - 1][2] + sw[si][1]) / 2;
  for (const L of lines) { t += GAP[L.id]; VO[L.id] = t; t += dur[L.id] + (L.id === SPLIT.id ? SPLIT.gap : 0); }
  const END = t + TAIL;
  const lt = (id, x) => VO[id] + x + (id === SPLIT.id && x > splitAt ? SPLIT.gap : 0);   // line-local → absolute
  const at = (id, w, k = 0, which = 1) => {
    let c = 0; const q = norm(w); for (const x of words[id]) { const v = norm(x[0]); if ((v.startsWith(q) || (q.length > 3 && v.endsWith(q))) && c++ === k) return lt(id, x[which]); }
    throw new Error(`word ${w} (${k}) not in ${id}`);
  };
  const S = (id, w, k) => at(id, w, k, 1), E = (id, w, k) => at(id, w, k, 2);
  const vEnd = id => lt(id, dur[id]);

  const tl = new W.Timeline();
  const K = new W.Pen('black', INK.black, { park: [2200, 1320] });
  const O = new W.Pen('orange', INK.orange, { park: [2350, 1150] });
  const B = new W.Pen('blue', INK.blue, { park: [2100, 1420] });
  const T = W.text;
  const D = (pen, shapes, t0, t1, o = {}) => tl.draw(pen, shapes, t0, { by: t1, ...o });
  const ell = (cx, cy, rx, ry, o = {}) => W.circle(cx, cy, rx, { ry, ...o });
  const pts = (cx, cy, arr, s = 1) => arr.map(([x, y]) => [cx + x * s, cy + y * s]);

  // ───────── ghost marks of old lessons
  const ghosts = [], gR = mulberry(77);
  for (let i = 0; i < 60; i++) {
    const x = gR() * (BW - 400) + 200, y = gR() * (BH - 400) + 200, k = gR();
    const o = { w: 12, alpha: .045 + gR() * .045, color: gR() < .2 ? '#8aa0c8' : '#9aa0a8' };
    if (k < .3) ghosts.push(...T(['ch. 4', 'quiz fri', 'x + 2', 'p. 12', 'TODO', 'H2O', 'sun', '3 x 4', 'ok'][i % 9], x, y, { h: 50 + gR() * 40, ...o }));
    else if (k < .55) ghosts.push(W.circle(x, y, 40 + gR() * 110, o));
    else if (k < .8) ghosts.push(...W.arrow(x, y, x + (gR() - .5) * 500, y + (gR() - .5) * 300, o));
    else ghosts.push(W.line(x, y, x + 200 + gR() * 500, y + (gR() - .5) * 80, o));
  }

  // ───────── layout
  const TLY = 2000, AGE = a => 400 + 900 * a;                 // the timeline of a life
  const CARD = [[200, 2800], [3000, 5600], [5800, 8400]], CY0 = 3300, CY1 = 4700;
  const CAM = [];                                            // camera keys [t, x, y, z, roll, ease]
  const HK = [];                                             // host anchor keys [t, x, y]
  const POSE = [[0, 'idle']];
  const shot = (t0, x, y, z, e = 'io', lag = .25, d = null) => {
    if (!CAM.length) { CAM.push([t0, x, y, z, 0, e]); HK.push([t0, x - 740 / z, y + 380 / z]); return; }
    const p = CAM[CAM.length - 1], hp = HK[HK.length - 1];
    t0 = Math.max(t0, p[0]);
    const dist = Math.hypot(x - p[1], y - p[2]) * Math.min(z, p[3]) + Math.abs(Math.log(z / p[3])) * 900;
    d = d ?? clamp(.8 + dist / 2600, .9, 2.2);
    CAM.push([t0, p[1], p[2], p[3], 0, 'io'], [t0 + d, x, y, z, 0, e]);
    const hx = x - 740 / z, hy = y + 380 / z, h0 = Math.max(t0 + lag, hp[0]);
    HK.push([h0, hp[1], hp[2]], [h0 + d, hx, hy]);
  };
  const hold = () => {};
  const pose = (t0, p) => POSE.push([t0, p]);
  const magnets = [];                                        // sound cues for the host landing

  // ═════════ S01 HOOK
  const h0 = VO.s01_hook;
  shot(0, 1450, 800, 1);
  // host drops onto the board
  const HOST_IN = .5; magnets.push(HOST_IN + .32);
  D(O, T('?', 1600, 900, { h: 520, w: 34 }), S('s01_hook', "what's"), E('s01_hook', 'remember'));
  D(K, T('your 1st memory?', 1600, 1050, { h: 62, align: 'center' }), S('s01_hook', 'very'), E('s01_hook', 'remember') + .5);
  pose(S('s01_hook', 'quick'), 'idle'); pose(S('s01_hook', 'got'), 'think'); pose(S('s01_hook', 'okay'), 'idle');
  D(B, T('age 3+', 2050, 760, { h: 96 }), S('s01_hook', 'three'), E('s01_hook', 'old'));
  hold(E('s01_hook', 'old'));
  // down to the start of the timeline
  shot(S('s01_hook', 'means') + .1, 1800, 2080, .62);
  const tl0 = S('s01_hook', 'thousand');
  D(K, [W.line(AGE(0), TLY, AGE(3) + 300, TLY, { w: 11 }), W.circle(AGE(0), TLY, 22, { w: 10 })], S('s01_hook', 'means'), tl0, { tag: 'timeline' });
  D(K, [0, 1, 2, 3].map(a => W.line(AGE(a), TLY - 30, AGE(a), TLY + 30, { w: 9 })), tl0, tl0 + .6);
  D(K, [...T('birth', AGE(0), TLY + 110, { h: 56, align: 'center' }), ...T('1', AGE(1), TLY + 110, { h: 56, align: 'center' }), ...T('2', AGE(2), TLY + 110, { h: 56, align: 'center' }), ...T('3', AGE(3), TLY + 110, { h: 56, align: 'center' })], tl0 + .6, E('s01_hook', 'days'));
  // brace over the first thousand days
  const brace = W.curve([[AGE(0) + 20, TLY - 90], [AGE(0) + 60, TLY - 160], [AGE(1.5) - 60, TLY - 160], [AGE(1.5), TLY - 230], [AGE(1.5) + 60, TLY - 160], [AGE(3) - 60, TLY - 160], [AGE(3) - 20, TLY - 90]], { w: 10, smooth: 2 });
  D(O, [brace, ...T('1,000+ days', AGE(1.5), TLY - 290, { h: 100, align: 'center' })], S('s01_hook', 'more'), E('s01_hook', 'life'));
  // what you learned in them
  const fx = AGE(0.55), fy = TLY + 420;
  const foot = (x, y, s) => [ell(x, y, 34 * s, 52 * s, { w: 8 }), ...[-28, -10, 8, 24].map((dx, i) => W.circle(x + dx * s, y - (66 + (i === 1 || i === 2 ? 8 : 0)) * s, 9 * s, { w: 7 }))];
  D(K, [...foot(fx - 60, fy + 30, 1), ...foot(fx + 60, fy - 40, 1)], S('s01_hook', 'walk'), E('s01_hook', 'walk') + .25);
  const bx = AGE(1.5), by = TLY + 400;
  D(K, [W.roundRect(bx - 170, by - 90, 340, 170, 40, { w: 9 }), W.poly([[bx - 60, by + 80], [bx - 90, by + 150], [bx, by + 80]], { w: 9 }), ...T('ma-ma!', bx, by + 20, { h: 64, align: 'center' })], S('s01_hook', 'talk'), E('s01_hook', 'talk') + .35);
  const mx = AGE(2.45), my = TLY + 410;
  D(K, [W.circle(mx, my, 110, { w: 9 }), W.circle(mx - 38, my - 25, 9, { w: 9 }), W.circle(mx + 38, my - 25, 9, { w: 9 }), W.arc(mx, my + 5, 55, .5, Math.PI - .5, { w: 9 }), W.curve([[mx - 100, my - 50], [mx - 60, my - 120], [mx + 20, my - 125], [mx + 100, my - 55]], { w: 9 })], S('s01_hook', 'recognize'), E('s01_hook', 'face'));
  D(B, [...T('walk', fx, fy + 190, { h: 52, align: 'center' }), ...T('talk', bx, by + 230, { h: 52, align: 'center' }), ...T('faces', mx, my + 190, { h: 52, align: 'center' })], E('s01_hook', 'face') - .2, E('s01_hook', 'face') + 1.1);
  // ... gone.
  const g0 = S('s01_hook', 'gone'); tl.erase(W.zigzag(AGE(0) + 80, TLY + 230, AGE(3) - AGE(0) - 80, 420, 6), g0 - .15, 1.25, { width: 190, strength: .92 });
  D(O, T('deleted?', AGE(1.5), TLY + 500, { h: 120, align: 'center' }), S('s01_hook', 'deleted'), E('s01_hook', 'deleted') + .5);
  pose(S('s01_hook', 'gone') - .2, 'shrug'); pose(S('s01_hook', 'deleted') + .6, 'idle'); pose(S('s01_hook', 'where'), 'shrug'); pose(vEnd('s01_hook') + .3, 'idle');

  // ═════════ S02 TITLE
  shot(vEnd('s01_hook') + .15, 4150, 780, .95);
  const tt0 = VO.s02_title, tt1 = vEnd('s02_title') + 1.1;
  const L1 = T("Why can't you", 4390, 600, { h: 130, align: 'center' }), L2 = T('remember being', 4390, 820, { h: 120, align: 'center' });
  const L3a = T('a ', 4170, 1050, { h: 130 }), L3b = T('baby?', 4170 + L3a.width, 1050, { h: 140 });
  const tm = (tt1 - tt0);
  D(K, [...L1, ...L2, ...L3a], tt0 - .2, tt0 + tm * .72);
  D(O, [...L3b, W.curve([[4170 + L3a.width - 10, 1100], [4440, 1120], [4740, 1090]], { w: 12 })], tt0 + tm * .72, tt1);
  pose(tt0, 'both'); pose(tt1 + .3, 'idle');
  hold(tt1 + 1);

  // ═════════ S03 KICK TEST
  const k = 's03_babies';
  shot(VO[k] - 1.0, 6950, 820, .8);
  D(K, T('myth: babies forget everything', 6300, 330, { h: 60 }), S(k, 'first'), E(k, 'myth') + .6);
  D(O, [W.line(6280, 312, 7900, 300, { w: 12 }), ...T('NOPE', 7600, 225, { h: 70 })], S(k, 'not'), E(k, 'remembering'));
  D(B, T('1980s · Rovee-Collier', 6300, 470, { h: 52 }), S(k, 'nineteen'), E(k, 'rovee'));
  // crib
  const cx = 6950, cyb = 1170;
  const crib = [W.line(6420, cyb, 7480, cyb, { w: 10 }), W.line(6420, cyb, 6420, 860, { w: 10 }), W.line(7480, cyb, 7480, 860, { w: 10 }), W.line(6420, 900, 7480, 900, { w: 9 }), ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => W.line(6520 + i * 106, 905, 6520 + i * 106, cyb - 6, { w: 6 }))];
  const baby = [W.circle(6640, 1050, 62, { w: 9 }), ell(6870, 1075, 170, 58, { w: 9 }), W.line(7030, 1060, 7160, 1035, { w: 9 }), W.line(7030, 1095, 7170, 1105, { w: 9 }), W.circle(6620, 1040, 6, { w: 8 }), W.arc(6650, 1072, 18, .3, 2.6, { w: 7 })];
  D(K, baby, S(k, 'tied'), E(k, 'ankle'));
  // mobile above
  const mob = [W.line(cx + 130, 520, cx + 130, 600, { w: 7 }), W.line(cx - 120, 600, cx + 380, 600, { w: 8 }), W.line(cx - 100, 600, cx - 100, 700, { w: 5 }), W.line(cx + 130, 600, cx + 130, 730, { w: 5 }), W.line(cx + 360, 600, cx + 360, 690, { w: 5 }),
    W.poly(pts(cx - 100, 745, [[0, -45], [13, -14], [45, -14], [20, 6], [29, 40], [0, 20], [-29, 40], [-20, 6], [-45, -14], [-13, -14], [0, -45]]), { w: 7 }), W.circle(cx + 130, 775, 40, { w: 7 }), W.arc(cx + 360, 730, 42, -2.2, 1.6, { w: 7 })];
  D(K, mob, S(k, 'mobile'), E(k, 'hanging') + .2);
  D(K, crib, S(k, 'over'), E(k, 'crib') + .4);
  D(B, W.curve([[7165, 1100], [7300, 960], [7150, 820], [cx + 360, 735]], { w: 8 }), S(k, 'ribbon') + .2, E(k, 'ankle') + .6, { tag: 'ribbon' });
  // kick → the mobile moves
  D(O, [...T('kick!', 7280, 1250, { h: 60 }), W.arc(cx - 100, 745, 75, -2.4, -1.4, { w: 7 }), W.arc(cx - 100, 745, 75, -.7, .3, { w: 7 }), W.arc(cx + 130, 775, 72, -2.2, -1.2, { w: 7 }), W.arc(cx + 130, 775, 72, -.6, .4, { w: 7 })], S(k, 'kick'), E(k, 'moves') + .2);
  pose(S(k, 'kick'), 'point'); pose(E(k, 'fast'), 'idle');
  D(B, [...T('1 week', 7850, 860, { h: 58, align: 'center' }), ...T('later', 7850, 930, { h: 58, align: 'center' }), ...W.arrow(7850, 960, 7850, 1060, { w: 8, head: 26 })], S(k, 'week') - .3, E(k, 'later') + .3);
  D(O, [...T('still', 7850, 1130, { h: 66, align: 'center' }), ...T('kicks!', 7850, 1205, { h: 66, align: 'center' })], S(k, 'remembered'), E(k, 'away'));
  D(B, T('older babies: months!', 6320, 1330, { h: 52 }), S(k, 'older'), E(k, 'months') + .3);
  // tons of memories... that fade
  const bub = [], bR = mulberry(5);
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, r = 520 + bR() * 160; bub.push(W.circle(6950 + Math.cos(a) * r * 1.3, 820 + Math.sin(a) * r * .55, 22 + bR() * 20, { w: 7 })); }
  D(O, bub, S(k, 'tons') - .2, E(k, 'them') + .4);
  pose(S(k, 'problem'), 'shrug'); pose(vEnd(k) + .4, 'idle');
  const er3 = S(k, 'last') - .1;
  tl.erase(bub.map(s => s.start).concat([]).sort((a, b) => Math.atan2(a[1] - 820, a[0] - 6950) - Math.atan2(b[1] - 820, b[0] - 6950)).concat([bub[0].start]), er3, 1.6, { width: 120, strength: .92 });

  // ═════════ S04 THE NAME + THREE SUSPECTS
  const s4 = 's04_name';
  shot(vEnd(k) + .25, 4200, 3060, .9, 'io');
  D(K, T('INFANTILE AMNESIA', 4400, 3140, { h: 105, align: 'center' }), S(s4, 'infantile') - .2, E(s4, 'amnesia') + .2);
  D(O, W.curve([[3650, 3190], [4400, 3210], [5150, 3180]], { w: 12 }), E(s4, 'amnesia') + .1, E(s4, 'amnesia') + .55);
  shot(S(s4, 'and') - .1, 4300, 3700, .225, 'io', .3);
  const cardF = CARD.map(([x0, x1]) => W.roundRect(x0, CY0, x1 - x0, CY1 - CY0, 60, { w: 12 }));
  D(K, cardF[0], S(s4, 'and') - .1, S(s4, 'three') + .1); D(B, cardF[1], S(s4, 'and'), S(s4, 'three') + .2); D(O, cardF[2], S(s4, 'and') + .1, S(s4, 'three') + .3);
  const num = i => T('#' + (i + 1), CARD[i][0] + 330, CY0 + 300, { h: 250 });
  const qq = i => T('?', (CARD[i][0] + CARD[i][1]) / 2 + 200, CY0 + 950, { h: 700, w: 40 });
  D(K, [...num(0), ...qq(0)], S(s4, 'three'), E(s4, 'suspects'));
  D(B, [...num(1), ...qq(1)], S(s4, 'three') + .1, E(s4, 'suspects') + .15);
  D(O, [...num(2), ...qq(2)], S(s4, 'three') + .2, E(s4, 'suspects') + .3);
  pose(S(s4, 'three'), 'both'); pose(vEnd(s4) + .4, 'idle');
  // wipe the question marks before each card fills
  const wipeQ = (i, t0) => tl.erase(W.zigzag((CARD[i][0] + CARD[i][1]) / 2 - 150, CY0 + 120, 1050, 950, 7), t0, 1.1, { width: 240, strength: .985 });

  // ═════════ S05 SUSPECT 1 — CONSTRUCTION SITE
  const s5 = 's05_hippo';
  shot(VO[s5] - .9, 1550, 3990, .85);
  wipeQ(0, VO[s5] - .6);
  D(B, T('a construction site!', 1150, 3460, { h: 56 }), S(s5, 'construction'), E(s5, 'site') + .4);
  // brain (side view)
  const BCX = 1520, BCY = 3990;
  const brain = W.curve(pts(BCX, BCY, [[-420, 90], [-460, -40], [-380, -190], [-210, -280], [0, -300], [210, -270], [380, -170], [450, -10], [400, 130], [250, 190], [80, 200], [-60, 230], [-180, 200], [-330, 190], [-420, 90]]), { w: 11, smooth: 3 });
  const stem = W.curve(pts(BCX, BCY, [[60, 200], [90, 300], [130, 360]]), { w: 10 });
  const folds = [W.curve(pts(BCX, BCY, [[-300, -120], [-200, -180], [-80, -150], [20, -210]]), { w: 7 }), W.curve(pts(BCX, BCY, [[80, -120], [200, -80], [320, -110]]), { w: 7 }), W.curve(pts(BCX, BCY, [[-330, 40], [-220, -20], [-120, 20]]), { w: 7 })];
  D(K, [brain, stem, ...folds], S(s5, 'deep'), E(s5, 'brain', 1) + .6);
  // seahorse = hippocampus
  const sea = W.curve(pts(BCX + 60, BCY + 40, [[-90, -70], [-40, -105], [20, -90], [40, -40], [10, 0], [30, 50], [10, 95], [-30, 110], [-55, 85], [-35, 60], [-10, 70]]), { w: 13, smooth: 3 });
  D(O, [sea, W.circle(BCX + 10, BCY - 45, 6, { w: 8 })], S(s5, 'shaped'), E(s5, 'seahorse'));
  D(O, [...W.arrow(BCX + 460, BCY + 330, BCX + 120, BCY + 120, { w: 8, head: 28 }), ...T('hippocampus', BCX + 430, BCY + 400, { h: 60 })], S(s5, 'called'), E(s5, 'hippocampus') + .5);
  D(B, [...W.arrow(BCX - 720, BCY - 150, BCX - 120, BCY - 40, { w: 8, head: 28, curve: [BCX - 450, BCY - 210] }), ...T('save!', BCX - 860, BCY - 190, { h: 54 })], S(s5, 'save'), E(s5, 'memory') + .4);
  // still being built: a traffic cone
  const cn = [BCX + 760, BCY - 160];
  D(O, [W.poly(pts(cn[0], cn[1], [[-110, 160], [-30, -160], [30, -160], [110, 160]]), { w: 10 }), W.line(cn[0] - 170, cn[1] + 160, cn[0] + 170, cn[1] + 160, { w: 11 }), W.hatch(pts(cn[0], cn[1], [[-70, 20], [-50, -50], [50, -50], [70, 20]]), { spacing: 22, w: 8, alpha: .7 })], S(s5, 'built'), E(s5, 'built') + .7);
  // new neurons pop in
  const neuron = (x, y, s, seed) => { const r = mulberry(seed), o = [W.circle(x, y, 16 * s, { w: 8 })]; for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + r(); o.push(W.curve([[x + Math.cos(a) * 18 * s, y + Math.sin(a) * 18 * s], [x + Math.cos(a + .3) * 50 * s, y + Math.sin(a + .3) * 50 * s], [x + Math.cos(a) * 80 * s, y + Math.sin(a) * 80 * s]], { w: 6 })); } return o; };
  const NP = [[BCX - 250, BCY - 90], [BCX + 230, BCY - 160], [BCX - 80, BCY + 120], [BCX + 280, BCY + 60], [BCX - 300, BCY + 80], [BCX + 60, BCY - 220]];
  const nt0 = S(s5, 'brand'), nt1 = E(s5, 'neurons', 0) + .8;
  NP.forEach((p, i) => D(B, neuron(p[0], p[1], 1, i + 3), lerp(nt0, nt1, i / NP.length), lerp(nt0, nt1, (i + 1) / NP.length)));
  D(O, [W.hatch(pts(BCX, BCY, [[-260, -60], [-120, -140], [40, -60], [-60, 60]]), { spacing: 20, w: 7, alpha: .6 }), W.hatch(pts(BCX, BCY, [[120, -40], [300, -60], [330, 80], [160, 110]]), { spacing: 20, w: 7, alpha: .6 })], S(s5, 'scramble'), E(s5, 'there') + .2);
  pose(S(s5, 'construction'), 'point'); pose(S(s5, 'job'), 'idle'); pose(S(s5, 'scramble'), 'shrug'); pose(E(s5, 'there') + .3, 'idle');
  // notebook with pages ripped out (camera eases right)
  shot(S(s5, 'imagine') - .3, 1900, 4020, .85);
  const NB = [2240, 4200];
  D(K, [W.roundRect(NB[0] - 230, NB[1] - 160, 400, 330, 20, { w: 9 }), ...[0, 1, 2, 3].map(i => W.line(NB[0] - 190, NB[1] - 90 + i * 66, NB[0] + 130, NB[1] - 90 + i * 66, { w: 5 })), ...[0, 1, 2, 3, 4].map(i => W.circle(NB[0] - 230, NB[1] - 120 + i * 62, 14, { w: 6 }))], S(s5, 'imagine'), E(s5, 'notebook') + .3);
  D(O, [W.poly(pts(NB[0] + 330, NB[1] - 260, [[-120, -100], [140, -150], [190, 140], [-70, 190], [-120, -100]]), { w: 9 }), W.line(NB[0] + 190, NB[1] - 30, NB[0] + 260, NB[1] - 70, { w: 6 }), W.line(NB[0] + 190, NB[1] + 40, NB[0] + 280, NB[1] + 20, { w: 6 })], S(s5, 'ripping'), E(s5, 'pages') + .3);
  // the mouse experiment
  shot(S(s5, 'experiments') - .3, 1640, 3800, .85);
  const mouse = (x, y, s = 1) => [ell(x, y, 120 * s, 70 * s, { w: 9 }), W.circle(x + 95 * s, y - 60 * s, 36 * s, { w: 8 }), W.circle(x + 135 * s, y - 15 * s, 6 * s, { w: 7 }), W.curve([[x - 120 * s, y + 10 * s], [x - 210 * s, y - 20 * s], [x - 240 * s, y + 60 * s], [x - 300 * s, y + 30 * s]], { w: 7 }), W.line(x + 170 * s, y + 5 * s, x + 230 * s, y - 10 * s, { w: 5 }), W.line(x + 170 * s, y + 18 * s, x + 230 * s, y + 25 * s, { w: 5 })];
  const MX = 2000, MY = 3530;
  D(K, mouse(MX, MY, .9), S(s5, 'baby') - .1, E(s5, 'mice') + .2);
  D(B, [...T('new neurons', MX + 330, MY - 30, { h: 44 }), ...W.arrow(MX + 640, MY - 90, MX + 640, MY + 10, { w: 8, head: 24 })], S(s5, 'slowed'), E(s5, 'growth'));
  D(O, T('forgot less ✓', MX + 330, MY + 90, { h: 62 }), S(s5, 'forgot'), E(s5, 'less') + .5);
  pose(S(s5, 'forgot'), 'point'); pose(vEnd(s5) + .4, 'idle');

  // ═════════ S06 SUSPECT 2 — NO WORDS
  const s6 = 's06_words';
  shot(VO[s6] - 1.0, 4380, 3990, .85);
  wipeQ(1, VO[s6] - .7);
  D(B, T('no words', 3800, 3460, { h: 66 }), S(s6, 'no'), E(s6, 'words') + .3);
  const folder = (x, y, w, h) => [W.poly([[x - w / 2, y - h / 2 + 40], [x - w / 2, y + h / 2], [x + w / 2, y + h / 2], [x + w / 2, y - h / 2 + 40], [x - 30, y - h / 2 + 40], [x - 70, y - h / 2], [x - w / 2 + 20, y - h / 2], [x - w / 2, y - h / 2 + 40]], { w: 9 })];
  const F1 = [3950, 3660], F2 = [4850, 3660], F3 = [4450, 4100];
  D(K, [...folder(F1[0], F1[1], 520, 300), ...folder(F2[0], F2[1], 520, 300)], S(s6, 'files') - .2, E(s6, 'labels') - .2);
  D(K, T('my 10th', F1[0], F1[1] + 30, { h: 50, align: 'center' }), S(s6, 'my'), E(s6, 'birthday') - .3);
  D(K, T('birthday', F1[0], F1[1] + 95, { h: 50, align: 'center' }), E(s6, 'birthday') - .3, E(s6, 'birthday') + .4);
  D(K, T('broke my', F2[0], F2[1] + 30, { h: 50, align: 'center' }), S(s6, 'the', 0), E(s6, 'broke'));
  D(K, T('arm', F2[0], F2[1] + 95, { h: 50, align: 'center' }), E(s6, 'broke'), E(s6, 'arm') + .3);
  D(O, [...folder(F3[0], F3[1], 520, 300), ...T('???', F3[0], F3[1] + 60, { h: 90, align: 'center' })], S(s6, 'but'), E(s6, 'anything') + .3);
  pose(S(s6, 'but'), 'point'); pose(E(s6, 'anything') + .4, 'idle');
  const MG = [5200, 4130];
  D(B, [W.circle(MG[0], MG[1], 90, { w: 10 }), W.line(MG[0] + 65, MG[1] + 65, MG[0] + 170, MG[1] + 170, { w: 16 }), ...T('0 results', MG[0] - 60, MG[1] + 290, { h: 50 })], S(s6, 'search') - .3, E(s6, 'it', 1) + .6);
  D(O, T('memory.baby — can\'t open ×', 3800, 4350, { h: 50 }), S(s6, 'format'), E(s6, 'anymore') + .3);
  pose(S(s6, 'computer'), 'shrug'); pose(vEnd(s6) + .4, 'idle');

  // ═════════ S07 SUSPECT 3 — NO "ME"
  const s7 = 's07_me';
  shot(VO[s7] - 1.0, 7180, 3990, .85);
  wipeQ(2, VO[s7] - .7);
  D(B, T('no "me" yet', 6550, 3460, { h: 66 }), S(s7, 'no'), E(s7, 'yet') + .3);
  D(O, [W.circle(6850, 3770, 120, { w: 10 }), ...T('me', 6850, 3810, { h: 100, align: 'center' })], S(s7, 'sense'), E(s7, 'me') + .4);
  // mirror test
  const MR = [7750, 3960];
  D(K, [ell(MR[0], MR[1], 230, 320, { w: 12 }), ell(MR[0], MR[1], 200, 290, { w: 6 }), W.line(MR[0], MR[1] + 320, MR[0], MR[1] + 420, { w: 10 }), W.line(MR[0] - 120, MR[1] + 420, MR[0] + 120, MR[1] + 420, { w: 10 })], S(s7, 'recognize'), E(s7, 'mirror'));
  D(K, [W.circle(MR[0], MR[1] - 40, 110, { w: 9 }), W.circle(MR[0] - 38, MR[1] - 60, 9, { w: 8 }), W.circle(MR[0] + 38, MR[1] - 60, 9, { w: 8 }), W.arc(MR[0], MR[1] - 20, 40, .5, 2.6, { w: 8 }), W.curve([[MR[0] - 10, MR[1] - 150], [MR[0] + 20, MR[1] - 175], [MR[0] + 5, MR[1] - 140]], { w: 7 })], S(s7, 'themselves'), E(s7, 'mirror') + .5);
  D(O, [...T('?', MR[0] + 130, MR[1] - 170, { h: 110 })], E(s7, 'mirror') + .1, E(s7, 'mirror') + .7);
  D(B, T('~18 months', MR[0], MR[1] - 380, { h: 54, align: 'center' }), S(s7, 'eighteen'), E(s7, 'months') + .4);
  // a story with no main character
  const BK = [6850, 4250];
  D(K, [W.poly(pts(BK[0], BK[1], [[0, -150], [-300, -180], [-300, 150], [0, 180], [300, 150], [300, -180], [0, -150], [0, 180]]), { w: 9 }), ...[0, 1, 2].map(i => W.line(BK[0] + 50, BK[1] - 90 + i * 60, BK[0] + 250, BK[1] - 100 + i * 60, { w: 5 }))], S(s7, 'before'), E(s7, 'main') - .1);
  D(O, [...W.dashed([[BK[0] - 150, BK[1] - 130], [BK[0] - 100, BK[1] - 110], [BK[0] - 100, BK[1] - 60], [BK[0] - 150, BK[1] - 40], [BK[0] - 200, BK[1] - 60], [BK[0] - 200, BK[1] - 110], [BK[0] - 150, BK[1] - 130]], { w: 7, dash: 20, gap: 14, smooth: 2 }), ...W.dashed([[BK[0] - 230, BK[1] + 110], [BK[0] - 200, BK[1] - 20], [BK[0] - 100, BK[1] - 20], [BK[0] - 70, BK[1] + 110]], { w: 7, dash: 20, gap: 14 })], S(s7, 'main'), E(s7, 'character') + .3);
  pose(S(s7, 'main'), 'shrug'); pose(vEnd(s7) + .3, 'idle');

  // ═════════ S08 THE BIG FORGETTING (age 7)
  const s8 = 's08_seven';
  // ride the timeline forward from age 3 to age 7
  shot(VO[s8] - 1.1, AGE(3.6), 2150, .8);
  const r0 = VO[s8] - .6, r1 = E(s8, 'while') + .2;
  D(K, W.line(AGE(3) + 300, TLY, AGE(10) + 250, TLY, { w: 11 }), r0, r1, { tag: 'timeline2' });
  D(K, [4, 5, 6, 7, 8, 9, 10].flatMap(a => [W.line(AGE(a), TLY - 30, AGE(a), TLY + 30, { w: 9 }), ...T(String(a), AGE(a), TLY + 110, { h: 56, align: 'center' })]), r0 + .4, r1 + 1.0);
  shot(S(s8, 'little') + .2, AGE(5.4), 2150, .8, 's', .25, 4);
  shot(S(s8, 'psychologist') - .1, AGE(7.1), 2520, .82);
  D(B, T('Bauer: 3-year-olds', 6700, 2225, { h: 52 }), S(s8, 'psychologist'), E(s8, 'olds') + .6);
  // the chart
  const CX0 = 6500, CB = 2850, CHH = 450;
  D(K, [W.line(CX0, CB, CX0, CB - CHH - 40, { w: 8 }), W.line(CX0, CB, CX0 + 1350, CB, { w: 8 })], S(s8, 'years'), E(s8, 'remembered', 0) + .2);
  const bar = (x, f, o) => [W.rect(x, CB - CHH * f, 300, CHH * f, { w: 9, over: 4 }), W.hatch([[x + 10, CB - CHH * f + 10], [x + 290, CB - CHH * f + 10], [x + 290, CB - 10], [x + 10, CB - 10]], { spacing: 30, w: 8, alpha: .5, ...o })];
  D(B, [...bar(CX0 + 120, .68), ...T('5–7', CX0 + 270, CB + 80, { h: 54, align: 'center' }), ...T('most', CX0 + 270, CB - CHH * .68 - 40, { h: 50, align: 'center' })], S(s8, 'five'), E(s8, 'most') + .4);
  D(O, [...bar(CX0 + 640, .34), ...T('8–9', CX0 + 790, CB + 80, { h: 54, align: 'center' }), ...T('~1/3', CX0 + 790, CB - CHH * .34 - 40, { h: 54, align: 'center' })], S(s8, 'eight'), E(s8, 'third') + .3);
  pose(S(s8, 'eight'), 'point'); pose(E(s8, 'third') + .5, 'idle');
  // the reveal: silence, then the arrow lands on 7
  shot(S(s8, 'doesn') - .2, AGE(6.6), 2150, .62);
  const rv = S(s8, 'happens', 0) - .15;
  D(O, [...W.arrow(AGE(7), TLY - 330, AGE(7), TLY - 50, { w: 13, head: 40 }), ...T('the big forgetting', AGE(7), TLY - 370, { h: 74, align: 'center' })], rv - .25, E(s8, 'seven') + .6);
  D(O, W.circle(AGE(7), TLY, 90, { w: 11 }), E(s8, 'seven') + .1, E(s8, 'seven') + .8);
  pose(S(s8, 'doesn'), 'idle'); pose(rv - .2, 'point'); pose(vEnd(s8) + .6, 'idle');
  const revealT = rv;

  // ═════════ S09 LOCKED, NOT LOST
  const s9 = 's09_locked';
  shot(VO[s9] - 1.0, 9050, 2760, .85);
  D(K, T('deleted?', 9100, 2290, { h: 72 }), S(s9, 'are'), E(s9, 'deleted') + .3);
  D(O, T('maybe not!', 9100, 2380, { h: 58 }), S(s9, 'maybe'), E(s9, 'not') + .3);
  const MS = [8950, 2700];
  D(B, T('2018 · Toronto', 8640, 2530, { h: 50 }), S(s9, 'twenty'), E(s9, 'toronto'));
  D(K, mouse(MS[0], MS[1], .9), S(s9, 'gave') - .2, E(s9, 'memory') + .2);
  D(K, [W.circle(MS[0] + 85, MS[1] - 160, 6, { w: 8 }), ...[0, 1, 2].map(i => W.circle(MS[0] + 60 + i * 26, MS[1] - 75, 12, { w: 6 }))], S(s9, 'waited'), E(s9, 'forgotten'));
  // light beam onto the exact cells
  D(B, [W.poly([[9450, 2400], [9560, 2470], [9520, 2530], [9410, 2460], [9450, 2400]], { w: 9 }), W.line(9440, 2490, MS[0] + 120, MS[1] - 80, { w: 7 }), W.line(9470, 2520, MS[0] + 140, MS[1] - 60, { w: 7 }), W.line(9410, 2470, MS[0] + 100, MS[1] - 100, { w: 7 })], S(s9, 'light'), E(s9, 'switch') + .2);
  D(O, [0, 1, 2].map(i => W.circle(MS[0] + 60 + i * 26, MS[1] - 75, 22, { w: 7 })), S(s9, 'exact'), E(s9, 'cells') + .3);
  D(O, T('remembered! ✓', 9050, 2950, { h: 62, align: 'center' }), S(s9, 'remembered'), E(s9, 'remembered') + .5);
  pose(S(s9, 'remembered'), 'both'); pose(E(s9, 'there') + .2, 'idle');
  // a locked door
  shot(S(s9, 'couldn') - .4, 9200, 3080, .85);
  const DR = [9620, 3220];
  D(K, [W.rect(DR[0] - 140, DR[1] - 260, 280, 460, { w: 9, over: 4 }), W.circle(DR[0] + 90, DR[1] - 20, 12, { w: 8 })], S(s9, 'couldn'), E(s9, 'door') + .2);
  D(O, [W.arc(DR[0], DR[1] - 40, 50, Math.PI, TAU, { w: 10 }), W.roundRect(DR[0] - 75, DR[1] - 40, 150, 120, 16, { w: 10 })], E(s9, 'door') - .1, E(s9, 'door') + .7);
  // Yale 2025 scan
  shot(S(s9, 'and', 1) - .2, 9150, 3600, .85);
  const SC = [8850, 3640];
  D(B, T('Yale 2025', 8600, 3400, { h: 54 }), S(s9, 'twenty', 2), E(s9, 'yale') + .3);
  D(K, [W.circle(SC[0], SC[1], 200, { w: 12 }), W.circle(SC[0], SC[1], 160, { w: 6 }), W.circle(SC[0], SC[1], 80, { w: 9 }), W.circle(SC[0] - 28, SC[1] - 15, 8, { w: 7 }), W.circle(SC[0] + 28, SC[1] - 15, 8, { w: 7 }), W.arc(SC[0], SC[1] + 12, 26, .5, 2.6, { w: 7 })], S(s9, 'scanned'), E(s9, 'brains') + .3);
  D(O, [...T('saving memories', SC[0] + 280, SC[1] - 20, { h: 54 }), ...T('at ~1 year', SC[0] + 280, SC[1] + 60, { h: 54 })], S(s9, 'saw'), E(s9, 'old') + .3);
  D(O, T('locked, not lost', SC[0] + 280, SC[1] + 210, { h: 70 }), S(s9, 'locked'), E(s9, 'now') + .6);
  pose(S(s9, 'locked'), 'point'); pose(vEnd(s9) + .4, 'idle');

  // ═════════ S10 YOUR FIRST MEMORY MAY BE FAKE
  const s10 = 's10_fake';
  shot(VO[s10] - 1.0, 9230, 860, .85);
  const crowd = []; for (let i = 0; i < 9; i++) { const x = 8780 + i * 110, y = 470; crowd.push(W.circle(x, y, 26, { w: 7 }), W.arc(x, y + 85, 45, Math.PI + .2, TAU - .2, { w: 7 })); }
  D(K, crowd, S(s10, 'survey'), E(s10, 'people') + .2);
  D(B, T('6,000+ people', 9200, 330, { h: 60, align: 'center' }), S(s10, 'six'), E(s10, 'people') + .5);
  D(O, T('~40%', 9000, 820, { h: 190, align: 'center' }), S(s10, 'almost'), E(s10, 'percent') + .3);
  D(K, [...T('"remember"', 9520, 740, { h: 50 }), ...T('age 2 or less', 9520, 815, { h: 50 })], S(s10, 'remembered'), E(s10, 'younger') + .3);
  D(O, [W.rect(8720, 600, 1440, 280, { w: 10, over: 10 }), ...T('FAKE?', 9440, 990, { h: 90, align: 'center' })], S(s10, 'fake') - .3, E(s10, 'fake') + .4);
  pose(S(s10, 'fake'), 'shrug'); pose(S(s10, 'not') + .4, 'idle');
  // stitched from photos + stories + things you were told
  const ph = [8850, 1250], sb = [9330, 1240], cl = [9830, 1230];
  D(K, [W.rect(ph[0] - 130, ph[1] - 100, 260, 200, { w: 9 }), W.poly([[ph[0] - 110, ph[1] + 80], [ph[0] - 30, ph[1] - 20], [ph[0] + 30, ph[1] + 40], [ph[0] + 70, ph[1] + 5], [ph[0] + 110, ph[1] + 80]], { w: 7 }), W.circle(ph[0] + 60, ph[1] - 50, 18, { w: 7 })], S(s10, 'photos'), E(s10, 'photos') + .3);
  D(K, [W.roundRect(sb[0] - 140, sb[1] - 90, 280, 160, 40, { w: 9 }), W.poly([[sb[0] - 50, sb[1] + 70], [sb[0] - 80, sb[1] + 130], [sb[0] + 10, sb[1] + 70]], { w: 9 }), ...T('...', sb[0], sb[1] + 20, { h: 70, align: 'center' })], S(s10, 'family'), E(s10, 'stories') + .2);
  D(K, [W.circle(cl[0] - 70, cl[1], 60, { w: 8 }), W.circle(cl[0], cl[1] - 40, 70, { w: 8 }), W.circle(cl[0] + 70, cl[1], 60, { w: 8 }), W.line(cl[0] - 110, cl[1] + 45, cl[0] + 110, cl[1] + 45, { w: 8 })], S(s10, 'told') - .2, E(s10, 'told') + .4);
  D(O, [...W.dashed([[ph[0] + 140, ph[1]], [sb[0] - 150, sb[1]]], { w: 7, dash: 22, gap: 16 }), ...W.dashed([[sb[0] + 150, sb[1]], [cl[0] - 140, cl[1]]], { w: 7, dash: 22, gap: 16 })], S(s10, 'stitched'), E(s10, 'together') + .3);
  D(O, T('"real"', cl[0], cl[1] + 140, { h: 58, align: 'center' }), S(s10, 'real'), E(s10, 'real') + .6);
  pose(S(s10, 'stitched'), 'point'); pose(vEnd(s10) + .3, 'idle');

  // ═════════ S11 RECAP + CTA
  const s11 = 's11_end';
  shot(VO[s11] - .9, 4150, 780, .95);                      // callback: the title
  pose(VO[s11], 'both');
  shot(S(s11, 'your') - .3, 4300, 3700, .225);               // the three suspects
  const ck = i => [W.line(CARD[i][1] - 560, CY0 + 200, CARD[i][1] - 470, CY0 + 300, { w: 22 }), W.line(CARD[i][1] - 470, CY0 + 300, CARD[i][1] - 260, CY0 + 60, { w: 22 })];
  D(O, ck(0), S(s11, 'construction') - .3, E(s11, 'construction') + .1);
  D(O, ck(1), S(s11, 'no') - .1, E(s11, 'words') + .1);
  D(O, ck(2), S(s11, 'no', 1) - .1, E(s11, 'me') + .2);
  shot(S(s11, 'around') - .3, AGE(7), 1900, .55);
  D(O, ell(AGE(7), TLY - 395, 420, 100, { w: 12 }), S(s11, 'cleaned') - .2, E(s11, 'house') + .2);
  pose(S(s11, 'cleaned'), 'point');
  // the whole lesson as one picture
  shot(S(s11, 'but') - .2, BW / 2, BH / 2 - 100, .17, 'io', .4, 2.6);
  pose(S(s11, 'but'), 'idle');
  shot(S(s11, 'every') , BW / 2 + 200, BH / 2 - 100, .2, 'l', .25, 5);
  // call to action
  const CT = [9250, 4300];
  shot(S(s11, 'so', 1) - .4, CT[0] - 80, CT[1], .9);
  D(K, [...T("What's YOUR", CT[0], CT[1] - 120, { h: 92, align: 'center' }), ...T('earliest memory?', CT[0], CT[1], { h: 92, align: 'center' })], S(s11, 'so', 1), E(s11, 'memory') + .3);
  D(O, [...T('comments ↓', CT[0], CT[1] + 150, { h: 80, align: 'center' }), W.curve([[CT[0] - 330, CT[1] + 190], [CT[0], CT[1] + 205], [CT[0] + 330, CT[1] + 185]], { w: 12 })], S(s11, 'drop'), E(s11, 'comments') + .4);
  pose(S(s11, 'so', 1), 'point'); pose(S(s11, 'drop'), 'wave'); pose(E(s11, 'fake') + .2, 'idle'); pose(END - 2.4, 'wave'); pose(END - .8, 'idle');
  hold(END);
  const capAt = E(s11, 'fake') + 1.2;

  tl.end();
  CAM.sort((a, b) => a[0] - b[0]); HK.sort((a, b) => a[0] - b[0]); POSE.sort((a, b) => a[0] - b[0]);
  const cam = new W.Camera(CAM);
  const board = new W.Board(tl, { ghosts, W: BW, H: BH });

  // ───────── host: a magnet that slides with the shots
  const hostAt = t => {
    if (t <= HK[0][0]) return { x: HK[0][1], y: HK[0][2], lift: 0 };
    let i = 0; while (i < HK.length - 2 && HK[i + 1][0] <= t) i++;
    const a = HK[i], b = HK[i + 1];
    if (t >= b[0]) return { x: b[1], y: b[2], lift: 0 };
    const u = clamp((t - a[0]) / Math.max(.01, b[0] - a[0])), e = u * u * u * (u * (u * 6 - 15) + 10);
    const moving = Math.hypot(b[1] - a[1], b[2] - a[2]) > 5;
    return { x: lerp(a[1], b[1], e), y: lerp(a[2], b[2], e), lift: moving ? Math.sin(Math.PI * u) * .9 : 0 };
  };
  const mouthAt = t => {
    for (const L of lines) {
      const t0 = VO[L.id]; let x = t - t0; if (x < 0) continue;
      if (L.id === SPLIT.id && x > splitAt) { x -= SPLIT.gap; if (x < splitAt) return 0; }
      const e = env[L.id], i = Math.floor(x * 50); if (i >= 0 && i < e.length - 1) return clamp((e[i] * .6 + e[i + 1] * .4 - .12) * 1.5);
    }
    return 0;
  };
  const talkAt = t => { let m = 0; for (let k = -6; k <= 6; k++) m += mouthAt(t + k * .05); return clamp(m / 13 * 2.2); };
  board.objs.push({
    draw: (ctx, t, c) => {
      if (t < HOST_IN - .4) return;
      const h = hostAt(t);
      const drop = clamp((t - HOST_IN + .4) / .7), dl = drop < 1 ? (1 - drop) * 1.6 : 0;
      const [sx, sy] = W.toScreen(c, h.x, h.y);
      const sc = Math.max(.55, c.z) * .8;               // keep the host readable on wide shots
      const bl = (() => { const p = (t + 1.3) % 4.1; return p < .14 ? Math.sin(p / .14 * Math.PI) : 0; })();
      const m = mouthAt(t);
      drawHost(ctx, sx, sy, sc, { mouth: m, blink: bl, ang: hostState(POSE, t, talkAt(t)), lift: Math.max(h.lift, dl), look: .7, sway: Math.sin(t * .8), bob: m * 3 + Math.sin(t * 1.7) * 2, tilt: Math.sin(t * .9) * .015 + (h.lift ? .04 * h.lift : 0) });
    }
  });
  // floating markers
  for (const P of [K, O, B]) board.objs.push({ draw: (ctx, t, c) => W.drawMarker(ctx, P, W.penPose(P, t, cam), c, t) });
  board.objs.push({ draw: (ctx, t, c) => { for (const e of tl.erasers) W.drawEraser(ctx, e, t, c); } });

  // ───────── burned subtitles (split into clauses ≤ 44 chars)
  const subs = [];
  for (const L of lines) {
    const ws = words[L.id];
    const cum = [0]; ws.forEach(w => cum.push(cum[cum.length - 1] + w[0].length + 1)); const tot = cum[cum.length - 1];
    const timeAt = f => { const c = f * tot; let i = 0; while (i < ws.length - 1 && cum[i + 1] <= c) i++; const u = clamp((c - cum[i]) / (cum[i + 1] - cum[i])); return lerp(ws[i][1], ws[i][2], u); };
    const parts = L.text.match(/[^,.?:]+[,.?:…]*\s*/g).reduce((acc, p) => {
      const last = acc[acc.length - 1];
      if (last != null && ((last + p).trim().length <= 44 || ((last.trim().length < 18 || p.trim().length < 14) && (last + p).trim().length <= 80))) acc[acc.length - 1] += p; else acc.push(p); return acc; }, []);
    let c0 = 0;
    for (const p of parts) {
      const f0 = c0 / L.text.length, f1 = (c0 + p.trimEnd().length) / L.text.length; c0 += p.length;
      subs.push({ t0: lt(L.id, f0 === 0 ? ws[0][1] : timeAt(f0)) - .05, t1: lt(L.id, f1 >= .999 ? ws[ws.length - 1][2] : timeAt(f1)) + .35, text: p.trim() });
    }
  }
  for (let i = 0; i < subs.length - 1; i++) subs[i].t1 = Math.min(Math.max(subs[i].t1, subs[i].t0 + 1.8), subs[i + 1].t0 - .04);
  // the host talks with his hands: a gesture on each new phrase unless a scripted pose is near
  const GEST = ['open', 'beat', 'openL', 'open2', 'chest', 'open', 'beat', 'openL'];
  const manual = POSE.slice(); let gi = 0;
  for (const sb of subs) {
    const t0 = sb.t0 + .1;
    if (manual.some(([tm]) => Math.abs(tm - t0) < 1.6 || (tm < t0 && tm > t0 - 2.6))) continue;
    if (t0 > END - 3) continue;
    POSE.push([t0, GEST[gi++ % GEST.length]], [Math.min(sb.t1, t0 + 2.2), 'idle']);
  }
  POSE.sort((a, b) => a[0] - b[0]);
  const noSubs = new URLSearchParams(location.search).has('nosubs');
  if (!noSubs) board.overlays.push({
    draw: (ctx, t) => {
      const s = subs.find(s => t >= s.t0 && t < s.t1); if (!s) return;
      const a = Math.min(1, (t - s.t0) / .12, (s.t1 - t) / .12);
      ctx.font = '44px AD';
      let rows = [s.text];
      if (ctx.measureText(s.text).width > 1250) {
        const ws = s.text.split(' '); let best = 1, bd = 1e9;
        for (let i = 1; i < ws.length; i++) { const d = Math.abs(ctx.measureText(ws.slice(0, i).join(' ')).width - ctx.measureText(ws.slice(i).join(' ')).width); if (d < bd) { bd = d; best = i; } }
        rows = [ws.slice(0, best).join(' '), ws.slice(best).join(' ')];
      }
      const w = Math.max(...rows.map(r => ctx.measureText(r).width)) + 64, h = 70 + (rows.length - 1) * 52, y0 = 1046 - h;
      ctx.globalAlpha = a * .9; ctx.fillStyle = '#fdfcf8'; ctx.shadowColor = 'rgba(30,30,40,.18)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
      ctx.beginPath(); ctx.roundRect(960 - w / 2, y0, w, h, 14); ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.globalAlpha = a;
      ctx.fillStyle = INK.orange; ctx.fillRect(960 - w / 2 + 22, y0 + h - 12, 36, 4);
      ctx.fillStyle = '#23262c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      rows.forEach((r, i) => ctx.fillText(r, 960, y0 + 37 + i * 52));
    }
  });

  // ───────── frame render with camera motion blur on fast moves
  const off = new OffscreenCanvas(1920, 1080), oc = off.getContext('2d');
  function render(ctx, t) {
    const dt = 1 / 24, a = cam.at(t), b = cam.at(Math.max(0, t - dt));
    const sp = Math.hypot((a.x - b.x) * a.z, (a.y - b.y) * a.z) + Math.abs(Math.log(a.z / b.z)) * 900;
    const N = sp > 14 ? Math.min(10, Math.ceil(sp * .5 / 4)) : 1;
    if (N === 1) { board.render(ctx, t, cam); return; }
    const ov = board.overlays; board.overlays = [];
    for (let i = 0; i < N; i++) { board.render(oc, t - dt * .5 * i / (N - 1), cam); ctx.globalAlpha = 1 / (i + 1); ctx.drawImage(off, 0, 0); }
    ctx.globalAlpha = 1; board.overlays = ov;
    for (const o of ov) { ctx.save(); o.draw(ctx, t); ctx.restore(); }
  }

  // ───────── events for the mixer
  const whips = [];
  for (let i = 1; i < CAM.length; i++) { const a = CAM[i - 1], b = CAM[i]; const d = Math.hypot(b[1] - a[1], b[2] - a[2]) * Math.min(a[3], b[3]) + Math.abs(Math.log(b[3] / a[3])) * 600; if (d > 500) whips.push({ t: +a[0].toFixed(3), dur: +(b[0] - a[0]).toFixed(3), amt: +Math.min(1.2, d / 2500).toFixed(2) }); }
  for (const t0 of magnets) tl.cue(t0, 'magnet', { big: 1 });
  for (let i = 1; i < HK.length; i++) if (Math.hypot(HK[i][1] - HK[i - 1][1], HK[i][2] - HK[i - 1][2]) > 5) { tl.cue(HK[i - 1][0], 'magnetOff'); tl.cue(HK[i][0] - .03, 'magnet', { big: 0 }); }
  tl.cue(capAt, 'capOn');
  const ev = [...tl.ev, ...Object.entries(VO).map(([id, t]) => ({ t, type: 'vo', id }))].sort((a, b) => a.t - b.t);
  for (const e of ev) if (e.x != null) { const c = cam.at(e.t), [px, py] = W.toScreen(c, e.x, e.y); e.pan = +clamp((px - 960) / 1400, -.7, .7).toFixed(2); e.z = +c.z.toFixed(2); e.on = px > -100 && px < 2020 && py > -100 && py < 1180 ? 1 : 0; }
  const sections = Object.fromEntries(Object.keys(VO).map(id => [id, [+VO[id].toFixed(3), +vEnd(id).toFixed(3)]]));
  return { dur: END, render, ev, subs, cues: { VO, sections, split: { id: SPLIT.id, at: splitAt, gap: SPLIT.gap }, revealT, whips, capAt, title: [VO.s02_title, VO.s02_title + 4] } };
}
