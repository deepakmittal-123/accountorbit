// Checks the GitHub Pages preview output without a browser. Runs locally and in the deployment workflow.
// Usage: node qa/pages-preview-check.mjs   (after npm run build:pages). A failure stops the deployment.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PRIVATE_TERMS } from './private-terms.mjs';

const OUT = '_site_preview';
const PREFIX = '/accountorbit/';
const ORIGIN = 'https://deepakmittal-123.github.io/accountorbit';
let pass = 0; const fails = [];
const check = (n, ok, d = '') => { if (ok) pass++; else { fails.push(n); console.log(`FAIL  ${n}  [${String(d).slice(0, 300)}]`); } };
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const has = (p) => existsSync(join(OUT, p));

check('Output folder exists', existsSync(OUT));
if (!existsSync(OUT)) { console.log('Run npm run build:pages first'); process.exit(1); }
const files = walk(OUT).map((f) => f.replace(/\\/g, '/').slice(OUT.length + 1));
const routes = JSON.parse(readFileSync('src/_data/routes.json', 'utf8'));
const built = routes.filter((r) => r.built);

for (const f of ['index.html', '404.html', 'robots.txt', 'llms.txt', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest', 'assets/css/site.css', 'assets/js/site.js', 'assets/js/enquiry-form.js', 'assets/favicon.svg', 'assets/og-image.png', 'assets/fonts/newsreader-italic.woff2', 'assets/fonts/hanken-grotesk.woff2']) check(`Required file: ${f}`, has(f));
check('Every built route has a page', built.every((r) => has(join(r.url, 'index.html'))), built.filter((r) => !has(join(r.url, 'index.html'))).map((r) => r.url).join(' '));
check('No unbuilt route has a page', routes.filter((r) => !r.built).every((r) => !has(join(r.url, 'index.html'))));
check('Page count matches built routes', files.filter((f) => f.endsWith('index.html')).length === built.length);

// Things that must not be offered from a preview, or published at all.
check('No sitemap', !has('sitemap.xml'));
check('No _headers file', !has('_headers'));
check('No source, private record or dependency files', !files.some((f) => /ACCOUNTORBIT_|private-terms|node_modules|\.njk$|\.env|package(-lock)?\.json|eleventy\.config/.test(f)), files.filter((f) => /ACCOUNTORBIT_|private-terms|\.njk$/.test(f)).join(' '));
const robots = readFileSync(join(OUT, 'robots.txt'), 'utf8');
check('robots.txt has no sitemap line and blocks nothing', !robots.includes('Sitemap:') && !/Disallow: \S/.test(robots));
const llms = readFileSync(join(OUT, 'llms.txt'), 'utf8');
const llmsLinks = [...llms.matchAll(/\]\((https?:[^)]*)\)/g)].map((m) => m[1]);
check('llms.txt links stay on the preview', llmsLinks.length > 0 && llmsLinks.every((u) => u.startsWith(ORIGIN + '/')));
check('llms.txt says this is a preview', /temporary public preview/i.test(llms) && /independent referral platform/i.test(llms));
const man = JSON.parse(readFileSync(join(OUT, 'site.webmanifest'), 'utf8'));
check('Manifest paths are relative and exist', man.start_url === './' && man.icons.every((i) => !i.src.startsWith('/') && has(i.src)));
const css = readFileSync(join(OUT, 'assets/css/site.css'), 'utf8');
const cssUrls = [...css.matchAll(/url\(["']?([^"')]+)/g)].map((m) => m[1]).filter((u) => !u.startsWith('data:'));
check('CSS has no root-relative URL, and its files exist', cssUrls.every((u) => !u.startsWith('/') && existsSync(join(OUT, 'assets/css', u))), cssUrls.join(' '));

const SECRET = /\b(ghp_|gho_|ghs_|github_pat_)[A-Za-z0-9_]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY|\bAKIA[0-9A-Z]{16}\b/;
const pages = files.filter((f) => f.endsWith('.html'));
const bad = {}; const note = (k, f) => { (bad[k] ||= []).push(f); };
for (const f of pages) {
  const h = readFileSync(join(OUT, f), 'utf8');
  if (!h.includes('<meta name="robots" content="noindex, nofollow">')) note('noindex', f);
  if (/rel="canonical"/.test(h)) note('canonical', f);
  if (/application\/ld\+json/.test(h)) note('structured data', f);
  if (/accountorbit\.in/.test(h)) note('future domain mentioned', f);
  if (/class="draft-bar"|Public preview|has not launched/.test(h)) note('preview or development banner', f);
  if (/Not yet available:|class="pending"/.test(h)) note('visible open-fact marker', f);
  if (PRIVATE_TERMS.test(h)) note('private details', f);
  if (SECRET.test(h)) note('secret', f);
  for (const m of h.matchAll(/<(?:a|link|script|img|source|form)\b[^>]*?\s(?:href|src|action)="([^"]+)"/g)) {
    const u = m[1];
    if (/^(https?:|tel:|mailto:|#|data:)/.test(u)) continue;
    if (!u.startsWith(PREFIX)) { note('link escapes the base path', `${f} -> ${u}`); continue; }
    const path = u.slice(PREFIX.length).split(/[?#]/)[0];
    const target = path === '' || path.endsWith('/') ? join(path, 'index.html') : path;
    if (!has(target)) note('link target missing', `${f} -> ${u}`);
  }
  for (const m of h.matchAll(/<(?:a)\b[^>]*?href="(#[^"]+)"/g)) if (!h.includes(`id="${m[1].slice(1)}"`)) note('in-page anchor missing', `${f} -> ${m[1]}`);
}
for (const k of ['noindex', 'canonical', 'structured data', 'future domain mentioned', 'preview banner', 'development banner', 'private details', 'secret', 'link escapes the base path', 'link target missing', 'in-page anchor missing']) check(`All pages: ${k}`, !bad[k], (bad[k] || []).slice(0, 4).join(' | '));

const form = readFileSync(join(OUT, 'request-an-accountant/index.html'), 'utf8');
check('Enquiry form has no action and cannot be sent', !/<form[^>]*\saction=/.test(form) && /<button[^>]*type="submit"[^>]*disabled/.test(form) && /nothing typed into it is sent/i.test(form) && /Online sending opens once the form is connected/.test(form));
for (const p of ['privacy-policy', 'disclaimer', 'terms-and-conditions']) check(`${p} discloses its legal-review status`, /awaiting legal review/.test(readFileSync(join(OUT, p, 'index.html'), 'utf8')));
const allText = pages.map((f) => readFileSync(join(OUT, f), 'utf8').replace(/<[^>]+>/g, ' ')).join(' ');
for (const re of [/\bour accountants\b/i, /verified partners?/i, /government[- ]approved/i, /\bour offices?\b/i]) check(`No misleading claim: ${re.source}`, !re.test(allText));

console.log(`\n${pass}/${pass + fails.length} preview output checks passed (${pages.length} HTML files)`);
process.exit(fails.length ? 1 : 0);
