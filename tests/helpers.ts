import { PrismaClient } from '@prisma/client';
import { seedDemo } from '../packages/database/src/fixtures.js';
import { buildApp } from '../apps/api/src/app.js';
export const admin = new PrismaClient({ log: [] });
export const secret = 'test-secret-with-at-least-32-characters';
export async function fixtures() { return seedDemo(admin); }
export function loggedApp(now?: () => Date) {
  const app = buildApp({ secret, now });
  app.get('/test/session', async (request, reply) => {
    try { const claims = await app.authenticateStaff(request); return { tenant_id: claims.tenant_id }; }
    catch { return reply.code(401).send(); }
  });
  return app;
}
export async function login(app: ReturnType<typeof buildApp>, second = false) {
  return app.inject({ method: 'POST', url: '/auth/login', payload: { slug: second ? 'lido-miseno' : 'trattoria-santa-lucia', email: second ? 'owner@lidomiseno.test' : 'owner@santalucia.test', password: 'bigant2026' } });
}
