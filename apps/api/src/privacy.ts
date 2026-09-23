import { randomBytes } from 'node:crypto';
import { db,reservationTransaction,resolveTenant,type TenantTransaction } from '@bigant/database';
import { DomainError,customerCsv,calendarPeriod } from '@bigant/core';
import { customerQuery,customerPatch,idParam,slugParam } from '@bigant/types';
import { notificationMessages } from '@bigant/i18n';
import type { FastifyInstance } from 'fastify';
import { withStaff } from './staff.js';

export async function anonymize(tx:TenantTransaction,tenantId:string,id:string,now:Date,staffId?:string) {
 const current=await tx.customer.findUnique({where:{id}});
 if(!current)throw new DomainError('NOT_FOUND',404);
 if(current.anonymized_at)return current;
 const reservations=await tx.reservation.findMany({where:{customer_id:id},select:{id:true}});
 const reservationIds=reservations.map(r=>r.id);
 await tx.waitlistEntry.updateMany({where:{reservation_id:{in:reservationIds}},data:{surname:notificationMessages.it.anonymizedCustomer,anonymized_at:now}});
 // Cancella anche il testo libero che può ripetere recapiti o dati sanitari.
 for(const reservation of reservations)await tx.reservation.update({where:{id:reservation.id},data:{notes:'',internal_notes:'',cancel_token:randomBytes(32).toString('hex')}});
 await tx.review.updateMany({where:{customer_id:id},data:{customer_id:null,comment:null,staff_response:null}});
 const logs=await tx.notificationLog.findMany({where:{reservation_id:{in:reservationIds}}});
 for(const log of logs)await tx.notificationLog.update({where:{id:log.id},data:{recipient:'',recipient_hash:randomBytes(32).toString('hex'),payload:{},...(log.status==='queued'?{status:'skipped' as const,error_code:'ANONYMIZED'}:{})}});
 const updated=await tx.customer.update({where:{id},data:{full_name:notificationMessages.it.anonymizedCustomer,phone_e164:null,email:null,notes:'',allergies:null,marketing_consent:false,marketing_consent_at:null,anonymized_at:now}});
 await tx.auditLog.create({data:{tenant_id:tenantId,staff_user_id:staffId??null,action:'customer.anonymize',entity_type:'Customer',entity_id:id,metadata:{source:staffId?'request':'retention'}}});
 return updated;
}
export async function retention(tenantId:string,now:Date) {
 // Registro separato: l’aggiunta M5S funziona anche se il job clienti del mese è già passato.
 await reservationTransaction(tenantId,async tx=>{
  const tenant=await tx.tenant.findFirstOrThrow();if(tenant.status!=='active')return;
  const settings=await tx.tenantSettings.findFirstOrThrow();const {period,cutoff}=calendarPeriod(now,tenant.timezone,settings.retention_months);
  if(await tx.auditLog.findFirst({where:{action:'retention.waitlist.month',entity_id:tenantId,metadata:{path:['period'],equals:period}}}))return;
  const result=await tx.waitlistEntry.updateMany({where:{anonymized_at:null,service_end:{lt:cutoff}},data:{surname:notificationMessages.it.anonymizedCustomer,anonymized_at:now}});
  await tx.auditLog.create({data:{tenant_id:tenantId,staff_user_id:null,action:'retention.waitlist.month',entity_type:'Tenant',entity_id:tenantId,metadata:{period,count:result.count}}});
 });
 let count=0;
 for(;;){
  const batch=await reservationTransaction(tenantId,async tx=>{
   const tenant=await tx.tenant.findFirstOrThrow();if(tenant.status!=='active')return {done:true,count:0};
   const settings=await tx.tenantSettings.findFirstOrThrow();const {period,cutoff}=calendarPeriod(now,tenant.timezone,settings.retention_months);
   if(await tx.auditLog.findFirst({where:{action:'retention.month',entity_id:tenantId,metadata:{path:['period'],equals:period}}}))return {done:true,count:0};
   const rows=await tx.customer.findMany({where:{anonymized_at:null,created_at:{lt:cutoff},reservations:{none:{OR:[{reserved_at:{gte:cutoff}},{status:{in:['pending','confirmed','seated']}}]}}},take:25,select:{id:true}});
   for(const row of rows)await anonymize(tx,tenantId,row.id,now);
   if(!rows.length)await tx.auditLog.create({data:{tenant_id:tenantId,staff_user_id:null,action:'retention.month',entity_type:'Tenant',entity_id:tenantId,metadata:{period}}});
   return {done:!rows.length,count:rows.length};
  });
  count+=batch.count;if(batch.done)return count;
 }
}
export function privacyRoutes(app:FastifyInstance,now:()=>Date) {
 const config={rateLimit:false as const};
 const fields={id:true,full_name:true,phone_e164:true,email:true,notes:true,marketing_consent:true,marketing_consent_at:true,total_visits:true,no_show_count:true,last_visit_at:true,anonymized_at:true} as const;
 app.get('/public/:slug/privacy',{config:{rateLimit:{max:30,timeWindow:'1 minute',groupId:'public-privacy'}}},async request=>{
  const {slug}=slugParam.parse(request.params);const tenant=await resolveTenant(slug);
  if(!tenant||tenant.status!=='active')throw new DomainError('NOT_FOUND',404);
  return reservationTransaction(tenant.id,async tx=>{
   const venue=await tx.tenant.findFirstOrThrow();const settings=await tx.tenantSettings.findFirstOrThrow();
   return {name:venue.name,slug:venue.slug,address:venue.address,phone:venue.phone,contact_email:settings.privacy_contact_email,retention_months:settings.retention_months,demo:venue.slug==='trattoria-santa-lucia'||venue.slug==='lido-miseno'};
  });
 });
 const search=async(data:unknown)=>{
  const {q,cursor}=customerQuery.parse(data);
  if(cursor&&!await db.customer.findUnique({where:{id:cursor}}))throw new DomainError('NOT_FOUND',404);
  const rows=await db.customer.findMany({where:q?{OR:[{full_name:{contains:q,mode:'insensitive'}},{phone_e164:{contains:q}},{email:{contains:q,mode:'insensitive'}}]}:{},select:fields,orderBy:{id:'asc'},take:51,...(cursor?{cursor:{id:cursor},skip:1}:{})});
  return {items:rows.slice(0,50),next_cursor:rows.length>50?rows[49]!.id:null};
 };
 app.get('/customers',{config},request=>withStaff(app,request,()=>search(customerQuery.pick({cursor:true}).parse(request.query))));
 app.post('/customers/search',{config},request=>withStaff(app,request,()=>search(request.body)));
 app.get('/customers/export',{config},(request,reply)=>withStaff(app,request,async claims=>{
  if(claims.role!=='owner')throw new DomainError('FORBIDDEN',403);
  const csv=await reservationTransaction(claims.tenant_id,async tx=>{
   const rows=await tx.customer.findMany({select:fields,orderBy:{id:'asc'}});
   await tx.auditLog.create({data:{tenant_id:claims.tenant_id,staff_user_id:claims.sub,action:'customer.export',entity_type:'Tenant',entity_id:claims.tenant_id,metadata:{count:rows.length}}});
   return customerCsv(rows);
  });
  reply.header('Content-Type','text/csv; charset=utf-8').header('Content-Disposition','attachment; filename="bigant-clienti.csv"');return csv;
 }));
 app.get('/customers/:id',{config},request=>withStaff(app,request,async()=>{
  const row=await db.customer.findUnique({where:{id:idParam.parse(request.params).id},select:fields});if(!row)throw new DomainError('NOT_FOUND',404);return row;
 }));
 app.get('/customers/:id/reservations',{config},request=>withStaff(app,request,async()=>{
  const {id}=idParam.parse(request.params);
  if(!await db.customer.findUnique({where:{id},select:{id:true}}))throw new DomainError('NOT_FOUND',404);
  // Riepilogo operativo: niente token di disdetta, recapiti o testo libero.
  const rows=await db.reservation.findMany({where:{customer_id:id},select:{id:true,reserved_at:true,party_size:true,status:true,source:true},orderBy:[{reserved_at:'desc'},{id:'desc'}],take:21});
  return {items:rows.slice(0,20),has_more:rows.length>20};
 }));
 app.patch('/customers/:id',{config},request=>withStaff(app,request,async claims=>{
  const {id}=idParam.parse(request.params);const data=customerPatch.parse(request.body);
  return reservationTransaction(claims.tenant_id,async tx=>{
   const row=await tx.customer.findUnique({where:{id}});if(!row)throw new DomainError('NOT_FOUND',404);
   // Un consenso non può essere dichiarato dall’operatore per conto dell’ospite.
   if(row.anonymized_at||data.marketing_consent===true)throw new DomainError('INVALID_INPUT',400);
   const updated=await tx.customer.update({where:{id},data:{...data,...(data.marketing_consent===false?{marketing_consent_at:null}:{})},select:fields});
   await tx.auditLog.create({data:{tenant_id:claims.tenant_id,staff_user_id:claims.sub,action:'customer.update',entity_type:'Customer',entity_id:id}});return updated;
  });
 }));
 app.delete('/customers/:id',{config},request=>withStaff(app,request,async claims=>{
  if(claims.role!=='owner')throw new DomainError('FORBIDDEN',403);
  const {id}=idParam.parse(request.params);await reservationTransaction(claims.tenant_id,tx=>anonymize(tx,claims.tenant_id,id,now(),claims.sub));return {anonymized:true};
 }));
}
