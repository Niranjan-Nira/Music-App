import { update } from 'youtube-dl-exec';

try {
  await update();
  console.log('yt-dlp updated successfully');
} catch (err) {
  console.warn('yt-dlp update skipped:', err?.message ?? err);
}
