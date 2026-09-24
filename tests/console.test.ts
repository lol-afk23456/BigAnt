import {beforeAll,afterAll,expect,test} from 'vitest';
import argon2 from '../packages/database/node_modules/argon2/argon2.cjs';
import {randomBytes,createHash} from 'node:crypto';
import {admin,fixtures,loggedApp,login} from './helpers';
import {consoleSearch,consoleCreate,withConsoleSession,disconnectConsole} from '../packages/database/src/console';
import {consoleCreateInput,type ConsoleAccessResult,type ConsoleDetail} from '../packages/types/src';

const password='admin-test-password-2026';
const email='console-suite@bigant.test';
const now=new Date('2026-09-24T10:00:00Z');
let adminId:string;let venueId:string;let otherId:string;const created:string[]=[];
const app=loggedApp(()=>now);let cookie='';
const headers=()=>({cookie,'x-bigant-console':'1'});
const request=(method:'POST'|'PATCH'|'GET',url:string,payload?:unknown)=>app.inject({method,url,headers:headers(),...(payload===undefined?{}:{payload:payload as Record<string,unknown>})});
beforeAll(async()=>{
 const venues=await fixtures();venueId=venues[0]!.id;otherId=venues[1]!.id;
 const a=await admin.platformAdmin.create({data:{email,full_name:'Console test',password_hash:await argon2.hash(password)}});adminId=a.id;
 const signed=await app.inject({method:'POST',url:'/console/login',headers:{'x-bigant-console':'1'},payload:{email,password}});expect(signed.statusCode).toBe(200);
 const set=signed.headers['set-cookie'] as string;expect(set).toContain('HttpOnly');expect(set).toContain('Secure');expect(set).toContain('SameSite=Strict');expect(set).toContain('Path=/api/console');cookie=set.split(';')[0]!;
});
afterAll(async()=>{
 await admin.tenant.deleteMany({where:{id:{in:created}}});
 await admin.platformAccessLink.deleteMany({where:{admin_id:adminId}});await admin.platformAudit.deleteMany({where:{admin_id:adminId}});await admin.platformAdmin.deleteMany({where:{id:adminId}});
 await app.close();await disconnectConsole();await admin.$disconnect();
});
test('confine amministrativo: niente bearer staff, niente form cross-site, niente query senza sessione',async()=>{
 expect((await app.inject({url:'/console/overview'})).statusCode).toBe(401);
 const staff=await login(app);expect((await app.inject({url:'/console/overview',headers:{authorization:`Bearer ${staff.json().access_token}`}})).statusCode).toBe(401);
 expect((await app.inject({method:'POST',url:'/console/search',headers:{cookie},payload:{}})).statusCode).toBe(401);
 expect((await app.inject({method:'POST',url:'/console/search',headers:{...headers(),'sec-fetch-site':'cross-site'},payload:{}})).statusCode).toBe(401);
 await expect(consoleSearch({q:'',page:1})).rejects.toMatchObject({code:'UNAUTHORIZED'});
 await expect(withConsoleSession('0'.repeat(64),now,()=>consoleSearch({q:'',page:1}))).rejects.toMatchObject({code:'UNAUTHORIZED'});
 expect((await request('GET','/console/me')).json()).toMatchObject({email,full_name:'Console test'});
});
test('ricerca e dettaglio espongono conteggi e operatori, non ospiti, password o token',async()=>{
 const search=await request('POST','/console/search',{q:'Santa',page:1});expect(search.statusCode).toBe(200);expect(search.json().items).toHaveLength(1);
 const detail=await request('GET',`/console/tenants/${venueId}`);expect(detail.statusCode).toBe(200);
 const body=detail.json<ConsoleDetail>();expect(body.counts.customers).toBeGreaterThan(0);expect(body.staff[0]).toHaveProperty('email');expect(body.checks.map(c=>c.key)).toContain('auto_assignment');
 expect(detail.body).not.toMatch(/password_hash|refresh_hash|cancel_token|phone_e164|internal_notes/);
 const guest=await admin.customer.findFirstOrThrow({where:{tenant_id:venueId}});expect(detail.body).not.toContain(guest.full_name);
 expect((await request('GET','/console/tenants/not-a-uuid')).statusCode).toBe(400);
});
test('creazione atomica, attivazione monouso e sospensione effettiva conservano i dati',async()=>{
 const input={name:'Cliente Console',slug:'console-suite-venue',type:'restaurant',locale_default:'it',address:null,phone:null,google_place_id:null,owner_name:'Titolare Console',owner_email:'owner@console-suite.test',plan:'trial'};
 await expect(consoleCreate(consoleCreateInput.parse(input))).rejects.toMatchObject({code:'UNAUTHORIZED'});
 const result=await request('POST','/console/tenants',input);expect(result.statusCode).toBe(201);
 const {id,access}=result.json<{id:string;access:ConsoleAccessResult}>();created.push(id);
 const d=(await request('GET',`/console/tenants/${id}`)).json<ConsoleDetail>();expect(d.settings.auto_confirm&&d.settings.auto_assign_tables).toBe(true);expect(d.counts.tables).toBe(0);
 expect((await request('POST','/console/tenants',input)).statusCode).toBe(409);expect(await admin.tenant.count({where:{slug:input.slug}})).toBe(1);
 const row=await admin.platformAccessLink.findFirstOrThrow({where:{tenant_id:id}});expect(row.token_hash).not.toBe(access.token);expect(row.token_hash).toBe(createHash('sha256').update(access.token).digest('hex'));
 const activate=()=>request('POST','/access/activate',{token:access.token,password:'owner-test-password-2026'});
 const both=await Promise.all([activate(),activate()]);expect(both.map(r=>r.statusCode).sort()).toEqual([200,400]);
 const staff=await request('POST','/auth/login',{slug:input.slug,email:input.owner_email,password:'owner-test-password-2026'});expect(staff.statusCode).toBe(200);
 const auth={authorization:`Bearer ${staff.json().access_token}`};expect((await app.inject({url:'/test/session',headers:auth})).statusCode).toBe(200);
 const before=await admin.staffUser.findMany({where:{tenant_id:id}});
 const [suspended,racingLogin]=await Promise.all([
  request('PATCH',`/console/tenants/${id}/status`,{status:'suspended',reason:'Pausa richiesta dal cliente'}),
  request('POST','/auth/login',{slug:input.slug,email:input.owner_email,password:'owner-test-password-2026'}),
 ]);expect(suspended.statusCode).toBe(200);expect([200,401]).toContain(racingLogin.statusCode);
 expect((await app.inject({url:'/test/session',headers:auth})).statusCode).toBe(401);
 expect((await app.inject({url:`/public/${input.slug}`})).statusCode).toBe(404);
 expect(await admin.staffUser.findMany({where:{tenant_id:id}})).toEqual(before);
 expect((await request('PATCH',`/console/tenants/${id}/status`,{status:'active',reason:'Riapertura richiesta'})).statusCode).toBe(200);
 expect((await app.inject({url:'/test/session',headers:auth})).statusCode).toBe(401);
 if(racingLogin.statusCode===200)expect((await app.inject({url:'/test/session',headers:{authorization:`Bearer ${racingLogin.json().access_token}`}})).statusCode).toBe(401);
 expect((await request('POST','/auth/login',{slug:input.slug,email:input.owner_email,password:'owner-test-password-2026'})).statusCode).toBe(200);
});
test('piani, centesimi, scadenze e SMS rispettano validazione e revoca delle opzioni',async()=>{
 const id=created[0]!;
 const account={plan:'pro',contact_name:'Referente',contact_email:'contact@example.test',monthly_fee_cents:7900,trial_ends_at:null,renewal_at:'2026-10-01',notes:'Contratto pilota'};
 expect((await request('PATCH',`/console/tenants/${id}/account`,{...account,monthly_fee_cents:79.5})).statusCode).toBe(400);
 expect((await request('PATCH',`/console/tenants/${id}/account`,account)).statusCode).toBe(200);
 const d=(await request('GET',`/console/tenants/${id}`)).json<ConsoleDetail>();
 const {auto_confirm,auto_assign_tables,slot_granularity_min,turn_duration_min,max_covers_per_slot,total_capacity,min_lead_time_min,max_advance_days,cancellation_deadline_hours}=d.settings;
 const services={booking:{auto_confirm,auto_assign_tables,slot_granularity_min,turn_duration_min,max_covers_per_slot,total_capacity,min_lead_time_min,max_advance_days,cancellation_deadline_hours},notifications:{sms_enabled:true,sms_monthly_cap:75,reminder_hours_before:4,retention_months:24,privacy_contact_email:'privacy@example.test'}};
 expect((await request('PATCH',`/console/tenants/${id}/services`,services)).statusCode).toBe(200);
 const overview=(await request('GET','/console/overview')).json();expect(overview.mrr_cents).toBeGreaterThanOrEqual(7900);expect(overview.due).toContainEqual(expect.objectContaining({id,date:'2026-10-01',kind:'renewal'}));
 expect((await request('PATCH',`/console/tenants/${id}/account`,{...account,plan:'base'})).statusCode).toBe(200);
 expect((await admin.tenantSettings.findUniqueOrThrow({where:{tenant_id:id}})).sms_enabled).toBe(false);
 expect((await request('PATCH',`/console/tenants/${id}/services`,services)).statusCode).toBe(400);
});
test('operatori: ultimo titolare protetto, ID estranei rifiutati, link precedenti invalidati',async()=>{
 const id=created[0]!;const owner=await admin.staffUser.findFirstOrThrow({where:{tenant_id:id,role:'owner'}});
 expect((await request('PATCH',`/console/tenants/${id}/staff/${owner.id}`,{role:'staff',status:'active'})).json().error.code).toBe('LAST_OWNER');
 const other=await admin.staffUser.findFirstOrThrow({where:{tenant_id:otherId}});
 expect((await request('POST',`/console/tenants/${id}/staff/${other.id}/access-link`,{})).statusCode).toBe(404);
 const added=await request('POST',`/console/tenants/${id}/staff`,{email:'second@console-suite.test',full_name:'Secondo titolare',role:'owner'});expect(added.statusCode).toBe(201);
 const second=await admin.staffUser.findFirstOrThrow({where:{tenant_id:id,email:'second@console-suite.test'}});
 const fresh=await request('POST',`/console/tenants/${id}/staff/${second.id}/access-link`,{});expect(fresh.statusCode).toBe(200);
 expect((await request('POST','/access/activate',{token:added.json().token,password})).statusCode).toBe(400);
 const concurrency=await Promise.all([owner,second].map(s=>request('PATCH',`/console/tenants/${id}/staff/${s.id}`,{role:'owner',status:'disabled'})));
 expect(concurrency.map(r=>r.statusCode).sort()).toEqual([200,409]);expect(await admin.staffUser.count({where:{tenant_id:id,role:'owner',status:'active'}})).toBe(1);
 const audits=(await request('POST','/console/audit',{tenant_id:id,page:1})).json();expect(audits.items.some((r:{action:string})=>r.action==='staff.updated')).toBe(true);expect(JSON.stringify(audits)).not.toContain(fresh.json().token);
});
test('sessione revocata/scaduta e cambio password chiudono ogni accesso amministrativo',async()=>{
 const raw=randomBytes(32).toString('hex');await admin.platformSession.create({data:{admin_id:adminId,token_hash:createHash('sha256').update(raw).digest('hex'),expires_at:new Date(now.getTime()-1)}});
 expect((await app.inject({url:'/console/me',headers:{cookie:`__Secure-bigant_console=${raw}`}})).statusCode).toBe(401);
 const changed=await request('POST','/console/password',{current_password:password,password:'updated-admin-password-2026'});expect(changed.statusCode).toBe(204);
 expect((await request('GET','/console/me')).statusCode).toBe(401);
 expect(await admin.platformSession.count({where:{admin_id:adminId,revoked_at:null}})).toBe(0);
 const sign=await request('POST','/console/login',{email,password:'updated-admin-password-2026'});expect(sign.statusCode).toBe(200);cookie=(sign.headers['set-cookie'] as string).split(';')[0]!;
 expect((await request('POST','/console/logout',{})).statusCode).toBe(204);expect((await request('GET','/console/me')).statusCode).toBe(401);
});
