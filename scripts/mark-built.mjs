// Marks one locality route as built, after its page file exists. Usage: node scripts/mark-built.mjs /locations/slug/ score
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const [url, score] = process.argv.slice(2);
const routes = JSON.parse(readFileSync('src/_data/routes.json', 'utf8'));
const r = routes.find((x) => x.url === url);
if (!r) throw new Error(`Unknown route ${url}`);
const slug = url.replace(/^\/|\/$/g, '');
if (![`src/${slug}.njk`, `src/${slug}/index.njk`].some(existsSync)) throw new Error(`No page file for ${url}`);
r.built = true;
r.name = r.name.replace('Accounting Services in', 'Accounting in');
r.status = 'DEVELOPMENT_COMPLETE';
r.score = Number(score);
delete r.decision;
writeFileSync('src/_data/routes.json', JSON.stringify(routes, null, 1) + '\n');
console.log('built', url);
