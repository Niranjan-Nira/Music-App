"use client";

import React, { useState } from 'react';
import { Play, Pause, Clock, ArrowLeft, Film, Mic2, ListMusic, Pencil, Minus, Check, X, MoreHorizontal, Heart, PlusCircle, Shuffle } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';
import { usePlaylist } from '@/contexts/PlaylistContext';
import { AddToPlaylistMenu } from './AddToPlaylistMenu';
import { CreatePlaylistModal } from './CreatePlaylistModal';

export function MainContent() {
  const { songs, filteredSongs, currentSong, isPlaying, togglePlay, playSong, activePlaylist, setActivePlaylist } = useAudio();
  const { renamePlaylist, removeSongFromPlaylist } = usePlaylist();

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'music' | 'podcasts'>('all');
  const [isLiked, setIsLiked] = useState(false);

  const isCustomPlaylist = activePlaylist?.type === 'custom';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const startRename = () => {
    if (!activePlaylist) return;
    setRenameValue(activePlaylist.name);
    setIsRenaming(true);
  };

  const confirmRename = () => {
    if (activePlaylist && renameValue.trim()) {
      renamePlaylist(activePlaylist.id, renameValue.trim());
      setActivePlaylist({ ...activePlaylist, name: renameValue.trim() });
    }
    setIsRenaming(false);
  };

  const handleRemoveSong = (songId: string) => {
    if (!activePlaylist) return;
    removeSongFromPlaylist(activePlaylist.id, songId);
    setActivePlaylist({
      ...activePlaylist,
      songs: activePlaylist.songs.filter(s => s.id !== songId),
      songIds: activePlaylist.songIds.filter(id => id !== songId),
    });
  };

  if (activePlaylist) {
    return (
      <div className="flex-1 bg-gradient-to-b from-[#1e1e1e] to-spotify-black overflow-y-auto pb-32 md:pb-28 custom-scrollbar">
        <div className="p-4 md:p-8">
          <button 
            onClick={() => { setActivePlaylist(null); setIsRenaming(false); }}
            className="flex items-center gap-2 text-spotify-light hover:text-white transition-colors mb-4 md:mb-6 group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs md:text-sm font-medium">Back</span>
          </button>

          <div className="flex flex-col md:items-end md:flex-row gap-4 md:gap-6 mb-6 md:mb-8">
            <div className={`w-40 h-40 md:w-56 md:h-56 flex items-center justify-center shadow-2xl bg-gradient-to-br from-indigo-600 to-purple-800 ${
              activePlaylist.type === 'director' ? 'rounded-full' : 'rounded-lg'
            } overflow-hidden mx-auto md:mx-0`}>
              <img src={activePlaylist.coverUrl} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-xs uppercase tracking-widest text-spotify-light font-bold mb-1">
                {activePlaylist.type === 'album' ? 'Movie / Album' : activePlaylist.type === 'director' ? 'Music Director' : 'Playlist'}
              </p>
              {isRenaming ? (
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
                    autoFocus
                    className="text-3xl md:text-6xl font-black text-white bg-transparent border-b-2 border-spotify-green focus:outline-none py-1 w-full"
                  />
                </div>
              ) : (
                <h1 className="text-4xl md:text-7xl font-black text-white leading-tight mb-2 tracking-tighter" onClick={isCustomPlaylist ? startRename : undefined}>
                  {activePlaylist.name}
                </h1>
              )}
              <div className="flex items-center gap-2 text-sm text-white font-medium">
                <span className="font-bold">Eargasm</span>
                <span className="text-white/60">• {activePlaylist.songs.length} songs, about 45 min</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center md:justify-start gap-4 md:gap-8 mb-6 md:mb-8">
            <button 
              onClick={() => {
                if (activePlaylist.songs.length > 0) {
                  const isCurrentPlaylistPlaying = activePlaylist.songs.some(s => s.id === currentSong?.id) && isPlaying;
                  if (isCurrentPlaylistPlaying) togglePlay();
                  else playSong(activePlaylist.songs[0]);
                }
              }}
              className="w-12 h-12 md:w-14 md:h-14 bg-spotify-green rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg active:scale-95"
            >
              {activePlaylist.songs.some(s => s.id === currentSong?.id) && isPlaying ? (
                <div className="w-4 h-4 md:w-5 md:h-5 bg-black rounded-sm" />
              ) : (
                <Play fill="black" size={24} className="md:ml-1" />
              )}
            </button>
            <button 
              onClick={() => {
                if (activePlaylist.songs.length > 0) {
                  const randomIndex = Math.floor(Math.random() * activePlaylist.songs.length);
                  playSong(activePlaylist.songs[randomIndex]);
                }
              }}
              className="text-spotify-light hover:text-spotify-green transition-all hover:scale-110"
              title="Shuffle"
            >
              <Shuffle size={24} md:size={28} />
            </button>
            <button 
              onClick={() => setIsLiked(!isLiked)}
              className={`transition-all hover:scale-110 ${isLiked ? 'text-spotify-green' : 'text-spotify-light hover:text-white'}`}
            >
              <Heart size={28} md:size={32} fill={isLiked ? "currentColor" : "none"} />
            </button>
            <button className="text-spotify-light hover:text-white transition-colors hover:scale-110"><MoreHorizontal size={28} md:size={32} /></button>
          </div>

          {/* Table */}
          <div className="text-spotify-light">
            <div className="grid grid-cols-[16px_minmax(0,1fr)_minmax(0,120px)] md:grid-cols-[16px_minmax(0,1fr)_1fr_minmax(0,120px)] gap-4 px-2 md:px-4 py-2 border-b border-white/10 mb-4 text-[10px] md:text-xs font-bold uppercase tracking-wider">
              <div>#</div>
              <div>Title</div>
              <div className="hidden md:block">Album</div>
              <div className="flex justify-end"><Clock size={14} md:size={16} /></div>
            </div>
            {activePlaylist.songs.map((song, index) => (
              <div 
                key={song.id}
                className="grid grid-cols-[16px_minmax(0,1fr)_minmax(0,120px)] md:grid-cols-[16px_minmax(0,1fr)_1fr_minmax(0,120px)] gap-4 px-2 md:px-4 py-3 hover:bg-white/10 rounded-md transition-colors items-center group"
                onClick={() => playSong(song)}
              >
                <div className="text-xs md:text-sm font-medium">{index + 1}</div>
                <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                  <img src={song.coverUrl} className="w-8 h-8 md:w-10 md:h-10 rounded shadow-md" alt="" />
                  <div className="truncate">
                    <div className="font-medium text-white truncate text-sm md:text-base">{song.title}</div>
                    <div className="text-[10px] md:text-xs text-spotify-light truncate">{song.artist}</div>
                  </div>
                </div>
                <div className="hidden md:block text-sm truncate">{song.album || 'Unknown Album'}</div>
                <div className="flex justify-end items-center gap-2 md:gap-4">
                  <PlusCircle size={14} md:size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-xs md:text-sm">3:45</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="flex-1 bg-gradient-to-b from-[#121212] to-black overflow-y-auto pb-32 md:pb-28 custom-scrollbar">
      <div className="p-4 md:p-6">
        {/* Top Filters */}
        <div className="flex gap-2 mb-8">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${filter === 'all' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/15'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('music')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${filter === 'music' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/15'}`}
          >
            Music
          </button>
        </div>

        {/* Recent Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {filteredSongs.slice(0, 8).map(song => (
            <div 
              key={song.id}
              onClick={() => playSong(song)}
              className="flex items-center bg-white/5 hover:bg-white/15 transition-all rounded-md overflow-hidden group cursor-pointer relative shadow-lg"
            >
              <img src={song.coverUrl} className="w-16 h-16 object-cover" alt="" />
              <div className="p-3 flex-1 overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{song.title}</p>
              </div>
              <div className="absolute right-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all translate-y-0 md:translate-y-2 md:group-hover:translate-y-0 shadow-xl">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-spotify-green rounded-full flex items-center justify-center text-black">
                  <Play fill="black" size={16} md:size={20} className="ml-1" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recommended Section / All Songs Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white hover:underline cursor-pointer">
              {filter === 'music' ? 'Your Music Library' : 'Made For NIRANJAN'}
            </h2>
            {filter === 'all' && (
              <button 
                onClick={() => setFilter('music')}
                className="text-sm font-bold text-spotify-light hover:underline cursor-pointer"
              >
                Show all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {(filter === 'music' ? filteredSongs : filteredSongs.slice(0, 6)).map(song => (
              <div 
                key={`rec-${song.id}`}
                onClick={() => playSong(song)}
                className="bg-[#181818] p-4 rounded-lg hover:bg-[#282828] transition-all cursor-pointer group shadow-xl"
              >
                <div className="relative mb-4">
                  <img src={song.coverUrl} className="w-full aspect-square object-cover rounded-md shadow-2xl" alt="" />
                  <div className="absolute bottom-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all translate-y-0 md:translate-y-2 md:group-hover:translate-y-0 shadow-xl">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-spotify-green rounded-full flex items-center justify-center text-black shadow-2xl">
                      <Play fill="black" size={20} md:size={24} className="ml-1" />
                    </div>
                  </div>
                </div>
                <h3 className="text-white font-bold mb-1 truncate">{song.title}</h3>
                <p className="text-spotify-light text-sm line-clamp-2 leading-relaxed">{song.artist}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
