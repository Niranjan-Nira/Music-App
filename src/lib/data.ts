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

export const songs: Song[] = [
  {
    id: "1",
    title: "Aasa Kooda",
    artist: "South Melody",
    url: "https://res.cloudinary.com/drte935yg/video/upload/v1778616631/Aasa_Kooda_-_SouthMelody_jv8wjs.mp3",
    coverUrl: "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=300&auto=format&fit=crop",
  },
  {
    id: "2",
    title: "Raathu Raasan",
    artist: "South Melody",
    url: "https://res.cloudinary.com/drte935yg/video/upload/v1778616594/Raathu_Raasan_-_SouthMelody_mayate.mp3",
    coverUrl: "https://images.unsplash.com/photo-1493225457124-a1a2a5956093?q=80&w=300&auto=format&fit=crop",
  },
  {
    id: "3",
    title: "Karuppa Kooda Va Karuppu",
    artist: "Masstamilan",
    url: "https://res.cloudinary.com/drte935yg/video/upload/v1778616520/Karuppa_Kooda_Va_Karuppu_-_Masstamilan.MY_jvrfkl.mp3",
    coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop",
  }
];
