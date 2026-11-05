// Full-page visual review: lays one page out in columns so the whole length stays readable.
// Usage: node qa/fullpage.mjs /route/ [width] [columnHeight]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-core';
import { mkdirSync as ensureDir } from 'node:fs';
ensureDir('qa/reports', { recursive: true });

const [url = '/', w = '390', h = '1900'] = process.argv.slice(2);
const width = Number(w), colH = Number(h);
const T = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
const s = createServer(async (q, r) => { let p = new URL(q.url, 'http://x').pathname; if (p.endsWith('/')) p += 'index.html'; try { const b = await readFile(join('_site', p)); r.writeHead(200, { 'content-type': T[extname(p)] || 'text/plain' }); r.end(b); } catch { r.writeHead(404); r.end(); } });
await new Promise((x) => s.listen(0, x));
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
await p.goto(`http://localhost:${s.address().port}${url}`, { waitUntil: 'networkidle' });
await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
await p.waitForTimeout(400);
const total = await p.evaluate(() => document.documentElement.scrollHeight);
const png = (await p.screenshot({ type: 'png', fullPage: true })).toString('base64');
const cols = Math.ceil(total / colH);
const m = await b.newPage({ viewport: { width: cols * (width + 10), height: colH } });
await m.setContent(`<!doctype html><style>*{margin:0}body{display:flex;gap:10px;background:#888}div{width:${width}px;height:${colH}px;background-image:url(data:image/png;base64,${png});background-repeat:no-repeat}</style>${Array.from({ length: cols }, (_, i) => `<div style="background-position:0 -${i * colH}px"></div>`).join('')}`);
await m.waitForTimeout(400);
const slug = url.replace(/\//g, '_');
await m.screenshot({ path: `qa/reports/full${slug}${width}.png` });
await b.close(); s.close();
console.log(url, width, 'height', total, 'columns', cols);
