"use client";

import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  Shuffle, 
  Volume2, 
  VolumeX, 
  Mic2, 
  ListMusic, 
  MonitorSpeaker, 
  Maximize2, 
  PlusCircle,
  PictureInPicture2
} from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';

export function Player() {
  const { 
    currentSong, 
    isPlaying, 
    togglePlay, 
    playNext, 
    playPrevious, 
    progress, 
    duration, 
    volume, 
    setVolume, 
    seek 
  } = useAudio();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-16 md:bottom-0 md:relative left-0 right-0 h-20 md:h-24 bg-black/95 backdrop-blur-lg md:bg-black border-t border-white/5 px-3 md:px-4 flex items-center justify-between z-50">
      {/* Left: Song Info */}
      <div className="flex items-center gap-3 md:gap-4 flex-1 md:flex-none md:w-[30%] min-w-0 md:min-w-[180px]">
        <img 
          src={currentSong.coverUrl} 
          alt={currentSong.title} 
          className="w-10 h-10 md:w-14 md:h-14 rounded shadow-lg flex-shrink-0"
        />
        <div className="overflow-hidden min-w-0">
          <div className="text-sm md:text-lg font-black text-white hover:underline cursor-pointer truncate">
            {currentSong.title}
          </div>
          <div className="text-[10px] md:text-sm text-spotify-light font-bold hover:text-white hover:underline cursor-pointer truncate">
            {currentSong.artist}
          </div>
        </div>
        <button className="hidden sm:block text-spotify-light hover:text-white transition-colors ml-2">
          <PlusCircle size={18} />
        </button>
      </div>

      {/* Middle: Controls */}
      <div className="flex flex-col items-center flex-shrink-0 md:max-w-[40%] md:w-full gap-1 md:gap-2 mx-2">
        <div className="flex items-center gap-4 md:gap-6">
          <button className="hidden md:block text-spotify-light hover:text-spotify-green transition-colors">
            <Shuffle size={18} />
          </button>
          <button 
            onClick={playPrevious}
            className="hidden sm:block text-spotify-light hover:text-white transition-colors"
          >
            <SkipBack size={20} fill="currentColor" />
          </button>
          <button 
            onClick={togglePlay}
            className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center bg-white rounded-full text-black hover:scale-105 transition-all shadow-lg"
          >
            {isPlaying ? <Pause size={20} md:size={18} fill="black" /> : <Play size={20} md:size={18} fill="black" className="ml-0.5" />}
          </button>
          <button 
            onClick={playNext}
            className="text-spotify-light hover:text-white transition-colors"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>
          <button className="hidden md:block text-spotify-light hover:text-spotify-green transition-colors">
            <Repeat size={18} />
          </button>
        </div>
        
        {/* Progress Bar - Hidden on small mobile */}
        <div className="hidden md:flex items-center gap-2 w-full text-[11px] text-spotify-light font-medium">
          <span className="w-10 text-right">{formatTime(progress)}</span>
          <div className="group relative flex-1 h-1 bg-white/20 rounded-full cursor-pointer overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-white group-hover:bg-spotify-green" 
              style={{ width: `${(progress / (duration || 1)) * 100}%` }} 
            />
            <input 
              type="range" 
              min={0} 
              max={duration || 0} 
              value={progress} 
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="w-10">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Tools - Hidden on mobile */}
      <div className="hidden md:flex items-center justify-end gap-3 w-[30%] min-w-[180px]">
        <button className="p-1 text-spotify-light hover:text-white transition-colors">
          <Mic2 size={16} />
        </button>
        <button className="p-1 text-spotify-light hover:text-white transition-colors">
          <ListMusic size={16} />
        </button>
        <button className="p-1 text-spotify-light hover:text-white transition-colors">
          <MonitorSpeaker size={16} />
        </button>
        <div className="flex items-center gap-2 w-24 group">
          <button onClick={() => setVolume(volume === 0 ? 0.5 : 0)}>
            {volume === 0 ? <VolumeX size={18} className="text-spotify-light group-hover:text-white" /> : <Volume2 size={18} className="text-spotify-light group-hover:text-white" />}
          </button>
          <div className="relative flex-1 h-1 bg-white/20 rounded-full cursor-pointer">
            <div 
              className="absolute top-0 left-0 h-full bg-white group-hover:bg-spotify-green" 
              style={{ width: `${volume * 100}%` }} 
            />
            <input 
              type="range" 
              min={0} 
              max={1} 
              step={0.01}
              value={volume} 
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
        <button className="p-1 text-spotify-light hover:text-white transition-colors">
          <PictureInPicture2 size={16} />
        </button>
        <button className="p-1 text-spotify-light hover:text-white transition-colors">
          <Maximize2 size={16} />
        </button>
      </div>
    </div>
  );
}
