// Mega menu and mobile accordion checks.
// Usage: node qa/mega-menu-qa.mjs            (tests _site over a local server; run `npm run build` first)
//        node qa/mega-menu-qa.mjs <base-url>  (tests a deployed site, e.g. https://deepakmittal-123.github.io/accountorbit/)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const routes = JSON.parse(await readFile('src/_data/routes.json', 'utf8'));
const built = new Set(routes.filter((r) => r.built).map((r) => r.url));
const builtAreas = routes.filter((r) => r.built && r.url.startsWith('/locations/accounting-services-in-')).length;
// Expected links per panel: Services and Industries are fixed by the owner's structure; Locations shows
// the three category hubs plus every built area page.
const EXPECT = { services: 15, industries: 12, locations: 3 + builtAreas };

let server;
let base = process.argv[2]?.replace(/\/$/, '');
if (!base) {
  const T = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp' };
  server = createServer(async (req, res) => {
    let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (p.endsWith('/') || p.endsWith('\\')) p += 'index.html';
    try { const b = await readFile(join('_site', p)); res.writeHead(200, { 'content-type': T[extname(p)] || 'text/plain' }); res.end(b); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}`;
}
const prefix = new URL(base + '/').pathname; // "/" locally, "/accountorbit/" on GitHub Pages

const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== '' ? `  [${detail}]` : ''}`); };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const open = async (w, h, url = '/', opts = {}) => {
  const page = await browser.newPage({ viewport: { width: w, height: h }, ...opts });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + url, { waitUntil: 'networkidle' });
  return { page, errors };
};
const strip = (href) => '/' + href.slice(prefix.length);

// ---- Desktop panels
for (const [w, h] of [[1152, 800], [1440, 900], [1920, 1080]]) {
  const { page, errors } = await open(w, h);
  for (const id of Object.keys(EXPECT)) {
    const t = `[aria-controls="mega-${id}"]`;
    const visible = await page.isVisible(t);
    check(`${w}px ${id}: chevron button shown and closed`, visible && (await page.getAttribute(t, 'aria-expanded')) === 'false');
    await page.click(t);
    const m = await page.evaluate((id) => {
      const p = document.getElementById(`mega-${id}`); const r = p.getBoundingClientRect();
      const links = [...p.querySelectorAll('.mega__list a')].map((a) => a.getAttribute('href'));
      const cols = getComputedStyle(p.querySelector('.mega__cols')).gridTemplateColumns.split(' ').length;
      return { shown: !p.hidden && r.height > 0, left: r.left, right: r.right, bottom: r.bottom, vw: innerWidth, vh: innerHeight, scrollable: p.scrollHeight > p.clientHeight, links, cols, all: p.querySelector('.mega__all')?.getAttribute('href'), mainTop: document.querySelector('main').getBoundingClientRect().top };
    }, id);
    check(`${w}px ${id}: opens on click`, m.shown && (await page.getAttribute(t, 'aria-expanded')) === 'true');
    check(`${w}px ${id}: ${EXPECT[id]} links`, m.links.length === EXPECT[id], m.links.length);
    check(`${w}px ${id}: no duplicate links`, new Set(m.links).size === m.links.length);
    check(`${w}px ${id}: every link is a built route`, m.links.every((u) => built.has(strip(u))), m.links.filter((u) => !built.has(strip(u))).join(' '));
    check(`${w}px ${id}: columns (${id === 'services' ? 4 : 3})`, m.cols === (id === 'services' ? 4 : 3), m.cols);
    check(`${w}px ${id}: panel inside viewport width`, m.left >= 0 && m.right <= m.vw, `${Math.round(m.left)}-${Math.round(m.right)}/${m.vw}`);
    check(`${w}px ${id}: panel fits the viewport height or scrolls`, m.bottom <= m.vh || m.scrollable, `${Math.round(m.bottom)}/${m.vh}`);
    check(`${w}px ${id}: "view all" goes to the hub`, strip(m.all || '') === `/${id}/`, m.all);
    const mainTop = await page.evaluate(() => document.querySelector('main').getBoundingClientRect().top);
    check(`${w}px ${id}: opening does not push the page down`, mainTop === m.mainTop);
    if (w === 1440) {
      await page.addScriptTag({ path: axePath });
      const v = await page.evaluate(async () => (await window.axe.run(document.querySelector('.site-header'), { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'], rules: { region: { enabled: false } } })).violations.map((x) => `${x.id}: ${x.nodes.length}`));
      check(`${w}px ${id}: axe, open panel`, v.length === 0, v.join(' ; '));
    }
    await page.keyboard.press('Escape');
    check(`${w}px ${id}: Escape closes and returns focus to the button`, await page.evaluate((id) => document.getElementById(`mega-${id}`).hidden && document.activeElement === document.querySelector(`[aria-controls="mega-${id}"]`), id));
  }
  // One open at a time; outside click closes.
  await page.click('[aria-controls="mega-services"]');
  await page.click('[aria-controls="mega-industries"]');
  check(`${w}px opening another menu closes the first`, await page.evaluate(() => document.getElementById('mega-services').hidden && !document.getElementById('mega-industries').hidden));
  await page.mouse.click(w / 2, h - 20);
  check(`${w}px outside click closes`, await page.evaluate(() => [...document.querySelectorAll('.mega__panel')].every((p) => p.hidden)));
  // Hover opens, moving into the panel keeps it open, leaving closes it.
  const box = await page.locator('.mega__link[href$="/locations/"]').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300); // hover intent delay is 160ms
  const hoverOpen = await page.isVisible('#mega-locations');
  const first = (await page.locator('#mega-locations .mega__list a').first().boundingBox()) || { x: 0, y: 0, height: 0 };
  await page.mouse.move(first.x + 10, first.y + first.height / 2, { steps: 8 });
  await page.waitForTimeout(400);
  const stillOpen = await page.isVisible('#mega-locations');
  await page.mouse.move(w / 2, h - 10, { steps: 4 });
  await page.waitForTimeout(450);
  check(`${w}px hover opens, survives the move into the panel, closes on leave`, hoverOpen && stillOpen && !(await page.isVisible('#mega-locations')), `${hoverOpen} ${stillOpen}`);
  // Hover, then clicking the chevron must keep it open, not close it under the pointer.
  const tb = await page.locator('[aria-controls="mega-services"]').boundingBox();
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2);
  await page.waitForTimeout(300);
  await page.mouse.down(); await page.mouse.up();
  check(`${w}px hover then click keeps the panel open`, await page.isVisible('#mega-services'));
  await page.keyboard.press('Escape');
  // Keyboard: Enter on the button opens; Tab moves into the panel; tabbing past the panel closes it.
  await page.focus('[aria-controls="mega-industries"]');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  const inPanel = await page.evaluate(() => document.activeElement.closest('#mega-industries') !== null);
  const n = await page.locator('#mega-industries a').count();
  for (let i = 0; i < n; i++) await page.keyboard.press('Tab');
  check(`${w}px keyboard: Enter opens, Tab enters the panel, tabbing out closes`, inPanel && (await page.evaluate(() => document.getElementById('mega-industries').hidden)), `${inPanel}`);
  await page.keyboard.press('Shift+Tab');
  check(`${w}px keyboard: visible focus ring`, await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2; }));
  check(`${w}px no script errors`, errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---- Mobile and tablet accordions
for (const [w, h] of [[320, 640], [360, 780], [375, 812], [390, 844], [768, 1024], [1024, 768]]) {
  const { page, errors } = await open(w, h);
  check(`${w}px desktop nav hidden, Menu shown`, !(await page.isVisible('.desktop-nav')) && (await page.isVisible('.site-menu summary')));
  await page.click('.site-menu summary');
  for (const id of Object.keys(EXPECT)) {
    const t = `[aria-controls="macc-${id}"]`;
    check(`${w}px ${id}: accordion starts collapsed`, (await page.getAttribute(t, 'aria-expanded')) === 'false' && !(await page.isVisible(`#macc-${id}`)));
    await page.click(t);
    const m = await page.evaluate((id) => {
      const p = document.getElementById(`macc-${id}`);
      const links = [...p.querySelectorAll('.macc__list a')];
      const tog = document.querySelector(`[aria-controls="macc-${id}"]`).getBoundingClientRect();
      return { shown: !p.hidden, count: links.length, visible: links.every((a) => a.getBoundingClientRect().height > 0), minTap: Math.min(...links.map((a) => a.getBoundingClientRect().height)), tog: [tog.width, tog.height], over: document.documentElement.scrollWidth - document.documentElement.clientWidth, nav: document.querySelector('.site-menu nav').scrollHeight > document.querySelector('.site-menu nav').clientHeight ? 'scrolls' : 'fits' };
    }, id);
    check(`${w}px ${id}: expands with all ${EXPECT[id]} links visible`, m.shown && m.count === EXPECT[id] && m.visible, m.count);
    check(`${w}px ${id}: touch targets (toggle 44px, links 40px+)`, m.tog[0] >= 44 && m.tog[1] >= 44 && m.minTap >= 40, `${m.tog} ${m.minTap}`);
    check(`${w}px ${id}: no sideways overflow`, m.over <= 0, m.over);
    await page.click(t);
    check(`${w}px ${id}: collapses again`, (await page.getAttribute(t, 'aria-expanded')) === 'false');
  }
  await page.click('[aria-controls="macc-locations"]');
  const scroll = await page.evaluate(() => { const n = document.querySelector('.site-menu nav'); n.scrollTop = n.scrollHeight; return { end: n.getBoundingClientRect().bottom <= innerHeight + 1, top: n.scrollTop }; });
  check(`${w}px long Locations list scrolls inside the menu`, scroll.end, JSON.stringify(scroll));
  await page.addScriptTag({ path: axePath });
  const v = await page.evaluate(async () => (await window.axe.run(document.querySelector('.site-header'), { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'], rules: { region: { enabled: false } } })).violations.map((x) => `${x.id}: ${x.nodes.length}`));
  check(`${w}px axe, menu open`, v.length === 0, v.join(' ; '));
  check(`${w}px no script errors`, errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---- Current section stays open on mobile; active state on desktop
{
  const { page } = await open(375, 812, '/services/gst-registration/');
  await page.click('.site-menu summary');
  check('Mobile: the current section opens by itself', (await page.getAttribute('[aria-controls="macc-services"]', 'aria-expanded')) === 'true');
  await page.close();
  const d = await open(1440, 900, '/services/gst-registration/');
  check('Desktop: the current section is marked', await d.page.evaluate(() => document.querySelector('.mega.is-section .mega__link')?.textContent.trim() === 'Services' && document.querySelector('#mega-services a[aria-current="page"]') !== null));
  await d.page.close();
}

// ---- Without JavaScript
{
  const { page } = await open(1440, 900, '/', { javaScriptEnabled: false });
  check('No JS, desktop: hub links work, no dead chevrons, panels stay closed', await page.evaluate(() => document.querySelectorAll('.mega__link').length === 3 && [...document.querySelectorAll('.mega__toggle')].every((b) => b.hidden) && [...document.querySelectorAll('.mega__panel')].every((p) => p.hidden)));
  await page.close();
  const m = await open(375, 812, '/', { javaScriptEnabled: false });
  await m.page.click('.site-menu summary');
  check('No JS, mobile: every accordion link is reachable', await m.page.evaluate((n) => document.querySelectorAll('.macc__list a').length === n && [...document.querySelectorAll('.macc__panel')].every((p) => !p.hidden), Object.values(EXPECT).reduce((a, b) => a + b, 0)));
  await m.page.close();
}

// ---- Every menu target loads, on every built page the menu is identical
{
  const { page } = await open(1440, 900);
  const hrefs = await page.evaluate(() => [...new Set([...document.querySelectorAll('.desktop-nav a, .site-menu nav a')].map((a) => a.getAttribute('href')).filter((h) => h.startsWith('/')))]);
  const bad = [];
  for (const h of hrefs) { const r = await fetch(new URL(h, base + '/')); if (!r.ok) bad.push(`${h} ${r.status}`); }
  check(`All ${hrefs.length} navigation targets return 200`, bad.length === 0, bad.join(' '));
  await page.close();
  let differ = 0;
  const ref = hrefs.length;
  for (const u of built) { const html = await (await fetch(base + u)).text(); const n = new Set([...html.matchAll(/class="mega__list"[\s\S]*?<\/ul>/g)].flatMap((x) => [...x[0].matchAll(/href="([^"]+)"/g)].map((y) => y[1]))).size; if (n !== EXPECT.services + EXPECT.industries + EXPECT.locations) differ++; }
  check(`Same complete menu on all ${built.size} built pages`, differ === 0, `${differ} differ (reference ${ref} nav targets)`);
}

await browser.close();
server?.close();
const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} mega menu checks passed (${base})`);
process.exit(passed === results.length ? 0 : 1);
