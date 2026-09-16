import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedDemo } from './fixtures.js';
if (process.env.NODE_ENV === 'production') throw new Error('DEMO_SEED_FORBIDDEN_IN_PRODUCTION');
const client = new PrismaClient({ log: [] });
try {
  const tenants = await seedDemo(client);
  process.stdout.write(`Seed completato: ${tenants.length} tenant demo.\n`);
} finally { await client.$disconnect(); }
