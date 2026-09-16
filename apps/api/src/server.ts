import { config } from 'dotenv';
config({ path: new URL('../../../.env', import.meta.url), quiet: true });
import { buildApp } from './app.js';
import { disconnectDatabase } from '@bigant/database';
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET_REQUIRED');
const app = buildApp({ secret });
for (const signal of ['SIGTERM','SIGINT']) process.on(signal, async () => { await app.close(); await disconnectDatabase(); });
await app.listen({ port: Number(process.env.PORT ?? 3001), host: process.env.HOST ?? '127.0.0.1' });
