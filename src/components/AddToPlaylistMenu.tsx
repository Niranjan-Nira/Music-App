"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Plus, Check, ListMusic } from 'lucide-react';
import { usePlaylist } from '@/contexts/PlaylistContext';
import { Song } from '@/lib/data';

interface AddToPlaylistMenuProps {
  song: Song;
  onCreateNew?: () => void;
}

export function AddToPlaylistMenu({ song, onCreateNew }: AddToPlaylistMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { customPlaylists, addSongToPlaylist, removeSongFromPlaylist, isSongInPlaylist } = usePlaylist();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggle = (playlistId: string) => {
    if (isSongInPlaylist(playlistId, song.id)) {
      removeSongFromPlaylist(playlistId, song.id);
    } else {
      addSongToPlaylist(playlistId, song);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-white/10 text-spotify-light hover:text-white transition-all"
      >
        <MoreHorizontal size={18} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-[#282828] rounded-lg shadow-2xl border border-white/10 py-1 z-[60] animate-in fade-in slide-in-from-top-2">
          <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-spotify-light/50 font-bold">
            Add to Playlist
          </div>

          {customPlaylists.length > 0 ? (
            customPlaylists.map(pl => {
              const isIn = isSongInPlaylist(pl.id, song.id);
              return (
                <button
                  key={pl.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(pl.id);
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-left text-sm hover:bg-white/10 transition-colors"
                >
                  <ListMusic size={16} className={isIn ? 'text-spotify-green' : 'text-spotify-light'} />
                  <span className={`flex-1 truncate ${isIn ? 'text-spotify-green font-medium' : 'text-white'}`}>
                    {pl.name}
                  </span>
                  {isIn && <Check size={14} className="text-spotify-green flex-shrink-0" />}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-3 text-xs text-spotify-light/40 text-center">
              No playlists yet
            </div>
          )}

          <div className="border-t border-white/10 mt-1 pt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onCreateNew?.();
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-left text-sm hover:bg-white/10 transition-colors text-spotify-light hover:text-white"
            >
              <Plus size={16} />
              <span>New Playlist</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
