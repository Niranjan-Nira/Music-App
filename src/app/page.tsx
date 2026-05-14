"use client";

import { Sidebar } from "@/components/Sidebar";
import { MainContent } from "@/components/MainContent";
import { Player } from "@/components/Player";
import { TopBar } from "@/components/TopBar";
import { RightSidebar } from "@/components/RightSidebar";
import { BottomNav } from "@/components/BottomNav";

export default function Home() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black selection:bg-spotify-green selection:text-black pb-16 md:pb-0">
      {/* Top Header */}
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation */}
        <Sidebar />

        {/* Center Main View */}
        <MainContent />

        {/* Right Sidebar */}
        <RightSidebar />
      </div>

      {/* Developer Credit */}
      <div className="fixed bottom-36 md:bottom-24 right-6 z-[60] pointer-events-none">
        <p className="text-xs font-medium tracking-widest text-white/30 uppercase italic hover:text-spotify-green transition-colors cursor-default select-none animate-pulse">
          Created by <span className="text-spotify-green font-black not-italic tracking-wider">NIRANJAN</span>
        </p>
      </div>

      {/* Bottom Player */}
      <Player />
      
      {/* Mobile Navigation */}
      <BottomNav />
    </div>
  );
}
