import { afterAll,afterEach,beforeAll,beforeEach,expect,test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { admin,fixtures,secret } from './helpers';
import { buildApp } from '../apps/api/src/app';
import { disconnectDatabase } from '../packages/database/src/index';
let hash:string;let app:ReturnType<typeof buildApp>;let ids:string[];let tokens:string[];
beforeAll(async()=>{await fixtures();hash=(await admin.staffUser.findFirstOrThrow({where:{email:'owner@santalucia.test'}})).password_hash;});
beforeEach(async()=>{
 app=buildApp({secret});ids=[];tokens=[];
 for(const role of ['owner','owner','staff'] as const){
  const slug=`settings-${randomUUID()}`;const tenant=await admin.tenant.create({data:{slug,name:'Locale impostazioni',type:'restaurant',tenantSettings:{create:{}},staffUser:{create:{email:'settings@example.test',password_hash:hash,full_name:'Staff test',role}}}});ids.push(tenant.id);
  const auth=await app.inject({method:'POST',url:'/auth/login',payload:{slug,email:'settings@example.test',password:'bigant2026'}});expect(auth.statusCode).toBe(200);tokens.push(auth.json().access_token);
 }
});
afterEach(async()=>{await app.close();await admin.tenant.deleteMany({where:{id:{in:ids}}});});
afterAll(async()=>{await admin.$disconnect();await disconnectDatabase();});
const headers=(i=0)=>({authorization:`Bearer ${tokens[i]}`});
const settings={total_capacity:30,max_covers_per_slot:10,turn_duration_min:90,slot_granularity_min:15,min_lead_time_min:30,max_advance_days:30,cancellation_deadline_hours:2,auto_confirm:false,auto_assign_tables:true};
const table={name:'Tavolo test',zone:'Sala',min_capacity:1,max_capacity:4,active:true};
test('profilo e letture richiedono sessione; impostazioni isolate e solo owner',async()=>{
 for(const url of ['/auth/me','/settings','/opening-hours','/blackouts','/tables'])expect((await app.inject({url})).statusCode).toBe(401);
 const me=await app.inject({url:'/auth/me',headers:headers()});expect(me.json().tenant.id).toBe(ids[0]);expect(me.body).not.toContain('password');
 expect((await app.inject({method:'PATCH',url:'/settings',headers:headers(),payload:settings})).statusCode).toBe(200);
 expect((await app.inject({url:'/settings',headers:headers()})).json().total_capacity).toBe(30);
 expect((await app.inject({url:'/settings',headers:headers(1)})).json().total_capacity).toBe(40);
 expect((await app.inject({method:'PATCH',url:'/settings',headers:headers(2),payload:settings})).statusCode).toBe(403);
 expect((await app.inject({method:'PATCH',url:'/settings',headers:headers(),payload:{...settings,total_capacity:0}})).statusCode).toBe(400);
 expect(await admin.auditLog.count({where:{tenant_id:ids[0],action:'settings.update'}})).toBe(1);
});
test('orari transazionali: validazione sovrapposizioni e confine tenant',async()=>{
 const hours=[{weekday:1,start_time:'19:00',end_time:'02:00',capacity_override:null,label:'Sera'}];
 expect((await app.inject({method:'PUT',url:'/opening-hours',headers:headers(),payload:hours})).statusCode).toBe(200);
 expect((await app.inject({url:'/opening-hours',headers:headers(1)})).json()).toEqual([]);
 expect((await app.inject({method:'PUT',url:'/opening-hours',headers:headers(),payload:[...hours,{...hours[0],weekday:2,start_time:'01:00',end_time:'03:00'}]})).statusCode).toBe(400);
 expect((await app.inject({url:'/opening-hours',headers:headers()})).json()).toHaveLength(1);
 expect((await app.inject({method:'PUT',url:'/opening-hours',headers:headers(2),payload:[]})).statusCode).toBe(403);
});
test('tavoli e chiusure: ID esterni non modificabili, staff di sala in sola lettura',async()=>{
 const created=await app.inject({method:'POST',url:'/tables',headers:headers(),payload:table});expect(created.statusCode).toBe(200);const id=created.json().id;
 expect((await app.inject({method:'PATCH',url:`/tables/${id}`,headers:headers(1),payload:table})).statusCode).toBe(404);
 expect((await app.inject({url:'/tables',headers:headers(1)})).json()).toEqual([]);
 expect((await app.inject({method:'POST',url:'/tables',headers:headers(2),payload:table})).statusCode).toBe(403);
 expect((await app.inject({method:'PATCH',url:`/tables/${id}`,headers:headers(),payload:{...table,active:false}})).json().active).toBe(false);
 const blackout=await app.inject({method:'POST',url:'/blackouts',headers:headers(),payload:{date:'2026-12-20',start_time:null,end_time:null,reason:'Chiuso'}});expect(blackout.statusCode).toBe(200);
 expect((await app.inject({url:'/blackouts',headers:headers(1)})).json()).toEqual([]);
 expect((await app.inject({method:'DELETE',url:`/blackouts/${blackout.json().id}`,headers:headers(1)})).statusCode).toBe(404);
 expect((await app.inject({method:'POST',url:'/blackouts',headers:headers(2),payload:{date:'2026-12-20'}})).statusCode).toBe(403);
 expect((await app.inject({method:'DELETE',url:`/blackouts/${blackout.json().id}`,headers:headers()})).statusCode).toBe(200);
});
