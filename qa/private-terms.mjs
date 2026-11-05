// Details that must never appear on the site are kept out of this public repository.
// Put them in qa/private-terms.local.json (git-ignored) as {"terms": ["..."]} to include them in the checks.
// Without that file, the checks still look for WhatsApp links and mentions.
import { existsSync, readFileSync } from 'node:fs';

const FILE = 'qa/private-terms.local.json';
const local = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')).terms : [];
const escape = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const PRIVATE_TERMS = new RegExp(['wa\\.me', 'whatsapp', ...local.map(escape)].join('|'), 'i');
