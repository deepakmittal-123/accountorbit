// Route-by-route audit of all 77 approved routes against the source tree and the built output.
// Serves _site locally and requests every route. Writes qa/reports/route-audit.json and prints a summary.
// Usage: node qa/route-audit.mjs
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { mkdirSync as ensureDir } from 'node:fs';
ensureDir('qa/reports', { recursive: true });

const routes = JSON.parse(readFileSync('src/_data/routes.json', 'utf8'));
const SITE = 'https://accountorbit.in';
const T = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.txt': 'text/plain', '.xml': 'application/xml' };
const s = createServer(async (q, r) => {
  let p = new URL(q.url, 'http://x').pathname; if (p.endsWith('/')) p += 'index.html';
  try { const b = await readFile(join('_site', p)); r.writeHead(200, { 'content-type': T[extname(p)] || 'application/octet-stream' }); r.end(b); }
  catch { r.writeHead(404, { 'content-type': 'text/html' }); r.end(readFileSync('_site/404.html')); }
});
await new Promise((x) => s.listen(0, x));
const base = `http://localhost:${s.address().port}`;

const sourceFor = (url) => {
  const slug = url.replace(/^\/|\/$/g, '');
  if (!slug) return 'src/index.njk';
  return [`src/${slug}.njk`, `src/${slug}/index.njk`].find(existsSync) || null;
};
const rows = [];
for (const r of routes) {
  const res = await fetch(base + r.url);
  const h = await res.text();
  const main = (h.match(/<main[\s\S]*<\/main>/) || [''])[0];
  const row = {
    url: r.url, name: r.name, built: Boolean(r.built), status: r.status, publication: r.publication, indexable: Boolean(r.indexable),
    source: sourceFor(r.url), html: existsSync(join('_site', r.url, 'index.html')), http: res.status,
    words: res.status === 200 ? main.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length : 0,
    canonical: (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || null,
    robots: (h.match(/<meta name="robots" content="([^"]+)"/) || [])[1] || null,
    notes: (main.match(/class="pending"/g) || []).length,
    noteText: [...main.matchAll(/<mark class="pending"><strong>[^<]*<\/strong>\s*([\s\S]*?)<\/mark>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim()),
    form: /id="enquiry-form"/.test(main),
    h1: (main.match(/<h1/g) || []).length,
  };
  row.canonicalOk = res.status === 200 ? row.canonical === SITE + r.url : null;
  rows.push(row);
}
s.close();
writeFileSync('qa/reports/route-audit.json', JSON.stringify(rows, null, 1));
const n = (f) => rows.filter(f).length;
console.log({ total: rows.length, built: n((x) => x.built), source: n((x) => x.source), html: n((x) => x.html), http200: n((x) => x.http === 200), http404: n((x) => x.http === 404), canonicalOk: n((x) => x.canonicalOk), noindex: n((x) => /noindex/.test(x.robots || '') && x.http === 200), withNotes: n((x) => x.notes > 0), noNotes: n((x) => x.built && x.notes === 0) });
for (const x of rows.filter((y) => y.notes)) console.log(x.notes, x.url, '::', x.noteText.join(' || ').slice(0, 400));
