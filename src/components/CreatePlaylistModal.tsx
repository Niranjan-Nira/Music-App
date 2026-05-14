"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2, Check, Music, Plus, Download } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';
import { usePlaylist } from '@/contexts/PlaylistContext';
import { Song } from '@/lib/data';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePlaylistModal({ isOpen, onClose }: CreatePlaylistModalProps) {
  const { songs, playSong, addSong } = useAudio();
  const { createPlaylist } = usePlaylist();

  const [playlistName, setPlaylistName] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [tab, setTab] = useState<'library' | 'search'>('library');

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus name input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
      // Reset state
      setPlaylistName('');
      setSelectedSongIds(new Set());
      setSearchQuery('');
      setSearchResults([]);
      setTab('library');
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (tab !== 'search' || searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.results) setSearchResults(data.results);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, tab]);

  const toggleSong = (id: string) => {
    setSelectedSongIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownloadAndAdd = async (track: any) => {
    // Check if song already exists in library
    const existingSong = songs.find(s => 
      s.title.toLowerCase() === track.title.toLowerCase() && 
      s.artist.toLowerCase() === track.artist.toLowerCase()
    );

    if (existingSong) {
      setSelectedSongIds(prev => new Set(prev).add(existingSong.id));
      return;
    }

    setDownloadingId(track.id);
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: track.title, artist: track.artist, album: track.album || '' }),
      });
      const data = await res.json();

      if (data.success && data.url) {
        const newSong: Song = {
          id: track.id,
          title: track.title,
          artist: data.artist || track.artist,
          url: data.url,
          coverUrl: track.coverUrl,
          album: data.album || track.album || '',
          musicDirector: data.artist || track.artist,
        };
        addSong(newSong);
        setSelectedSongIds(prev => new Set(prev).add(newSong.id));
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCreate = () => {
    if (!playlistName.trim()) return;
    const pl = createPlaylist(playlistName.trim(), Array.from(selectedSongIds));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-[#1a1a1a] rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Create Playlist</h2>
          <button onClick={onClose} className="text-spotify-light hover:text-white transition p-1 rounded-full hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {/* Name Input */}
        <div className="p-5 pb-3">
          <label className="text-xs uppercase tracking-wider text-spotify-light/70 font-bold mb-2 block">Playlist Name</label>
          <input
            ref={nameInputRef}
            type="text"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="My awesome playlist..."
            className="w-full bg-[#2a2a2a] text-white text-lg font-semibold rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-spotify-green/50 border border-white/10 placeholder:text-white/20"
          />
        </div>

        {/* Tabs */}
        <div className="flex px-5 gap-1">
          <button
            onClick={() => setTab('library')}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${
              tab === 'library' ? 'bg-white text-black' : 'text-spotify-light hover:text-white hover:bg-white/10'
            }`}
          >
            From Library
          </button>
          <button
            onClick={() => setTab('search')}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${
              tab === 'search' ? 'bg-white text-black' : 'text-spotify-light hover:text-white hover:bg-white/10'
            }`}
          >
            Search & Download
          </button>
        </div>

        {/* Content */}
        <div className="p-5 pt-3 max-h-[350px] overflow-y-auto scrollbar-hide">
          {tab === 'library' ? (
            /* Library Song Picker */
            <div className="space-y-1 mt-2">
              {songs.length === 0 ? (
                <div className="text-center py-8 text-spotify-light/50">
                  <Music size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No songs in library yet</p>
                </div>
              ) : (
                songs.map(song => (
                  <button
                    key={song.id}
                    onClick={() => toggleSong(song.id)}
                    className={`flex items-center gap-3 w-full p-2.5 rounded-lg transition-all text-left ${
                      selectedSongIds.has(song.id)
                        ? 'bg-spotify-green/15 ring-1 ring-spotify-green/30'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <img src={song.coverUrl} className="w-10 h-10 rounded object-cover" alt="" />
                    <div className="flex-1 overflow-hidden">
                      <p className="text-white text-sm font-medium truncate">{song.title}</p>
                      <p className="text-spotify-light text-xs truncate">{song.artist}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      selectedSongIds.has(song.id)
                        ? 'bg-spotify-green border-spotify-green'
                        : 'border-spotify-light/40'
                    }`}>
                      {selectedSongIds.has(song.id) && <Check size={12} className="text-black" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            /* Search & Download */
            <div className="mt-2">
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-spotify-light/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for songs to download..."
                  className="w-full bg-[#2a2a2a] text-white text-sm rounded-full py-2.5 pl-9 pr-4 focus:outline-none focus:ring-2 focus:ring-spotify-green/50 border border-white/10"
                />
              </div>

              {isSearching ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-spotify-light" /></div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map(track => {
                    const existingSong = songs.find(s => 
                      s.title.toLowerCase() === track.title.toLowerCase() && 
                      s.artist.toLowerCase() === track.artist.toLowerCase()
                    );
                    const isSelected = selectedSongIds.has(existingSong?.id || track.id);
                    return (
                      <div key={track.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-all">
                        <img src={track.coverUrl} className="w-10 h-10 rounded object-cover" alt="" />
                        <div className="flex-1 overflow-hidden">
                          <p className="text-white text-sm font-medium truncate">{track.title}</p>
                          <p className="text-spotify-light text-xs truncate">{track.artist}</p>
                          {track.album && <p className="text-spotify-light/40 text-[10px] truncate">{track.album}</p>}
                        </div>
                        {existingSong ? (
                          <button
                            onClick={() => toggleSong(existingSong.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                              isSelected ? 'bg-spotify-green text-black' : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                          >
                            {isSelected ? '✓ Added' : '+ Add'}
                          </button>
                        ) : downloadingId === track.id ? (
                          <Loader2 size={18} className="animate-spin text-spotify-green flex-shrink-0" />
                        ) : (
                          <button
                            onClick={() => handleDownloadAndAdd(track)}
                            disabled={downloadingId !== null}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-spotify-green/20 text-spotify-green hover:bg-spotify-green/30 transition-all"
                          >
                            <Download size={12} />
                            Download
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : searchQuery.length >= 3 ? (
                <div className="text-center py-8 text-spotify-light/50">
                  <p className="text-sm">No results found</p>
                </div>
              ) : (
                <div className="text-center py-8 text-spotify-light/30">
                  <Search size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Type at least 3 characters to search</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-white/10 bg-black/30">
          <p className="text-sm text-spotify-light">
            {selectedSongIds.size} song{selectedSongIds.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-spotify-light hover:text-white transition rounded-full"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!playlistName.trim()}
              className="px-6 py-2.5 text-sm font-bold bg-spotify-green text-black rounded-full hover:bg-spotify-green-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            >
              Create Playlist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
