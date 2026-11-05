// Records or compares each built page's substantive content, so a redesign cannot silently lose anything.
// Usage: node qa/content-inventory.mjs baseline   writes qa/reports/pre-redesign-content-inventory.json from _site
//        node qa/content-inventory.mjs compare    checks _site against it, and writes qa/reports/content-preservation.json
// Text is compared after normalising space and case, so markup changes do not count as loss.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

mkdirSync('qa/reports', { recursive: true });
const BASE = 'qa/reports/pre-redesign-content-inventory.json';
const OUT = 'qa/reports/content-preservation.json';
const mode = process.argv[2] || 'compare';
const routes = JSON.parse(readFileSync('src/_data/routes.json', 'utf8')).filter((r) => r.built);

const entities = (s) => s.replace(/&nbsp;|&#160;| /g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;|&rsquo;|&#8217;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&middot;/g, '·').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&times;/g, '×').replace(/&rarr;/g, '→');
const clean = (s) => entities(s.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const norm = (s) => clean(s).toLowerCase().replace(/\s+([.,;:!?)])/g, '$1').replace(/([(])\s+/g, '$1').replace(/\s+/g, ' ').trim();
const blocks = (html, tag) => [...html.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => clean(m[1])).filter(Boolean);

function extract(html) {
  const head = html.match(/<head>[\s\S]*?<\/head>/)?.[0] || '';
  const main = (html.match(/<main[\s\S]*<\/main>/) || [html])[0].replace(/<script[\s\S]*?<\/script>/g, '');
  const inMain = (re) => [...main.matchAll(re)];
  const ext = [...new Set(inMain(/href="(https?:\/\/[^"]+)"/g).map((m) => m[1].replace(/&amp;/g, '&')))];
  const internal = [...new Set(inMain(/href="(\/[^"]*)"/g).map((m) => m[1]))];
  return {
    title: head.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '',
    description: head.match(/name="description" content="([^"]*)"/)?.[1] || '',
    robots: head.match(/name="robots" content="([^"]*)"/)?.[1] || '',
    canonical: head.match(/rel="canonical" href="([^"]*)"/)?.[1] || '',
    h1: blocks(main, 'h1'),
    h2: blocks(main, 'h2'),
    h3: blocks(main, 'h3'),
    paragraphs: blocks(main, 'p'),
    list: blocks(main, 'li'),
    table: [...blocks(main, 'td'), ...blocks(main, 'th'), ...blocks(main, 'caption')],
    definitions: [...blocks(main, 'dt'), ...blocks(main, 'dd')],
    faq: blocks(main, 'summary'),
    notices: inMain(/<(?:mark|div|p|aside)\s[^>]*class="[^"]*(?:pending|note|notice)[^"]*"[^>]*>([\s\S]*?)<\/(?:mark|div|p|aside)>/g).map((m) => clean(m[1])).filter(Boolean),
    labels: blocks(main, 'label'),
    fields: inMain(/<(?:input|select|textarea)\s[^>]*name="([^"]+)"/g).map((m) => m[1]),
    externalLinks: ext,
    internalLinks: internal,
    fullText: norm(main),
  };
}

const read = (url) => readFileSync(join('_site', url, 'index.html'), 'utf8');
if (mode === 'baseline') {
  const pages = Object.fromEntries(routes.map((r) => [r.url, extract(read(r.url))]));
  pages['/404.html'] = extract(readFileSync('_site/404.html', 'utf8'));
  writeFileSync(BASE, JSON.stringify({ created: new Date().toISOString(), pages }, null, 1));
  const n = Object.values(pages).reduce((a, p) => a + p.paragraphs.length + p.list.length + p.table.length + p.h2.length + p.h3.length + p.faq.length, 0);
  console.log(`baseline: ${Object.keys(pages).length} pages, ${n} content blocks`);
  process.exit(0);
}

if (!existsSync(BASE)) { console.log('No baseline found'); process.exit(2); }
const base = JSON.parse(readFileSync(BASE, 'utf8')).pages;
const KINDS = ['h1', 'h2', 'h3', 'paragraphs', 'list', 'table', 'definitions', 'faq', 'notices', 'labels'];
const only = process.argv.slice(3);
const report = {}; let totalBase = 0, totalKept = 0, failed = 0;
for (const [url, b] of Object.entries(base)) {
  if (only.length && !only.includes(url)) continue;
  const file = url === '/404.html' ? '_site/404.html' : join('_site', url, 'index.html');
  if (!existsSync(file)) { report[url] = { status: 'PAGE_MISSING' }; failed++; continue; }
  const now = extract(readFileSync(file, 'utf8'));
  const missing = [];
  let count = 0;
  for (const k of KINDS) for (const t of b[k]) { count++; if (!now.fullText.includes(norm(t))) missing.push(`${k}: ${t.slice(0, 140)}`); }
  for (const u of b.externalLinks) { count++; if (!now.externalLinks.includes(u)) missing.push(`external link: ${u}`); }
  for (const u of b.internalLinks) { count++; const bare = u.split('#')[0]; if (!now.internalLinks.includes(u) && !now.internalLinks.some((x) => x.split('#')[0] === bare)) missing.push(`internal link: ${u}`); }
  for (const f of b.fields) { count++; if (!now.fields.includes(f)) missing.push(`form field: ${f}`); }
  for (const k of ['title', 'description', 'robots', 'canonical']) { count++; if (b[k] !== now[k]) missing.push(`${k} changed`); }
  if (JSON.stringify(b.h1) !== JSON.stringify(now.h1)) missing.push(`h1 changed: ${b.h1.join(' | ')} -> ${now.h1.join(' | ')}`);
  const newBlocks = ['h2', 'h3', 'paragraphs', 'list'].reduce((a, k) => a + now[k].filter((t) => !b.fullText.includes(norm(t))).length, 0);
  totalBase += count; totalKept += count - missing.length;
  report[url] = { baselineBlocks: count, preserved: count - missing.length, missing, newBlocks, status: missing.length ? 'CONTENT_LOSS' : 'PRESERVED' };
  if (missing.length) failed++;
}
writeFileSync(OUT, JSON.stringify({ checked: new Date().toISOString(), totalBase, totalKept, pages: report }, null, 1));
for (const [u, r] of Object.entries(report)) if (r.status !== 'PRESERVED') { console.log(`LOSS ${u}: ${r.missing?.length ?? 'page missing'}`); (r.missing || []).slice(0, 6).forEach((m) => console.log('   ', m)); }
console.log(`\n${totalKept}/${totalBase} content items preserved across ${Object.keys(report).length} pages; ${failed} page(s) with findings`);
process.exit(failed ? 1 : 0);
