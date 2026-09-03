import express from 'express';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { promises as fsp } from 'fs';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { create } from 'youtube-dl-exec';
import bundledYoutubedl from 'youtube-dl-exec';
import ffmpegStaticPath from 'ffmpeg-static';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4321;

function which(bin, versionFlag = '--version') {
  try {
    execFileSync(bin, [versionFlag], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Prefer a system-installed yt-dlp (e.g. via pip/brew, or baked into the Docker
// image) over the one youtube-dl-exec's postinstall tries to fetch from GitHub —
// that fetch can fail behind flaky networks/rate limits, whereas a system binary
// is deterministic and easy to keep updated independently of npm.
const youtubedl = which('yt-dlp') ? create('yt-dlp') : bundledYoutubedl;

// ffmpeg-static ships a bundled binary that works with zero OS-level install —
// required on Vercel, which has no apt/pip access — and doubles as a reliable
// fallback everywhere else too, so it's tried first rather than only as backup.
let ffmpegPath = null;
if (ffmpegStaticPath && which(ffmpegStaticPath, '-version')) {
  ffmpegPath = ffmpegStaticPath;
} else if (which('ffmpeg', '-version')) {
  // ffmpeg only understands single-dash flags (-version), unlike most other CLIs.
  ffmpegPath = 'ffmpeg';
}
const hasFfmpeg = Boolean(ffmpegPath);
if (!hasFfmpeg) {
  console.warn('ffmpeg not found — "Best" and "Audio" quality options will be unavailable. See README.');
}

app.use(express.json());

// Belt-and-braces against any CDN/edge/browser cache along the way — every
// dynamic response here reflects live state and must never be reused.
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// There is deliberately no access-key check here. An earlier version gated
// /api behind an ACCESS_KEY env var, but a stale value on the host kept
// locking the owner out of their own tool with no way to clear it from the
// app itself. Access control now depends solely on the URL being unlisted.
// To reinstate a key, add the check here AND in public/app.js together.

function isYoutubeUrl(raw) {
  try {
    const u = new URL(raw);
    return ['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be', 'music.youtube.com']
      .includes(u.hostname);
  } catch {
    return false;
  }
}

// bestvideo+bestaudio merged by ffmpeg gets the actual highest resolution/bitrate
// YouTube offers (often only available as separate video/audio tracks); the
// mp4-first ordering keeps the result compatible with the widest range of players.
const FORMATS = {
  standard: {
    format: 'best[ext=mp4]/best',
    ext: 'mp4',
    requiresFfmpeg: false,
  },
  best: {
    format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
    mergeOutputFormat: 'mp4',
    ext: 'mp4',
    requiresFfmpeg: true,
  },
  audio: {
    format: 'bestaudio/best',
    extractAudio: true,
    audioFormat: 'mp3',
    audioQuality: 0,
    ext: 'mp3',
    requiresFfmpeg: true,
  },
};

app.get('/api/capabilities', (req, res) => {
  res.json({ ffmpeg: hasFfmpeg });
});

app.get('/api/info', async (req, res) => {
  const url = req.query.url;
  if (!isYoutubeUrl(url)) return res.status(400).json({ error: 'Not a valid YouTube URL' });

  try {
    const raw = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      preferFreeFormats: true,
      addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
      ...(ffmpegPath ? { ffmpegLocation: ffmpegPath } : {}),
    });
    const info = typeof raw === 'string' ? JSON.parse(raw) : raw;
    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration_string || null,
      id: info.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch video info. It may be private, age-restricted, or region-locked.' });
  }
});

app.get('/api/download', async (req, res) => {
  const { url, format = 'standard', title = 'video' } = req.query;
  if (!isYoutubeUrl(url)) return res.status(400).send('Not a valid YouTube URL');

  const chosen = FORMATS[format] || FORMATS.standard;
  if (chosen.requiresFfmpeg && !hasFfmpeg) {
    return res.status(400).send('This quality requires ffmpeg to be installed. See the README for a one-line install command.');
  }

  const safeTitle = String(title).replace(/[^\w\-.,() ]/g, '').slice(0, 100) || 'video';
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ytdl-'));
  const outTemplate = path.join(tempDir, 'download.%(ext)s');

  const subprocess = youtubedl.exec(
    url,
    {
      output: outTemplate,
      format: chosen.format,
      ...(chosen.mergeOutputFormat ? { mergeOutputFormat: chosen.mergeOutputFormat } : {}),
      ...(chosen.extractAudio ? { extractAudio: true } : {}),
      ...(chosen.audioFormat ? { audioFormat: chosen.audioFormat } : {}),
      ...(chosen.audioQuality !== undefined ? { audioQuality: chosen.audioQuality } : {}),
      noWarnings: true,
      noCheckCertificates: true,
      addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
      ...(ffmpegPath ? { ffmpegLocation: ffmpegPath } : {}),
    },
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );

  req.on('close', () => {
    if (!subprocess.killed) subprocess.kill('SIGKILL');
  });

  let stderr = '';
  subprocess.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });

  try {
    await subprocess;

    const files = await fsp.readdir(tempDir);
    if (files.length === 0) throw new Error('yt-dlp produced no output file');
    const outputFile = path.join(tempDir, files[0]);
    const ext = path.extname(outputFile).slice(1) || chosen.ext;
    const stat = await fsp.stat(outputFile);

    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.${ext}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);

    const readStream = fs.createReadStream(outputFile);
    const cleanup = () => fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    readStream.on('close', cleanup);
    readStream.on('error', cleanup);
    readStream.pipe(res);
  } catch (err) {
    console.error('Download failed:', stderr.slice(-2000) || err.message);
    await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    if (!res.headersSent) {
      res.status(500).send('Download failed. It may be private, age-restricted, region-locked, or need a newer yt-dlp.');
    }
  }
});

// On Vercel this file is imported as a serverless function handler (see
// api/index.js) rather than run directly, so it must not also try to bind
// a port itself.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\nYouTube downloader running at http://localhost:${PORT}\n`);
    console.log(`ffmpeg detected: ${hasFfmpeg ? 'yes (Best/Audio available)' : 'no (only Standard quality available)'}\n`);
  });
}

export default app;
