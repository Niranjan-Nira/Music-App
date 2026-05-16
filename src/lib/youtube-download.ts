import path from 'path';
import fs from 'fs';
import os from 'os';
import youtubedl from 'youtube-dl-exec';
import yts from 'yt-search';
import ytdl from '@distube/ytdl-core';
import * as cheerio from 'cheerio';

// Force Next.js and Vercel dependency tracing to include cheerio (required by yt-search)
if (typeof cheerio === 'undefined') {
  console.log('cheerio fallback trace placeholder');
}
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
  const base64 = process.env.YOUTUBE_COOKIES_BASE64?.trim();
  if (base64) {
    try {
      return Buffer.from(base64, 'base64').toString('utf8');
    } catch (e) {
      console.error('Invalid YOUTUBE_COOKIES_BASE64:', e);
    }
  }

  let netscape = process.env.YOUTUBE_COOKIES?.trim();
  // Vercel sometimes stores multiline env vars with literal \n
  if (netscape?.includes('\\n')) {
    netscape = netscape.replace(/\\n/g, '\n');
  }
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

function parseNetscapeForYtdl(content: string) {
  return content
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const p = line.split('\t');
      if (p.length < 7) return null;
      const domain = p[0];
      if (!domain.includes('youtube.com')) return null;
      return {
        name: p[5],
        value: p[6],
        domain: domain.startsWith('.') ? domain.slice(1) : domain,
        path: p[2] || '/',
        secure: p[3]?.toUpperCase() === 'TRUE',
        expirationDate: Number(p[4]) || undefined,
      };
    })
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
}

/** Parse cookies for ytdl-core fallback agent. */
export function getYtdlAgent(): ReturnType<typeof ytdl.createAgent> | undefined {
  const json = process.env.YOUTUBE_COOKIES_JSON?.trim();
  if (json) {
    try {
      const cookies = JSON.parse(json);
      if (Array.isArray(cookies) && cookies.length > 0) {
        return ytdl.createAgent(cookies);
      }
    } catch (e) {
      console.error('Invalid YOUTUBE_COOKIES_JSON:', e);
    }
  }

  const netscape = readCookiesContent();
  if (netscape) {
    const cookies = parseNetscapeForYtdl(netscape);
    if (cookies.length > 0) return ytdl.createAgent(cookies);
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

export function extractErrorText(error: unknown): string {
  if (error && typeof error === 'object') {
    const err = error as { message?: string; stderr?: string };
    if (err.stderr) return err.stderr;
    if (err.message) return err.message;
  }
  return error instanceof Error ? error.message : String(error);
}

export async function downloadYouTubeAudio(
  videoUrl: string,
  outputPath: string
): Promise<string> {
  try {
    return await downloadWithYtDlp(videoUrl, outputPath);
  } catch (ytDlpError) {
    const detail = extractErrorText(ytDlpError);
    console.warn('yt-dlp download failed:', detail);

    if (!hasYouTubeCookies()) {
      throw new Error(getBotBlockHelpMessage());
    }

    if (getYtdlAgent()) {
      console.warn('Trying ytdl-core fallback with cookies...');
      return await downloadWithYtdlCore(videoUrl, outputPath);
    }

    throw new Error(detail || 'YouTube download failed');
  }
}

function cookiesLookValid(content: string): boolean {
  return (
    content.includes('.youtube.com') &&
    (content.includes('LOGIN_INFO') ||
      content.includes('SID') ||
      content.includes('__Secure-1PSID'))
  );
}

export function hasYouTubeCookies(): boolean {
  if (process.env.YOUTUBE_COOKIES_JSON?.trim() || process.env.YOUTUBE_COOKIE?.trim()) {
    return true;
  }

  const content = readCookiesContent();
  return Boolean(content && cookiesLookValid(content));
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
