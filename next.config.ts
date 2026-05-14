import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['play-dl', '@distube/ytdl-core', 'youtube-dl-exec', 'ffmpeg-static'],
};

export default nextConfig;
