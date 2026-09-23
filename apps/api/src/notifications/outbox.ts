import { createHash } from 'node:crypto';
import { type TenantTransaction } from '@bigant/database';
import type { Reservation, NotificationChannel, NotificationType } from '@bigant/database';

export type EventName='created'|'pending'|'confirmed'|'reminder'|'cancellation'|'staff_cancellation'|'private_review'|'new_reservation';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export async function enqueue(tx:TenantTransaction,tenantId:string,eventKey:string,event:EventName,channel:NotificationChannel,recipient:string,options:{reservationId?:string;locale?:'it'|'en';reservedAt?:Date;reviewId?:string;fallback?:boolean;now?:Date;dueAt?:Date}={}) {
 if(!recipient)return;
 // Accodamento e worker usano lo stesso clock applicativo: un default del
 // database più avanti nel tempo non deve rinviare una consegna immediata.
 const now=options.now??new Date();
 const type:NotificationType=event==='reminder'?'reminder':event==='private_review'?'low_review_alert':event.includes('cancellation')?'cancellation':'confirmation';
 // createMany skipDuplicates usa la chiave evento/canale/destinatario anche sotto concorrenza.
 await tx.notificationLog.createMany({skipDuplicates:true,data:[{
  tenant_id:tenantId,event_key:eventKey,event_name:event,type,channel,recipient,recipient_hash:hash(recipient.toLowerCase()),
  reservation_id:options.reservationId??null,fallback:options.fallback??false,created_at:now,due_at:options.dueAt??now,
  payload:{locale:options.locale??'it',...(options.reservedAt?{reserved_at:options.reservedAt.toISOString()}:{}),...(options.reviewId?{review_id:options.reviewId}:{})},
 }]});
}
async function staffDeliveries(tx:TenantTransaction,tenantId:string,key:string,event:EventName,now:Date,reservation?:Reservation,reviewId?:string) {
 const ownersOnly=event==='private_review';
 const people=await tx.staffUser.findMany({where:{status:'active',...(ownersOnly?{role:'owner'}:{})},select:{id:true,email:true}});
 const locale=(await tx.tenant.findFirstOrThrow()).locale_default;
 for(const person of people) {
  if(event!=='new_reservation')await enqueue(tx,tenantId,key,event,'email',person.email,{reservationId:reservation?.id,locale,reviewId,now});
  const subscriptions=await tx.pushSubscription.findMany({where:{staff_user_id:person.id,active:true}});
  for(const subscription of subscriptions)await enqueue(tx,tenantId,key,event,'push',subscription.id,{reservationId:reservation?.id,locale,reviewId,now});
 }
}
export async function reservationCreated(tx:TenantTransaction,tenantId:string,reservation:Reservation,now=new Date()) {
 const customer=await tx.customer.findUniqueOrThrow({where:{id:reservation.customer_id}});
 await enqueue(tx,tenantId,`${reservation.id}:created`,reservation.status==='pending'?'pending':'created','email',customer.email??'',{reservationId:reservation.id,locale:reservation.locale,now});
 await staffDeliveries(tx,tenantId,`${reservation.id}:new`,'new_reservation',now,reservation);
}
export async function reservationChanged(tx:TenantTransaction,tenantId:string,reservation:Reservation,previous:string,by:'staff'|'customer',now=new Date()) {
 if(reservation.status===previous)return;
 const customer=await tx.customer.findUniqueOrThrow({where:{id:reservation.customer_id}});
 if(reservation.status==='confirmed') {
  const key=`${reservation.id}:confirmed`;
  await enqueue(tx,tenantId,key,'confirmed','email',customer.email??'',{reservationId:reservation.id,locale:reservation.locale,now});
  const settings=await tx.tenantSettings.findFirstOrThrow();const tenant=await tx.tenant.findFirstOrThrow();
  if(settings.sms_enabled&&['pro','full'].includes(tenant.plan)&&customer.phone_e164)await enqueue(tx,tenantId,key,'confirmed','sms',customer.phone_e164,{reservationId:reservation.id,locale:reservation.locale,now});
 }
 if(reservation.status==='cancelled') {
  if(by==='customer')await staffDeliveries(tx,tenantId,`${reservation.id}:cancelled`,'cancellation',now,reservation);
  else await enqueue(tx,tenantId,`${reservation.id}:cancelled`,'staff_cancellation','email',customer.email??'',{reservationId:reservation.id,locale:reservation.locale,now});
 }
}
export async function reviewCreated(tx:TenantTransaction,tenantId:string,reviewId:string,now=new Date()) {
 await staffDeliveries(tx,tenantId,`${reviewId}:private`,'private_review',now,undefined,reviewId);
}
