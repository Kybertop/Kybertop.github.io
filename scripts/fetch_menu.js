const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MENU_PAGE_URL = 'https://ucm.top-relax.sk/';
const OUTPUT_DIR = path.join(__dirname, '..', 'assets');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'menu.jpg');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'sk,en-US;q=0.7,en;q=0.3',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGet(res.headers.location).then(resolve).catch(reject);
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

function extractImageUrl(html) {
  // 1) Try wp-image class img tag with srcset (pick largest)
  const imgTagRegex = /<img[^>]*class="[^"]*wp-image[^"]*"[^>]*>/i;
  const imgMatch = html.match(imgTagRegex);

  if (imgMatch) {
    const tag = imgMatch[0];

    // Try srcset first — pick the widest version
    const srcsetMatch = tag.match(/srcset="([^"]+)"/i);
    if (srcsetMatch) {
      const best = srcsetMatch[1]
        .split(',')
        .map((e) => {
          const [url, w] = e.trim().split(/\s+/);
          return { url, width: parseInt(w) || 0 };
        })
        .sort((a, b) => b.width - a.width)[0];
      if (best) return best.url;
    }

    // Fall back to src
    const srcMatch = tag.match(/src="([^"]+)"/i);
    if (srcMatch) return srcMatch[1];
  }

  // 2) Fallback: any img src from wp-content/uploads on this domain
  const anyImg = html.match(
    /(?:src|srcset)="(https?:\/\/ucm\.top-relax\.sk\/wp-content\/uploads\/[^"\s]+)/i
  );
  if (anyImg) return anyImg[1];

  throw new Error('No menu image found on the page');
}

async function main() {
  console.log('Fetching menu page:', MENU_PAGE_URL);
  const html = (await httpGet(MENU_PAGE_URL)).toString('utf-8');

  const imageUrl = extractImageUrl(html);
  console.log('Found image:', imageUrl);

  const imageData = await httpGet(imageUrl);
  console.log(`Downloaded ${imageData.length} bytes`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, imageData);
  console.log('Saved to', OUTPUT_FILE);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
