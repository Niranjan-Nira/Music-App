import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AudioProvider } from "@/contexts/AudioContext";
import { PlaylistProvider } from "@/contexts/PlaylistContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Eargasm - Premium Audio Experience",
  description: "A stunning Spotify-like music application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-spotify-black text-white h-screen overflow-hidden`}>
        <AudioProvider>
          <PlaylistProvider>
            {children}
          </PlaylistProvider>
        </AudioProvider>
      </body>
    </html>
  );
}
