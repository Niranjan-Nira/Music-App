const youtubedl = require('youtube-dl-exec');
const path = require('path');
const os = require('os');
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static');
const yts = require('yt-search');

async function test() {
  try {
    const ytPath = path.resolve(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
    const yt = youtubedl.create(ytPath);

    const searchResult = await yts(`senjitaley official audio`);
    const targetVideo = searchResult.videos[0];
    console.log('Target video:', targetVideo.title, targetVideo.url);

    const tempFile = path.join(os.tmpdir(), `dl-${Date.now()}.mp3`);
    console.log('ffmpeg path:', ffmpegPath);
    console.log('Downloading to:', tempFile);

    await yt(targetVideo.url, {
      extractAudio: true,
      audioFormat: 'mp3',
      output: `"${tempFile}"`,
      ffmpegLocation: `"${ffmpegPath}"`,
    });

    console.log('Download complete.');
    let finalFile = tempFile;
    if (!fs.existsSync(tempFile)) {
       console.log('tempFile does not exist, looking for alternatives...');
       const files = fs.readdirSync(os.tmpdir()).filter(f => f.startsWith(path.basename(tempFile, '.mp3')));
       if (files.length > 0) finalFile = path.join(os.tmpdir(), files[0]);
    }

    if (fs.existsSync(finalFile)) {
       const buffer = fs.readFileSync(finalFile);
       console.log('Success, buffer length:', buffer.length);
       fs.unlinkSync(finalFile);
    } else {
       console.log('Final file not found either.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
test();
