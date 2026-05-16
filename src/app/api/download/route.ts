import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import os from 'os';
import cloudinary from '@/lib/cloudinary';
import {
  searchYouTube,
  downloadYouTubeAudio,
  getBotBlockHelpMessage,
  hasYouTubeCookies,
  isBotBlockError,
} from '@/lib/youtube-download';

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
    const message = error instanceof Error ? error.message : 'Failed to process song';
    console.error('Download/Upload Error:', error);

    const userMessage = isBotBlockError(message) ? getBotBlockHelpMessage() : message;

    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
