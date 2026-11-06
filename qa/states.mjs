// Captures interaction states for visual review: open menu, open FAQ, form errors, 404 page, table scrolled.
// Writes qa/reports/state_<name>.png. Usage: node qa/states.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-core';
import { mkdirSync as ensureDir } from 'node:fs';
ensureDir('qa/reports', { recursive: true });

const T = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp' };
const s = createServer(async (q, r) => { let p = new URL(q.url, 'http://x').pathname; if (p.endsWith('/')) p += 'index.html'; try { const b = await readFile(join('_site', p)); r.writeHead(200, { 'content-type': T[extname(p)] || 'text/plain' }); r.end(b); } catch { const b = await readFile('_site/404.html'); r.writeHead(404, { 'content-type': 'text/html' }); r.end(b); } });
await new Promise((x) => s.listen(0, x));
const base = `http://localhost:${s.address().port}`;
const b = await chromium.launch({ channel: 'chrome' });
const open = async (url, width, height = 800) => { const p = await b.newPage({ viewport: { width, height }, reducedMotion: 'reduce' }); await p.goto(base + url, { waitUntil: 'networkidle' }); return p; };
const shot = (p, name, fullPage = false) => p.screenshot({ path: `qa/reports/state_${name}.png`, fullPage });

let p = await open('/', 390);
await p.locator('.site-menu summary').click();
await p.waitForTimeout(200);
await shot(p, 'menu-390');
await p.close();

p = await open('/', 1280, 900);
const q = p.locator('main details summary').first();
await q.scrollIntoViewIfNeeded(); await q.click(); await p.waitForTimeout(200);
await shot(p, 'faq-1280');
await p.close();

p = await open('/request-an-accountant/', 390, 1500);
for (const [id, v] of [['#phone', '123'], ['#email', 'not-an-email']]) { await p.locator(id).fill(v); await p.locator(id).blur(); }
await p.waitForTimeout(150);
await shot(p, 'form-errors-390');
await p.close();

p = await open('/no-such-page/', 390);
await shot(p, '404-390');
await p.close();

p = await open('/how-it-works/', 768, 1200);
await shot(p, 'how-768');
await p.close();

p = await open('/how-it-works/', 390, 1000);
const wrap = p.locator('.data-table-wrap').first();
await wrap.scrollIntoViewIfNeeded();
await wrap.evaluate((e) => { e.scrollLeft = e.scrollWidth; });
await p.waitForTimeout(150);
await shot(p, 'table-scrolled-390');
await p.close();

await b.close(); s.close();
console.log('states captured');
