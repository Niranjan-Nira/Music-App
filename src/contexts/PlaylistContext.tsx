"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Song, Playlist, StoredPlaylist } from '@/lib/data';
import { useAudio } from './AudioContext';

const STORAGE_KEY = 'musicify_playlists';

interface PlaylistContextType {
  customPlaylists: Playlist[];
  createPlaylist: (name: string, initialSongIds?: string[]) => Playlist;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  addSongToPlaylist: (playlistId: string, song: Song) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  isSongInPlaylist: (playlistId: string, songId: string) => boolean;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  const { songs } = useAudio();
  const [storedPlaylists, setStoredPlaylists] = useState<StoredPlaylist[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setStoredPlaylists(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load playlists from localStorage:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever playlists change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storedPlaylists));
      } catch (e) {
        console.error('Failed to save playlists to localStorage:', e);
      }
    }
  }, [storedPlaylists, isLoaded]);

  // Hydrate stored playlists with full Song objects from the songs list
  const customPlaylists: Playlist[] = storedPlaylists.map(sp => {
    const resolvedSongs = sp.songIds
      .map(id => songs.find(s => s.id === id))
      .filter(Boolean) as Song[];

    return {
      id: sp.id,
      name: sp.name,
      type: 'custom' as const,
      songIds: sp.songIds,
      songs: resolvedSongs,
      coverUrl: resolvedSongs.length > 0 
        ? resolvedSongs[0].coverUrl 
        : sp.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop',
    };
  });

  const createPlaylist = useCallback((name: string, initialSongIds: string[] = []): Playlist => {
    const newPlaylist: StoredPlaylist = {
      id: `custom-${Date.now()}`,
      name,
      songIds: initialSongIds,
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop',
    };
    setStoredPlaylists(prev => [...prev, newPlaylist]);

    // Return the hydrated version
    const resolvedSongs = initialSongIds
      .map(id => songs.find(s => s.id === id))
      .filter(Boolean) as Song[];

    return {
      ...newPlaylist,
      type: 'custom',
      songs: resolvedSongs,
    };
  }, [songs]);

  const deletePlaylist = useCallback((id: string) => {
    setStoredPlaylists(prev => prev.filter(p => p.id !== id));
  }, []);

  const renamePlaylist = useCallback((id: string, name: string) => {
    setStoredPlaylists(prev => prev.map(p => 
      p.id === id ? { ...p, name } : p
    ));
  }, []);

  const addSongToPlaylist = useCallback((playlistId: string, song: Song) => {
    setStoredPlaylists(prev => prev.map(p => {
      if (p.id === playlistId && !p.songIds.includes(song.id)) {
        return { ...p, songIds: [...p.songIds, song.id] };
      }
      return p;
    }));
  }, []);

  const removeSongFromPlaylist = useCallback((playlistId: string, songId: string) => {
    setStoredPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return { ...p, songIds: p.songIds.filter(id => id !== songId) };
      }
      return p;
    }));
  }, []);

  const isSongInPlaylist = useCallback((playlistId: string, songId: string) => {
    const pl = storedPlaylists.find(p => p.id === playlistId);
    return pl ? pl.songIds.includes(songId) : false;
  }, [storedPlaylists]);

  return (
    <PlaylistContext.Provider value={{
      customPlaylists,
      createPlaylist,
      deletePlaylist,
      renamePlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist,
      isSongInPlaylist,
    }}>
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylist() {
  const context = useContext(PlaylistContext);
  if (context === undefined) {
    throw new Error('usePlaylist must be used within a PlaylistProvider');
  }
  return context;
}
