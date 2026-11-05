// Builds review sheets from saved full-page screenshots, one sheet per group of pages.
// Usage: node qa/contact-sheet.mjs after 1440 [thumbWidth] [capHeight]   Writes qa/reports/sheet_<group>_<width>.png
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const [label = 'after', width = '1440', tw = '330', cap = '1500'] = process.argv.slice(2);
const built = JSON.parse(readFileSync('src/_data/routes.json', 'utf8')).filter((r) => r.built).map((r) => r.url);
const groups = {
  core: built.filter((u) => ['/how-it-works/', '/about-us/', '/contact-us/', '/request-an-accountant/', '/for-accounting-professionals/', '/privacy-policy/', '/terms-and-conditions/', '/disclaimer/'].includes(u)),
  services1: built.filter((u) => u.startsWith('/services/')).slice(0, 8),
  services2: built.filter((u) => u.startsWith('/services/')).slice(8),
  industries1: built.filter((u) => u.startsWith('/industries/')).slice(0, 7),
  industries2: built.filter((u) => u.startsWith('/industries/')).slice(7),
  guides: built.filter((u) => u.startsWith('/guides/')),
  locations1: built.filter((u) => u.startsWith('/locations/')).slice(0, 8),
  locations2: built.filter((u) => u.startsWith('/locations/')).slice(8),
};
const b = await chromium.launch({ channel: 'chrome' });
for (const [name, urls] of Object.entries(groups)) {
  const cells = urls.map((u) => {
    const f = `qa/reports/shots-${label}/${u.replace(/\//g, '_')}${width}.png`;
    if (!existsSync(f)) return '';
    return `<figure><figcaption>${u}</figcaption><div class="c"><img src="file:///${resolve(f).replace(/\\/g, '/')}"></div></figure>`;
  }).join('');
  const page = await b.newPage({ viewport: { width: Math.min(urls.length, 8) * (Number(tw) + 10) + 10, height: Number(cap) + 50 } });
  const tmp = resolve(`qa/reports/_sheet_${name}.html`);
  const { writeFileSync } = await import('node:fs');
  writeFileSync(tmp, `<!doctype html><style>*{margin:0}body{display:flex;gap:10px;padding:10px;background:#777;font:12px sans-serif}figcaption{color:#fff;height:24px;overflow:hidden;white-space:nowrap}.c{width:${tw}px;height:${cap}px;overflow:hidden;background:#fff}img{width:100%;display:block}</style>${cells}`);
  await page.goto(`file:///${tmp.replace(/\\/g, '/')}`, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `qa/reports/sheet_${name}_${width}.png` });
  await page.close();
}
await b.close();
console.log('sheets written');
