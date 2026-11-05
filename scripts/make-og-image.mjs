// Renders the 1200x630 social sharing image into src/assets. Run again if the brand wording changes.
// It uses the text wordmark only, because no final logo has been supplied.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const font = (file) => readFileSync(`node_modules/@fontsource-variable/${file}`).toString('base64');
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: N; src: url(data:font/woff2;base64,${font('newsreader/files/newsreader-latin-wght-normal.woff2')}); font-weight: 200 800; }
@font-face { font-family: N; font-style: italic; src: url(data:font/woff2;base64,${font('newsreader/files/newsreader-latin-wght-italic.woff2')}); font-weight: 200 800; }
@font-face { font-family: H; src: url(data:font/woff2;base64,${font('hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2')}); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; background: #16392c; color: #f8f4ea; padding: 72px 80px; display: flex; flex-direction: column; justify-content: space-between; }
.w { font: 500 44px N; } .w i { color: #e7c56f; }
h1 { font: 400 84px/1.05 N; letter-spacing: -0.02em; } h1 i { color: #e7c56f; }
.b { font: 500 26px H; color: #e4eae3; padding-top: 22px; border-top: 6px double #b68a2c; }
</style><div class="w">Account<i>Orbit</i></div><h1>Find accounting help in Delhi, and <i>know who is doing what.</i></h1><p class="b">Independent referral platform. Not a CA firm.</p>`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'src/assets/og-image.png' });
await browser.close();
console.log('Wrote src/assets/og-image.png');
