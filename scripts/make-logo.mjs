// Builds the website logo files from the owner-supplied original in brand-source/ (kept unchanged, never published).
// Only the transparent margin is trimmed (pixels at alpha 2/255 or less, invisible noise left by background removal); the artwork is scaled down proportionally and never recoloured or redrawn.
// Uses the locally installed Chrome, like make-icons.mjs, so no image library is needed.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const SRC = 'brand-source/accountorbit-logo-original.png';
const OUT = 'src/assets/images/brand';
// Header shows at up to 180 CSS px and footer at up to 195, so these widths cover 3x screens.
const TARGETS = [['accountorbit-logo-header.webp', 540], ['accountorbit-logo-footer.webp', 600]];
const PAD = 8; // transparent pixels kept around the artwork so anti-aliased edges are not clipped

mkdirSync(OUT, { recursive: true });
const b64 = readFileSync(SRC).toString('base64');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const result = await page.evaluate(async ({ b64, TARGETS, PAD }) => {
  const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
  const c = new OffscreenCanvas(img.width, img.height); const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, img.width, img.height).data;
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) for (let i = 0; i < img.width; i++) if (d[(y * img.width + i) * 4 + 3] > 2) {
    if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD); x1 = Math.min(img.width - 1, x1 + PAD); y1 = Math.min(img.height - 1, y1 + PAD);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const files = [];
  for (const [name, tw] of TARGETS) {
    const th = Math.round((tw * h) / w);
    const o = new OffscreenCanvas(tw, th); const ox = o.getContext('2d');
    ox.imageSmoothingEnabled = true; ox.imageSmoothingQuality = 'high';
    ox.drawImage(img, x0, y0, w, h, 0, 0, tw, th);
    const blob = await o.convertToBlob({ type: 'image/webp', quality: 0.92 });
    files.push({ name, tw, th, data: [...new Uint8Array(await blob.arrayBuffer())] });
  }
  return { original: [img.width, img.height], crop: [x0, y0, w, h], files };
}, { b64, TARGETS, PAD });
await browser.close();
for (const f of result.files) {
  writeFileSync(`${OUT}/${f.name}`, Buffer.from(f.data));
  console.log(`${f.name}: ${f.tw}x${f.th}, ${(f.data.length / 1024).toFixed(1)} KB`);
}
console.log(`original ${result.original.join('x')}, artwork crop ${result.crop.join(',')}`);
