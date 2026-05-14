const youtubedl = require('youtube-dl-exec');
const fs = require('fs');

async function test() {
  try {
    console.log('Fetching stream...');
    // Download the video as audio using yt-dlp
    // We use youtube-dl-exec to stream the output
    const subprocess = youtubedl.exec('https://www.youtube.com/watch?v=a3Ue-LN5B9U', {
      extractAudio: true,
      audioFormat: 'mp3',
      output: '-', // output to stdout
      quiet: true
    });

    const chunks = [];
    subprocess.stdout.on('data', chunk => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      subprocess.on('close', resolve);
      subprocess.on('error', reject);
    });

    const buffer = Buffer.concat(chunks);
    console.log('Downloaded bytes:', buffer.length);
  } catch (error) {
    console.error('Error:', error);
  }
}
test();
