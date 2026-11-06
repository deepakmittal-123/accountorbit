// Writes qa/reports/seo-audit.md: one row per route (all 77), read from the built _site, routes.json and the keyword map.
// Usage: node scripts/seo-audit-report.mjs   (after a build)
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import site from '../src/_data/site.js';
import kw from '../src/_data/seoKeywords.js';

const routes = JSON.parse(readFileSync('src/_data/routes.json', 'utf8'));
const sitemap = existsSync('_site/sitemap.xml') ? readFileSync('_site/sitemap.xml', 'utf8') : '';
const inMap = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(site.url, '')));
const meta = (h, n) => h.match(new RegExp(`<meta name="${n}" content="([^"]*)"`))?.[1] || '';
const rows = []; const totals = { routes: routes.length, built: 0, indexable: 0, excludedBuilt: 0, unbuilt: 0, missingMeta: 0, canonicalMismatch: 0, sitemap: inMap.size };
for (const r of routes) {
  if (!r.built) { totals.unbuilt++; rows.push(`| \`${r.url}\` | No | n/a | n/a | n/a | n/a | n/a | No | Not built: ${r.status} |`); continue; }
  totals.built++;
  const h = readFileSync(join('_site', r.url, 'index.html'), 'utf8');
  const canon = h.match(/rel="canonical" href="([^"]+)"/)?.[1] || '';
  const okCanon = canon === site.url + r.url;
  if (!okCanon) totals.canonicalMismatch++;
  const missing = ['description', 'robots', 'author', 'publisher', 'keywords'].filter((n) => !meta(h, n));
  if (missing.length || !/<title>[^<]+/.test(h)) totals.missingMeta++;
  if (r.indexable) totals.indexable++; else totals.excludedBuilt++;
  const why = r.indexable ? (r.gaps ? `Indexable; ${r.gaps.length} tracked gap(s)` : 'Indexable') : `Held: ${(r.blockers || []).length} blocking fact(s)`;
  rows.push(`| \`${r.url}\` | Yes | ${meta(h, 'robots')} | ${okCanon ? 'Self, primary' : 'MISMATCH ' + canon} | ${meta(h, 'author')} | ${meta(h, 'publisher')} | ${kw[r.url]?.primary || 'none'} | ${inMap.has(r.url) ? 'Yes' : 'No'} | ${why} |`);
}
const held = routes.filter((r) => r.built && !r.indexable).map((r) => `- \`${r.url}\`: ${(r.blockers || []).join('; ')}`).join('\n');
const gaps = routes.filter((r) => r.gaps).map((r) => `- \`${r.url}\`: ${r.gaps.join('; ')}`).join('\n');
const out = `# AccountOrbit SEO audit

Primary origin: ${site.url} (planned domain ${site.plannedDomain} is not registered). Generated from the build.

| Total routes | Built | Indexable | Built but excluded | Not built | Sitemap URLs | Missing metadata | Canonical mismatches |
|---|---|---|---|---|---|---|---|
| ${totals.routes} | ${totals.built} | ${totals.indexable} | ${totals.excludedBuilt} | ${totals.unbuilt} | ${totals.sitemap} | ${totals.missingMeta} | ${totals.canonicalMismatch} |

| Route | Built | Robots | Canonical | Author | Publisher | Primary keyword | Sitemap | Status |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## Built pages held from indexing, and why

${held || '- None'}

## Indexable pages with tracked operational gaps (not shown to visitors; block only the formal launch build)

${gaps || '- None'}
`;
mkdirSync('qa/reports', { recursive: true });
writeFileSync('qa/reports/seo-audit.md', out);
console.log(JSON.stringify(totals));
