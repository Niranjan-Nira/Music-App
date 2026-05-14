import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['yt-search', 'cheerio', 'youtube-dl-exec', 'ffmpeg-static', 'play-dl', '@distube/ytdl-core'],
};

export default nextConfig;
