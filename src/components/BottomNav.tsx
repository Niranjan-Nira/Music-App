"use client";

import React from 'react';
import { Home, Search, Library } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';

export function BottomNav() {
  const { setActivePlaylist } = useAudio();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-black/95 backdrop-blur-lg border-t border-white/5 flex items-center justify-around px-2 z-[100] md:hidden">
      <button 
        onClick={() => {
          setActivePlaylist(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="flex flex-col items-center gap-1 text-spotify-light hover:text-white transition-all group"
      >
        <Home size={24} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-bold">Home</span>
      </button>

      <button 
        onClick={() => document.getElementById('main-search-input')?.focus()}
        className="flex flex-col items-center gap-1 text-spotify-light hover:text-white transition-all group"
      >
        <Search size={24} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-bold">Search</span>
      </button>

      <button 
        className="flex flex-col items-center gap-1 text-spotify-light hover:text-white transition-all group"
      >
        <Library size={24} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-bold">Your Library</span>
      </button>
    </nav>
  );
}
