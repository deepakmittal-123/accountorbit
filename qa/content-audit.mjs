// Content audit across all built pages: length, incoming links, weak wording, source labels and notes.
// Usage: node qa/content-audit.mjs   (run after a build). Writes qa/reports/content-audit.json and prints a table.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const routes = JSON.parse(readFileSync('src/_data/routes.json', 'utf8')).filter((r) => r.built);
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
const pages = routes.map((r) => {
  const html = readFileSync(join('_site', r.url, 'index.html'), 'utf8');
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  const text = strip(main);
  const words = text.split(' ').length;
  const sentences = text.split(/[.!?]\s/).filter((s) => s.split(' ').length > 2);
  const longSent = sentences.filter((s) => s.split(' ').length > 32).length;
  const links = [...main.matchAll(/href="(\/[^"#]*)/g)].map((m) => m[1]);
  return {
    url: r.url, words, avgSentence: Math.round(words / Math.max(sentences.length, 1)), longSent,
    outInternal: new Set(links).size,
    notes: (main.match(/<!-- open fact:/g) || []).length,
    notReviewed: /confirm with a qualified professional/.test(main),
    secondary: (main.match(/\(secondary/g) || []).length,
    hasCta: /cta-band|request-an-accountant/.test(main),
    weak: ['leverage', 'seamless', 'one-stop', 'world-class', 'cutting-edge', 'delve', 'navigate the', 'in today', 'robust', 'tailored'].filter((w) => text.toLowerCase().includes(w)),
    links: [...new Set(links)],
  };
});
for (const p of pages) p.inLinks = pages.filter((q) => q.url !== p.url && q.links.includes(p.url)).length;
mkdirSync('qa/reports', { recursive: true });
writeFileSync('qa/reports/content-audit.json', JSON.stringify(pages.map(({ links, ...p }) => p), null, 1));
console.log('url | words | avgSent | long | in | out | notes | secondary | cta | weak');
for (const p of pages) console.log([p.url.replace('/industries/accounting-for-', '/i/').replace('/services/', '/s/').replace('/guides/', '/g/').replace('/locations/', '/l/'), p.words, p.avgSentence, p.longSent, p.inLinks, p.outInternal, p.notes, p.secondary, p.hasCta ? 'y' : 'N', p.weak.join(',')].join(' | '));
