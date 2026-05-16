import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

// @ts-ignore
const play = require('play-dl');
import cloudinary from '@/lib/cloudinary';

const execAsync = promisify(exec);

// Helper to prepare executable in /tmp for Vercel
function getExecutablePath(originalPath: string) {
  if (process.platform === 'win32') return originalPath;
  
  const os = require('os');
  const fs = require('fs');
  const path = require('path');
  
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

export async function POST(request: Request) {
  try {
    const { title, artist, album } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Step 0: Set YouTube Cookie if available
    const youtubeCookie = process.env.YOUTUBE_COOKIE;
    if (youtubeCookie) {
      try {
        await play.setToken({
          youtube: {
            cookie: youtubeCookie
          }
        });
        console.log("YouTube cookie set successfully");
      } catch (e) {
        console.error("Failed to set YouTube cookie:", e);
      }
    }

    console.log(`Searching YouTube for: ${title} ${artist}`);
    
    // Step 1: Prime the connection and Search YouTube
    // Refresh token to help bypass bot detection
    try {
      await play.getFreeToken();
    } catch (e) {
      console.warn("Could not refresh play-dl token, proceeding anyway...");
    }

    const searchResult = await play.search(`${title} ${artist} official audio`, { 
      limit: 1,
      source: { youtube: 'video' } 
    });
    
    if (!searchResult || searchResult.length === 0) {
      throw new Error("Could not find song on YouTube");
    }

    const targetVideo = searchResult[0]; 
    const videoUrl = targetVideo.url;
    console.log(`Found YouTube video: ${targetVideo.title} (${videoUrl})`);

    // Step 2: Download and Convert
    console.log(`Preparing to download and convert...`);
    
    const isWin = process.platform === 'win32';
    const ffmpegOriginalPath = path.join(
      process.cwd(), 
      'node_modules', 
      'ffmpeg-static', 
      isWin ? 'ffmpeg.exe' : 'ffmpeg'
    );
    const ffmpegPath = getExecutablePath(ffmpegOriginalPath);

    const os = require('os');
    const tempFile = path.join(os.tmpdir(), `dl-${Date.now()}.mp3`);

    // Use play-dl to get the stream with anti-bot headers
    const stream = await play.stream(videoUrl, {
      quality: 1, // high quality
      seek: 0,
      htmldata: false // helps bypass some signature issues
    });
    
    console.log(`Running ffmpeg conversion...`);
    
    // Using ffmpeg to download and convert in one go
    // -i: input url, -vn: no video, -ab: bitrate, -ar: frequency, -f: format
    const ffmpegCmd = `"${ffmpegPath}" -i "${stream.url}" -vn -ab 128k -ar 44100 -y "${tempFile}"`;
    
    await execAsync(ffmpegCmd);

    if (!fs.existsSync(tempFile)) {
      throw new Error("FFmpeg failed to create the MP3 file.");
    }

    const buffer = fs.readFileSync(tempFile);
    fs.unlinkSync(tempFile); // Cleanup

    console.log(`Buffered audio (${buffer.length} bytes), uploading to Cloudinary...`);

    const safeArtist = (artist || 'Unknown Artist').replace(/[|=]/g, '-');
    const safeAlbum = (album || 'Unknown Album').replace(/[|=]/g, '-');

    // Step 3: Upload to Cloudinary
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

    const secureUrl = (uploadResult as any).secure_url;

    return NextResponse.json({ 
      success: true, 
      url: secureUrl,
      artist: artist || 'Unknown Artist',
      album: album || 'Unknown Album',
      message: 'Processed and uploaded successfully'
    });

  } catch (error: any) {
    console.error('Download/Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process song' }, { status: 500 });
  }
}
