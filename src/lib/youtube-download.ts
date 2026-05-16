import path from 'path';
import fs from 'fs';
import os from 'os';
import youtubedl from 'youtube-dl-exec';
import yts from 'yt-search';
import ytdl from '@distube/ytdl-core';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/** Copy binaries to /tmp on Linux serverless (Vercel) so they are executable. */
function prepareExecutable(originalPath: string): string {
  if (process.platform === 'win32') return originalPath;

  try {
    const tempBinDir = path.join(os.tmpdir(), 'bin');
    if (!fs.existsSync(tempBinDir)) fs.mkdirSync(tempBinDir, { recursive: true });

    const targetPath = path.join(tempBinDir, path.basename(originalPath));
    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(originalPath, targetPath);
    }
    fs.chmodSync(targetPath, '755');
    return targetPath;
  } catch (err) {
    console.error(`Failed to prepare executable ${originalPath}:`, err);
    return originalPath;
  }
}

export function getFfmpegPath(): string {
  const isWin = process.platform === 'win32';
  const original = path.join(
    process.cwd(),
    'node_modules',
    'ffmpeg-static',
    isWin ? 'ffmpeg.exe' : 'ffmpeg'
  );
  const prepared = prepareExecutable(original);

  // Windows: paths with spaces break youtube-dl-exec CLI quoting — use temp copy
  if (isWin && prepared.includes(' ')) {
    const tempFfmpeg = path.join(os.tmpdir(), 'ffmpeg-static.exe');
    if (!fs.existsSync(tempFfmpeg)) {
      fs.copyFileSync(prepared, tempFfmpeg);
    }
    return tempFfmpeg;
  }

  return prepared;
}

export function getYtDlpPath(): string {
  const binName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const original = path.resolve(
    process.cwd(),
    'node_modules',
    'youtube-dl-exec',
    'bin',
    binName
  );
  return prepareExecutable(original);
}

/** Convert browser cookie header string to Netscape format for yt-dlp. */
function headerCookiesToNetscape(header: string): string {
  const lines = ['# Netscape HTTP Cookie File', '# Generated from YOUTUBE_COOKIE'];
  const expiry = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;

  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (!trimmed || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!name) continue;
    lines.push(`.youtube.com\tTRUE\t/\tTRUE\t${expiry}\t${name}\t${value}`);
    lines.push(`.google.com\tTRUE\t/\tTRUE\t${expiry}\t${name}\t${value}`);
  }

  return lines.join('\n');
}

function readCookiesContent(): string | undefined {
  const netscape = process.env.YOUTUBE_COOKIES?.trim();
  const legacyHeader = process.env.YOUTUBE_COOKIE?.trim();

  if (netscape) {
    return netscape.startsWith('# Netscape')
      ? netscape
      : `# Netscape HTTP Cookie File\n${netscape}`;
  }

  if (legacyHeader) {
    return headerCookiesToNetscape(legacyHeader);
  }

  const filePath =
    process.env.YOUTUBE_COOKIES_FILE?.trim() ||
    path.join(process.cwd(), 'youtube-cookies.txt');

  if (filePath && fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  }

  return undefined;
}

/** Path to cookies file for yt-dlp (--cookies). */
export function getCookiesFilePath(): string | undefined {
  const content = readCookiesContent();
  if (!content) return undefined;

  const cookiesPath = path.join(os.tmpdir(), `yt-cookies-${Date.now()}.txt`);
  fs.writeFileSync(cookiesPath, content, 'utf8');
  return cookiesPath;
}

/** Parse JSON cookie array (EditThisCookie export) for ytdl-core agent. */
export function getYtdlAgent(): ReturnType<typeof ytdl.createAgent> | undefined {
  const json = process.env.YOUTUBE_COOKIES_JSON?.trim();
  if (!json) return undefined;

  try {
    const cookies = JSON.parse(json);
    if (Array.isArray(cookies) && cookies.length > 0) {
      return ytdl.createAgent(cookies);
    }
  } catch (e) {
    console.error('Invalid YOUTUBE_COOKIES_JSON:', e);
  }
  return undefined;
}

export async function searchYouTube(query: string): Promise<{ title: string; url: string } | null> {
  const result = await yts(query);
  const videos = result.videos ?? [];
  if (videos.length === 0) return null;

  const video =
    videos.find((v) => /official audio/i.test(v.title) && !/lyric/i.test(v.title)) ||
    videos.find((v) => /official video/i.test(v.title) && !/lyric/i.test(v.title)) ||
    videos.find((v) => !/lyric/i.test(v.title)) ||
    videos[0];

  if (!video?.url) return null;
  return { title: video.title, url: video.url };
}

function resolveOutputFile(requestedPath: string): string {
  if (fs.existsSync(requestedPath)) return requestedPath;

  const base = path.basename(requestedPath, path.extname(requestedPath));
  const dir = path.dirname(requestedPath);
  const alt = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(base) && /\.(mp3|m4a|opus|webm)$/i.test(f))
    .sort((a, b) => {
      const score = (f: string) => (f.endsWith('.mp3') ? 2 : 1);
      return score(b) - score(a);
    })[0];

  if (alt) return path.join(dir, alt);

  throw new Error('Download finished but MP3 file was not found.');
}

/** Primary download path: yt-dlp (most reliable with cookies on serverless). */
export async function downloadWithYtDlp(videoUrl: string, outputPath: string): Promise<string> {
  const yt = youtubedl.create(getYtDlpPath());
  const ffmpegPath = getFfmpegPath();
  const cookiesPath = getCookiesFilePath();

  const baseOpts: Record<string, unknown> = {
    noPlaylist: true,
    noWarnings: true,
    extractAudio: true,
    audioFormat: 'mp3',
    output: outputPath,
    ffmpegLocation: ffmpegPath,
    retries: 3,
    // Required on current YouTube — solves n/signature challenges via Node
    remoteComponents: 'ejs:npm',
    jsRuntimes: 'node',
  };

  if (cookiesPath) {
    baseOpts.cookies = cookiesPath;
  }

  try {
    await yt(videoUrl, baseOpts);
  } finally {
    if (cookiesPath && fs.existsSync(cookiesPath)) {
      try {
        fs.unlinkSync(cookiesPath);
      } catch {
        /* ignore */
      }
    }
  }

  return resolveOutputFile(outputPath);
}

/** Fallback: ytdl-core stream piped through ffmpeg. */
export async function downloadWithYtdlCore(videoUrl: string, outputPath: string): Promise<string> {
  const agent = getYtdlAgent();
  const ffmpegPath = getFfmpegPath();

  const info = await ytdl.getInfo(videoUrl, agent ? { agent } : {});
  const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
  if (!format) throw new Error('No audio format available from YouTube.');

  const stream = ytdl.downloadFromInfo(info, { format, ...(agent ? { agent } : {}) });

  const ffmpegCmd = `"${ffmpegPath}" -i pipe:0 -vn -ab 128k -ar 44100 -y "${outputPath}"`;
  const child = exec(ffmpegCmd);

  await new Promise<void>((resolve, reject) => {
    stream.pipe(child.stdin!);
    stream.on('error', reject);
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });

  return resolveOutputFile(outputPath);
}

export async function downloadYouTubeAudio(
  videoUrl: string,
  outputPath: string
): Promise<string> {
  try {
    return await downloadWithYtDlp(videoUrl, outputPath);
  } catch (ytDlpError) {
    console.warn('yt-dlp download failed, trying ytdl-core fallback:', ytDlpError);
    return await downloadWithYtdlCore(videoUrl, outputPath);
  }
}

export function hasYouTubeCookies(): boolean {
  if (
    process.env.YOUTUBE_COOKIES?.trim() ||
    process.env.YOUTUBE_COOKIES_JSON?.trim() ||
    process.env.YOUTUBE_COOKIE?.trim()
  ) {
    return true;
  }

  const filePath =
    process.env.YOUTUBE_COOKIES_FILE?.trim() ||
    path.join(process.cwd(), 'youtube-cookies.txt');

  return Boolean(filePath && fs.existsSync(filePath));
}

export function getBotBlockHelpMessage(): string {
  const hasCookies = hasYouTubeCookies();

  if (hasCookies) {
    return 'YouTube blocked this download. Your cookies may have expired — export fresh cookies from your browser and update Vercel env vars (YOUTUBE_COOKIES or YOUTUBE_COOKIES_JSON).';
  }

  return 'YouTube blocked this download from the server. Add YOUTUBE_COOKIES (Netscape format) or YOUTUBE_COOKIES_JSON to your Vercel project environment variables. Export cookies while logged into YouTube using a browser extension like Get cookies.txt LOCALLY.';
}

export function isBotBlockError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('sign in to confirm') ||
    lower.includes('not a bot') ||
    lower.includes('bot detection') ||
    lower.includes('confirm you')
  );
}
