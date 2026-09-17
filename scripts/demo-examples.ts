import { config } from 'dotenv';
config({ quiet: true });
import { disconnectDatabase } from '../packages/database/src/index.js';
import { populateDemoExamples } from '../apps/api/src/demo-examples.js';

const url = new URL(process.env.DATABASE_URL ?? '');
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(url.hostname) || !['/bigant', '/bigant_test'].includes(url.pathname) || (process.env.NOTIFICATION_MODE ?? 'demo') !== 'demo') throw new Error('Gli esempi richiedono database locale bigant/bigant_test e notifiche in modalità demo.');
try {
  const examples = await populateDemoExamples();
  process.stdout.write(`${JSON.stringify(examples, null, 2)}\n`);
} finally { await disconnectDatabase(); }
