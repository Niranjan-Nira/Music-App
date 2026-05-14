"use client";

import React, { useState } from 'react';
import { Library, Plus, ArrowRight, Search, List, ListMusic, Music, Film, Mic2, Trash2, Home } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';
import { usePlaylist } from '@/contexts/PlaylistContext';
import { CreatePlaylistModal } from './CreatePlaylistModal';

export function Sidebar() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'playlists' | 'by-spotify' | 'by-you'>('all');
  
  const { songs, autoPlaylists, activePlaylist, setActivePlaylist } = useAudio();
  const { customPlaylists, deletePlaylist } = usePlaylist();

  const albumPlaylists = autoPlaylists.filter(p => p.type === 'album');
  const directorPlaylists = autoPlaylists.filter(p => p.type === 'director');

  const filterButtons = [
    { id: 'playlists', label: 'Playlists' }
  ];

  return (
    <>
      <div className="w-[450px] h-full flex flex-col gap-2 p-2 hidden md:flex">
        {/* Navigation - Top Part */}
        <div className="bg-[#121212] rounded-lg p-3 flex flex-col gap-1">
          <button 
            onClick={() => {
              setActivePlaylist(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-4 px-3 py-2 text-spotify-light hover:text-white transition-all font-bold group"
          >
            <Home size={24} className="group-hover:scale-105 transition-transform" />
            <span>Home</span>
          </button>
          <button 
            onClick={() => document.getElementById('main-search-input')?.focus()}
            className="flex items-center gap-4 px-3 py-2 text-spotify-light hover:text-white transition-all font-bold group"
          >
            <Search size={24} className="group-hover:scale-105 transition-transform" />
            <span>Search</span>
          </button>
        </div>

        {/* Library Section */}
        <div className="bg-[#121212] rounded-lg flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-4 flex items-center justify-between shadow-lg">
            <button className="flex items-center gap-3 text-spotify-light hover:text-white transition-colors font-black group">
              <Library size={28} className="group-hover:scale-105 transition-transform" />
              <span className="text-xl">Your Library</span>
            </button>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="p-2 text-spotify-light hover:text-white hover:bg-white/10 rounded-full transition-all"
                title="Create playlist"
              >
                <Plus size={24} />
              </button>
              <button className="p-2 text-spotify-light hover:text-white hover:bg-white/10 rounded-full transition-all">
                <ArrowRight size={24} />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {filterButtons.map(btn => (
              <button
                key={btn.id}
                onClick={() => setFilter(filter === btn.id ? 'all' : btn.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  filter === btn.id ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Search & Recents */}
          <div className="px-4 py-2 flex items-center justify-between">
            <button 
              onClick={() => document.getElementById('main-search-input')?.focus()}
              className="p-1.5 text-spotify-light hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <Search size={18} />
            </button>
            <button className="flex items-center gap-1.5 text-spotify-light hover:text-white transition-colors text-sm font-medium">
              <span>Recents</span>
              <List size={16} />
            </button>
          </div>

          {/* Playlist List */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 custom-scrollbar">
            {/* Custom User Playlists */}
            {customPlaylists.map(pl => (
              <div key={pl.id} className="group/item flex items-center">
                <button
                  onClick={() => setActivePlaylist(activePlaylist?.id === pl.id ? null : pl)}
                  className={`flex-1 text-left flex items-center gap-3 p-2 rounded-md transition-all group ${
                    activePlaylist?.id === pl.id 
                      ? 'bg-white/10' 
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0 shadow-lg ${
                    activePlaylist?.id === pl.id 
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600' 
                      : 'bg-[#282828]'
                  }`}>
                    <ListMusic size={20} className={activePlaylist?.id === pl.id ? 'text-white' : 'text-spotify-light'} />
                  </div>
                  <div className="overflow-hidden flex-1 py-1">
                    <p className={`text-lg font-black truncate ${activePlaylist?.id === pl.id ? 'text-spotify-green' : 'text-white'}`}>
                      {pl.name}
                    </p>
                    <p className="text-sm text-spotify-light font-bold">Playlist • {pl.songs.length} songs</p>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activePlaylist?.id === pl.id) setActivePlaylist(null);
                    deletePlaylist(pl.id);
                  }}
                  className="opacity-0 group-hover/item:opacity-100 p-2 text-spotify-light hover:text-red-400 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {/* Movies / Albums */}
            {albumPlaylists.map(pl => (
              <button
                key={pl.id}
                onClick={() => setActivePlaylist(activePlaylist?.id === pl.id ? null : pl)}
                className={`w-full text-left flex items-center gap-3 p-2 rounded-md transition-all group ${
                  activePlaylist?.id === pl.id ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <div className="w-12 h-12 rounded-md overflow-hidden shadow-lg">
                  <img src={pl.coverUrl} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="overflow-hidden flex-1 py-1">
                  <p className={`text-lg font-black truncate ${activePlaylist?.id === pl.id ? 'text-spotify-green' : 'text-white'}`}>
                    {pl.name}
                  </p>
                  <p className="text-sm text-spotify-light font-bold">Album • {pl.songs.length} songs</p>
                </div>
              </button>
            ))}

            {/* Music Directors */}
            {directorPlaylists.map(pl => (
              <button
                key={pl.id}
                onClick={() => setActivePlaylist(activePlaylist?.id === pl.id ? null : pl)}
                className={`w-full text-left flex items-center gap-3 p-2 rounded-md transition-all group ${
                  activePlaylist?.id === pl.id ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg border-2 border-transparent group-hover:border-white/10 transition-all">
                  <img src={pl.coverUrl} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="overflow-hidden flex-1 py-1">
                  <p className={`text-lg font-black truncate ${activePlaylist?.id === pl.id ? 'text-spotify-green' : 'text-white'}`}>
                    {pl.name}
                  </p>
                  <p className="text-sm text-spotify-light font-bold">Artist • {pl.songs.length} songs</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <CreatePlaylistModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </>
  );
}
