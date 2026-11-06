// Builds the owner portrait files from the owner-supplied photograph in brand-source/ (kept unchanged, never published).
// The photo is only scaled down proportionally: no crop, no retouching, no filters. The source is 1122x1402 (4:5), the same
// shape as the frame, so the whole picture is shown. Uses the locally installed Chrome, like make-logo.mjs.
// The frame is at most 21rem (336 CSS px) wide, so 400/672/1008 cover 1x to 3x screens. A JPEG is the fallback for
// browsers without WebP.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const SRC = 'brand-source/deepak-mittal-portrait-original.png';
const OUT = 'src/assets/images/owner';
const TARGETS = [['owner-photo-deepak-mittal-400.webp', 400, 'image/webp', 0.86], ['owner-photo-deepak-mittal-672.webp', 672, 'image/webp', 0.84], ['owner-photo-deepak-mittal-1008.webp', 1008, 'image/webp', 0.82], ['owner-photo-deepak-mittal-672.jpg', 672, 'image/jpeg', 0.84]];

mkdirSync(OUT, { recursive: true });
const b64 = readFileSync(SRC).toString('base64');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const result = await page.evaluate(async ({ b64, TARGETS }) => {
  const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
  const src = await createImageBitmap(blob);
  const files = [];
  for (const [name, tw, type, quality] of TARGETS) {
    const th = Math.round((tw * src.height) / src.width);
    // Chrome's high-quality resize filter, rather than a single bilinear drawImage, keeps facial detail sharp.
    const bmp = await createImageBitmap(blob, { resizeWidth: tw, resizeHeight: th, resizeQuality: 'high' });
    const c = new OffscreenCanvas(tw, th); c.getContext('2d').drawImage(bmp, 0, 0);
    const out = await c.convertToBlob({ type, quality });
    files.push({ name, tw, th, data: [...new Uint8Array(await out.arrayBuffer())] });
  }
  return { original: [src.width, src.height], files };
}, { b64, TARGETS });
await browser.close();
for (const f of result.files) {
  writeFileSync(`${OUT}/${f.name}`, Buffer.from(f.data));
  console.log(`${f.name}: ${f.tw}x${f.th}, ${(f.data.length / 1024).toFixed(1)} KB`);
}
console.log(`original ${result.original.join('x')}`);
