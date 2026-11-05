// Checks external links once each. Hosts that refuse automated reading are listed, not requested.
// A status of 403, 405 or 429, or a timeout, means "could not confirm", not "broken".
// Usage: node qa/external-links.mjs   Writes qa/reports/external-links.json
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { mkdirSync as ensureDir } from 'node:fs';
ensureDir('qa/reports', { recursive: true });

const SKIP = ['mca.gov.in', 'incometaxindia.gov.in', 'indiacode.nic.in', 'meity.gov.in', 'msme.gov.in'];
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const urls = new Map();
for (const f of walk('_site').filter((x) => x.endsWith('.html'))) {
  const body = readFileSync(f, 'utf8').replace(/<head>[\s\S]*?<\/head>/, '').replace(/<script[\s\S]*?<\/script>/g, '');
  for (const m of body.matchAll(/href="(https?:\/\/[^"]+)"/g)) { const u = m[1].replace(/&amp;/g, '&'); if (!urls.has(u)) urls.set(u, f.replace(/\\/g, '/').replace('_site', '')); }
}
const list = [...urls.keys()];
const skipped = list.filter((u) => SKIP.some((h) => new URL(u).host.endsWith(h)));
const todo = list.filter((u) => !skipped.includes(u));
const results = [];
const one = async (u) => {
  try {
    const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; AccountOrbitLinkCheck/1.0)', accept: '*/*' } });
    r.body?.cancel().catch(() => {});
    results.push({ url: u, page: urls.get(u), status: r.status });
  } catch (e) { results.push({ url: u, page: urls.get(u), status: 0, error: String(e.cause?.code || e.name) }); }
};
for (let i = 0; i < todo.length; i += 6) await Promise.all(todo.slice(i, i + 6).map(one));
const ok = results.filter((r) => r.status >= 200 && r.status < 400);
const broken = results.filter((r) => r.status === 404 || r.status === 410);
const unconfirmed = results.filter((r) => !ok.includes(r) && !broken.includes(r));
writeFileSync('qa/reports/external-links.json', JSON.stringify({ total: list.length, ok: ok.length, broken, unconfirmed, skipped }, null, 1));
console.log(`external links: ${list.length} unique, ${ok.length} ok, ${broken.length} broken, ${unconfirmed.length} could not confirm, ${skipped.length} not requested`);
for (const r of [...broken, ...unconfirmed]) console.log(r.status, r.error || '', r.url, 'on', r.page);
