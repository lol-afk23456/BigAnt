import { createHash } from 'node:crypto';
import { db,reservationTransaction } from '@bigant/database';
import { calendarPeriod,DomainError } from '@bigant/core';
import { notificationSettingsInput,pushInput } from '@bigant/types';
import type { FastifyInstance } from 'fastify';
import { withStaff } from '../staff.js';
import type { NotificationRuntime } from './config.js';
import { validPushEndpoint } from './channels.js';
export function notificationRoutes(app:FastifyInstance,runtime:NotificationRuntime,now:()=>Date) {
 const config={rateLimit:false as const};
 const fields={sms_enabled:true,sms_monthly_cap:true,reminder_hours_before:true,retention_months:true,privacy_contact_email:true} as const;
 app.get('/notifications/settings',{config},request=>withStaff(app,request,async()=>db.tenantSettings.findFirstOrThrow({select:fields})));
 app.patch('/notifications/settings',{config},request=>withStaff(app,request,async claims=>{
  if(claims.role!=='owner')throw new DomainError('FORBIDDEN',403);
  const data=notificationSettingsInput.parse(request.body);
  return reservationTransaction(claims.tenant_id,async tx=>{
   const tenant=await tx.tenant.findFirstOrThrow();if(data.sms_enabled&&!['pro','full'].includes(tenant.plan))throw new DomainError('FORBIDDEN',403);
   const result=await tx.tenantSettings.update({where:{tenant_id:claims.tenant_id},data,select:fields});
   await tx.auditLog.create({data:{tenant_id:claims.tenant_id,staff_user_id:claims.sub,action:'notifications.settings',entity_type:'TenantSettings',entity_id:claims.tenant_id}});return result;
  });
 }));
 app.get('/notifications/summary',{config},request=>withStaff(app,request,async()=>{
  const tenant=await db.tenant.findFirstOrThrow();const settings=await db.tenantSettings.findFirstOrThrow();const month=calendarPeriod(now(),tenant.timezone);
  const [used,fallbacks,queued,failed,uncertain,simulated,accepted]=await Promise.all([
   db.notificationLog.count({where:{channel:'sms',status:{in:['processing','sent','uncertain','simulated']},attempted_at:{gte:month.start,lt:month.end}}}),
   db.notificationLog.count({where:{channel:'email',fallback:true,created_at:{gte:month.start,lt:month.end}}}),
   db.notificationLog.count({where:{status:{in:['queued','processing']}}}),db.notificationLog.count({where:{status:'failed'}}),db.notificationLog.count({where:{status:'uncertain'}}),db.notificationLog.count({where:{status:'simulated'}}),db.notificationLog.count({where:{status:'sent'}}),
  ]);
  return {mode:runtime.mode,sms_used:used,sms_cap:settings.sms_monthly_cap,sms_fallbacks:fallbacks,queued,failed,uncertain,simulated,accepted,push_configured:!!runtime.publicVapidKey};
 }));
 app.get('/notifications',{config},request=>withStaff(app,request,async()=>db.notificationLog.findMany({select:{id:true,channel:true,event_name:true,status:true,attempts:true,created_at:true,fallback:true},orderBy:[{created_at:'desc'},{id:'desc'}],take:50})));
 app.get('/push/config',{config},request=>withStaff(app,request,async()=>({public_key:runtime.publicVapidKey,enabled:!!runtime.publicVapidKey})));
 app.post('/push/subscriptions',{config},request=>withStaff(app,request,async claims=>{
  if(!runtime.publicVapidKey)throw new DomainError('INVALID_INPUT',400);
  const data=pushInput.parse(request.body);if(!validPushEndpoint(data.endpoint))throw new DomainError('INVALID_INPUT',400);
  const p256dh=Buffer.from(data.keys.p256dh,'base64url');const auth=Buffer.from(data.keys.auth,'base64url');
  if(p256dh.length!==65||p256dh[0]!==4||auth.length!==16)throw new DomainError('INVALID_INPUT',400);
  const endpoint_hash=createHash('sha256').update(data.endpoint).digest('hex');
  return reservationTransaction(claims.tenant_id,async tx=>{
   await tx.pushSubscription.updateMany({where:{endpoint_hash,staff_user_id:{not:claims.sub}},data:{active:false}});
   const result=await tx.pushSubscription.upsert({where:{tenant_id_staff_user_id_endpoint_hash:{tenant_id:claims.tenant_id,staff_user_id:claims.sub,endpoint_hash}},create:{tenant_id:claims.tenant_id,staff_user_id:claims.sub,endpoint_hash,endpoint:data.endpoint,p256dh:data.keys.p256dh,auth:data.keys.auth},update:{active:true,p256dh:data.keys.p256dh,auth:data.keys.auth}});
   return {id:result.id};
  });
 }));
 app.post('/push/subscriptions/status',{config},request=>withStaff(app,request,async claims=>{
  const data=pushInput.pick({endpoint:true}).parse(request.body);const endpoint_hash=createHash('sha256').update(data.endpoint).digest('hex');
  return {active:!!await db.pushSubscription.findFirst({where:{staff_user_id:claims.sub,endpoint_hash,active:true}})};
 }));
 app.delete('/push/subscriptions',{config},request=>withStaff(app,request,async claims=>{
  const data=pushInput.pick({endpoint:true}).parse(request.body);
  await db.pushSubscription.deleteMany({where:{staff_user_id:claims.sub,endpoint_hash:createHash('sha256').update(data.endpoint).digest('hex')}});return {disabled:true};
 }));
}
