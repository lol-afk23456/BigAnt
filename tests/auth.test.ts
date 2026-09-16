import { beforeAll, afterAll, expect, test } from 'vitest';
import { admin, fixtures, loggedApp, login } from './helpers.js';
import { disconnectDatabase } from '../packages/database/src/index.js';
beforeAll(async () => { await fixtures(); });
afterAll(async () => { await admin.$disconnect(); await disconnectDatabase(); });
test('login, durata access 15 minuti, refresh ruotato, logout e revoca', async () => {
  let date = new Date();
  const app = loggedApp(() => date);
  try {
    const response = await login(app);
    expect(response.statusCode).toBe(200);
    const data = response.json<{ access_token: string; expires_in: number }>();
    expect(data.expires_in).toBe(900);
    const cookie = response.cookies[0]!;
    expect(cookie.httpOnly).toBe(true); expect(cookie.secure).toBe(true); expect(cookie.sameSite).toBe('Lax'); expect(cookie.maxAge).toBe(2592000);
    expect(response.json()).not.toHaveProperty('refresh');
    const headers = { authorization: `Bearer ${data.access_token}` };
    expect((await app.inject({ url:'/test/session', headers })).statusCode).toBe(200);
    date = new Date(date.getTime() + 901000);
    expect((await app.inject({ url:'/test/session', headers })).statusCode).toBe(401);
    const refreshed = await app.inject({method:'POST',url:'/auth/refresh',cookies:{[cookie.name]:cookie.value}});
    expect(refreshed.statusCode).toBe(200);
    const rotated = refreshed.cookies[0]!;
    expect(rotated.value).not.toBe(cookie.value);
    expect((await app.inject({method:'POST',url:'/auth/refresh',cookies:{[cookie.name]:cookie.value}})).statusCode).toBe(401);
    const newHeaders = { authorization: `Bearer ${refreshed.json<{access_token:string}>().access_token}` };
    expect((await app.inject({url:'/test/session',headers:newHeaders})).statusCode).toBe(200);
    expect((await app.inject({method:'POST',url:'/auth/logout',cookies:{[rotated.name]:rotated.value}})).statusCode).toBe(204);
    expect((await app.inject({url:'/test/session',headers:newHeaders})).statusCode).toBe(401);
    expect((await app.inject({method:'POST',url:'/auth/refresh',cookies:{[rotated.name]:rotated.value}})).statusCode).toBe(401);
  } finally { await app.close(); }
});
test('6° tentativo bloccato per email, anche cambiando IP e maiuscole', async () => {
  const app = loggedApp();
  try {
    for (let n=0;n<6;n++) {
      const response = await app.inject({method:'POST',url:'/auth/login',remoteAddress:`127.0.0.${n+1}`,payload:{slug:'trattoria-santa-lucia',email:n%2?'OWNER@SANTALUCIA.TEST':'owner@santalucia.test',password:'sbagliata'}});
      expect(response.statusCode).toBe(n===5?429:401);
      expect(response.json()).toHaveProperty('error.message');
    }
  } finally { await app.close(); }
});
test('refresh concorrente: un solo utilizzo; scadenza dopo 30 giorni', async () => {
  let date = new Date();
  const app = loggedApp(() => date);
  try {
    const response = await login(app, true); const c = response.cookies[0]!;
    const results = await Promise.all([1,2].map(() => app.inject({method:'POST',url:'/auth/refresh',cookies:{[c.name]:c.value}})));
    expect(results.map(r=>r.statusCode).sort()).toEqual([200,401]);
    const rotated = results.find(r=>r.statusCode===200)!.cookies[0]!;
    date = new Date(date.getTime()+31*86400000);
    expect((await app.inject({method:'POST',url:'/auth/refresh',cookies:{[rotated.name]:rotated.value}})).statusCode).toBe(401);
  } finally { await app.close(); }
});
test('credenziali tenant errato, JWT manomesso e token di tipo errato rifiutati', async () => {
 const app=loggedApp();
 try {
  expect((await app.inject({method:'POST',url:'/auth/login',payload:{slug:'lido-miseno',email:'owner@santalucia.test',password:'bigant2026'}})).statusCode).toBe(401);
  const response=await login(app);const c=response.cookies[0]!;
  expect((await app.inject({url:'/test/session',headers:{authorization:`Bearer ${c.value}`}})).statusCode).toBe(401);
  expect((await app.inject({url:'/test/session',headers:{authorization:`Bearer ${response.json<{access_token:string}>().access_token}x`}})).statusCode).toBe(401);
 } finally {await app.close();}
});
test('healthcheck, header di sicurezza ed errori localizzati', async () => {
  const app = loggedApp();
  try {
    const health = await app.inject({url:'/health'});
    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({status:'ok'});
    expect(health.headers['x-content-type-options']).toBe('nosniff');
    expect(health.headers['content-security-policy']).toBeDefined();
    const invalid = await app.inject({method:'POST',url:'/auth/login',headers:{'accept-language':'en'},payload:{}});
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toEqual({error:{code:'INVALID_INPUT',message:'Check your details and try again.',details:{}}});
  } finally { await app.close(); }
});
test('utente disabilitato: access e refresh già emessi vengono rifiutati', async () => {
  const app = loggedApp();
  const user = await admin.staffUser.findFirstOrThrow({where:{email:'owner@lidomiseno.test'}});
  try {
    const response=await login(app,true); expect(response.statusCode).toBe(200);
    const c=response.cookies[0]!;
    await admin.staffUser.update({where:{id:user.id},data:{status:'disabled'}});
    expect((await app.inject({url:'/test/session',headers:{authorization:`Bearer ${response.json<{access_token:string}>().access_token}`}})).statusCode).toBe(401);
    expect((await app.inject({method:'POST',url:'/auth/refresh',cookies:{[c.name]:c.value}})).statusCode).toBe(401);
  } finally { await admin.staffUser.update({where:{id:user.id},data:{status:'active'}}); await app.close(); }
});
