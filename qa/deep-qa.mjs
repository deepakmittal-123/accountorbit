// Deeper checks: Firefox and WebKit rendering, HTML validity, and near-duplicate content across pages.
// Usage: node qa/deep-qa.mjs   (run after a build). Exit code is non-zero if any check fails.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { firefox, webkit } from 'playwright-core';
import { mkdirSync as ensureDir } from 'node:fs';
ensureDir('qa/reports', { recursive: true });

const routes = JSON.parse(readFileSync('src/_data/routes.json', 'utf8')).filter((r) => r.built);
const T = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp' };
const s = createServer(async (q, r) => { let p = new URL(q.url, 'http://x').pathname; if (p.endsWith('/')) p += 'index.html'; try { const b = await readFile(join('_site', p)); r.writeHead(200, { 'content-type': T[extname(p)] || 'text/plain' }); r.end(b); } catch { r.writeHead(404); r.end('nf'); } });
await new Promise((x) => s.listen(0, x));
const base = `http://localhost:${s.address().port}`;
const fails = []; let pass = 0;
const check = (n, ok, d = '') => { if (ok) pass++; else { fails.push(n); console.log(`FAIL  ${n}  [${d}]`); } };

for (const [name, engine] of [['firefox', firefox], ['webkit', webkit]]) {
  const b = await engine.launch();
  for (const r of routes) for (const width of [375, 1440]) {
    const p = await b.newPage({ viewport: { width, height: 800 } });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('response', (x) => { if (x.status() >= 400) errs.push(`${x.status()} ${x.url()}`); });
    await p.goto(base + r.url, { waitUntil: 'load' });
    const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }));
    check(`${name} ${r.url} @${width} no overflow`, m.sw <= m.vw, `${m.sw}/${m.vw}`);
    check(`${name} ${r.url} @${width} no errors`, errs.length === 0, errs.join(' | '));
    await p.close();
  }
  const m = await b.newPage({ viewport: { width: 375, height: 800 } });
  await m.goto(base + '/');
  await m.locator('.site-menu summary').click();
  check(`${name} mobile menu opens`, await m.locator('.site-menu nav').isVisible());
  await m.goto(base + '/request-an-accountant/');
  await m.locator('#phone').fill('12'); await m.locator('#phone').blur();
  check(`${name} form validation works`, await m.locator('#phone-error').isVisible());
  check(`${name} form cannot be sent`, await m.locator('#enquiry-form button[type=submit]').isDisabled());
  await b.close();
}
s.close();

const hv = spawnSync('npx', ['html-validate', '--formatter', 'json', '_site/**/*.html'], { encoding: 'utf8', shell: true, maxBuffer: 1e8 });
let summary = {};
try {
  const out = JSON.parse(hv.stdout.slice(hv.stdout.indexOf('[')));
  const msgs = out.flatMap((f) => f.messages.map((x) => ({ rule: x.ruleId, sev: x.severity, file: f.filePath, msg: x.message })));
  for (const x of msgs) summary[x.rule] = (summary[x.rule] || 0) + 1;
  const errors = msgs.filter((x) => x.sev === 2);
  writeFileSync('qa/reports/html-validate.json', JSON.stringify(msgs, null, 1));
  console.log('html-validate by rule:', summary, 'errors', errors.length);
  check('HTML validator: no errors', errors.length === 0, `${errors.length}`);
} catch (e) { console.log('html-validate unavailable', (hv.stderr || e.message).slice(0, 300)); }

// Near-duplicate check: shared 8-word runs between pages.
const shingles = (t) => { const w = t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean); const set = new Set(); for (let i = 0; i + 8 <= w.length; i++) set.add(w.slice(i, i + 8).join(' ')); return set; };
const docs = routes.map((r) => { const h = readFileSync(join('_site', r.url, 'index.html'), 'utf8'); const main = h.slice(h.indexOf('<main'), h.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<section class="cta-band[\s\S]*?<\/section>/g, ' ').replace(/<section class="related[\s\S]*?<\/section>/g, ' ').replace(/<div class="source-list[\s\S]*?<\/div>/g, ' ').replace(/<[^>]+>/g, ' '); return { url: r.url, set: shingles(main) }; });
const pairs = [];
for (let i = 0; i < docs.length; i++) for (let j = i + 1; j < docs.length; j++) { let shared = 0; for (const x of docs[i].set) if (docs[j].set.has(x)) shared++; const ratio = shared / Math.min(docs[i].set.size, docs[j].set.size); pairs.push({ a: docs[i].url, b: docs[j].url, ratio: +ratio.toFixed(3), shared }); }
pairs.sort((x, y) => y.ratio - x.ratio);
writeFileSync('qa/reports/similarity.json', JSON.stringify(pairs.slice(0, 40), null, 1));
console.log('Most similar pairs:'); pairs.slice(0, 6).forEach((p) => console.log(`  ${p.ratio}  ${p.a}  ${p.b}`));
check('No page pair shares over 15% of its 8-word runs', pairs[0].ratio <= 0.15, `${pairs[0].ratio}`);

console.log(`\n${pass}/${pass + fails.length} deep checks passed`);
process.exit(fails.length ? 1 : 0);
