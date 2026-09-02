import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import youtubedl from 'youtube-dl-exec';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4321;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function isYoutubeUrl(raw) {
  try {
    const u = new URL(raw);
    return ['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be', 'music.youtube.com']
      .includes(u.hostname);
  } catch {
    return false;
  }
}

const FORMATS = {
  standard: { format: 'best[ext=mp4]/best', ext: 'mp4' },
  best: { format: 'bestvideo+bestaudio/best', ext: 'mp4', mergeOutputFormat: 'mp4' },
  audio: { format: 'bestaudio/best', ext: 'm4a' },
};

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
  const safeTitle = String(title).replace(/[^\w\-.,() ]/g, '').slice(0, 100) || 'video';

  res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.${chosen.ext}"`);
  res.setHeader('Content-Type', 'application/octet-stream');

  const subprocess = youtubedl.exec(
    url,
    {
      output: '-',
      format: chosen.format,
      ...(chosen.mergeOutputFormat ? { mergeOutputFormat: chosen.mergeOutputFormat } : {}),
      noWarnings: true,
      noCheckCertificates: true,
      addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
    },
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );

  subprocess.stdout.pipe(res);

  let stderr = '';
  subprocess.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  subprocess.on('error', (err) => {
    console.error('yt-dlp failed to start:', err);
    if (!res.headersSent) res.status(500).end('Download failed to start.');
  });

  subprocess.on('close', (code) => {
    if (code !== 0) {
      console.error('yt-dlp exited with code', code, stderr.slice(-2000));
      if (!res.headersSent) res.status(500).end('Download failed. See server logs.');
      else res.end();
    }
  });

  req.on('close', () => {
    if (!subprocess.killed) subprocess.kill('SIGKILL');
  });
});

app.listen(PORT, () => {
  console.log(`\nYouTube downloader running at http://localhost:${PORT}\n`);
});
