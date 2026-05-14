import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    // Search iTunes API for song recommendations
    const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=10`);
    const data = await response.json();

    const results = data.results.map((track: any) => ({
      id: track.trackId.toString(),
      title: track.trackName,
      artist: track.artistName,
      album: track.collectionName || '', // Movie / Album name from iTunes
      coverUrl: track.artworkUrl100?.replace('100x100bb', '300x300bb') || 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=300&auto=format&fit=crop',
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json({ error: 'Failed to search songs' }, { status: 500 });
  }
}
