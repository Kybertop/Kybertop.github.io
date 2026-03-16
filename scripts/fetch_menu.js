const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MENU_PAGE_URL = 'https://ucm.top-relax.sk/';
const OUTPUT_DIR = path.join(__dirname, '..', 'assets');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'menu.png');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function extractBestImageUrl(html) {
  // Find the <img> tag with wp-image class (the menu screenshot)
  const imgRegex = /<img[^>]*class="[^"]*wp-image[^"]*"[^>]*>/i;
  const imgMatch = html.match(imgRegex);

  if (!imgMatch) {
    // Fallback: find any img with srcset pointing to wp-content/uploads
    const fallbackRegex = /<img[^>]*src="(https?:\/\/ucm\.top-relax\.sk\/wp-content\/uploads\/[^"]+)"/i;
    const fallbackMatch = html.match(fallbackRegex);
    if (fallbackMatch) return fallbackMatch[1];
    throw new Error('No menu image found on page');
  }

  const imgTag = imgMatch[0];

  // Try to get the largest image from srcset
  const srcsetRegex = /srcset="([^"]+)"/i;
  const srcsetMatch = imgTag.match(srcsetRegex);

  if (srcsetMatch) {
    const entries = srcsetMatch[1].split(',').map((entry) => {
      const parts = entry.trim().split(/\s+/);
      const url = parts[0];
      const width = parseInt(parts[1]) || 0;
      return { url, width };
    });

    // Sort by width descending, pick the largest
    entries.sort((a, b) => b.width - a.width);
    if (entries.length > 0) return entries[0].url;
  }

  // Fallback to src attribute
  const srcRegex = /src="([^"]+)"/i;
  const srcMatch = imgTag.match(srcRegex);
  if (srcMatch) return srcMatch[1];

  throw new Error('Could not extract image URL from img tag');
}

async function main() {
  console.log(`Fetching menu page: ${MENU_PAGE_URL}`);
  const htmlBuffer = await fetch(MENU_PAGE_URL);
  const html = htmlBuffer.toString('utf-8');

  const imageUrl = extractBestImageUrl(html);
  console.log(`Found menu image: ${imageUrl}`);

  console.log('Downloading image...');
  const imageData = await fetch(imageUrl);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, imageData);
  console.log(`Saved menu image to ${OUTPUT_FILE} (${imageData.length} bytes)`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
