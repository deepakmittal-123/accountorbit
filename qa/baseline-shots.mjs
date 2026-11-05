// Saves viewport-width screenshots of every built page, for before and after comparison.
// Usage: node qa/baseline-shots.mjs before|after [widths comma separated]   Writes to qa/reports/shots-<label>/
import { createServer } from 'node:http';
import { mkdirSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-core';

const [label = 'before', w = '390,1440'] = process.argv.slice(2);
const widths = w.split(',').map(Number);
const dir = `qa/reports/shots-${label}`;
mkdirSync(dir, { recursive: true });
const built = JSON.parse(readFileSync('src/_data/routes.json', 'utf8')).filter((r) => r.built);
const T = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp' };
const s = createServer(async (q, r) => { let p = new URL(q.url, 'http://x').pathname; if (p.endsWith('/')) p += 'index.html'; try { const b = await readFile(join('_site', p)); r.writeHead(200, { 'content-type': T[extname(p)] || 'text/plain' }); r.end(b); } catch { r.writeHead(404); r.end(); } });
await new Promise((x) => s.listen(0, x));
const b = await chromium.launch({ channel: 'chrome' });
let n = 0;
for (const width of widths) {
  const ctx = await b.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  for (const r of built) {
    const p = await ctx.newPage();
    await p.goto(`http://localhost:${s.address().port}${r.url}`, { waitUntil: 'networkidle' });
    await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
    await p.screenshot({ path: join(dir, `${(r.url.replace(/\//g, '_') || '_')}${width}.png`), fullPage: true });
    await p.close(); n++;
  }
  await ctx.close();
}
await b.close(); s.close();
console.log(`${n} screenshots in ${dir}`);
