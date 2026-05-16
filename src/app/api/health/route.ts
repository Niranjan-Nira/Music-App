import { NextResponse } from 'next/server';
import { hasYouTubeCookies } from '@/lib/youtube-download';

export const runtime = 'nodejs';

/** Check which download stack is live (open in browser after deploy). */
export async function GET() {
  return NextResponse.json({
    downloadEngine: 'yt-dlp-v3',
    hasYouTubeCookies: hasYouTubeCookies(),
    vercel: process.env.VERCEL === '1',
    node: process.version,
  });
}
