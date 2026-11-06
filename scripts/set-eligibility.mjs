// Decides publication eligibility page by page, after a build. Owner approval is recorded but never decides this.
// A built page is eligible only if it has no open fact and no recorded publication blocker.
// Usage: node scripts/set-eligibility.mjs   (run after `npx eleventy`, then rebuild)
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Blockers that a page's notes do not show.
const OTHER_BLOCKERS = {
  '/disclaimer/': ['Marked as a draft legal page, not yet reviewed by a lawyer'],
};

const routes = JSON.parse(readFileSync('src/_data/routes.json', 'utf8'));
for (const r of routes) {
  delete r.blockers;
  if (!r.built) { r.indexable = false; r.publication = 'NOT_PUBLICATION_ELIGIBLE'; continue; }
  const html = readFileSync(join('_site', r.url, 'index.html'), 'utf8');
  const main = (html.match(/<main[\s\S]*<\/main>/) || [''])[0];
  // Open facts render as HTML comments (see the `pending` shortcode in eleventy.config.js).
  // If that format changes, this must change with it, or held pages would be marked eligible.
  const notes = [...main.matchAll(/<!-- open fact: ([\s\S]*?) -->/g)].map((m) => m[1].trim());
  if (!notes.length && /class="pending"|Not yet available:/.test(main)) throw new Error(`${r.url}: open-fact markup not recognised`);
  const blockers = [...notes, ...(OTHER_BLOCKERS[r.url] || [])];
  if (blockers.length) r.blockers = blockers;
  r.indexable = blockers.length === 0;
  r.publication = r.indexable ? 'PUBLICATION_ELIGIBLE' : 'NOT_PUBLICATION_ELIGIBLE';
}
writeFileSync('src/_data/routes.json', JSON.stringify(routes, null, 1) + '\n');
const eligible = routes.filter((r) => r.indexable);
console.log(`eligible ${eligible.length}; built but held ${routes.filter((r) => r.built && !r.indexable).length}; not built ${routes.filter((r) => !r.built).length}`);
for (const r of routes.filter((x) => x.blockers)) console.log(r.url, r.blockers.length);
