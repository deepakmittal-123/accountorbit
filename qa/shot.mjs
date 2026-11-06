// Full-page screenshots for visual review. Usage: node qa/shot.mjs /route/ [width...]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { chromium } from 'playwright-core';

const [url = '/', ...w] = process.argv.slice(2);
const widths = w.length ? w.map(Number) : [390, 1440];
const T = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp' };
const s = createServer(async (q, r) => { let p = new URL(q.url, 'http://x').pathname; if (p.endsWith('/')) p += 'index.html'; try { const b = await readFile(join('_site', p)); r.writeHead(200, { 'content-type': T[extname(p)] || 'text/plain' }); r.end(b); } catch { r.writeHead(404); r.end(); } });
await new Promise((x) => s.listen(0, x));
const b = await chromium.launch({ channel: 'chrome' });
const slug = url.replace(/\//g, '_') || 'home';
for (const width of widths) {
  const p = await b.newPage({ viewport: { width, height: 800 } });
  await p.goto(`http://localhost:${s.address().port}${url}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  console.log(width, 'height', await p.evaluate(() => document.documentElement.scrollHeight));
  await p.screenshot({ path: `qa/reports/shot${slug}${width}.png`, fullPage: true });
  await p.close();
}
await b.close(); s.close();
