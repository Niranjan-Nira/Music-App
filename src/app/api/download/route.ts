import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// @ts-ignore
const play = require('play-dl');
// @ts-ignore
const youtubedl = require('youtube-dl-exec');
import cloudinary from '@/lib/cloudinary';

// Helper to ensure binary is executable on Linux (Vercel)
// Since node_modules is read-only on Vercel, we copy to /tmp and set permissions there
function getExecutablePath(originalPath: string) {
  if (process.platform === 'win32') return originalPath;
  
  const os = require('os');
  const fs = require('fs');
  const path = require('path');
  
  try {
    const tempBinDir = path.join(os.tmpdir(), 'bin');
    if (!fs.existsSync(tempBinDir)) fs.mkdirSync(tempBinDir, { recursive: true });
    
    const targetPath = path.join(tempBinDir, path.basename(originalPath));
    
    // Copy if it doesn't exist or we need to ensure fresh permissions
    if (!fs.existsSync(targetPath)) {
      console.log(`Copying ${originalPath} to ${targetPath}`);
      fs.copyFileSync(originalPath, targetPath);
    }
    
    fs.chmodSync(targetPath, '755');
    return targetPath;
  } catch (err) {
    console.error(`Failed to prepare executable ${originalPath}:`, err);
    return originalPath; // Fallback to original
  }
}

export async function POST(request: Request) {
  try {
    const { title, artist, album } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    console.log(`Searching YouTube for: ${title} ${artist}`);
    
    // Step 1: Search YouTube for the audio track using play-dl
    const searchResult = await play.search(`${title} ${artist} official audio`, { limit: 1 });
    
    if (!searchResult || searchResult.length === 0) {
      throw new Error("Could not find song on YouTube");
    }

    const targetVideo = searchResult[0]; 
    const videoUrl = targetVideo.url;
    console.log(`Found YouTube video: ${targetVideo.title} (${videoUrl})`);

    // Step 2: Download audio stream to a temporary file
    console.log(`Downloading audio to temporary file...`);
    
    // Fix for Next.js/Vercel binary resolution
    const isWin = process.platform === 'win32';
    
    const ytPath = path.join(
      process.cwd(), 
      'node_modules', 
      'youtube-dl-exec', 
      'bin', 
      isWin ? 'yt-dlp.exe' : 'yt-dlp'
    );
    
    const ffmpegPath = path.join(
      process.cwd(), 
      'node_modules', 
      'ffmpeg-static', 
      isWin ? 'ffmpeg.exe' : 'ffmpeg'
    );

    // Prepare executables in /tmp for Vercel
    const ytExecPath = getExecutablePath(ytPath);
    const ffmpegExecPath = getExecutablePath(ffmpegPath);

    const yt = youtubedl.create(ytExecPath);

    const os = require('os');
    const tempFile = path.join(os.tmpdir(), `dl-${Date.now()}.mp3`);

    console.log(`Using yt-dlp at: ${ytExecPath}`);
    console.log(`Using ffmpeg at: ${ffmpegExecPath}`);

    await yt(videoUrl, {
      extractAudio: true,
      audioFormat: 'mp3',
      output: tempFile, 
      ffmpegLocation: ffmpegExecPath, 
      noPlaylist: true,
    });

    // yt-dlp might change the extension based on actual format if it couldn't convert,
    let finalFile = tempFile;
    if (!fs.existsSync(tempFile)) {
       // fallback just in case yt-dlp added a weird extension
       const files = fs.readdirSync(os.tmpdir()).filter((f: string) => f.startsWith(path.basename(tempFile, '.mp3')));
       if (files.length > 0) finalFile = path.join(os.tmpdir(), files[0]);
    }

    const buffer = fs.readFileSync(finalFile);
    fs.unlinkSync(finalFile); // Cleanup

    if (buffer.length === 0) {
      throw new Error("Downloaded audio buffer is empty.");
    }

    console.log(`Buffered audio (${buffer.length} bytes), uploading to Cloudinary...`);

    // Sanitize metadata for Cloudinary context (no pipes or equals in values)
    const safeArtist = (artist || 'Unknown Artist').replace(/[|=]/g, '-');
    const safeAlbum = (album || 'Unknown Album').replace(/[|=]/g, '-');

    // Step 3: Upload to Cloudinary with metadata context
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video', // Audio files are uploaded as 'video' in Cloudinary
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
      message: 'Downloaded from YouTube and uploaded to Cloudinary successfully'
    });

  } catch (error: any) {
    console.error('Download/Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process song' }, { status: 500 });
  }
}
