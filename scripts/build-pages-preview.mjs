// Builds the temporary public preview for GitHub Pages into _site_preview/.
// This is not a production build. Open facts stay visible as highlighted notes, and the production safeguard is untouched.
import { rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const OUT = '_site_preview';
rmSync(OUT, { recursive: true, force: true });
const env = { ...process.env, DEPLOY_TARGET: 'github-pages' };
delete env.ELEVENTY_ENV;
const result = spawnSync('npx', ['eleventy', `--output=${OUT}`], { stdio: 'inherit', shell: true, env });
process.exit(result.status ?? 1);
