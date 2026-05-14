const play = require('play-dl');

async function test() {
  try {
    const searchResult = await play.search('Aasa Kooda South Melody', { limit: 1 });
    if (!searchResult || searchResult.length === 0) {
      console.log('No results');
      return;
    }
    const video = searchResult[0];
    console.log('Found:', video.url);
    
    const stream = await play.stream(video.url);
    console.log('Got stream:', stream.type);
    
    // Just grab a tiny bit of data to prove it works
    const chunks = [];
    let count = 0;
    for await (const chunk of stream.stream) {
      chunks.push(chunk);
      count++;
      if (count > 5) break; // just test stream start
    }
    console.log('Successfully read data chunks from stream!');
  } catch (error) {
    console.error('Error:', error);
  }
}
test();
