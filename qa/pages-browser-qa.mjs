// Tests the GitHub Pages preview in Chrome, either locally under /accountorbit/ or on the live URL.
// Usage: node qa/pages-browser-qa.mjs                 serves _site_preview locally under /accountorbit/
//        node qa/pages-browser-qa.mjs https://...    tests a deployed preview. Pass --shots to save screenshots.
import { createServer } from 'node:http';
import { mkdirSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-core';

mkdirSync('qa/reports', { recursive: true });
const args = process.argv.slice(2);
const shots = args.includes('--shots');
const liveArg = args.find((a) => a.startsWith('http'));
const PREFIX = '/accountorbit/';
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const routes = JSON.parse(readFileSync('src/_data/routes.json', 'utf8'));
const built = routes.filter((r) => r.built);
const REP = ['/', '/services/', '/services/accounting-bookkeeping/', '/services/gst-return-filing/', '/industries/', '/guides/', '/locations/', '/locations/accounting-services-in-nehru-place/', '/how-it-works/', '/about-us/', '/about-me/', '/contact-us/', '/request-an-accountant/', '/privacy-policy/'];
const WIDTHS = [[320, 640], [360, 780], [375, 812], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]];

const T = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
let server, base;
if (liveArg) base = liveArg.replace(/\/$/, '');
else {
  // Like GitHub Pages: nothing exists outside the project path, and 404.html answers missing paths inside it.
  server = createServer(async (q, r) => {
    let p = new URL(q.url, 'http://x').pathname;
    if (!p.startsWith(PREFIX)) { r.writeHead(404); r.end('outside project path'); return; }
    p = p.slice(PREFIX.length); if (p === '' || p.endsWith('/')) p += 'index.html';
    try { const b = await readFile(join('_site_preview', p)); r.writeHead(200, { 'content-type': T[extname(p)] || 'application/octet-stream' }); r.end(b); }
    catch { r.writeHead(404, { 'content-type': 'text/html' }); r.end(await readFile('_site_preview/404.html')); }
  });
  await new Promise((x) => server.listen(0, x));
  base = `http://localhost:${server.address().port}/accountorbit`;
}
const origin = new URL(base).origin;

let pass = 0; const fails = [];
const check = (n, ok, d = '') => { if (ok) pass++; else { fails.push(n); console.log(`FAIL  ${n}  [${String(d).slice(0, 260)}]`); } };
const browser = await chromium.launch({ channel: 'chrome' });

async function open(url, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(`script error: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(origin)) problems.push(`${r.status()} ${r.url().replace(origin, '')}`); });
  page.on('requestfailed', (r) => { if (r.url().startsWith(origin)) problems.push(`failed ${r.url().replace(origin, '')}`); });
  const res = await page.goto(base + url, { waitUntil: 'networkidle', timeout: 60000 });
  return { ctx, page, res, problems };
}

const facts = (page) => page.evaluate(async () => {
  await document.fonts.ready;
  // Scroll through the page, so lazy images load as they would for a reader.
  for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); }
  window.scrollTo(0, 0);
  await Promise.all([...document.images].filter((i) => getComputedStyle(i).display !== 'none' && !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 5000); })));
  const links = [...document.querySelectorAll('a[href], link[href], script[src], img[src]')].map((e) => e.getAttribute('href') || e.getAttribute('src'));
  return {
    title: document.title,
    h1: document.querySelectorAll('h1').length,
    robots: document.querySelector('meta[name=robots]')?.content,
    canonical: Boolean(document.querySelector('link[rel=canonical]')),
    banner: document.querySelector('.draft-bar')?.textContent || '',
    links,
    cssApplied: getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)',
    bodyFont: getComputedStyle(document.body).fontFamily,
    fontsLoaded: [...document.fonts].filter((f) => f.status === 'loaded').length,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    imagesBroken: [...document.images].filter((i) => getComputedStyle(i).display !== 'none' && (!i.complete || i.naturalWidth === 0)).length,
  };
});

// Every built page, on desktop and phone.
for (const r of built) {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { ctx, page, res, problems } = await open(r.url, w, h);
    const f = await facts(page);
    const label = `${r.url} @${w}`;
    check(`${label} HTTP 200`, res.status() === 200, res.status());
    check(`${label} is the Eleventy site, not the README`, !/Jekyll/.test(await page.content()) && f.h1 === 1 && /AccountOrbit/.test(f.title + (await page.content())), f.title);
    check(`${label} no failed requests or script errors`, problems.length === 0, problems.join(' | '));
    check(`${label} CSS and fonts loaded`, f.cssApplied && f.fontsLoaded > 0 && /Hanken/.test(f.bodyFont), `${f.bodyFont} ${f.fontsLoaded}`);
    check(`${label} images loaded`, f.imagesBroken === 0, f.imagesBroken);
    check(`${label} no sideways overflow`, f.overflow <= 0, f.overflow);
    check(`${label} noindex, nofollow, no canonical`, f.robots === 'noindex, nofollow' && !f.canonical, f.robots);
    check(`${label} no preview banner shown to visitors`, f.banner === '', f.banner);
    const esc = f.links.filter((u) => u && u.startsWith('/') && !u.startsWith(PREFIX));
    check(`${label} no link escapes ${PREFIX}`, esc.length === 0, esc.slice(0, 3).join(' '));
    await ctx.close();
  }
}

// Representative pages at all 8 widths, with accessibility checks.
for (const u of REP) {
  for (const [w, h] of WIDTHS) {
    const { ctx, page, problems } = await open(u, w, h);
    const f = await facts(page);
    check(`${u} @${w} no overflow or errors`, f.overflow <= 0 && problems.length === 0, `${f.overflow} ${problems.join(' | ')}`);
    await page.addScriptTag({ content: axeSource });
    const ax = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] })).violations.map((v) => `${v.id}: ${v.nodes.length}`));
    check(`${u} @${w} axe`, ax.length === 0, ax.join(', '));
    if (shots && [390, 1440].includes(w)) await page.screenshot({ path: `qa/reports/pages${u.replace(/\//g, '_')}${w}.png`, fullPage: false });
    await ctx.close();
  }
}

// Interactions.
{
  const { ctx, page } = await open('/', 1440, 900);
  for (const name of ['Services', 'Industries', 'Guides', 'How it works', 'About', 'Contact']) {
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
    const link = page.locator('header nav a', { hasText: name }).first();
    const [res] = await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), link.click()]);
    check(`Header link "${name}" opens inside the preview`, res.status() === 200 && page.url().includes(PREFIX), page.url());
  }
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  const hrefs = await page.locator('footer a[href^="/"]').evaluateAll((a) => a.map((x) => x.getAttribute('href')));
  check('Footer has internal links', hrefs.length > 5);
  for (const h of [...new Set(hrefs)]) { const r = await page.request.get(origin + h); check(`Footer link ${h}`, r.status() === 200 && h.startsWith(PREFIX), r.status()); }
  await ctx.close();
}
{
  const { ctx, page } = await open('/', 390, 844);
  const menu = page.locator('.site-menu summary');
  await menu.click();
  const servicesLink = page.locator('.site-menu a', { hasText: 'Services' }).first();
  check('Phone menu opens', await servicesLink.isVisible());
  const [res] = await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), servicesLink.click()]);
  check('Phone menu link opens inside the preview', res.status() === 200 && page.url().includes(`${PREFIX}services/`), page.url());
  await ctx.close();
}
{
  const { ctx, page } = await open('/request-an-accountant/', 390, 844);
  check('Enquiry submit is disabled', await page.locator('#enquiry-form button[type=submit]').isDisabled());
  check('Closed form is explained', await page.locator('.notice').first().isVisible());
  await page.locator('#phone').fill('1'); await page.locator('#phone').blur();
  check('Form validation script runs', await page.locator('#phone-error').isVisible());
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const res = await page.goto(`${base}/no-such-page-here/`, { waitUntil: 'networkidle' });
  const f = await facts(page);
  check('Missing page returns 404', res.status() === 404, res.status());
  check('Custom 404 page shows with styling', /We can't find that page/.test(await page.locator('h1').innerText()) && f.cssApplied && f.fontsLoaded > 0, f.title);
  const home = await page.locator('.notfound__links a').first().getAttribute('href');
  check('404 links home inside the preview', home === PREFIX, home);
  await ctx.close();
}

// Technical files.
const api = await browser.newContext();
for (const [p, re] of [['robots.txt', /User-agent/], ['llms.txt', /AccountOrbit/], ['favicon.ico', null], ['site.webmanifest', /AccountOrbit/], ['assets/css/site.css', /font-face/], ['assets/js/site.js', null], ['assets/fonts/newsreader-italic.woff2', null], ['assets/og-image.png', null]]) {
  const r = await api.request.get(`${base}/${p}`);
  check(`${p} returns 200`, r.status() === 200 && (!re || re.test(await r.text())), r.status());
}
const robotsText = await (await api.request.get(`${base}/robots.txt`)).text();
check('robots.txt has no sitemap line', !robotsText.includes('Sitemap:'));
check('No sitemap is served', (await api.request.get(`${base}/sitemap.xml`)).status() === 404);
check('Source and README are not served', (await api.request.get(`${base}/README.md`)).status() === 404 && (await api.request.get(`${base}/eleventy.config.js`)).status() === 404);
const hd = (await api.request.get(`${base}/`)).headers();
console.log('Response headers:', JSON.stringify({ server: hd.server, 'content-type': hd['content-type'], 'cache-control': hd['cache-control'], 'x-robots-tag': hd['x-robots-tag'] || null, 'content-security-policy': hd['content-security-policy'] || null, 'strict-transport-security': hd['strict-transport-security'] || null, 'x-frame-options': hd['x-frame-options'] || null }));
await api.close();

await browser.close();
server?.close();
console.log(`\n${pass}/${pass + fails.length} browser checks passed on ${liveArg ? base : 'local simulation under /accountorbit/'} (${built.length} pages)`);
process.exit(fails.length ? 1 : 0);
