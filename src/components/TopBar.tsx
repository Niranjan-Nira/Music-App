"use client";

import React, { useState, useEffect } from 'react';
import { Search, Home, Bell, Users, User, LayoutGrid, Loader2, X, Play } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';
import { Song } from '@/lib/data';

export function TopBar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const { songs, playSong, setActivePlaylist } = useAudio();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setIsFocused(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        if (data.results) setSearchResults(data.results);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleDownloadAndPlay = async (track: any) => {
    if (!track) return;
    
    console.log("Attempting to play/download:", track);

    const trackTitle = (track.title || '').toLowerCase().trim();
    const trackArtist = (track.artist || '').toLowerCase().trim();

    const existingSong = songs.find(s => 
      (s.title || '').toLowerCase().trim() === trackTitle && 
      (s.artist || '').toLowerCase().trim() === trackArtist
    );

    if (existingSong) {
      console.log("Found existing song in library:", existingSong);
      playSong(existingSong);
      setSearchQuery('');
      setSearchResults([]);
      setIsFocused(false);
      return;
    }

    console.log("Song not found in library, triggering download...");
    setDownloadingId(track.id);
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: track.title || 'Unknown Title', 
          artist: track.artist || 'Unknown Artist', 
          album: track.album || '' 
        }),
      });
      const data = await res.json();

      if (data.success && data.url) {
        console.log("Download successful:", data);
        const newSong: Song = {
          id: track.id || `dl-${Date.now()}`,
          title: track.title || 'Unknown Title',
          artist: data.artist || track.artist || 'Unknown Artist',
          url: data.url,
          coverUrl: track.coverUrl,
          album: data.album || track.album || '',
          musicDirector: data.artist || track.artist || 'Unknown Artist',
        };
        playSong(newSong);
        setSearchQuery('');
        setSearchResults([]);
        setIsFocused(false);
      } else {
        console.error("Download failed or URL missing:", data);
        alert(`Failed to download: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Download fetch error:", error);
      alert("Error connecting to download server. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="h-16 flex items-center justify-between px-4 md:px-6 bg-black z-40">
      {/* Left: Branding */}
      <div className="flex items-center gap-2 md:gap-4">
        <h1 className="text-2xl md:text-4xl font-black tracking-tighter italic bg-gradient-to-r from-spotify-green via-orange-400 to-amber-300 bg-clip-text text-transparent drop-shadow-sm select-none cursor-pointer hover:opacity-80 transition-opacity pr-2 md:pr-4"
          onClick={() => {
            setActivePlaylist(null);
            setSearchQuery('');
            setSearchResults([]);
          }}
        >
          EARGASM
        </h1>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 md:max-w-[500px] mx-2 md:mx-4 relative search-container">
        <div className="relative flex items-center">
          <button 
            onClick={() => document.getElementById('main-search-input')?.focus()}
            className={`absolute left-3 transition-colors ${isFocused ? 'text-white' : 'text-spotify-light'} hover:text-white`}
          >
            <Search size={20} />
          </button>
          <input 
            id="main-search-input"
            type="text" 
            placeholder="What do you want to play?" 
            value={searchQuery}
            onFocus={() => setIsFocused(true)}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1f1f1f] hover:bg-[#2a2a2a] focus:bg-[#242424] text-white text-sm rounded-full py-3 pl-10 pr-12 focus:outline-none focus:ring-2 focus:ring-white transition-all border-none placeholder:text-[#757575]"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-12 text-spotify-light hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
          <div className="absolute right-4 border-l border-white/10 pl-3 text-spotify-light hover:text-white cursor-pointer group">
            <LayoutGrid size={20} className="group-hover:scale-110 transition-transform" />
          </div>
        </div>

        {/* Search Results Dropdown */}
        {(isFocused && (searchQuery.trim().length >= 2 || isSearching)) && (
          <div className="absolute top-full left-0 w-full mt-2 bg-[#1f1f1f] rounded-lg shadow-[0_16px_48px_rgba(0,0,0,0.8)] max-h-[520px] overflow-y-auto z-[100] border border-white/5 animate-in fade-in slide-in-from-top-2 custom-scrollbar">
            {isSearching ? (
              <div className="p-12 flex flex-col items-center gap-4 text-spotify-light">
                <Loader2 className="animate-spin text-spotify-green" size={32} />
                <p className="text-xs font-medium animate-pulse">Searching the cosmos...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="flex flex-col p-2 gap-1">
                <p className="text-[10px] font-bold text-spotify-light uppercase tracking-wider px-3 py-2">Top results</p>
                {searchResults.map((track) => (
                  <button 
                    key={track.id}
                    onClick={() => handleDownloadAndPlay(track)}
                    disabled={downloadingId !== null}
                    className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-md transition-all text-left w-full group relative"
                  >
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <img src={track.coverUrl} className="w-full h-full rounded shadow-lg object-cover" alt="" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                        <Search size={16} className="text-white" />
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-white text-sm font-bold truncate group-hover:text-spotify-green transition-colors">{track.title}</p>
                      <p className="text-spotify-light text-xs truncate mt-0.5">{track.artist}</p>
                    </div>
                    {downloadingId === track.id ? (
                      <Loader2 size={18} className="animate-spin text-spotify-green mr-2" />
                    ) : (
                      <div className="opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 pr-2">
                        <div className="w-8 h-8 flex items-center justify-center bg-spotify-green rounded-full text-black shadow-lg">
                          <Play size={14} fill="currentColor" className="ml-0.5" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : searchQuery.trim().length >= 2 ? (
              <div className="p-12 text-sm text-spotify-light text-center flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-2">
                  <Search size={24} />
                </div>
                <p className="font-bold text-white">No results found for "{searchQuery}"</p>
                <p className="text-xs">Try searching for an artist, song, or movie name.</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 md:gap-2">
        <button className="hidden sm:p-2 text-spotify-light hover:text-white hover:scale-105 transition-all relative group">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-black" />
          <div className="absolute top-full right-0 mt-2 bg-[#282828] p-2 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
            Notifications
          </div>
        </button>
        <button className="hidden sm:p-2 text-spotify-light hover:text-white hover:scale-105 transition-all">
          <Users size={20} />
        </button>
        <button className="ml-2 w-8 h-8 rounded-full bg-[#121212] flex items-center justify-center border-2 border-transparent hover:border-white/20 hover:scale-105 transition-all overflow-hidden group">
          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
            <User size={18} />
          </div>
        </button>
      </div>
    </div>
  );
}
