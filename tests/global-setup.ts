import { config } from 'dotenv';
import { execFileSync } from 'node:child_process';
config({ quiet: true });
const url = process.env.TEST_DATABASE_URL ?? 'postgresql://bigant:bigant_local@127.0.0.1:55432/bigant_test?schema=public';
if (!new URL(url).pathname.endsWith('_test')) throw new Error('DEDICATED_TEST_DATABASE_REQUIRED');
process.env.DATABASE_URL = url;
export default function setup() {
  execFileSync('pnpm', ['db:migrate'], { env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' });
}
