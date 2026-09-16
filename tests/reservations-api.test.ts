import { beforeAll, beforeEach, afterEach, afterAll, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { admin, fixtures, secret } from './helpers.js';
import { buildApp } from '../apps/api/src/app.js';
import { disconnectDatabase } from '../packages/database/src/index.js';
let passwordHash:string;
let app:ReturnType<typeof buildApp>;
let clock:Date;
let tenants:Array<{id:string;slug:string}>;
let access:string[];
const instant='2026-09-21T10:00:00.000Z';
const payload={full_name:'Cliente test',email:'cliente@example.test',phone:'333 123 4567',party_size:2,reserved_at:instant,notes:''};
beforeAll(async()=>{await fixtures();passwordHash=(await admin.staffUser.findFirstOrThrow({where:{email:'owner@santalucia.test'}})).password_hash;});
beforeEach(async()=>{
 clock=new Date('2026-09-20T07:00:00Z');tenants=[];access=[];app=buildApp({secret,now:()=>clock});
 for(const auto of [true,false]) {
  const slug=`test-${randomUUID()}`;
  const tenant=await admin.tenant.create({data:{name:'Locale test',slug,type:'restaurant',staffUser:{create:{email:'owner@test.test',password_hash:passwordHash,full_name:'Owner',role:'owner'}},tenantSettings:{create:{auto_confirm:auto}},openingHours:{create:Array.from({length:7},(_,weekday)=>({weekday,start_time:new Date('1970-01-01T10:00:00Z'),end_time:new Date('1970-01-01T23:00:00Z')}))},restaurantTable:{create:[{name:'Piccolo',max_capacity:2},{name:'Grande',max_capacity:6}]}}});
  tenants.push(tenant);
  const response=await app.inject({method:'POST',url:'/auth/login',payload:{slug,email:'owner@test.test',password:'bigant2026'}});expect(response.statusCode).toBe(200);access.push(response.json<{access_token:string}>().access_token);
 }
});
afterEach(async()=>{await app.close();await admin.tenant.deleteMany({where:{id:{in:tenants.map(t=>t.id)}}});});
afterAll(async()=>{await admin.$disconnect();await disconnectDatabase();});
const headers=(index=0)=>({authorization:`Bearer ${access[index]}`});
async function form(index=0) {
 const response=await app.inject({url:`/public/${tenants[index]!.slug}`});
 expect(response.statusCode).toBe(200);
 clock=new Date(clock.getTime()+3000);
 return response.json<{form_token:string}>().form_token;
}
async function book(index=0,changes:Partial<typeof payload>={},ip='127.0.0.1') {
 const form_token=await form(index);
 return app.inject({method:'POST',url:`/public/${tenants[index]!.slug}/reservations`,remoteAddress:ip,payload:{...payload,...changes,form_token}});
}
test('20 richieste parallele sull’ultima fascia: una sola prenotazione',async()=>{
 await admin.tenantSettings.update({where:{tenant_id:tenants[0]!.id},data:{total_capacity:2}});
 const form_token=await form();
 const results=await Promise.all(Array.from({length:20},(_,n)=>app.inject({method:'POST',url:`/public/${tenants[0]!.slug}/reservations`,remoteAddress:`10.0.0.${n+1}`,payload:{...payload,form_token}})));
 expect(results.filter(r=>r.statusCode===201)).toHaveLength(1);
 expect(results.filter(r=>r.statusCode===409)).toHaveLength(19);
 expect(await admin.reservation.count({where:{tenant_id:tenants[0]!.id}})).toBe(1);
});
test('il lock copre anche inizi diversi con permanenze sovrapposte',async()=>{
 await admin.tenantSettings.update({where:{tenant_id:tenants[0]!.id},data:{total_capacity:2}});
 const form_token=await form();
 const results=await Promise.all([instant,'2026-09-21T10:15:00.000Z'].map(reserved_at=>app.inject({method:'POST',url:`/public/${tenants[0]!.slug}/reservations`,payload:{...payload,reserved_at,form_token}})));
 expect(results.map(r=>r.statusCode).sort()).toEqual([201,409]);
});
test('ritmo 12: la 13ª persona riceve PACING_LIMIT',async()=>{
 expect((await book(0,{party_size:12})).statusCode).toBe(201);
 const response=await book(0,{party_size:1});expect(response.statusCode).toBe(409);expect(response.json().error.code).toBe('PACING_LIMIT');
});
test('conferma automatica/manuale, deduplica telefono e disdetta con capability',async()=>{
 const a=await book();const b=await book(1);expect(a.statusCode).toBe(201);expect(b.statusCode).toBe(201);
 expect(a.json().status).toBe('confirmed');expect(b.json().status).toBe('pending');
 const repeat=await book(0,{phone:'+39 3331234567',reserved_at:'2026-09-21T12:00:00.000Z'});expect(repeat.statusCode).toBe(201);
 expect(await admin.customer.count({where:{tenant_id:tenants[0]!.id}})).toBe(1);
 const details=await app.inject({url:`/public/reservations/${a.json().cancel_token}`});expect(details.json().can_cancel).toBe(true);expect(details.json()).not.toHaveProperty('customer');
 expect((await app.inject({method:'POST',url:`/public/reservations/${a.json().cancel_token}/cancel`})).statusCode).toBe(200);
 expect((await admin.reservation.findUniqueOrThrow({where:{id:a.json().id}})).cancelled_by).toBe('customer');
 const confirmed=await app.inject({method:'PATCH',url:`/reservations/${b.json().id}`,headers:headers(1),payload:{status:'confirmed'}});expect(confirmed.statusCode).toBe(200);
});
test('giorno chiuso: HTTP 200 con le due date alternative e nessun dato interno',async()=>{
 await admin.blackoutDate.create({data:{tenant_id:tenants[0]!.id,date:new Date('2026-09-21T00:00:00Z'),reason:'Riservato staff'}});
 const response=await app.inject({url:`/public/${tenants[0]!.slug}/availability?date=2026-09-21&party_size=2`});expect(response.statusCode).toBe(200);
 expect(response.json().alternatives.map((a:{date:string})=>a.date)).toEqual(['2026-09-22','2026-09-23']);expect(response.body).not.toContain('Riservato staff');expect(response.body).not.toContain('table_id');
});
test('CRUD autenticato e isolamento sulle route reali',async()=>{
 const created=await app.inject({method:'POST',url:'/reservations',headers:headers(1),payload});expect(created.statusCode).toBe(201);
 const id=created.json().id;
 const own=await app.inject({url:'/reservations?date=2026-09-21',headers:headers(1)});expect(own.json()).toHaveLength(1);
 expect((await app.inject({url:'/reservations?date=2026-09-21',headers:headers()})).json()).toEqual([]);
 for(const method of ['PATCH','DELETE'] as const) expect((await app.inject({method,url:`/reservations/${id}`,headers:headers(),...(method==='PATCH'?{payload:{status:'confirmed'}}:{})})).statusCode).toBe(404);
 expect((await app.inject({method:'PATCH',url:`/reservations/${id}`,headers:headers(1),payload:{status:'completed'}})).statusCode).toBe(409);
 const table=await admin.restaurantTable.findFirstOrThrow({where:{tenant_id:tenants[1]!.id}});
 const confirmed=await app.inject({method:'PATCH',url:`/reservations/${id}`,headers:headers(1),payload:{status:'confirmed',table_id:table.id}});expect(confirmed.statusCode).toBe(200);
 expect((await app.inject({method:'DELETE',url:`/reservations/${id}`,headers:headers(1)})).statusCode).toBe(200);
 expect(await admin.auditLog.count({where:{tenant_id:tenants[1]!.id,entity_id:id,action:'reservation.cancel'}})).toBe(1);
 expect((await app.inject({url:'/reservations?date=2026-09-21'})).statusCode).toBe(401);
});
test('modifica rivalida capienza e tavoli, conserva durata e impedisce riferimenti esterni',async()=>{
 const a=await book();const b=await book(0,{reserved_at:'2026-09-21T12:00:00.000Z'});
 const id=a.json().id;const otherId=b.json().id;
 const otherTable=await admin.restaurantTable.findFirstOrThrow({where:{tenant_id:tenants[1]!.id}});
 expect((await app.inject({method:'PATCH',url:`/reservations/${id}`,headers:headers(),payload:{table_id:otherTable.id}})).statusCode).toBe(409);
 await admin.tenantSettings.update({where:{tenant_id:tenants[0]!.id},data:{total_capacity:2,turn_duration_min:120}});
 expect((await app.inject({method:'PATCH',url:`/reservations/${otherId}`,headers:headers(),payload:{reserved_at:instant}})).statusCode).toBe(409);
 const changed=await app.inject({method:'PATCH',url:`/reservations/${id}`,headers:headers(),payload:{reserved_at:'2026-09-21T14:00:00.000Z'}});expect(changed.statusCode).toBe(200);expect(changed.json().duration_min).toBe(90);
});
test('honeypot, tempo minimo, token falsificato e rate limit pubblici',async()=>{
 const v=await app.inject({url:`/public/${tenants[0]!.slug}`});const token=v.json().form_token;
 const url=`/public/${tenants[0]!.slug}/reservations`;
 expect((await app.inject({method:'POST',url,payload:{...payload,form_token:token}})).statusCode).toBe(400);
 clock=new Date(clock.getTime()+3000);
 expect((await app.inject({method:'POST',url,payload:{...payload,form_token:token,website:'bot'}})).statusCode).toBe(400);
 expect((await app.inject({method:'POST',url,payload:{...payload,form_token:'invalid'}})).statusCode).toBe(400);
 for(let n=0;n<3;n++) {const r=await app.inject({method:'POST',url,payload:{...payload,form_token:'invalid'}});expect(r.statusCode).toBe(n===2?429:400);}
});
test('disdetta oltre termine bloccata e conteggio visite aggiornato una volta',async()=>{
 const created=await book();const id=created.json().id;
 clock=new Date('2026-09-21T09:00:00Z');
 expect((await app.inject({method:'POST',url:`/public/reservations/${created.json().cancel_token}/cancel`})).statusCode).toBe(409);
 // Nuovo login dopo l'avanzamento dell'orologio.
 const auth=await app.inject({method:'POST',url:'/auth/login',payload:{slug:tenants[0]!.slug,email:'owner@test.test',password:'bigant2026'}});access[0]=auth.json().access_token;
 for(const status of ['seated','completed']) expect((await app.inject({method:'PATCH',url:`/reservations/${id}`,headers:headers(),payload:{status}})).statusCode).toBe(200);
 expect((await app.inject({method:'PATCH',url:`/reservations/${id}`,headers:headers(),payload:{status:'completed'}})).statusCode).toBe(409);
 expect((await admin.customer.findFirstOrThrow({where:{tenant_id:tenants[0]!.id}})).total_visits).toBe(1);
});
