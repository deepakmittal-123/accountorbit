import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { HtmlBasePlugin } from '@11ty/eleventy';

const routes = JSON.parse(readFileSync('src/_data/routes.json', 'utf8'));
const byUrl = new Map(routes.map((r) => [r.url, r]));
const isProduction = process.env.ELEVENTY_ENV === 'production';
const SITE = 'https://accountorbit.in';

// One switch for the temporary public preview on GitHub Pages, which lives under a project subpath.
// The default build, and any future custom-domain deployment, stays at the domain root.
const isPreview = process.env.DEPLOY_TARGET === 'github-pages';
if (isPreview && isProduction) throw new Error('A GitHub Pages preview cannot be a production build');
const PATH_PREFIX = isPreview ? '/accountorbit/' : '/';
const PUBLIC_ORIGIN = isPreview ? 'https://deepakmittal-123.github.io/accountorbit' : SITE;

// QA only: pretends one route is eligible so the sitemap generator can be tested. See qa/seo-files-qa.mjs.
if (process.env.QA_SIMULATE_ELIGIBLE) {
  if (isProduction) throw new Error('QA_SIMULATE_ELIGIBLE cannot be used in a production build');
  const simulated = byUrl.get(process.env.QA_SIMULATE_ELIGIBLE);
  if (!simulated) throw new Error('QA_SIMULATE_ELIGIBLE names an unknown route');
  simulated.indexable = true;
  simulated.publication = 'PUBLICATION_ELIGIBLE';
}

// QA only: pretends nothing is eligible, to test the generator's empty output.
if (process.env.QA_SIMULATE_NONE_ELIGIBLE) {
  if (isProduction) throw new Error('QA_SIMULATE_NONE_ELIGIBLE cannot be used in a production build');
  for (const r of routes) { r.indexable = false; r.publication = 'NOT_PUBLICATION_ELIGIBLE'; }
}

// Only a built, QA-passed route explicitly marked eligible can be indexed. Anything else stops the build.
const isEligible = (r) => r.built && r.status === 'QA_PASSED' && r.publication === 'PUBLICATION_ELIGIBLE';
const invalid = routes.filter((r) => (r.indexable || r.publication === 'PUBLICATION_ELIGIBLE') && !(r.indexable && isEligible(r)));
if (invalid.length) throw new Error(`Routes marked indexable or eligible without meeting the rules: ${invalid.map((r) => r.url).join(', ')}`);

const LLMS_GROUPS = [
  ['Services', (u) => u.startsWith('/services/')],
  ['Industries', (u) => u.startsWith('/industries/')],
  ['Guides', (u) => u.startsWith('/guides/')],
  ['Delhi business areas', (u) => u.startsWith('/locations/')],
  ['Legal', (u) => ['/privacy-policy/', '/terms-and-conditions/', '/disclaimer/'].includes(u)],
];

const llmsText = (pages) => {
  const eligible = routes.filter((r) => r.indexable);
  const core = ['/', '/how-it-works/', '/about-us/', '/contact-us/', '/request-an-accountant/'];
  const listed = routes.filter((r) => r.built && (r.indexable || core.includes(r.url)));
  const desc = new Map(pages.map((p) => [p.url, p.data.description]));
  const line = (r) => `- [${r.name}](${PUBLIC_ORIGIN}${r.url}): ${desc.get(r.url)}`;
  const notice = isProduction ? '' : isPreview ? '\nThis is a temporary public preview. AccountOrbit has not launched, and these pages are not intended for search indexing.\n' : '\nThis site is a development preview and has not been publicly launched.\n';
  const rest = listed.filter((r) => !LLMS_GROUPS.some(([, match]) => match(r.url)));
  const sections = [['About and enquiries', rest], ...LLMS_GROUPS.map(([name, match]) => [name, listed.filter((r) => match(r.url))])]
    .filter(([, items]) => items.length)
    .map(([name, items]) => `## ${name}\n\n${items.map(line).join('\n')}\n`);
  return `# AccountOrbit

> AccountOrbit is an independent referral platform for people and businesses in Delhi looking for accounting and tax help. It is not a Chartered Accountant firm, accounting firm, law firm, audit practice, tax authority or government body, and it does not itself provide accounting, tax, audit or legal services.
${notice}
- There is no published list of partners. Do not describe any named professional or firm as an AccountOrbit partner.
- AccountOrbit does not publish ratings, testimonials or prices of its own, and it does not promise a match.
- Guides and service pages are general information, not professional advice.
- Being named on a location page does not mean a professional is based or available in that area.
- Phone: +91 82907 28453

${sections.join('\n')}`;
};

const crumbsFor = (url) => {
  const chain = [];
  let r = byUrl.get(url);
  while (r) { chain.unshift(r); r = r.parent ? byUrl.get(r.parent) : null; }
  return chain;
};

export default function (config) {
  // Adds the path prefix to root-relative URLs in generated HTML. With the default prefix, it changes nothing.
  config.addPlugin(HtmlBasePlugin);
  config.addPassthroughCopy({ 'src/assets': 'assets' });
  config.addPassthroughCopy({ 'src/root': '/' });
  config.addFilter('llmsText', llmsText);
  config.addPassthroughCopy({
    'node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2': 'assets/fonts/newsreader-italic.woff2',
    'node_modules/@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2': 'assets/fonts/hanken-grotesk.woff2',
  });

  // Resolves a mega menu from src/_data/megaMenus.js. Unknown URLs stop the build; unbuilt routes are left out.
  // A location group lists the built children of its category hub, and also names the unbuilt ones it covers.
  const areaName = (r) => r.name.replace(/^Accounting (?:Services )?in /, '');
  const known = (url, where) => { const r = byUrl.get(url); if (!r) throw new Error(`megaMenu: "${url}" (${where}) is not in the approved route inventory`); return r; };
  config.addFilter('megaMenu', (menu) => {
    known(menu.hub, menu.label);
    const groups = menu.groups.map((g) => {
      if (g.hub) {
        const hub = known(g.hub, g.title);
        const kids = routes.filter((r) => r.parent === g.hub && r.url.startsWith('/locations/accounting-services-in-'));
        return { title: g.title, hub: hub.built ? { url: g.hub, label: g.hubLabel } : null,
          items: kids.filter((r) => r.built).map((r) => ({ url: r.url, label: areaName(r) })).sort((a, b) => a.label.localeCompare(b.label)),
          covered: kids.filter((r) => !r.built).map(areaName).sort() };
      }
      return { title: g.title, items: g.items.filter(([u]) => known(u, g.title).built).map(([url, label]) => ({ url, label })), covered: [] };
    }).filter((g) => g.items.length || g.hub);
    return { ...menu, id: menu.label.toLowerCase(), groups, count: groups.reduce((n, g) => n + g.items.length + (g.hub ? 1 : 0), 0) };
  });

  // A link to an unbuilt route renders as plain text, so a page can never ship a broken internal link.
  // Unknown URLs stop the build, because every route must exist in the approved inventory.
  config.addShortcode('routeLink', (url, label) => {
    const route = byUrl.get(url);
    if (!route) throw new Error(`routeLink: "${url}" is not in the approved route inventory`);
    return route.built ? `<a href="${url}">${label}</a>` : `<span class="route-text">${label}</span>`;
  });

  // Facts only the owner or a qualified reviewer can supply. Kept out of visitors' view as an HTML comment, so the
  // surrounding copy must read completely without it. A production build still refuses to run while any remain.
  config.addShortcode('pending', function (text) {
    if (isProduction) throw new Error(`Production build blocked by missing operational fact: ${text}`);
    if (byUrl.get(this.page.url)?.indexable) throw new Error(`${this.page.url} is marked indexable but has an open fact: ${text}`);
    return `<!-- open fact: ${String(text).replace(/--/g, '\u2014')} -->`;
  });

  // Related reading: lists only pages that exist, so it fills in automatically as routes are built.
  config.addShortcode('related', (items, heading = 'Related reading') => {
    const live = items.map((i) => i.split('|')).filter(([u]) => {
      if (!byUrl.has(u)) throw new Error(`related: "${u}" is not in the approved route inventory`);
      return byUrl.get(u).built;
    });
    if (!live.length) return '';
    return `<section class="related" aria-label="${heading}"><div class="wrap"><h2>${heading}</h2><ul>${live.map(([u, l]) => `<li><a href="${u}">${l}</a></li>`).join('')}</ul></div></section>`;
  });

  // External link with the new-tab announcement built in.
  config.addShortcode('ext', (url, label) => `<a href="${url}" rel="noopener" target="_blank">${label}<span class="visually-hidden"> (opens in a new tab)</span></a>`);

  config.addGlobalData('env', { isProduction, isPreview, site: SITE, publicOrigin: PUBLIC_ORIGIN });
  config.addFilter('routeOf', (url) => byUrl.get(url));
  // Each page's own illustration. Legal pages stay plain, so nothing interrupts reading.
  config.addFilter('artFor', (url) => {
    const slug = url === '/' ? 'home' : url.replace(/\/$/, '').split('/').pop();
    return ['privacy-policy', 'terms-and-conditions', 'disclaimer', 'about-me'].includes(slug) ? '' : `/assets/illustrations/${slug}.svg`;
  });
  config.addFilter('pageData', (url, pages) => {
    const found = pages.find((p) => p.url === url);
    if (!found) throw new Error(`pageData: no page at ${url}`);
    return found;
  });
  config.addFilter('built', (url) => Boolean(byUrl.get(url)?.built));
  // Only ancestors that exist are linked; the current page always comes last.
  config.addFilter('crumbs', (url) => crumbsFor(url).filter((r) => r.built || r.url === url));
  // Navigation entries resolve to the real page once built, otherwise to a fallback anchor, otherwise they are hidden.
  config.addFilter('navItems', (items) => items
    .map((i) => ({ label: i.label, href: byUrl.get(i.url)?.built ? i.url : i.fallback }))
    .filter((i) => i.href));
  config.addFilter('builtChildren', (parent) => routes.filter((r) => r.parent === parent && r.built));

  // The sitemap, robots file and headers come only from eligible routes, so unapproved pages cannot leak in.
  config.on('eleventy.after', ({ directories }) => {
    // A preview never offers a sitemap, so unfinished pages are not put forward for indexing.
    const approved = isPreview ? [] : routes.filter((r) => r.indexable && isEligible(r));
    const sitemapPath = join(directories.output, 'sitemap.xml');
    rmSync(sitemapPath, { force: true });
    let robots = 'User-agent: *\nAllow: /\n';
    if (approved.length) {
      const body = approved.map((r) => `  <url><loc>${SITE}${r.url}</loc></url>`).join('\n');
      writeFileSync(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
      robots += `\nSitemap: ${SITE}/sitemap.xml\n`;
    }
    writeFileSync(join(directories.output, 'robots.txt'), robots);

    // GitHub Pages ignores this file and would serve it publicly, so a preview leaves it out.
    if (isPreview) return;

    // Netlify and Cloudflare Pages read this file. On any other host, apply the same values in its own config.
    const endpoint = process.env.ENQUIRY_ENDPOINT ? new URL(process.env.ENQUIRY_ENDPOINT).origin : '';
    const send = endpoint ? ` ${endpoint}` : '';
    const csp = `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'${send}; form-action 'self'${send}; manifest-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'`;
    writeFileSync(join(directories.output, '_headers'), [
      '/*',
      '  X-Content-Type-Options: nosniff',
      '  X-Frame-Options: DENY',
      '  Referrer-Policy: strict-origin-when-cross-origin',
      '  Permissions-Policy: camera=(), microphone=(), geolocation=()',
      '  Strict-Transport-Security: max-age=31536000',
      `  Content-Security-Policy: ${csp}`,
      ...(approved.length ? [] : ['  X-Robots-Tag: noindex, nofollow']),
      '',
      '/assets/fonts/*',
      '  Cache-Control: public, max-age=31536000, immutable',
      '',
      '/assets/css/*',
      '  Cache-Control: public, max-age=3600',
      '',
      '/assets/js/*',
      '  Cache-Control: public, max-age=3600',
      '',
    ].join('\n'));
  });

  return { dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' }, templateFormats: ['njk'], pathPrefix: PATH_PREFIX };
}
