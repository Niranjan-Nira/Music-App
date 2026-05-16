/**
 * Encode cookies.txt for Vercel env var YOUTUBE_COOKIES_BASE64
 * Usage: node scripts/encode-cookies.mjs [path-to-cookies.txt]
 */
import fs from 'fs';
import path from 'path';

const input =
  process.argv[2] ||
  path.join(process.cwd(), 'youtube-cookies.txt');

if (!fs.existsSync(input)) {
  console.error(`File not found: ${input}`);
  process.exit(1);
}

const content = fs.readFileSync(input, 'utf8');
const encoded = Buffer.from(content, 'utf8').toString('base64');

console.log('\nAdd to Vercel → Environment Variables:\n');
console.log('Key:   YOUTUBE_COOKIES_BASE64');
console.log('Value: (copy the line below)\n');
console.log(encoded);
console.log('\n');
