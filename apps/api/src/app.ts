import { menuRoutes } from './menu.js';
import { DomainError } from '@bigant/core';
import { ZodError } from 'zod';
import { settingsRoutes } from './settings.js';
import { reservationRoutes } from './reservations/routes.js';
import Fastify, { type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { SignJWT, jwtVerify } from 'jose';
import { db, withTenant, resolveTenant } from '@bigant/database';
import { loginInput, staffClaims, type StaffClaims } from '@bigant/types';
import { errorBody } from '@bigant/i18n';

const ACCESS_SECONDS = 15 * 60;
const REFRESH_SECONDS = 30 * 24 * 60 * 60;
const cookieName = '__Secure-bigant_refresh';
const cookieOptions = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/auth' };
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

export function buildApp(options: { secret: string; now?: () => Date; menuImageDir?: string }) {
  if (Buffer.byteLength(options.secret) < 32) throw new Error('JWT_SECRET_TOO_SHORT');
  const app = Fastify({ logger: false, bodyLimit: 16_384, trustProxy: false });
  const key = new TextEncoder().encode(options.secret);
  const now = options.now ?? (() => new Date());
  const dummyHash = argon2.hash(randomBytes(32), { type: argon2.argon2id });
  const epoch = () => Math.floor(now().getTime() / 1000);
  async function sign(claims: StaffClaims, lifetime: number) {
    return new SignJWT(claims).setProtectedHeader({ alg: 'HS256' }).setIssuer('bigant-api').setAudience('bigant-staff').setIssuedAt(epoch()).setExpirationTime(epoch() + lifetime).setJti(randomUUID()).sign(key);
  }
  async function verify(token: string, kind: StaffClaims['kind']) {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'], issuer: 'bigant-api', audience: 'bigant-staff', currentDate: now(), requiredClaims: ['exp','iat','jti'] });
    const claims = staffClaims.parse(payload);
    if (claims.kind !== kind) throw new Error('INVALID_TOKEN_KIND');
    return claims;
  }
  async function tokens(claims: Omit<StaffClaims, 'kind'>) {
    return { access_token: await sign({ ...claims, kind: 'access' }, ACCESS_SECONDS), refresh: await sign({ ...claims, kind: 'refresh' }, REFRESH_SECONDS) };
  }
  async function activeSession(claims: StaffClaims) {
    return db.staffSession.findFirst({ where: { id: claims.sid, staff_user_id: claims.sub, revoked_at: null, expires_at: { gt: now() }, staff_user: { status: 'active' }, tenant: { status: 'active' } }, include: { staff_user: true } });
  }
  async function authenticate(request: FastifyRequest) {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new Error('UNAUTHORIZED');
    const claims = await verify(header.slice(7), 'access');
    const session = await withTenant(claims.tenant_id, () => activeSession(claims));
    if (!session || session.staff_user.role !== claims.role) throw new Error('UNAUTHORIZED');
    return claims;
  }
  app.decorate('authenticateStaff', authenticate);
  app.register(async app => {
    await app.register(cookie);
    await app.register(helmet);
    await app.register(rateLimit, {
      global: true, max: 30, timeWindow: '1 minute',
    });
    app.setErrorHandler((error, request, reply) => {
      if (error instanceof DomainError) return reply.code(error.statusCode).send(errorBody(error.code, request.headers['accept-language']));
      if (error instanceof ZodError) return reply.code(400).send(errorBody('INVALID_INPUT', request.headers['accept-language']));
      const status = (error as { statusCode?: number }).statusCode;
      const code = status === 429 ? 'RATE_LIMITED' : status && status >= 400 && status < 500 ? 'INVALID_INPUT' : 'INTERNAL_ERROR';
      reply.code(code === 'RATE_LIMITED' ? 429 : code === 'INVALID_INPUT' ? 400 : 500).send(errorBody(code, request.headers['accept-language']));
    });
    app.setNotFoundHandler((request, reply) => reply.code(404).send(errorBody('NOT_FOUND', request.headers['accept-language'])));
    app.addHook('onSend', async (_request, reply, payload) => { reply.header('Cache-Control','no-store'); return payload; });
    reservationRoutes(app, { secret: options.secret, now });
    settingsRoutes(app);
    menuRoutes(app, options.menuImageDir);
    app.get('/health', async () => ({ status: 'ok' }));
    app.post('/auth/login', {
      config: { rateLimit: { max: 5, timeWindow: '15 minutes', hook: 'preHandler', keyGenerator: request => {
        const parsed = loginInput.safeParse(request.body);
        return parsed.success ? digest(parsed.data.email) : request.ip;
      } } },
    }, async (request, reply) => {
      const parsed = loginInput.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send(errorBody('INVALID_INPUT', request.headers['accept-language']));
      const { slug, email, password } = parsed.data;
      const tenant = await resolveTenant(slug);
      const user = tenant && tenant.status === 'active' ? await withTenant(tenant.id, () => db.staffUser.findFirst({ where: { email, status: 'active' } })) : null;
      const valid = await argon2.verify(user?.password_hash ?? await dummyHash, password);
      if (!user || !valid) return reply.code(401).send(errorBody('INVALID_CREDENTIALS', request.headers['accept-language']));
      return withTenant(user.tenant_id, async () => {
        const issued = await db.$transaction(async tx => {
          const session = await tx.staffSession.create({ data: { tenant_id: user.tenant_id, staff_user_id: user.id, refresh_hash: randomBytes(32).toString('hex'), expires_at: new Date(now().getTime() + REFRESH_SECONDS * 1000) } });
          const result = await tokens({ sub: user.id, tenant_id: user.tenant_id, sid: session.id, role: user.role });
          await tx.staffSession.update({ where: { id: session.id }, data: { refresh_hash: digest(result.refresh) } });
          await tx.staffUser.update({ where: { id: user.id }, data: { last_login_at: now() } });
          return result;
        });
        reply.header('Cache-Control','no-store').setCookie(cookieName, issued.refresh, { ...cookieOptions, maxAge: REFRESH_SECONDS });
        return { access_token: issued.access_token, token_type: 'Bearer', expires_in: ACCESS_SECONDS };
      });
    });
    app.post('/auth/refresh', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
      const token = request.cookies[cookieName];
      try {
        if (!token) throw new Error('MISSING_COOKIE');
        const claims = await verify(token, 'refresh');
        return await withTenant(claims.tenant_id, async () => {
          const session = await activeSession(claims);
          if (!session) throw new Error('INVALID_SESSION');
          const issued = await tokens({ sub: claims.sub, tenant_id: claims.tenant_id, sid: claims.sid, role: session.staff_user.role });
          const changed = await db.staffSession.updateMany({ where: { id: claims.sid, refresh_hash: digest(token), revoked_at: null, expires_at: { gt: now() } }, data: { refresh_hash: digest(issued.refresh) } });
          if (changed.count !== 1) throw new Error('REFRESH_REPLAY');
          reply.header('Cache-Control','no-store').setCookie(cookieName, issued.refresh, { ...cookieOptions, maxAge: Math.max(0, Math.floor((session.expires_at.getTime() - now().getTime()) / 1000)) });
          return { access_token: issued.access_token, token_type: 'Bearer', expires_in: ACCESS_SECONDS };
        });
      } catch {
        return reply.code(401).send(errorBody('UNAUTHORIZED', request.headers['accept-language']));
      }
    });
    app.post('/auth/logout', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
      try {
        const token = request.cookies[cookieName];
        if (token) {
          const claims = await verify(token, 'refresh');
          await withTenant(claims.tenant_id, () => db.staffSession.updateMany({ where: { id: claims.sid, refresh_hash: digest(token), revoked_at: null }, data: { revoked_at: now() } }));
        }
      } catch { /* Logout idempotente anche con un cookie scaduto. */ }
      return reply.header('Cache-Control','no-store').clearCookie(cookieName, cookieOptions).code(204).send();
    });
  });
  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticateStaff(request: FastifyRequest): Promise<StaffClaims>;
  }
}
