import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export async function GET() {
  try {
    // Fetch all resources in the musicify_downloads folder WITH context metadata
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'musicify_downloads/',
      resource_type: 'video',
      max_results: 100,
      context: true, // Include context metadata (artist, album)
    });

    const songs = result.resources.map((res: any, index: number) => {
      // Create a readable title from public_id
      const rawTitle = res.public_id.replace('musicify_downloads/', '');
      const title = rawTitle.replace(/_[0-9]+$/, '').replace(/_/g, ' ');
      
      // Extract metadata from Cloudinary context
      const context = res.context?.custom || {};
      const artist = context.artist || 'Unknown Artist';
      const album = context.album || 'Unknown Album';

      return {
        id: `cloud-${res.asset_id || index}`,
        title: title.charAt(0).toUpperCase() + title.slice(1),
        artist: artist,
        album: album,
        musicDirector: artist, // For Tamil songs, artist is typically the music director
        url: res.secure_url,
        coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop",
      };
    });

    return NextResponse.json({ songs });
  } catch (error: any) {
    console.error('Cloudinary fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch library' }, { status: 500 });
  }
}
