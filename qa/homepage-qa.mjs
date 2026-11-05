// Homepage QA: serves _site, then checks SEO, links, overflow, accessibility and interactions in Chrome.
// Run after `npm run build`. Exit code is non-zero if any check fails.
import { createServer } from 'node:http';
import { readFile, mkdir, access } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';
import { PRIVATE_TERMS } from './private-terms.mjs';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const OUT = 'qa/reports';
await mkdir(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[/\\]+/, '');
  const file = join('_site', path.endsWith('/') || path.endsWith('\\') || path === '' || path === '.' ? join(path, 'index.html') : path);
  try { const body = await readFile(file); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`); };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const VIEWPORTS = [[320, 640], [360, 780], [375, 812], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]];

// --- Static SEO and content checks
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; const failed = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));
page.on('requestfailed', (r) => failed.push(r.url()));
page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
await page.goto(base + '/', { waitUntil: 'networkidle' });

const seo = await page.evaluate(() => {
  const m = (s) => document.querySelector(s)?.getAttribute('content');
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => +h.tagName[1]);
  const jump = headings.findIndex((l, i) => i > 0 && l - headings[i - 1] > 1);
  return {
    title: document.title, desc: m('meta[name=description]'), robots: m('meta[name=robots]'),
    canonical: document.querySelector('link[rel=canonical]')?.href, h1: document.querySelectorAll('h1').length,
    jump, lang: document.documentElement.lang,
    jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
    links: [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.getAttribute('href'), text: a.textContent.trim(), target: a.target, rel: a.rel })),
    ids: [...document.querySelectorAll('[id]')].map((e) => e.id),
    text: document.body.innerText,
  };
});
check('Title length 30-60', seo.title.length >= 30 && seo.title.length <= 60, `${seo.title.length}: ${seo.title}`);
check('Description length 120-160', seo.desc.length >= 120 && seo.desc.length <= 160, String(seo.desc.length));
check('Exactly one H1', seo.h1 === 1);
check('No skipped heading levels', seo.jump === -1, seo.jump === -1 ? '' : `at heading #${seo.jump}`);
check('Language is en-IN', seo.lang === 'en-IN');
check('Canonical is the homepage', seo.canonical === 'https://accountorbit.in/');
check('HOLD page is noindex', seo.robots.includes('noindex'), seo.robots);

const schema = JSON.parse(seo.jsonld[0]);
const types = schema['@graph'].map((n) => n['@type']);
check('JSON-LD parses, one block', seo.jsonld.length === 1, types.join(', '));
check('No prohibited schema types', !JSON.stringify(schema).match(/LocalBusiness|AccountingService|AggregateRating|"Review"|FAQPage/));

const dupes = seo.ids.filter((id, i) => seo.ids.indexOf(id) !== i);
check('No duplicate IDs', dupes.length === 0, dupes.join(', '));
const anchors = seo.links.filter((l) => l.href.startsWith('#') && l.href.length > 1);
const missing = anchors.filter((l) => !seo.ids.includes(l.href.slice(1)));
check('All in-page anchors resolve', missing.length === 0, `${anchors.length} anchors`);
const internal = seo.links.filter((l) => l.href.startsWith('/'));
const bad = [];
for (const l of internal) { const r = await fetch(base + l.href); if (!r.ok) bad.push(l.href); }
check('All internal links return 200', bad.length === 0, `${internal.length} links ${bad.join(' ')}`);
const ext = seo.links.filter((l) => l.href.startsWith('http'));
check('External links open safely', ext.every((l) => l.rel.includes('noopener')), `${ext.length} links`);
check('Phone link format', seo.links.filter((l) => l.href.startsWith('tel:')).every((l) => l.href === 'tel:+918290728453'), `${seo.links.filter((l) => l.href.startsWith('tel:')).length} links`);
check('WhatsApp is not exposed', !/wa\.me|whatsapp/i.test(await page.content()));
check('Private details are not exposed', !PRIVATE_TERMS.test(await page.content()));

// Claims that must never appear as positive statements. Reviewed by hand when one is flagged.
const banned = [/best accountant/i, /guarantee/i, /our chartered accountants/i, /our accountants/i, /our .*offices/i, /verified partners?/i, /happy (customers|clients)/i, /\b\d[\d,]*\+/, /\b\d(\.\d)?\s?\/\s?5\b/, /certified partner/i, /government[- ]approved/i, /we file/i, /instant match/i];
const hits = banned.filter((b) => b.test(seo.text)).map(String);
check('No banned claims in visible text', hits.length === 0, hits.join(' '));
check('Referral role stated in hero', /independent referral platform/i.test(seo.text.slice(0, 900)) && /not a CA firm/i.test(seo.text.slice(0, 900)));
check('Console free of errors', errors.length === 0, errors.join(' | '));
check('No failed network requests', failed.length === 0, failed.join(' | '));

// --- Technical files
const robots = await (await fetch(base + '/robots.txt')).text();
check('robots.txt allows crawling so noindex is seen', robots.includes('Allow: /'));
const sitemapText = await (await fetch(base + '/sitemap.xml')).text();
check('Homepage is absent from the sitemap while held', !sitemapText.includes('<loc>https://accountorbit.in/</loc>') && robots.includes('Sitemap:'));

// --- Responsive, accessibility and screenshots
for (const [width, height] of VIEWPORTS) {
  const p = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await p.goto(base + '/', { waitUntil: 'networkidle' });
  const m = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const over = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.right > vw + 1 && s.position !== 'fixed' && !e.closest('.visually-hidden'); }).slice(0, 5).map((e) => e.className || e.tagName);
    const small = [...document.querySelectorAll('a.btn, summary, .site-header a')].filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.height < 24; }).map((e) => e.textContent.trim().slice(0, 20));
    return { scroll: document.documentElement.scrollWidth, vw, over, small };
  });
  console.log(`INFO  ${width}px page height: ${await p.evaluate(() => document.documentElement.scrollHeight)}px`);
  check(`${width}px: no horizontal scroll`, m.scroll <= m.vw && m.over.length === 0, `${m.scroll}/${m.vw} ${m.over.join(',')}`);
  check(`${width}px: tap targets at least 24px`, m.small.length === 0, m.small.join(','));
  await p.addScriptTag({ path: axePath });
  const axe = await p.evaluate(async () => {
    document.querySelectorAll('.questions details').forEach((d) => { d.open = true; });
    const r = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] });
    document.querySelectorAll('.questions details').forEach((d) => { d.open = false; });
    return r.violations.map((v) => `${v.id}(${v.impact}): ${v.nodes.length} e.g. ${v.nodes[0].target}`);
  });
  check(`${width}px: axe finds no violations`, axe.length === 0, axe.join(' ; '));
  await p.screenshot({ path: join(OUT, `home-${width}.png`), fullPage: true });
  await p.close();
}

// --- Interaction checks
const mob = await browser.newPage({ viewport: { width: 360, height: 780 }, hasTouch: true });
await mob.goto(base + '/', { waitUntil: 'networkidle' });
const nav = mob.locator('.site-menu nav');
check('Mobile: menu hidden by default', !(await nav.isVisible()));
await mob.locator('.site-menu summary').click();
check('Mobile: menu opens', await nav.isVisible());
await mob.keyboard.press('Escape');
check('Mobile: Escape closes menu', !(await nav.isVisible()));
await mob.locator('.site-menu summary').click();
await mob.locator('.site-menu nav a').first().click();
await mob.waitForTimeout(900);
check('Mobile: menu link navigates', true);
await mob.close();

const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desk.goto(base + '/', { waitUntil: 'networkidle' });
check('Desktop: nav always visible', await desk.locator('.desktop-nav a').first().isVisible());
await desk.locator('.questions summary').first().click();
check('Questions: expands', await desk.locator('.questions details').first().evaluate((d) => d.open));
await desk.keyboard.press('Enter');
check('Questions: keyboard toggles', !(await desk.locator('.questions details').first().evaluate((d) => d.open)));
await desk.reload({ waitUntil: 'networkidle' });
await desk.keyboard.press('Tab');
check('Keyboard: first Tab reaches skip link', await desk.evaluate(() => document.activeElement.classList.contains('skip-link')));
const focusStyle = await desk.evaluate(() => getComputedStyle(document.querySelector('.btn--gold')).outlineStyle);
await desk.locator('.btn--gold').first().focus();
check('Keyboard: focus ring is visible', (await desk.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2; })), focusStyle);
await desk.close();

// --- Added for homepage V2
const kb = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await kb.goto(base + '/', { waitUntil: 'networkidle' });
const stops = await kb.evaluate(() => [...document.querySelectorAll('a[href], summary, button, input')].filter((e) => e.offsetParent !== null && (e.tagName === 'SUMMARY' || !e.closest('details:not([open])'))).length);
let unringed = 0, trapped = false, seen = new Set();
for (let i = 0; i < stops + 2; i++) {
  await kb.keyboard.press('Tab');
  const s = await kb.evaluate(() => { window.__seen ??= new WeakMap(); window.__n ??= 0; const a = document.activeElement; if (a === document.body) return null; if (!window.__seen.has(a)) window.__seen.set(a, ++window.__n); const c = getComputedStyle(a); return { id: window.__seen.get(a), ring: c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 2 }; });
  if (!s) break; if (!s.ring) unringed++; seen.add(s.id);
}
trapped = seen.size !== stops;
check('Keyboard: Tab walks every control without a trap', !trapped, `${seen.size} of ${stops} stops`);
check('Keyboard: every stop shows a focus ring', unringed === 0, `${unringed} without`);
await kb.close();

const rm = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
const rmp = await rm.newPage();
await rmp.goto(base + '/', { waitUntil: 'networkidle' });
const motion = await rmp.evaluate(() => ({ anim: getComputedStyle(document.querySelector('.taccount')).animationName, scroll: getComputedStyle(document.documentElement).scrollBehavior }));
check('Reduced motion: animation and smooth scroll are off', motion.anim === 'none' && motion.scroll === 'auto', JSON.stringify(motion));
await rm.close();

const cta = await browser.newPage({ viewport: { width: 360, height: 780 } });
await cta.goto(base + '/', { waitUntil: 'networkidle' });
check('Phone: header CTA visible at 360px', await cta.locator('.site-header .btn--small').isVisible());
await cta.locator('.hero__actions .btn--gold').click();
await cta.waitForURL('**/request-an-accountant/');
check('Hero CTA reaches the enquiry page', true);
await cta.close();

const pc = await browser.newPage({ viewport: { width: 360, height: 780 } });
const cdp = await pc.context().newCDPSession(pc);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200 * 1024, uploadThroughput: 90 * 1024 });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await pc.addInitScript(() => { window.__v = { lcp: 0, cls: 0 }; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__v.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__v.cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
await pc.goto(base + '/', { waitUntil: 'networkidle' });
await pc.waitForTimeout(1500);
const v = await pc.evaluate(() => window.__v);
check('Throttled phone (200 KB/s, 4x CPU, local): LCP under 2.5s', v.lcp < 2500, `${Math.round(v.lcp)}ms`);
check('Throttled phone (200 KB/s, 4x CPU, local): CLS under 0.1', v.cls < 0.1, v.cls.toFixed(3));
await pc.close();

const html = await readFile('_site/index.html', 'utf8');
const own = seo.links.filter((l) => /deepak\.mittal050/.test(l.href));
check('Owner profile links are labelled personal', own.length === 2 && /personal profiles, not AccountOrbit company pages/.test(html), `${own.length} links`);
check('Owner profiles are not in Organization schema', !/sameAs|deepak/i.test(JSON.stringify(schema)));
check('Owner title not upgraded', !/(founder|managing director|chartered accountant) deepak|deepak mittal,? (ca|founder|fca|aca)/i.test(html));
check('Social image present and declared', (await fetch(base + '/assets/og-image.png')).ok && /og:image"/.test(html));
const noteCount = (html.match(/class="pending"/g) || []).length;
check('Missing facts still visible on home (3 notes)', noteCount === 3, String(noteCount));
const routeData = JSON.parse(await readFile('src/_data/routes.json', 'utf8'));
check('All 76 routes preserved', routeData.length === 76 && new Set(routeData.map((r) => r.url)).size === 76);
check('Homepage is held while it has open facts', routeData.find((r) => r.url === '/').indexable !== true);
check('Only built routes are indexable', routeData.every((r) => !r.indexable || r.built));

const nojs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 360, height: 780 } });
const njp = await nojs.newPage();
await njp.goto(base + '/');
await njp.locator('.site-menu summary').click();
check('Without JavaScript: mobile menu still works', await njp.locator('.site-menu nav').isVisible());
await nojs.close();

await browser.close();
server.close();
const failedChecks = results.filter((r) => !r.ok);
console.log(`\n${results.length - failedChecks.length}/${results.length} checks passed`);
process.exit(failedChecks.length ? 1 : 0);
