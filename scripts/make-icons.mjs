// Renders site icons from src/assets/favicon.svg into src/root (copied to the site root by the build).
// The mark is a neutral placeholder (a T-account with a double rule). Replace favicon.svg and re-run when a final logo exists.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const svg = readFileSync('src/assets/favicon.svg', 'utf8');
mkdirSync('src/root', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const render = async (size, solid = true) => {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<!doctype html><style>*{margin:0}html{background:${solid ? '#16392c' : 'transparent'}}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  const png = await page.screenshot({ type: 'png', omitBackground: true });
  await page.close();
  return png;
};
const [p32, p48] = await Promise.all([render(32, false), render(48, false)]);
const [p180, p192, p512] = await Promise.all([render(180), render(192), render(512)]);
await browser.close();

// An ICO file can hold PNG images directly: a 6-byte header, then a 16-byte entry per image.
const images = [[32, p32], [48, p48]];
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach(([size, data], i) => {
  const at = 6 + 16 * i;
  header.writeUInt8(size, at); header.writeUInt8(size, at + 1); header.writeUInt16LE(1, at + 4); header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(data.length, at + 8); header.writeUInt32LE(offset, at + 12);
  offset += data.length;
});
writeFileSync('src/root/favicon.ico', Buffer.concat([header, ...images.map(([, d]) => d)]));
writeFileSync('src/root/apple-touch-icon.png', p180);
writeFileSync('src/root/icon-192.png', p192);
writeFileSync('src/root/icon-512.png', p512);
writeFileSync('src/root/site.webmanifest', JSON.stringify({
  name: 'AccountOrbit',
  short_name: 'AccountOrbit',
  description: 'Independent referral platform for accounting and tax help in Delhi.',
  start_url: '/',
  display: 'browser',
  background_color: '#f8f4ea',
  theme_color: '#16392c',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
}, null, 2) + '\n');
console.log('icons written');
