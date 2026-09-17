import type { FastifyInstance } from 'fastify';
import { randomBytes } from 'node:crypto';
import { db,resolveTenant,reservationTransaction } from '@bigant/database';
import { DomainError,feedbackRetrySeconds,googleReviewUrl } from '@bigant/core';
import { feedbackQuery,publicReviewInput,reviewQuery,reviewPatch,cardInput,cardPatch,slugParam,idParam,type FeedbackOptions } from '@bigant/types';
import { withStaff } from './staff.js';
const reviewSelect={id:true,rating:true,comment:true,channel:true,staff_seen_at:true,staff_response:true,created_at:true,nfc_card:{select:{label:true}}} as const;
const cardSelect={id:true,card_uid:true,label:true,active:true,last_tapped_at:true,tap_count:true} as const;
export function reviewRoutes(app:FastifyInstance,now:()=>Date){
 const config={rateLimit:false as const};
 async function tenantId(slug:string){const tenant=await resolveTenant(slug);if(!tenant||tenant.status!=='active')throw new DomainError('NOT_FOUND',404);return tenant.id;}
 app.get('/public/:slug/feedback',{config:{rateLimit:{max:30,timeWindow:'1 minute',groupId:'feedback-read'}}},async request=>{
  const {slug}=slugParam.parse(request.params);const {card}=feedbackQuery.parse(request.query);const id=await tenantId(slug);
  return reservationTransaction(id,async tx=>{
   const tenant=await tx.tenant.findFirstOrThrow({select:{name:true,slug:true,google_place_id:true}});
   const tagged=card?await tx.nFCCard.findFirst({where:{card_uid:card,active:true}}):null;
   if(card&&!tagged)throw new DomainError('NOT_FOUND',404);
   // Conta le aperture del link, non persone uniche né recensioni pubblicate.
   if(tagged)await tx.nFCCard.update({where:{id:tagged.id},data:{tap_count:{increment:1},last_tapped_at:now()}});
   return {tenant:{name:tenant.name,slug:tenant.slug},google_available:!!tenant.google_place_id,google_demo:tenant.google_place_id?.startsWith('test-place-')??false,card_uid:tagged?.card_uid??null,card_label:tagged?.label??null} satisfies FeedbackOptions;
  });
 });
 app.post('/public/:slug/reviews',{config:{rateLimit:{max:5,timeWindow:'1 minute',groupId:'feedback-write'}}},async(request,reply)=>{
  const {slug}=slugParam.parse(request.params);const data=publicReviewInput.parse(request.body);const id=await tenantId(slug);
  return reservationTransaction(id,async tx=>{
   const tenant=await tx.tenant.findFirstOrThrow({select:{google_place_id:true}});
   const card=data.card_uid?await tx.nFCCard.findFirst({where:{card_uid:data.card_uid,active:true}}):null;
   if(data.card_uid&&!card)throw new DomainError('NOT_FOUND',404);
   if(data.channel==='google_redirect'&&!tenant.google_place_id)throw new DomainError('NOT_FOUND',404);
   if(card){
    const last=await tx.review.findFirst({where:{nfc_card_id:card.id},orderBy:{created_at:'desc'},select:{created_at:true}});
    const wait=feedbackRetrySeconds(last?.created_at??null,now());
    if(wait){reply.header('Retry-After',wait);throw new DomainError('CARD_COOLDOWN',429);}
   }
   // Il lock DB rende il limite della card valido anche con richieste parallele.
   const review=await tx.review.create({data:{tenant_id:id,nfc_card_id:card?.id??null,channel:data.channel,rating:data.channel==='private'?data.rating:null,comment:data.channel==='private'?data.comment||null:null,created_at:now()}});
   reply.code(201);
   return {id:review.id,channel:review.channel,...(data.channel==='google_redirect'?{redirect_url:googleReviewUrl(tenant.google_place_id!),google_demo:tenant.google_place_id!.startsWith('test-place-')}:{})};
  });
 });
 app.get('/reviews/summary',{config},request=>withStaff(app,request,async()=>{
  const [unseen_private,unseen_low,private_total,google_redirects]=await Promise.all([
   db.review.count({where:{channel:'private',staff_seen_at:null}}),db.review.count({where:{channel:'private',staff_seen_at:null,rating:{lte:2}}}),db.review.count({where:{channel:'private'}}),db.review.count({where:{channel:'google_redirect'}}),
  ]);return {unseen_private,unseen_low,private_total,google_redirects};
 }));
 app.get('/reviews',{config},request=>withStaff(app,request,async()=>{
  const query=reviewQuery.parse(request.query);const where={...(query.rating?{rating:query.rating}:{}),...(query.channel?{channel:query.channel}:{}),...(query.seen?{staff_seen_at:query.seen==='false'?null:{not:null}}:{})};
  if(query.cursor&&!await db.review.findFirst({where:{id:query.cursor,...where},select:{id:true}}))throw new DomainError('NOT_FOUND',404);
  const rows=await db.review.findMany({where,select:reviewSelect,orderBy:[{created_at:'desc'},{id:'desc'}],take:51,...(query.cursor?{cursor:{id:query.cursor},skip:1}:{})});
  return {items:rows.slice(0,50),next_cursor:rows.length>50?rows[49]!.id:null};
 }));
 app.patch('/reviews/:id',{config},request=>withStaff(app,request,async claims=>{
  const {id}=idParam.parse(request.params);const data=reviewPatch.parse(request.body);
  return reservationTransaction(claims.tenant_id,async tx=>{
   const row=await tx.review.findUnique({where:{id}});if(!row)throw new DomainError('NOT_FOUND',404);
   return tx.review.update({where:{id},data:{...(data.seen?{staff_seen_at:row.staff_seen_at??now()}:{}),...(data.staff_response!==undefined?{staff_response:data.staff_response||null}:{})},select:reviewSelect});
  });
 }));
 app.get('/nfc-cards',{config},request=>withStaff(app,request,()=>db.nFCCard.findMany({select:cardSelect,orderBy:{created_at:'asc'}})));
 app.post('/nfc-cards',{config},(request,reply)=>withStaff(app,request,async claims=>{
  if(claims.role!=='owner')throw new DomainError('FORBIDDEN',403);const data=cardInput.parse(request.body);
  const row=await db.nFCCard.create({data:{tenant_id:claims.tenant_id,label:data.label,card_uid:randomBytes(32).toString('hex')},select:cardSelect});reply.code(201);return row;
 }));
 app.patch('/nfc-cards/:id',{config},request=>withStaff(app,request,async claims=>{
  if(claims.role!=='owner')throw new DomainError('FORBIDDEN',403);const {id}=idParam.parse(request.params);const data=cardPatch.parse(request.body);
  return reservationTransaction(claims.tenant_id,async tx=>{
   if(!await tx.nFCCard.findUnique({where:{id}}))throw new DomainError('NOT_FOUND',404);
   const row=await tx.nFCCard.update({where:{id},data,select:cardSelect});
   await tx.auditLog.create({data:{tenant_id:claims.tenant_id,staff_user_id:claims.sub,action:'nfc.card.update',entity_type:'NFCCard',entity_id:id}});return row;
  });
 }));
}
