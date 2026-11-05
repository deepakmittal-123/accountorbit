// Single place for route status. Development status and publication eligibility are tracked separately.
// Usage: node scripts/status-report.mjs [--qa=QA_PASSED]   Rewrites ACCOUNTORBIT_BUILD_PROGRESS.md from routes.json.
// Development: DEVELOPMENT_COMPLETE, QA_PASSED, NEEDS_TECHNICAL_FIX, EXTERNAL_DEPENDENCY, MERGED_WITH_HUB, NOT_JUSTIFIED_AS_SEPARATE_PAGE
// Publication: PUBLICATION_ELIGIBLE, NOT_PUBLICATION_ELIGIBLE
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const routes = JSON.parse(readFileSync('src/_data/routes.json', 'utf8'));
const qaFlag = process.argv.find((a) => a.startsWith('--qa='))?.split('=')[1];

for (const r of routes) {
  if (r.built) r.status = qaFlag || (r.status === 'QA_PASSED' ? 'QA_PASSED' : 'DEVELOPMENT_COMPLETE');
  r.publication = r.indexable ? 'PUBLICATION_ELIGIBLE' : 'NOT_PUBLICATION_ELIGIBLE';
}
writeFileSync('src/_data/routes.json', JSON.stringify(routes, null, 1) + '\n');

const by = (s) => routes.filter((r) => r.status === s);
const counts = ['QA_PASSED', 'DEVELOPMENT_COMPLETE', 'NEEDS_TECHNICAL_FIX', 'EXTERNAL_DEPENDENCY', 'MERGED_WITH_HUB', 'NOT_JUSTIFIED_AS_SEPARATE_PAGE'].map((s) => [s, by(s).length]);
const total = counts.reduce((n, [, c]) => n + c, 0);
if (total !== 76) throw new Error(`Status counts do not reconcile to 76: ${total} ${JSON.stringify(counts)}`);
const eligible = routes.filter((r) => r.publication === 'PUBLICATION_ELIGIBLE').length;
const lastQa = existsSync('qa/reports/site-last.txt') ? readFileSync('qa/reports/site-last.txt', 'utf8').trim().split('\n').slice(-1)[0] : 'Not yet run';
const list = (s) => by(s).map((r) => `- \`${r.url}\`${r.score ? ` (${r.score}/100)` : ''}`).join('\n') || '- None';

writeFileSync('ACCOUNTORBIT_BUILD_PROGRESS.md', `# AccountOrbit build progress

Compact checkpoint for resuming work. \`ACCOUNTORBIT_SINGLE_SOURCE_OF_TRUTH.md\` remains the authoritative ledger.

| | |
|---|---|
| **Last updated** | ${new Date().toISOString().slice(0, 10)} |
| **Authorization** | Owner approved all 76 routes (master prompt V6.0, field \`ownerApproved\`). No routine approvals are pending. Approval does not decide eligibility. Deployment needs separate authorization |
| **Active page** | None. Locality development under V6.0 is complete |
| **Next required action** | External dependencies in the ledger, section 10A |
| **Last sitewide QA** | ${lastQa} |

## Development status (reconciles to 76)

| Status | Count |
|---|---:|
${counts.map(([s, c]) => `| ${s} | ${c} |`).join('\n')}
| **Total** | **${total}** |

## Publication eligibility

| Status | Count |
|---|---:|
| PUBLICATION_ELIGIBLE | ${eligible} |
| NOT_PUBLICATION_ELIGIBLE | ${76 - eligible} |

${routes.filter((r) => r.indexable).length} URLs are in \`_site/sitemap.xml\`. Eligible does not mean published: nothing has been deployed, and the production build stays blocked while held pages have open facts.

## QA passed

${list('QA_PASSED')}

## External dependency

${list('EXTERNAL_DEPENDENCY')}

## Built but held from indexing

${routes.filter((r) => r.built && !r.indexable).map((r) => `- \`${r.url}\`: ${r.blockers?.length || 0} open item(s)`).join('\n') || '- None'}

## Merged with hub

${list('MERGED_WITH_HUB')}

## Not justified as a separate page

${list('NOT_JUSTIFIED_AS_SEPARATE_PAGE')}

## How to resume

1. Read the ledger and this file.
2. Compare them with \`src/\` and \`src/_data/routes.json\`.
3. Run \`npx eleventy\`, \`npm run qa\`, \`npm run qa:home\`, \`npm run qa:deep\` and \`npm run qa:files\`.
`);
console.log(JSON.stringify(Object.fromEntries(counts)), 'eligible', eligible);
