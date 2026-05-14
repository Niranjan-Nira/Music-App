require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'drte935yg',
  api_key: '186629761222654',
  api_secret: 'dp5CUipkyiAUi9d5WJ8Gbnihe_w',
});

const fs = require('fs');
const youtubedl = require('youtube-dl-exec');
const path = require('path');
const os = require('os');
const ffmpegPath = require('ffmpeg-static');
const yts = require('yt-search');

async function test() {
  try {
    const ytPath = path.resolve(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
    const yt = youtubedl.create(ytPath);

    const searchResult = await yts(`senjitaley official audio`);
    const targetVideo = searchResult.videos[0];
    
    const tempFile = path.join(os.tmpdir(), `dl-${Date.now()}.mp3`);

    await yt(targetVideo.url, {
      extractAudio: true,
      audioFormat: 'mp3',
      output: `"${tempFile}"`,
      ffmpegLocation: `"${ffmpegPath}"`,
    });

    let finalFile = tempFile;
    if (!fs.existsSync(tempFile)) {
       const files = fs.readdirSync(os.tmpdir()).filter(f => f.startsWith(path.basename(tempFile, '.mp3')));
       if (files.length > 0) finalFile = path.join(os.tmpdir(), files[0]);
    }

    const buffer = fs.readFileSync(finalFile);
    fs.unlinkSync(finalFile);

    console.log('Uploading to Cloudinary...');
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'musicify_downloads',
          public_id: `test_${Date.now()}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      uploadStream.end(buffer);
    });

    console.log('Cloudinary success:', uploadResult.secure_url);
  } catch (error) {
    console.error('Error:', error);
  }
}
test();
