// Sitewide QA. Usage: node qa/site-qa.mjs [--quick] [/route/ ...]   With no routes, every built page is tested.
// --quick tests 320, 390 and 1440px only. Exit code is non-zero if any check fails.
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';
import { PRIVATE_TERMS } from './private-terms.mjs';
import site from '../src/_data/site.js';
import { mkdirSync as ensureDir } from 'node:fs';
ensureDir('qa/reports', { recursive: true });

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const args = process.argv.slice(2);
const quick = args.includes('--quick');
const routes = JSON.parse(await readFile('src/_data/routes.json', 'utf8'));
const builtUrls = routes.filter((r) => r.built).map((r) => r.url);
const targets = args.filter((a) => a.startsWith('/')).length ? args.filter((a) => a.startsWith('/')) : builtUrls;
const WIDTHS = quick ? [[320, 640], [390, 844], [1440, 900]] : [[320, 640], [360, 780], [375, 812], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]];

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml', '.png': 'image/png', '.webp': 'image/webp' };
const server = createServer(async (req, res) => {
  const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[/\\]+/, '');
  const file = join('_site', p.endsWith('/') || p.endsWith('\\') || p === '' || p === '.' ? join(p, 'index.html') : p);
  try { const b = await readFile(file); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

let pass = 0; const fails = [];
const check = (name, ok, detail = '') => { if (ok) pass++; else { fails.push(`${name} [${detail}]`); console.log(`FAIL  ${name}  [${detail}]`); } };

const banned = [/independent referral platform/i, /best accountant/i, /(?<!not |cannot |no |never )\bguarantee[ds]?\b/i, /\bour chartered accountants/i, /\bour accountants/i, /\bour (delhi |local )?offices?\b/i, /verified partners?/i, /happy (customers|clients)/i, /\b\d[\d]*\+ (clients|customers|businesses|accountants|professionals|cas)\b/i, /\b\d(\.\d)?\s?\/\s?5\b/, /certified partner/i, /government[- ]approved/i, /\bwe file\b/i, /instant match/i, /wa\.me|whatsapp/i, PRIVATE_TERMS];

// Collect all generated HTML so IDs and link targets can be checked across pages.
const walk = async (d) => (await Promise.all((await readdir(d, { withFileTypes: true })).map((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)])))).flat();
const htmlFiles = (await walk('_site')).filter((f) => f.endsWith('.html'));
const builtSet = new Set(builtUrls);
const onDisk = htmlFiles.filter((f) => !f.endsWith('404.html')).map((f) => '/' + f.replace(/\\/g, '/').replace(/^_site\//, '').replace(/index\.html$/, ''));
check('Generated pages match routes marked built', onDisk.length === builtSet.size && onDisk.every((u) => builtSet.has(u)), `${onDisk.length} vs ${builtSet.size}: ${onDisk.filter((u) => !builtSet.has(u))} ${[...builtSet].filter((u) => !onDisk.includes(u))}`);
check('All 77 routes preserved, none duplicated', routes.length === 77 && new Set(routes.map((r) => r.url)).size === 77);
check('Nothing marked indexable without eligibility', routes.every((r) => !r.indexable || (r.publication === 'PUBLICATION_ELIGIBLE' && r.built && r.status === 'QA_PASSED')));
check('404 page exists and is noindex', /noindex/.test(await readFile('_site/404.html', 'utf8')));
const robotsTxt = await readFile('_site/robots.txt', 'utf8');
check('robots.txt allows crawling', robotsTxt.includes('Allow: /'));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const metaSeen = new Map();
const allMeta = [];
for (const f of htmlFiles.filter((x) => !x.endsWith('404.html'))) {
  const h = await readFile(f, 'utf8');
  allMeta.push({ f, title: h.match(/<title>(.*?)<\/title>/s)?.[1], desc: h.match(/name="description" content="(.*?)"/s)?.[1] });
}
for (const k of ['title', 'desc']) { const vals = allMeta.map((m) => m[k]); const dup = vals.filter((v, i) => vals.indexOf(v) !== i); check(`Every ${k} is unique across the site`, dup.length === 0, dup.join(' | ')); }

let pending = 0;
for (const url of targets) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', (e) => errs.push(e.message)); p.on('response', (r) => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url()}`); });
  await p.goto(base + url, { waitUntil: 'networkidle' });
  const s = await p.evaluate(() => {
    const m = (q) => document.querySelector(q)?.getAttribute('content');
    const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => +h.tagName[1]);
    return { title: document.title, desc: m('meta[name=description]'), robots: m('meta[name=robots]'), canonical: document.querySelector('link[rel=canonical]')?.href, h1: document.querySelectorAll('h1').length, jump: hs.findIndex((l, i) => i > 0 && l - hs[i - 1] > 1), jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((x) => x.textContent), links: [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.getAttribute('href'), rel: a.rel, target: a.target })), ids: [...document.querySelectorAll('[id]')].map((e) => e.id), text: document.body.innerText, crumb: !!document.querySelector('.breadcrumb'), pend: document.querySelectorAll('mark.pending').length, imgs: [...document.images].filter((i) => !i.hasAttribute('alt')).length, ctas: [...document.querySelectorAll('a.btn, a.btn-call')].map((a) => ({ t: a.textContent.replace(/s+/g, ' ').trim(), href: a.getAttribute('href') })), tels: [...document.querySelectorAll('a[href^="tel:"]')].map((a) => ({ t: a.textContent.replace(/s+/g, ' ').trim(), href: a.getAttribute('href') })) };
  });
  const r = routes.find((x) => x.url === url);
  pending += s.pend;
  check(`${url} title length 30-65`, s.title.length >= 30 && s.title.length <= 65, `${s.title.length}: ${s.title}`);
  check(`${url} description length 110-165`, s.desc.length >= 110 && s.desc.length <= 165, String(s.desc.length));
  check(`${url} one H1`, s.h1 === 1, String(s.h1));
  check(`${url} heading order`, s.jump === -1, String(s.jump));
  check(`${url} canonical`, s.canonical === `${site.url}${url}`, s.canonical);
  check(`${url} robots match status`, r.indexable ? s.robots.startsWith('index') : s.robots.includes('noindex'), s.robots);
  check(`${url} breadcrumb`, url === '/' || s.crumb);
  check(`${url} images have alt`, s.imgs === 0, String(s.imgs));
  try {
    const blob = s.jsonld.map((j) => JSON.stringify(JSON.parse(j))).join('');
    check(`${url} JSON-LD valid, no prohibited types`, s.jsonld.length === 1 && !/LocalBusiness|AccountingService|AggregateRating|"Review"|FAQPage|sameAs/.test(blob));
  } catch (e) { check(`${url} JSON-LD parses`, false, e.message); }
  const dupIds = s.ids.filter((id, i) => s.ids.indexOf(id) !== i);
  check(`${url} no duplicate IDs`, dupIds.length === 0, dupIds.join(','));
  const badA = s.links.filter((l) => l.href.startsWith('#') && l.href.length > 1 && !s.ids.includes(l.href.slice(1)));
  check(`${url} in-page anchors`, badA.length === 0, badA.map((l) => l.href).join(' '));
  const bad = [];
  for (const l of s.links.filter((x) => x.href.startsWith('/'))) {
    const [path, frag] = l.href.split('#');
    const target = path || url;
    if (!builtSet.has(target) && !target.startsWith('/assets')) { bad.push(`unbuilt:${l.href}`); continue; }
    if (frag) { const file = join('_site', target, 'index.html'); const body = await readFile(file, 'utf8'); if (!body.includes(`id="${frag}"`)) bad.push(`noanchor:${l.href}`); }
  }
  check(`${url} internal links resolve to built pages`, bad.length === 0, bad.join(' '));
  check(`${url} external links noopener`, s.links.filter((l) => l.href.startsWith('http')).every((l) => l.rel.includes('noopener')));
  check(`${url} phone links`, s.links.filter((l) => l.href.startsWith('tel:')).every((l) => l.href === 'tel:+918290728453'));
  const hits = banned.filter((b) => b.test(s.text)).map(String);
  check(`${url} no banned claims`, hits.length === 0, hits.join(' '));
  const genericCta = s.ctas.filter((c) => /^(explore|discover|learn more|read more|get started|click here|know more|find out more|unlock|get connected|start your journey)/i.test(c.t));
  check(`${url} no generic CTA labels`, genericCta.length === 0, genericCta.map((c) => c.t).join(' | '));
  const badTel = s.tels.filter((c) => c.href !== 'tel:+918290728453' || /^view/i.test(c.t));
  check(`${url} every phone link uses the verified number and a call label`, badTel.length === 0, badTel.map((c) => `${c.t} ${c.href}`).join(' | '));
  const fakeCall = s.ctas.filter((c) => /^(call|talk)/i.test(c.t) && !c.href.startsWith('tel:'));
  check(`${url} no Call/Talk label on a non-phone link`, fakeCall.length === 0, fakeCall.map((c) => `${c.t} -> ${c.href}`).join(' | '));
  check(`${url} owner-managed role and CA distinction visible`, /owned and managed by Deepak Mittal/i.test(s.text) && /not a firm of Chartered Accountants/i.test(s.text));
  check(`${url} no console or network errors`, errs.length === 0, errs.join(' | '));
  await p.close();

  for (const [width, height] of WIDTHS) {
    const v = await browser.newPage({ viewport: { width, height } });
    await v.goto(base + url, { waitUntil: 'networkidle' });
    const m = await v.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const over = [...document.querySelectorAll('body *')].filter((e) => { const rr = e.getBoundingClientRect(); return rr.width > 0 && rr.right > vw + 1 && !e.closest('.visually-hidden,.form-trap,.data-table-wrap,.site-menu nav') && getComputedStyle(e).position !== 'fixed'; }).slice(0, 4).map((e) => e.className || e.tagName);
      const small = [...document.querySelectorAll('a.btn, summary, .site-header a, button, input:not([type=checkbox]):not([type=radio]):not([tabindex="-1"]), select')].filter((e) => { const rr = e.getBoundingClientRect(); return rr.height > 0 && rr.height < 24; }).map((e) => (e.textContent || e.id).trim().slice(0, 18));
      return { scroll: document.documentElement.scrollWidth, vw, over, small };
    });
    check(`${url} @${width} no overflow`, m.scroll <= m.vw && m.over.length === 0, `${m.scroll}/${m.vw} ${m.over.join(',')}`);
    check(`${url} @${width} tap targets`, m.small.length === 0, m.small.join(','));
    await v.addScriptTag({ path: axePath });
    const ax = await v.evaluate(async () => {
      document.querySelectorAll('main details').forEach((d) => { d.open = true; });
      const res = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] });
      return res.violations.map((x) => `${x.id}: ${x.nodes.length} e.g. ${x.nodes[0].target}`);
    });
    check(`${url} @${width} axe`, ax.length === 0, ax.join(' ; '));
    await v.close();
  }
}

// Enquiry form behaviour, tested only when that page is in scope.
if (targets.includes('/request-an-accountant/')) {
  const u = base + '/request-an-accountant/';
  const f = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await f.goto(u, { waitUntil: 'networkidle' });
  const sent = []; await f.route('**/test-endpoint', (route) => { sent.push(route.request().postData()); route.fulfill({ status: f.__status || 200, contentType: 'application/json', body: '{}' }); });
  check('Form: submit disabled with no endpoint', await f.locator('#enquiry-form button[type=submit]').isDisabled());
  check('Form: no action attribute with no endpoint', (await f.locator('#enquiry-form').getAttribute('action')) === null);
  check('Form: disabled state explained', await f.locator('.notice').isVisible());
  await f.locator('#phone').fill('123'); await f.locator('#phone').blur();
  check('Form: inline phone error', await f.locator('#phone-error').isVisible() && (await f.locator('#phone').getAttribute('aria-invalid')) === 'true');
  await f.locator('#phone').fill('98765 43210'); await f.locator('#phone').blur();
  check('Form: phone error clears', !(await f.locator('#phone-error').isVisible()));
  check('Form: consent not pre-ticked', !(await f.locator('#consent_process').isChecked()) && !(await f.locator('#consent_share').isChecked()));
  // Exercise a real send path against an intercepted endpoint.
  await f.evaluate(() => { const form = document.getElementById('enquiry-form'); form.dataset.endpoint = '/test-endpoint'; form.querySelector('button[type=submit]').disabled = false; });
  await f.locator('#enquiry-form button[type=submit]').click();
  check('Form: error summary shown and focused', await f.locator('#form-errors').isVisible() && await f.evaluate(() => document.activeElement.id === 'form-errors'));
  check('Form: nothing sent while invalid', sent.length === 0);
  await f.locator('#form-errors a').first().click();
  check('Form: summary link moves to field', await f.evaluate(() => document.activeElement.tagName !== 'BODY' && document.activeElement.id !== 'form-errors'));
  await f.locator('#name').fill('Test Person');
  await f.locator('#service').selectOption({ index: 1 }); await f.locator('#business').selectOption({ index: 1 });
  await f.locator('#area').fill('Karol Bagh'); await f.locator('#frequency-once').check();
  await f.locator('#details').fill('Monthly bookkeeping for a small shop.');
  await f.locator('#consent_process').check();
  await f.unroute('**/test-endpoint'); await f.route('**/test-endpoint', (route) => route.fulfill({ status: 500, body: 'x' }));
  await f.locator('#enquiry-form button[type=submit]').click();
  await f.locator('#form-status').waitFor();
  check('Form: server failure shows failure, not success', /not sent/i.test(await f.locator('#form-status').innerText()));
  check('Form: can retry after failure', await f.locator('#enquiry-form button[type=submit]').isEnabled());
  await f.unroute('**/test-endpoint'); const bodies = [];
  await f.route('**/test-endpoint', (route) => { bodies.push(route.request().postData()); route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
  await f.locator('#enquiry-form button[type=submit]').click();
  await f.waitForFunction(() => document.getElementById('form-status').classList.contains('form-status--success'));
  const msg = await f.locator('#form-status').innerText();
  check('Form: success only after a 2xx, with no availability promise', /reached us/i.test(msg) && /not confirmation/i.test(msg));
  const body = JSON.parse(bodies[0] || '{}');
  check('Form: payload has honeypot and timing, and share consent respected', 'website' in body && 'elapsed_ms' in body && !('consent_share' in body));
  await f.close();
}

await browser.close(); server.close();
console.log(`\nOwner notes visible on tested pages: ${pending}`);
console.log(`${pass}/${pass + fails.length} checks passed across ${targets.length} page(s)`);
process.exit(fails.length ? 1 : 0);
