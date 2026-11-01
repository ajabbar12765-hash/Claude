// Renders the HyperFrames composition frame-by-frame: seeks window.__timelines.main and pipes JPEG frames to ffmpeg.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const FPS = 30, DUR = 16, W = 1080, H = 1920;
const out = process.argv[2] || 'freshleaf-ad-9x16.mp4';
const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null; // stills mode: list of seconds
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html') + '?render');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => window.__timelines && window.__timelines.main && [...document.images].every(i => i.complete));
  const seek = t => page.evaluate(t => { window.__timelines.main.seek(t, false); }, t);
  if (only) {
    for (const t of only) { await seek(t); await page.screenshot({ path: `${out}-${t}.png` }); }
    await browser.close(); return;
  }
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-i', path.resolve(__dirname, 'assets/music.wav'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = FPS * DUR;
  for (let f = 0; f < N; f++) {
    await seek(f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 60 === 0) process.stdout.write(`frame ${f}/${N}\n`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('wrote', out);
})();
