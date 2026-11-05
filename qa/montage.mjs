// Contact sheets of every built page, for visual review. Usage: node qa/montage.mjs
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-core';

const routes = JSON.parse(readFileSync('src/_data/routes.json', 'utf8')).filter((r) => r.built);
const T = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
const s = createServer(async (q, r) => { let p = new URL(q.url, 'http://x').pathname; if (p.endsWith('/')) p += 'index.html'; try { const b = await readFile(join('_site', p)); r.writeHead(200, { 'content-type': T[extname(p)] || 'text/plain' }); r.end(b); } catch { r.writeHead(404); r.end(); } });
await new Promise((x) => s.listen(0, x));
const b = await chromium.launch({ channel: 'chrome' });
for (const [name, width, height, cols, thumb] of [['mobile', 390, 1500, 13, 150], ['desktop', 1440, 1100, 9, 220]]) {
  const shots = [];
  for (const r of routes) {
    const p = await b.newPage({ viewport: { width, height } });
    await p.goto(`http://localhost:${s.address().port}${r.url}`, { waitUntil: 'load' });
    await p.waitForTimeout(250);
    shots.push({ url: r.url, data: (await p.screenshot({ type: 'jpeg', quality: 55 })).toString('base64') });
    await p.close();
  }
  const m = await b.newPage({ viewport: { width: cols * (thumb + 6), height: 800 } });
  await m.setContent(`<style>body{margin:0;display:grid;grid-template-columns:repeat(${cols},${thumb + 6}px);font:9px sans-serif;background:#fff}div{padding:3px;overflow:hidden}img{width:${thumb}px;display:block}</style>` + shots.map((x) => `<div>${x.url.replace('/industries/accounting-for-', '/i/').replace('/services/', '/s/').replace('/guides/', '/g/').slice(0, 30)}<img src="data:image/jpeg;base64,${x.data}"></div>`).join(''));
  await m.waitForTimeout(500);
  await m.screenshot({ path: `qa/reports/montage-${name}.png`, fullPage: true });
  await m.close();
}
await b.close(); s.close();
console.log('montages written');
