import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@distube/ytdl-core', 'youtube-dl-exec', 'ffmpeg-static', 'yt-search'],
};

export default nextConfig;
