"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { Song, Playlist, songs as initialSongs } from '@/lib/data';

interface AudioContextType {
  songs: Song[];
  filteredSongs: Song[];
  autoPlaylists: Playlist[];
  activePlaylist: Playlist | null;
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  playSong: (song: Song) => void;
  togglePlay: () => void;
  setVolume: (value: number) => void;
  seek: (value: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  addSong: (song: Song) => void;
  setActivePlaylist: (playlist: Playlist | null) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-generate playlists from songs metadata
  const autoPlaylists = useMemo<Playlist[]>(() => {
    // Use an object to store both the display name and the grouped songs
    const directorMap = new Map<string, { name: string, songs: Song[] }>();
    const albumMap = new Map<string, { name: string, songs: Song[] }>();

    songs.forEach(song => {
      const fullDirector = (song.musicDirector || song.artist || '').trim();
      if (fullDirector && fullDirector !== 'Unknown Artist' && fullDirector !== 'Downloaded Song') {
        // Extract primary director (take first name before comma, ampersand, or 'and')
        const primaryDirector = fullDirector.split(/[,&]|\band\b/i)[0].trim();
        const key = primaryDirector.toLowerCase();
        
        if (!directorMap.has(key)) {
          directorMap.set(key, { name: primaryDirector, songs: [] });
        }
        directorMap.get(key)!.songs.push(song);
      }

      const album = (song.album || '').trim();
      if (album && album !== 'Unknown Album' && album !== '') {
        const key = album.toLowerCase();
        if (!albumMap.has(key)) {
          albumMap.set(key, { name: album, songs: [] });
        }
        albumMap.get(key)!.songs.push(song);
      }
    });

    const result: Playlist[] = [];

    albumMap.forEach((data, normalizedName) => {
      const { name, songs: albumSongs } = data;
      result.push({
        id: `album-${normalizedName.replace(/[^a-z0-9]/gi, '_')}`,
        name: name,
        type: 'album',
        songIds: albumSongs.map(s => s.id),
        songs: albumSongs,
        coverUrl: albumSongs[0].coverUrl,
      });
    });

    directorMap.forEach((data, normalizedName) => {
      const { name, songs: dirSongs } = data;
      result.push({
        id: `director-${normalizedName.replace(/[^a-z0-9]/gi, '_')}`,
        name: name,
        type: 'director',
        songIds: dirSongs.map(s => s.id),
        songs: dirSongs,
        coverUrl: dirSongs[0].coverUrl,
      });
    });

    return result;
  }, [songs]);

  // Filtered songs based on active playlist
  const filteredSongs = useMemo(() => {
    if (!activePlaylist) return songs;
    return activePlaylist.songs;
  }, [activePlaylist, songs]);

  useEffect(() => {
    fetch('/api/library')
      .then(res => res.json())
      .then(data => {
        if (data.songs && data.songs.length > 0) {
          setSongs(prev => {
            const existingUrls = new Set(prev.map(s => s.url));
            const newSongs = data.songs.filter((s: Song) => !existingUrls.has(s.url));
            return [...prev, ...newSongs];
          });
        }
      })
      .catch(console.error);

    audioRef.current = new Audio();
    audioRef.current.volume = volume;

    const audio = audioRef.current;

    const handleTimeUpdate = () => setProgress(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => playNext();

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, []);

  const songsRef = useRef(songs);
  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  useEffect(() => {
    if (audioRef.current && currentSong) {
      if (audioRef.current.src !== currentSong.url) {
        audioRef.current.src = currentSong.url;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
      } else {
        if (isPlaying) {
          audioRef.current.play().catch(console.error);
        } else {
          audioRef.current.pause();
        }
      }
    }
  }, [currentSong, isPlaying]);

  const addSong = (song: Song) => {
    if (!songs.find(s => s.id === song.id)) {
      setSongs(prev => [song, ...prev]);
    }
  };

  const playSong = (song: Song) => {
    addSong(song);
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (!currentSong && songs.length > 0) {
      playSong(songs[0]);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const setVolume = (value: number) => {
    setVolumeState(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  };

  const seek = (value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setProgress(value);
    }
  };

  const playNext = () => {
    if (!currentSong) return;
    const currentList = songsRef.current;
    const currentIndex = currentList.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % currentList.length;
    playSong(currentList[nextIndex]);
  };

  const playPrevious = () => {
    if (!currentSong) return;
    const currentList = songsRef.current;
    const currentIndex = currentList.findIndex(s => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + currentList.length) % currentList.length;
    playSong(currentList[prevIndex]);
  };

  return (
    <AudioContext.Provider value={{
      songs,
      filteredSongs,
      autoPlaylists,
      activePlaylist,
      currentSong,
      isPlaying,
      progress,
      duration,
      volume,
      playSong,
      togglePlay,
      setVolume,
      seek,
      playNext,
      playPrevious,
      addSong,
      setActivePlaylist,
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
