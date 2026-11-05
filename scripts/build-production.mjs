// Cross-platform production build. Fails while any "owner to confirm" note remains on a built page.
import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['eleventy'], { stdio: 'inherit', shell: true, env: { ...process.env, ELEVENTY_ENV: 'production' } });
process.exit(result.status ?? 1);
