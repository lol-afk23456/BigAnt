import { db,withTenant,reservationTransaction,activeTenantIds } from '@bigant/database';
import { calendarPeriod,reservationNotificationIsCurrent } from '@bigant/core';
import { transactionCopy } from '@bigant/i18n';
import type { NotificationLog } from '@bigant/database';
import { enqueue,type EventName } from './outbox.js';
import { DeliveryError,type Message } from './channels.js';
import type { NotificationRuntime } from './config.js';
import { retention } from '../privacy.js';

export async function scheduleReminders(tenantId:string,now:Date) {
 return reservationTransaction(tenantId,async tx=>{
  const tenant=await tx.tenant.findFirstOrThrow();const settings=await tx.tenantSettings.findFirstOrThrow();
  if(tenant.status!=='active')return;
  const rows=await tx.reservation.findMany({where:{status:'confirmed',reserved_at:{gt:now,lte:new Date(now.getTime()+settings.reminder_hours_before*3600000)}},include:{customer:true}});
  for(const row of rows){
   if(row.customer.anonymized_at)continue;
   const sms=settings.sms_enabled&&['pro','full'].includes(tenant.plan)&&!!row.customer.phone_e164;
   await enqueue(tx,tenantId,`${row.id}:reminder:${row.reserved_at.toISOString()}`,'reminder',sms?'sms':'email',(sms?row.customer.phone_e164:row.customer.email)??'',{reservationId:row.id,locale:row.locale,reservedAt:row.reserved_at});
  }
 });
}
async function messageFor(tenantId:string,log:NotificationLog,runtime:NotificationRuntime,now:Date):Promise<Message|null> {
 return withTenant(tenantId,async()=>{
  const tenant=await db.tenant.findFirstOrThrow();if(tenant.status!=='active'||!log.recipient)return null;
  const settings=await db.tenantSettings.findFirstOrThrow();
  const payload=log.payload as {locale?:'it'|'en';reserved_at?:string;review_id?:string};
  const locale=payload.locale==='en'?'en':'it';const copy=transactionCopy[locale];
  const event=log.event_name as EventName;if(!(event in copy))return null;
  const staffEvent=['new_reservation','cancellation','private_review'].includes(event);
  const view=event==='private_review'?'reviews':'reservations';
  let url=`${runtime.origin}/r/${tenant.slug}/staff?view=${view}`;
  let text:string=copy.details;
  if(log.reservation_id){
   const reservation=await db.reservation.findUnique({where:{id:log.reservation_id},include:{customer:true}});
   if(!reservation)return null;
   if(!staffEvent){
    if(reservation.customer.anonymized_at)return null;
    if(!reservationNotificationIsCurrent(event,reservation,payload.reserved_at,now))return null;
    url=`${runtime.origin}/prenotazione/${reservation.cancel_token}`;
    const when=new Intl.DateTimeFormat(locale,{timeZone:tenant.timezone,dateStyle:'medium',timeStyle:'short'}).format(reservation.reserved_at);
    text=`${tenant.name}\n${when} · ${reservation.party_size} ${copy.guests}\n${event==='pending'?copy.pendingHint+'\n':''}${copy.manage} ${url}`;
   }
  }
  if(event==='private_review'&&(!payload.review_id||!await db.review.findFirst({where:{id:payload.review_id,channel:'private'}})))return null;
  const message:Message={recipient:log.recipient,subject:copy[event],text,url,...(settings.privacy_contact_email?{replyTo:settings.privacy_contact_email}:{})};
  if(log.channel==='push'){
   const subscription=await db.pushSubscription.findFirst({where:{id:log.recipient,active:true,staff_user:{status:'active',...(event==='private_review'?{role:'owner'}:{})}}});
   if(!subscription)return null;
   message.subscription={endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}};
   // Payload push generico: nessun nome, recapito, commento o allergia.
   message.text=copy.details;
  }else if(staffEvent&&!await db.staffUser.findFirst({where:{email:log.recipient,status:'active',...(event==='private_review'?{role:'owner'}:{})}}))return null;
  return message;
 });
}
export async function dispatch(tenantId:string,runtime:NotificationRuntime,now:Date,limit=100) {
 let count=0;
 for(let n=0;n<limit;n++){
  const claimed=await reservationTransaction(tenantId,async tx=>{
   const tenant=await tx.tenant.findFirstOrThrow();if(tenant.status!=='active')return null;
   await tx.notificationLog.updateMany({where:{status:'processing',attempted_at:{lte:new Date(now.getTime()-20*60000)}},data:{status:'uncertain',error_code:'WORKER_INTERRUPTED'}});
   const log=await tx.notificationLog.findFirst({where:{status:'queued',event_name:{not:'legacy'},due_at:{lte:now}},orderBy:[{due_at:'asc'},{id:'asc'}]});
   if(!log)return null;
   if(log.channel==='sms'){
    const reservation=log.reservation_id?await tx.reservation.findUnique({where:{id:log.reservation_id},include:{customer:true}}):null;
    const payload=log.payload as {reserved_at?:string};
    if(!reservation||reservation.customer.anonymized_at||!reservationNotificationIsCurrent(log.event_name,reservation,payload.reserved_at,now)){
     await tx.notificationLog.update({where:{id:log.id},data:{status:'skipped',error_code:'EVENT_NO_LONGER_VALID'}});
     return {skip:true as const,log};
    }
    const settings=await tx.tenantSettings.findFirstOrThrow();const month=calendarPeriod(now,tenant.timezone);
    const used=await tx.notificationLog.count({where:{channel:'sms',status:{in:['processing','sent','uncertain','simulated']},attempted_at:{gte:month.start,lt:month.end}}});
    if(!settings.sms_enabled||!['pro','full'].includes(tenant.plan)||used>=settings.sms_monthly_cap){
     if(reservation.customer.email){
      await enqueue(tx,tenantId,log.event_key,log.event_name as EventName,'email',reservation.customer.email,{reservationId:reservation.id,locale:reservation.locale,reservedAt:reservation.reserved_at,fallback:true});
      // Se l’email dell’evento esiste già, viene riusata senza una seconda consegna.
      await tx.notificationLog.updateMany({where:{event_key:log.event_key,channel:'email'},data:{fallback:true}});
     }
     await tx.notificationLog.update({where:{id:log.id},data:{status:'skipped',error_code:'SMS_CAP_OR_DISABLED',fallback:true}});
     return {skip:true as const,log};
    }
   }
   const updated=await tx.notificationLog.update({where:{id:log.id},data:{status:'processing',attempts:{increment:1},attempted_at:now,error_code:null}});
   return {skip:false as const,log:updated};
  });
  if(!claimed)break;
  if(claimed.skip)continue;
  const log=claimed.log;
  try{
   const message=await messageFor(tenantId,log,runtime,now);
   if(!message){await withTenant(tenantId,()=>db.notificationLog.update({where:{id:log.id},data:{status:'skipped',error_code:'EVENT_NO_LONGER_VALID'}}));continue;}
   const result=await runtime.channels[log.channel].send(message,log.id);
   await withTenant(tenantId,()=>db.notificationLog.update({where:{id:log.id},data:{status:result.status,provider_id:result.providerId,sent_at:result.status==='sent'?now:null}}));count++;
  }catch(error){
   const failure=error instanceof DeliveryError?error:new DeliveryError('uncertain','PROVIDER_UNKNOWN');
   await withTenant(tenantId,async()=>{
    if(failure.outcome==='expired'&&log.channel==='push')await db.pushSubscription.updateMany({where:{id:log.recipient},data:{active:false}});
    const retry=failure.outcome==='retry'&&log.attempts<3;
    await db.notificationLog.update({where:{id:log.id},data:{status:retry?'queued':failure.outcome==='uncertain'?'uncertain':'failed',error_code:failure.code,due_at:new Date(now.getTime()+log.attempts*5*60000)}});
   });
  }
 }
 return count;
}
export async function workerTick(runtime:NotificationRuntime,now=new Date()) {
 let errors=0;
 for(const id of await activeTenantIds()){
  try{await scheduleReminders(id,now);await dispatch(id,runtime,now);await retention(id,now);}catch{errors++;}
 }
 if(errors)throw new Error(`WORKER_TENANTS_FAILED:${errors}`);
}
