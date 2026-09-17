import { afterAll,afterEach,beforeEach,beforeAll,expect,test } from 'vitest';
import { randomBytes,createECDH } from 'node:crypto';
import { admin,secret,fixtures } from './helpers';
import { buildApp } from '../apps/api/src/app';
import { db,disconnectDatabase,reservationTransaction } from '../packages/database/src/index';
import { enqueue,reservationChanged } from '../apps/api/src/notifications/outbox';
import { scheduleReminders,dispatch } from '../apps/api/src/notifications/worker';
import { notificationRuntime,type NotificationRuntime } from '../apps/api/src/notifications/config';
import { DemoChannel,DeliveryError,validPushEndpoint,type Message } from '../apps/api/src/notifications/channels';
import { retention } from '../apps/api/src/privacy';
import { csvCell,calendarPeriod } from '../packages/core/src/index';
import { publicBookingInput } from '../packages/types/src/index';

let ids:string[]=[],tokens:string[]=[],owners:string[]=[],app:ReturnType<typeof buildApp>;
const now=new Date('2026-09-21T10:00:00Z');
let runtime:NotificationRuntime;let password_hash:string;
beforeAll(async()=>{const tenants=await fixtures();password_hash=(await admin.staffUser.findFirstOrThrow({where:{tenant_id:tenants[0]!.id,role:'owner'}})).password_hash;});
beforeEach(async()=>{
 runtime=notificationRuntime({PUBLIC_ORIGIN:'http://localhost:3000'});
 ids=[];owners=[];tokens=[];
 for(let n=0;n<2;n++){
  const tenant=await admin.tenant.create({data:{name:`Locale M5 ${n}`,slug:`m5-${randomBytes(8).toString('hex')}`,type:'restaurant',plan:'full'}});ids.push(tenant.id);
  const owner=await admin.staffUser.create({data:{tenant_id:tenant.id,email:`owner${n}@m5.test`,full_name:'Titolare M5',password_hash,role:'owner'}});owners.push(owner.id);
  await admin.tenantSettings.create({data:{tenant_id:tenant.id,min_lead_time_min:0,sms_enabled:true,sms_monthly_cap:1,auto_confirm:false}});
  await admin.openingHours.createMany({data:Array.from({length:7},(_,weekday)=>({tenant_id:tenant.id,weekday,start_time:new Date('1970-01-01T12:00:00Z'),end_time:new Date('1970-01-01T23:00:00Z')}))});
 }
 app=buildApp({secret,now:()=>now,notifications:runtime});
 for(let n=0;n<2;n++){const tenant=await admin.tenant.findUniqueOrThrow({where:{id:ids[n]!}});const auth=await app.inject({method:'POST',url:'/auth/login',payload:{slug:tenant.slug,email:`owner${n}@m5.test`,password:'bigant2026'}});expect(auth.statusCode).toBe(200);tokens.push(auth.json<{access_token:string}>().access_token);}
});
afterEach(async()=>{await app.close();await admin.tenant.deleteMany({where:{id:{in:ids}}});});
afterAll(async()=>{await admin.$disconnect();await disconnectDatabase();});
const headers=(n=0)=>({authorization:`Bearer ${tokens[n]}`});
async function booking(n=0,index=0){
 const customer=await admin.customer.create({data:{tenant_id:ids[n]!,full_name:`Ospite ${index}`,email:`ospite${n}-${index}@m5.test`,phone_e164:`+39333${n}2345${String(index).padStart(2,'0')}`}});
 const reservation=await admin.reservation.create({data:{tenant_id:ids[n]!,customer_id:customer.id,reserved_at:new Date('2026-09-21T12:00:00Z'),party_size:2,duration_min:90,status:'confirmed',source:'direct',cancel_token:randomBytes(32).toString('hex')}});
 return {customer,reservation};
}
test('doppio scheduler e due worker paralleli producono una sola consegna del promemoria',async()=>{
 const {reservation}=await booking();let calls=0;
 runtime.channels.sms={send:async(_message,key)=>{calls++;expect((await admin.notificationLog.findUniqueOrThrow({where:{id:key}})).status).toBe('processing');return {status:'sent',providerId:'test-accepted'};}};
 await Promise.all([scheduleReminders(ids[0]!,now),scheduleReminders(ids[0]!,now)]);
 await Promise.all([dispatch(ids[0]!,runtime,now),dispatch(ids[0]!,runtime,now)]);
 await dispatch(ids[0]!,runtime,now);
 expect(calls).toBe(1);expect(await admin.notificationLog.count({where:{reservation_id:reservation.id}})).toBe(1);
});
test('tetto SMS atomico in concorrenza, email di fallback e segnalazione nel pannello',async()=>{
 await booking(0,1);await booking(0,2);let sms=0,email=0;
 runtime.channels.sms={send:async()=>{sms++;return {status:'sent',providerId:'test-sms'};}};
 runtime.channels.email={send:async()=>{email++;return {status:'sent',providerId:'test-email'};}};
 await scheduleReminders(ids[0]!,now);await Promise.all([dispatch(ids[0]!,runtime,now),dispatch(ids[0]!,runtime,now)]);
 expect(sms).toBe(1);expect(email).toBe(1);
 const summary=await app.inject({url:'/notifications/summary',headers:headers()});expect(summary.statusCode).toBe(200);expect(summary.json()).toMatchObject({sms_used:1,sms_cap:1,sms_fallbacks:1,mode:'demo'});
 expect((await app.inject({url:'/notifications',headers:headers()})).body).not.toContain('ospite');
});
test('attesa e conferma sono eventi diversi; fallback non duplica l’email di conferma',async()=>{
 const payload={full_name:'Ospite telefono',phone:'3331234567',email:'ospite@m5.test',party_size:2,reserved_at:'2026-09-21T12:00:00Z',locale:'en'};
 const created=await app.inject({method:'POST',url:'/reservations',headers:headers(),payload});expect(created.statusCode).toBe(201);const id=created.json<{id:string}>().id;
 expect((await admin.notificationLog.findFirstOrThrow({where:{reservation_id:id}})).event_name).toBe('pending');
 const patch=await app.inject({method:'PATCH',url:`/reservations/${id}`,headers:headers(),payload:{status:'confirmed'}});expect(patch.statusCode).toBe(200);
 await admin.tenantSettings.update({where:{tenant_id:ids[0]!},data:{sms_monthly_cap:0}});
 const messages:Message[]=[];runtime.channels.email={send:async(message)=>{messages.push(message);return {status:'sent',providerId:'test-email'};}};
 await dispatch(ids[0]!,runtime,now);
 expect(messages).toHaveLength(1);expect(messages[0]!.subject).toBe('The venue has confirmed');
 expect(await admin.notificationLog.count({where:{reservation_id:id,event_name:'confirmed',channel:'email'}})).toBe(1);
 expect((await admin.notificationLog.findFirstOrThrow({where:{reservation_id:id,event_name:'confirmed',channel:'email'}})).fallback).toBe(true);
});
test('timeout e riavvio durante un invio diventano incerti senza reinvio cieco',async()=>{
 const {reservation,customer}=await booking();let calls=0;
 await reservationTransaction(ids[0]!,tx=>enqueue(tx,ids[0]!,'uncertain-test','reminder','email',customer.email!,{reservationId:reservation.id,reservedAt:reservation.reserved_at}));
 runtime.channels.email={send:async()=>{calls++;throw new DeliveryError('uncertain','PROVIDER_TIMEOUT');}};
 await dispatch(ids[0]!,runtime,now);await dispatch(ids[0]!,runtime,new Date(now.getTime()+30*60000));expect(calls).toBe(1);
 expect((await admin.notificationLog.findFirstOrThrow({where:{event_key:'uncertain-test'}})).status).toBe('uncertain');
 await admin.notificationLog.create({data:{tenant_id:ids[0]!,event_key:'interrupted',event_name:'created',type:'confirmation',channel:'email',recipient:customer.email!,status:'processing',attempted_at:new Date(now.getTime()-30*60000)}});
 await dispatch(ids[0]!,runtime,now);expect(calls).toBe(1);expect((await admin.notificationLog.findFirstOrThrow({where:{event_key:'interrupted'}})).status).toBe('uncertain');
});
test('rifiuto 429 riprovato con lo stesso ID; disdetta rende obsoleto il promemoria',async()=>{
 const {reservation}=await booking();await admin.tenantSettings.update({where:{tenant_id:ids[0]!},data:{sms_enabled:false}});await scheduleReminders(ids[0]!,now);
 const keys:string[]=[];runtime.channels.email={send:async(_message,key)=>{keys.push(key);if(keys.length===1)throw new DeliveryError('retry','PROVIDER_THROTTLED');return {status:'sent',providerId:'test'};}};
 await dispatch(ids[0]!,runtime,now);await dispatch(ids[0]!,runtime,new Date(now.getTime()+5*60000));expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);
 await admin.reservation.update({where:{id:reservation.id},data:{reserved_at:new Date('2026-09-21T13:00:00Z')}});await scheduleReminders(ids[0]!,now);
 await reservationTransaction(ids[0]!,async tx=>{const row=await tx.reservation.update({where:{id:reservation.id},data:{status:'cancelled'}});await reservationChanged(tx,ids[0]!,row,'confirmed','customer');});
 await dispatch(ids[0]!,runtime,now);expect(keys.length).toBe(3); // Una sola email staff per la disdetta, nessun nuovo promemoria.
 expect(await admin.notificationLog.count({where:{reservation_id:reservation.id,event_name:'reminder',status:'skipped'}})).toBe(1);
});
test('privacy obbligatoria, marketing separato e informativa dedicata; nessun consenso inventato dallo staff',async()=>{
 const tenant=await admin.tenant.findUniqueOrThrow({where:{id:ids[0]!}});
 const data={full_name:'Ospite pubblico',phone:'3331234567',email:'ospite@m5.test',party_size:2,reserved_at:'2026-09-21T12:00:00Z',form_token:'signed-token'};
 expect(publicBookingInput.safeParse(data).success).toBe(false);expect(publicBookingInput.parse({...data,privacy_accepted:true}).marketing_consent).toBe(false);
 const privacy=await app.inject({url:`/public/${tenant.slug}/privacy`});expect(privacy.statusCode).toBe(200);expect(privacy.json()).toMatchObject({name:tenant.name,retention_months:24});expect(privacy.body).not.toContain('owner0');
 const form=await app.inject({url:`/public/${tenant.slug}`});
 await app.close();app=buildApp({secret,now:()=>new Date(now.getTime()+3000),notifications:runtime});
 const publicResult=await app.inject({method:'POST',url:`/public/${tenant.slug}/reservations`,payload:{...data,form_token:form.json().form_token,privacy_accepted:true,marketing_consent:true}});
 expect(publicResult.statusCode).toBe(201);
 const consent=await admin.customer.findFirstOrThrow({where:{tenant_id:ids[0]!,phone_e164:'+393331234567'}});
 expect(consent.marketing_consent).toBe(true);expect(consent.marketing_consent_at).toEqual(new Date(now.getTime()+3000));
 expect((await admin.reservation.findUniqueOrThrow({where:{id:publicResult.json().id}})).privacy_accepted_at).toEqual(consent.marketing_consent_at);
 const {customer}=await booking();expect((await app.inject({method:'PATCH',url:`/customers/${customer.id}`,headers:headers(),payload:{marketing_consent:true}})).statusCode).toBe(400);
});
test('export CSV senza formule o dati sanitari, audit e isolamento di ogni percorso nuovo',async()=>{
 const {customer}=await booking();const other=await booking(1);
 await admin.customer.update({where:{id:customer.id},data:{full_name:'=HYPERLINK("https://example.test")',allergies:'Dato sanitario segreto',notes:'Nota sanitaria segreta'}});
 const csv=await app.inject({url:'/customers/export',headers:headers()});expect(csv.statusCode).toBe(200);expect(csv.headers['content-type']).toContain('text/csv');expect(csv.body).toContain("'=HYPERLINK");expect(csv.body).not.toContain('segreto');expect(csv.body).not.toContain(other.customer.email);
 expect(await admin.auditLog.count({where:{tenant_id:ids[0]!,action:'customer.export'}})).toBe(1);
 for(const method of ['GET','PATCH','DELETE'] as const){const result=await app.inject({method,url:`/customers/${other.customer.id}`,headers:headers(),...(method==='PATCH'?{payload:{notes:'no'}}:{})});expect(result.statusCode).toBe(404);}
 const searched=await app.inject({method:'POST',url:'/customers/search',headers:headers(),payload:{q:other.customer.phone_e164}});expect(searched.json().items).toEqual([]);
 expect((await app.inject({url:'/customers?q=personal',headers:headers()})).statusCode).toBe(400);
 for(const url of ['/notifications','/notifications/settings','/notifications/summary','/push/config','/customers'])expect((await app.inject({url})).statusCode).toBe(401);
 expect(csvCell('"ciao,\nmondo"')).toBe('"""ciao,\nmondo"""');
});
test('anonimizzazione idempotente conserva storico e conteggi, rimuove testo libero e messaggi in coda',async()=>{
 const {customer,reservation}=await booking();await admin.customer.update({where:{id:customer.id},data:{allergies:'Allergia',notes:'Nota',total_visits:3,marketing_consent:true,marketing_consent_at:now}});
 await admin.reservation.update({where:{id:reservation.id},data:{notes:'Allergia',internal_notes:'Telefono'}});await admin.review.create({data:{tenant_id:ids[0]!,customer_id:customer.id,channel:'private',rating:2,comment:'Telefono',staff_response:'Nome'}});await scheduleReminders(ids[0]!,now);
 for(let n=0;n<2;n++)expect((await app.inject({method:'DELETE',url:`/customers/${customer.id}`,headers:headers()})).statusCode).toBe(200);
 const row=await admin.customer.findUniqueOrThrow({where:{id:customer.id}});expect(row).toMatchObject({phone_e164:null,email:null,notes:'',allergies:null,total_visits:3,marketing_consent:false,marketing_consent_at:null});expect(row.anonymized_at).toEqual(now);
 const history=await admin.reservation.findUniqueOrThrow({where:{id:reservation.id}});expect(history).toMatchObject({customer_id:customer.id,party_size:2,status:'confirmed',notes:'',internal_notes:''});expect(history.cancel_token).not.toBe(reservation.cancel_token);
 expect((await admin.review.findFirstOrThrow({where:{tenant_id:ids[0]!}}))).toMatchObject({customer_id:null,comment:null,staff_response:null,rating:2});
 const log=await admin.notificationLog.findFirstOrThrow({where:{reservation_id:reservation.id}});expect(log).toMatchObject({recipient:'',status:'skipped'});
 expect(await admin.auditLog.count({where:{entity_id:customer.id,action:'customer.anonymize'}})).toBe(1);
 expect((await app.inject({url:`/public/reservations/${reservation.cancel_token}`})).statusCode).toBe(404);
});
test('retention mensile persistente rispetta nuove prenotazioni, clienti recenti e tenant',async()=>{
 const stale=await booking(),active=await booking(0,1),other=await booking(1);
 for(const customer of [stale.customer,active.customer,other.customer])await admin.customer.update({where:{id:customer.id},data:{created_at:new Date('2020-01-01T00:00:00Z')}});
 await admin.reservation.update({where:{id:stale.reservation.id},data:{reserved_at:new Date('2020-02-01T00:00:00Z'),status:'completed'}});
 expect(await retention(ids[0]!,now)).toBe(1);expect(await retention(ids[0]!,now)).toBe(0);
 expect((await admin.customer.findUniqueOrThrow({where:{id:active.customer.id}})).anonymized_at).toBeNull();expect((await admin.customer.findUniqueOrThrow({where:{id:other.customer.id}})).anonymized_at).toBeNull();
 expect((await admin.auditLog.findFirstOrThrow({where:{tenant_id:ids[0]!,action:'retention.month'}})).staff_user_id).toBeNull();
 const month=calendarPeriod(new Date('2026-10-01T00:00:00Z'),'Europe/Rome');expect(month.start.toISOString()).toBe('2026-09-30T22:00:00.000Z');
});
test('adattatori demo mai sent, endpoint push privati respinti e invii live bloccati senza verifica',async()=>{
 const result=await new DemoChannel().send({recipient:'x',subject:'x',text:'x',url:'x'},'stable');expect(result.status).toBe('simulated');
 for(const url of ['http://fcm.googleapis.com/a','https://127.0.0.1/a','https://fcm.googleapis.com.evil.test/a','https://user@web.push.apple.com/a','https://web.push.apple.com:8443/a'])expect(validPushEndpoint(url)).toBe(false);
 expect(validPushEndpoint('https://web.push.apple.com/Q')).toBe(true);
 expect(()=>notificationRuntime({NOTIFICATION_MODE:'live',PUBLIC_ORIGIN:'https://example.test'})).toThrow();
 expect((await app.inject({method:'POST',url:'/push/subscriptions',headers:headers(),payload:{endpoint:'https://127.0.0.1/a',keys:{p256dh:'x',auth:'x'}}})).statusCode).toBe(400);
 await expect(db.notificationLog.findMany()).rejects.toThrow();await expect(db.pushSubscription.findMany()).rejects.toThrow();
});
test('abbonamenti push dello staff isolati, disattivabili, e payload privato senza recapiti o commento',async()=>{
 const ecdh=createECDH('prime256v1');ecdh.generateKeys();const keys={p256dh:ecdh.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')};
 runtime.publicVapidKey=keys.p256dh;
 const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/m5-test',keys};
 const registered=await app.inject({method:'POST',url:'/push/subscriptions',headers:headers(),payload:subscription});expect(registered.statusCode).toBe(200);
 const other=await app.inject({method:'DELETE',url:'/push/subscriptions',headers:headers(1),payload:{endpoint:subscription.endpoint}});expect(other.statusCode).toBe(200);
 expect((await admin.pushSubscription.findUniqueOrThrow({where:{id:registered.json().id}})).active).toBe(true);
 const venue=await admin.tenant.findUniqueOrThrow({where:{id:ids[0]!}});const privateReview=await app.inject({method:'POST',url:`/public/${venue.slug}/reviews`,payload:{channel:'private',rating:5,comment:'Commento riservato, telefono 3331234567'}});expect(privateReview.statusCode).toBe(201);
 const messages:Message[]=[];runtime.channels.push={send:async(message)=>{messages.push(message);return {status:'sent',providerId:'push-test'};}};
 await dispatch(ids[0]!,runtime,now);expect(messages).toHaveLength(1);expect(messages[0]!.text).not.toMatch(/333|Commento|owner|Ospite/);expect(messages[0]!.url).toBe(`http://localhost:3000/r/${venue.slug}/staff?view=reviews`);
 expect((await app.inject({url:'/notifications',headers:headers(1)})).json()).toEqual([]);
 const newOwner=await admin.staffUser.create({data:{tenant_id:ids[0]!,role:'owner',email:'second-owner@m5.test',full_name:'Secondo titolare',password_hash}});
 const login=await app.inject({method:'POST',url:'/auth/login',payload:{slug:venue.slug,email:newOwner.email,password:'bigant2026'}});const nextHeaders={authorization:`Bearer ${login.json().access_token}`};
 expect((await app.inject({method:'POST',url:'/push/subscriptions',headers:nextHeaders,payload:subscription})).statusCode).toBe(200);
 expect((await app.inject({method:'POST',url:'/push/subscriptions/status',headers:headers(),payload:{endpoint:subscription.endpoint}})).json()).toEqual({active:false});
 expect((await app.inject({method:'POST',url:'/push/subscriptions/status',headers:nextHeaders,payload:{endpoint:subscription.endpoint}})).json()).toEqual({active:true});
 expect((await app.inject({method:'DELETE',url:'/push/subscriptions',headers:headers(),payload:{endpoint:subscription.endpoint}})).statusCode).toBe(200);expect(await admin.pushSubscription.count({where:{tenant_id:ids[0]!,active:true}})).toBe(1);
 expect((await app.inject({method:'DELETE',url:'/push/subscriptions',headers:nextHeaders,payload:{endpoint:subscription.endpoint}})).statusCode).toBe(200);expect(await admin.pushSubscription.count({where:{tenant_id:ids[0]!}})).toBe(0);
});
