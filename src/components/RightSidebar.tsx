"use client";

import React from 'react';
import { PlusCircle, MoreHorizontal, X } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';

export function RightSidebar() {
  const { currentSong, activePlaylist } = useAudio();

  if (!currentSong) return null;

  return (
    <div className="w-[580px] bg-[#121212] m-2 rounded-lg flex flex-col overflow-hidden hidden lg:flex">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <h3 className="font-bold text-white text-sm hover:underline cursor-pointer truncate pr-4">
          {activePlaylist?.name || 'Now Playing'}
        </h3>
        <div className="flex items-center gap-2 text-spotify-light">
          <button className="hover:text-white transition-colors"><MoreHorizontal size={20} /></button>
          <button className="hover:text-white transition-colors"><X size={20} /></button>
        </div>
      </div>

      {/* Album Cover */}
      <div className="px-4 pb-4">
        <div className="aspect-square w-full rounded-lg overflow-hidden shadow-2xl relative group">
          <img 
            src={currentSong.coverUrl} 
            alt={currentSong.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      </div>

      <div className="px-4 flex flex-col gap-1 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-black text-white hover:underline cursor-pointer truncate leading-tight">{currentSong.title}</h2>
          <button className="text-spotify-light hover:text-white transition-transform hover:scale-110 flex-shrink-0 ml-4">
            <PlusCircle size={32} />
          </button>
        </div>
        <p className="text-xl text-spotify-light font-bold hover:text-white hover:underline cursor-pointer truncate">
          {currentSong.artist}
        </p>
      </div>
      
      {/* Credits */}
      <div className="px-4 mb-4">
        <div className="bg-[#242424] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-white">Credits</span>
            <span className="text-xs font-bold text-spotify-light hover:text-white cursor-pointer">Show all</span>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-white text-sm font-bold truncate">{currentSong.artist}</p>
              <p className="text-spotify-light text-xs">Main Artist</p>
            </div>
            {currentSong.musicDirector && currentSong.musicDirector !== currentSong.artist && (
              <div>
                <p className="text-white text-sm font-bold truncate">{currentSong.musicDirector}</p>
                <p className="text-spotify-light text-xs">Composer</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
