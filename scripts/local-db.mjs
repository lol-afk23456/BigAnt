import EmbeddedPostgres from 'embedded-postgres';
import { URL } from 'node:url';
import { existsSync } from 'node:fs';
import process from 'node:process';
const databaseDir = new URL('../.local/postgres', import.meta.url).pathname;
const pg = new EmbeddedPostgres({ databaseDir, user: 'bigant', password: 'bigant_local', port: 55432, persistent: true, authMethod: 'scram-sha-256', initdbFlags: ['--locale=C','--encoding=UTF8'], postgresFlags: ['-h','127.0.0.1','-c','timezone=UTC','-c','log_statement=none','-c','log_min_error_statement=panic'], onLog: () => {}, onError: () => {} });
if (!existsSync(`${databaseDir}/PG_VERSION`)) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
for (const name of ['bigant','bigant_test']) {
  const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  if (!result.rowCount) await pg.createDatabase(name);
}
await client.end();
process.stdout.write('PostgreSQL 16 pronto su 127.0.0.1:55432 (bigant, bigant_test).\n');
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, async () => { await pg.stop(); process.exit(0); });
