export type Song = {
  id: string;
  title: string;
  artist: string;
  url: string;
  coverUrl: string;
  album?: string;
  musicDirector?: string;
};

export type Playlist = {
  id: string;
  name: string;
  type: 'director' | 'album' | 'custom';
  songIds: string[];    // Stored IDs for persistence
  songs: Song[];        // Populated at runtime
  coverUrl: string;
};

// Serializable version for localStorage
export type StoredPlaylist = {
  id: string;
  name: string;
  songIds: string[];
  coverUrl: string;
};

export const songs: Song[] = [];
