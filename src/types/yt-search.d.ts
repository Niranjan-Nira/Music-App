declare module 'yt-search' {
  interface VideoResult {
    title: string;
    url: string;
  }

  interface SearchResult {
    videos: VideoResult[];
  }

  function yts(query: string): Promise<SearchResult>;
  export = yts;
}
