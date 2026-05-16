import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import os from 'os';
import cloudinary from '@/lib/cloudinary';
import {
  searchYouTube,
  downloadYouTubeAudio,
  extractErrorText,
  getBotBlockHelpMessage,
  hasYouTubeCookies,
  isBotBlockError,
} from '@/lib/youtube-download';

export const runtime = 'nodejs';
export const maxDuration = 120;

const STALE_PLAY_DL_ERROR = 'While getting info from url';

export async function POST(request: Request) {
  try {
    const { title, artist, album } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // On Vercel, downloads need authenticated YouTube cookies
    if (process.env.VERCEL === '1' && !hasYouTubeCookies()) {
      return NextResponse.json(
        { error: getBotBlockHelpMessage() },
        { status: 503 }
      );
    }

    const searchQuery = `${title} ${artist || ''} official audio`.trim();
    console.log(`Searching YouTube for: ${searchQuery}`);

    const target = await searchYouTube(searchQuery);
    if (!target) {
      return NextResponse.json({ error: 'Could not find song on YouTube' }, { status: 404 });
    }

    console.log(`Found: ${target.title} (${target.url})`);

    const tempFile = path.join(os.tmpdir(), `dl-${Date.now()}.mp3`);
    await downloadYouTubeAudio(target.url, tempFile);

    const buffer = fs.readFileSync(tempFile);
    fs.unlinkSync(tempFile);

    console.log(`Buffered audio (${buffer.length} bytes), uploading to Cloudinary...`);

    const safeArtist = (artist || 'Unknown Artist').replace(/[|=]/g, '-');
    const safeAlbum = (album || 'Unknown Album').replace(/[|=]/g, '-');

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'musicify_downloads',
          public_id: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}`,
          context: `artist=${safeArtist}|album=${safeAlbum}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(buffer);
    });

    const secureUrl = (uploadResult as { secure_url: string }).secure_url;

    return NextResponse.json({
      success: true,
      url: secureUrl,
      artist: artist || 'Unknown Artist',
      album: album || 'Unknown Album',
      message: 'Processed and uploaded successfully',
    });
  } catch (error: unknown) {
    const message = extractErrorText(error);
    console.error('Download/Upload Error:', message);

    if (message.includes(STALE_PLAY_DL_ERROR)) {
      return NextResponse.json(
        {
          error:
            'Production is still on old code (play-dl). In Vercel → Deployments → Redeploy the latest commit from GitHub main, then add YOUTUBE_COOKIES_BASE64. Check: /api/health should show downloadEngine "yt-dlp-v3".',
        },
        { status: 503 }
      );
    }

    const userMessage = isBotBlockError(message) ? getBotBlockHelpMessage() : message;

    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
