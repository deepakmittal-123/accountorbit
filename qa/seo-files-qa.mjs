// Validates root technical files, head metadata, security headers and the sitemap generator.
// Usage: node qa/seo-files-qa.mjs   (run after a build). Exit code is non-zero if any check fails.
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { PRIVATE_TERMS } from './private-terms.mjs';

let pass = 0; const fails = [];
const check = (n, ok, d = '') => { if (ok) pass++; else { fails.push(n); console.log(`FAIL  ${n}  [${d}]`); } };
const read = (p) => readFileSync(join('_site', p), 'utf8');
const routes = JSON.parse(readFileSync('src/_data/routes.json', 'utf8'));
const built = routes.filter((r) => r.built);
const urls = new Set(built.map((r) => r.url));
const SITE = 'https://accountorbit.in';

// Route registry.
check('77 routes, each once', routes.length === 77 && new Set(routes.map((r) => r.url)).size === 77);
const eligible = routes.filter((r) => r.indexable);
check('Owner approval recorded on all 77 routes', routes.every((r) => r.ownerApproved === true));
check('Owner approval has not made an unbuilt route indexable', routes.filter((r) => !r.built).every((r) => r.ownerApproved && !r.indexable && r.publication === 'NOT_PUBLICATION_ELIGIBLE'));
check('Every unbuilt route records why', routes.filter((r) => !r.built).every((r) => r.decision && ['MERGED_WITH_HUB', 'NOT_JUSTIFIED_AS_SEPARATE_PAGE', 'EXTERNAL_DEPENDENCY'].includes(r.status)));
check('Every held built page records its blockers', routes.filter((r) => r.built && !r.indexable).every((r) => r.blockers?.length));
check('No eligible page has a blocker', eligible.every((r) => !r.blockers?.length));
const valid = ['DEVELOPMENT_COMPLETE', 'QA_PASSED', 'NEEDS_TECHNICAL_FIX', 'EXTERNAL_DEPENDENCY', 'MERGED_WITH_HUB', 'NOT_JUSTIFIED_AS_SEPARATE_PAGE'];
check('Every route has a valid development status', routes.every((r) => valid.includes(r.status)));
check('Every route has a publication status', routes.every((r) => ['PUBLICATION_ELIGIBLE', 'NOT_PUBLICATION_ELIGIBLE'].includes(r.publication)));
check('Built status only on built routes', routes.every((r) => (['DEVELOPMENT_COMPLETE', 'QA_PASSED', 'NEEDS_TECHNICAL_FIX'].includes(r.status)) === Boolean(r.built)));
check('Publication status agrees with indexable', routes.every((r) => (r.publication === 'PUBLICATION_ELIGIBLE') === Boolean(r.indexable)));
check('Every eligible route is built and QA passed', eligible.every((r) => r.built && r.status === 'QA_PASSED'));

// robots.txt
const robots = read('robots.txt');
const lines = robots.split('\n').map((l) => l.trim()).filter(Boolean);
check('robots.txt syntax is valid', lines.every((l) => /^(User-agent|Allow|Disallow|Sitemap): \S+/.test(l)), lines.join(' / '));
check('robots.txt starts with a user-agent group', /^User-agent: /.test(lines[0]));
check('robots.txt blocks nothing', !/Disallow: \S/.test(robots));
check('robots.txt references the sitemap', robots.includes(`Sitemap: ${SITE}/sitemap.xml`) && existsSync('_site/sitemap.xml'));

// llms.txt
const llms = read('llms.txt');
check('llms.txt follows the format', /^# AccountOrbit\n\n> /.test(llms) && /\n## /.test(llms));
check('llms.txt states the referral role', /independent referral platform/i.test(llms) && /not a Chartered Accountant firm/i.test(llms));
check('llms.txt states what is not available', /no published list of partners/i.test(llms));
const llmsLinks = [...llms.matchAll(/\]\((https:\/\/accountorbit\.in[^)]*)\)/g)].map((m) => m[1].replace(SITE, ''));
check('llms.txt links only to built routes', llmsLinks.length > 0 && llmsLinks.every((u) => urls.has(u)), llmsLinks.filter((u) => !urls.has(u)).join(' '));
const llmsWanted = [...eligible.map((r) => r.url), '/', '/how-it-works/', '/about-us/', '/contact-us/', '/request-an-accountant/'];
check('llms.txt lists every eligible page and the core pages, once each', llmsWanted.every((u) => llmsLinks.includes(u)) && new Set(llmsLinks).size === llmsLinks.length && llmsLinks.length === new Set(llmsWanted).size, String(llmsLinks.length));
check('llms.txt does not list held legal or partner pages', !['/privacy-policy/', '/terms-and-conditions/', '/disclaimer/', '/for-accounting-professionals/'].some((u) => llmsLinks.includes(u)));
check('llms.txt makes no banned claims', ![/\bbest\b/i, /verified partners?/i, /government[- ]approved/i, /certified/i, /\bour accountants/i, /guaranteed/i, PRIVATE_TERMS].some((r) => r.test(llms)));
check('llms.txt shows the correct phone number', llms.includes('+91 82907 28453'));

// Icons and manifest.
const pngSize = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
for (const [f, s] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  const b = readFileSync(join('_site', f));
  check(`${f} is a ${s}px PNG`, b.toString('latin1', 1, 4) === 'PNG' && pngSize(b)[0] === s && pngSize(b)[1] === s);
}
const ico = readFileSync('_site/favicon.ico');
check('favicon.ico is a valid icon with 2 sizes', ico.readUInt16LE(2) === 1 && ico.readUInt16LE(4) === 2 && ico.readUInt32LE(6 + 12) + ico.readUInt32LE(6 + 8) <= ico.length);
const og = readFileSync('_site/assets/og-image.png');
check('Social image is 1200 x 630', pngSize(og)[0] === 1200 && pngSize(og)[1] === 630);
const man = JSON.parse(read('site.webmanifest'));
check('Manifest icons exist', man.icons.every((i) => existsSync(join('_site', i.src))));
check('Manifest is accurate', man.name === 'AccountOrbit' && /referral/i.test(man.description));

// Head metadata on every page.
for (const r of built) {
  const h = read(join(r.url, 'index.html'));
  const need = { canonical: `<link rel="canonical" href="${SITE}${r.url}">`, ico: 'href="/favicon.ico"', svg: 'href="/assets/favicon.svg"', touch: 'href="/apple-touch-icon.png"', manifest: 'href="/site.webmanifest"', ogImage: `property="og:image" content="${SITE}/assets/og-image.png"`, ogUrl: `property="og:url" content="${SITE}${r.url}"`, card: 'name="twitter:card" content="summary_large_image"', robots: r.indexable ? 'name="robots" content="index, follow"' : 'name="robots" content="noindex, follow"' };
  const missing = Object.entries(need).filter(([, v]) => !h.includes(v)).map(([k]) => k);
  check(`${r.url} head metadata`, missing.length === 0, missing.join(','));
  const ld = JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const crumbs = ld['@graph'].find((n) => n['@type'] === 'BreadcrumbList');
  check(`${r.url} structured data`, r.url === '/' || (crumbs && crumbs.itemListElement.every((c, i) => c.position === i + 1 && urls.has(c.item.replace(SITE, '')))));
}
// About Me: only confirmed facts in structured data.
const me = read('about-me/index.html');
const meLd = JSON.parse(me.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
const person = meLd.find((n) => n['@type'] === 'Person');
check('About Me has one H1', (me.match(/<h1/g) || []).length === 1 && me.includes('>Meet Deepak Mittal</h1>'));
check('About Me Person data holds confirmed facts only', person && person.name === 'Deepak Mittal' && person.jobTitle === 'Owner' && Object.keys(person).sort().join() === '@id,@type,jobTitle,name,url,worksFor', Object.keys(person || {}).join());
check('Organization data does not use personal profiles', !JSON.stringify(meLd.find((n) => n['@type'] === 'Organization')).includes('facebook'));
check('About Me is linked from About Us and the homepage', read('about-us/index.html').includes('href="/about-me/"') && read('index.html').includes('href="/about-me/"'));
const nf = read('404.html');
check('404 is noindex with no canonical', nf.includes('noindex') && !nf.includes('rel="canonical"'));
check('404 links home', nf.includes('href="/"'));

// Security and cache headers: parse _headers, then serve the site with them and watch for CSP violations.
const hdr = read('_headers');
const globals = {}; let scope = null; const scoped = {};
for (const line of hdr.split('\n')) { if (!line.trim() || line.startsWith('#')) continue; if (!line.startsWith(' ')) { scope = line.trim(); scoped[scope] = {}; } else { const i = line.indexOf(':'); scoped[scope][line.slice(0, i).trim()] = line.slice(i + 1).trim(); } }
Object.assign(globals, scoped['/*']);
for (const k of ['X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options', 'Permissions-Policy', 'Content-Security-Policy', 'Strict-Transport-Security']) check(`_headers sets ${k}`, Boolean(globals[k]));
check('_headers has no X-Robots-Tag that would conflict with eligible pages', !globals['X-Robots-Tag']);
check('_headers caches fonts long, CSS and JS briefly, and leaves HTML to revalidate', /immutable/.test(scoped['/assets/fonts/*']?.['Cache-Control'] || '') && /max-age=3600/.test(scoped['/assets/css/*']?.['Cache-Control'] || '') && !globals['Cache-Control']);

const T = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const s = createServer(async (q, r) => { let p = new URL(q.url, 'http://x').pathname; if (p.endsWith('/')) p += 'index.html'; try { const b = await readFile(join('_site', p)); r.writeHead(200, { 'content-type': T[extname(p)] || 'application/octet-stream', 'content-security-policy': globals['Content-Security-Policy'] }); r.end(b); } catch { r.writeHead(404); r.end(); } });
await new Promise((x) => s.listen(0, x));
const browser = await chromium.launch({ channel: 'chrome' });
for (const u of ['/', '/request-an-accountant/', '/services/accounting-bookkeeping/', '/guides/', '/locations/wholesale-trading/']) {
  const p = await browser.newPage();
  const bad = []; p.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) bad.push(m.text().slice(0, 120)); });
  await p.goto(`http://localhost:${s.address().port}${u}`, { waitUntil: 'networkidle' });
  const fonts = await p.evaluate(async () => { await document.fonts.ready; return [...document.fonts].some((f) => f.status === 'loaded'); });
  check(`CSP causes no violations on ${u}`, bad.length === 0, bad.join(' | '));
  check(`Fonts load under CSP on ${u}`, fonts);
  await p.close();
}
const form = await browser.newPage();
await form.goto(`http://localhost:${s.address().port}/request-an-accountant/`, { waitUntil: 'networkidle' });
await form.locator('#phone').fill('1'); await form.locator('#phone').blur();
check('Form script runs under CSP', await form.locator('#phone-error').isVisible());
await browser.close(); s.close();

// Sitemap: every rule is tested against the real output, over a local server.
const map = read('sitemap.xml');
const locs = [...map.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
const paths = locs.map((l) => l.replace(SITE, ''));
check('Sitemap is valid XML with the sitemap namespace', map.startsWith('<?xml version="1.0" encoding="UTF-8"?>') && map.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"') && map.trim().endsWith('</urlset>') && (map.match(/<url>/g) || []).length === locs.length);
check('Sitemap URLs are absolute HTTPS on the canonical origin', locs.every((l) => l.startsWith(SITE + '/')));
check('Sitemap has no duplicates', new Set(locs).size === locs.length);
check('Sitemap count equals eligible routes', locs.length === eligible.length && eligible.every((r) => paths.includes(r.url)), `${locs.length} vs ${eligible.length}`);
const byPath = new Map(routes.map((r) => [r.url, r]));
check('Every sitemap URL is built', paths.every((u) => byPath.get(u)?.built));
check('No merged, rejected or held route is in the sitemap', paths.every((u) => byPath.get(u)?.status === 'QA_PASSED' && byPath.get(u)?.indexable));
const s2 = createServer(async (q, r) => { let p = new URL(q.url, 'http://x').pathname; if (p.endsWith('/')) p += 'index.html'; try { const b = await readFile(join('_site', p)); r.writeHead(200, { 'content-type': T[extname(p)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } });
await new Promise((x) => s2.listen(0, x));
const problems = [];
for (const u of paths) {
  const res = await fetch(`http://localhost:${s2.address().port}${u}`, { redirect: 'manual' });
  const h = await res.text();
  if (res.status !== 200) problems.push(`${u} status ${res.status}`);
  if (!h.includes(`<link rel="canonical" href="${SITE}${u}">`)) problems.push(`${u} canonical`);
  if (/noindex/.test(h.match(/<meta name="robots" content="([^"]+)"/)?.[1] || 'noindex')) problems.push(`${u} noindex`);
  if (/class="pending"/.test(h)) problems.push(`${u} open note`);
}
s2.close();
check('Every sitemap URL returns 200, is canonical, is not noindex and has no open note', problems.length === 0, problems.join(', '));
for (const r of routes.filter((x) => !x.built)) check(`${r.url} is absent from the sitemap and has no page`, !paths.includes(r.url) && !existsSync(join('_site', r.url, 'index.html')));

// Generator tests in a separate output folder. Nothing in src or _site changes.
const out = '_site_generator_test';
const buildWith = (env) => spawnSync('npx', ['eleventy', `--output=${out}`, '--quiet'], { shell: true, encoding: 'utf8', env: { ...process.env, ...env } });
const none = buildWith({ QA_SIMULATE_NONE_ELIGIBLE: '1' });
check('Generator test build runs', none.status === 0, (none.stderr || '').slice(0, 200));
if (none.status === 0) {
  check('With nothing eligible, no sitemap is written', !existsSync(join(out, 'sitemap.xml')));
  check('With nothing eligible, robots.txt has no sitemap line', !readFileSync(join(out, 'robots.txt'), 'utf8').includes('Sitemap:'));
  check('With nothing eligible, the noindex header returns', readFileSync(join(out, '_headers'), 'utf8').includes('X-Robots-Tag'));
}
rmSync(out, { recursive: true, force: true });
const merged = routes.find((r) => r.status === 'MERGED_WITH_HUB');
const refused = buildWith({ QA_SIMULATE_ELIGIBLE: merged.url });
check('Owner approval cannot make an unbuilt route eligible: the build refuses', refused.status !== 0 && /without meeting the rules/.test(refused.stderr + refused.stdout));
rmSync(out, { recursive: true, force: true });
const open = buildWith({ QA_SIMULATE_ELIGIBLE: '/' });
check('A page with an open fact cannot be made eligible: the build refuses', open.status !== 0 && /has an open fact/.test(open.stderr + open.stdout));
rmSync(out, { recursive: true, force: true });
check('Real build is unchanged by the tests', existsSync('_site/sitemap.xml') && !existsSync(out));

console.log(`\n${pass}/${pass + fails.length} technical file checks passed`);
process.exit(fails.length ? 1 : 0);
