import type { FastifyInstance } from 'fastify';
import { SignJWT, jwtVerify } from 'jose';
import { db, withTenant, resolveTenant, resolveCancellation } from '@bigant/database';
import { DomainError } from '@bigant/core';
import { availabilityQuery, staffAvailabilityQuery, publicBookingInput, staffBookingInput, reservationPatch, reservationQuery, idParam, slugParam, tokenParam } from '@bigant/types';
import { groupInclude } from '../rooms.js';
import { withStaff } from '../staff.js';
import { loadAvailability, availabilityResult, createReservation, patchReservation, cancellationView, cancelPublic, listReservations } from './service.js';

export function reservationRoutes(app:FastifyInstance, options:{secret:string;now:()=>Date}) {
  const {now}=options;
  const key=new TextEncoder().encode(options.secret);
  const writeLimit={rateLimit:{max:5,timeWindow:'1 minute'}};
  const staffConfig={rateLimit:false as const};
  const tenantFromSlug=async (slug:string)=>{
    const tenant=await resolveTenant(slug);
    if(!tenant||tenant.status!=='active') throw new DomainError('NOT_FOUND',404);
    return tenant.id;
  };
  const formToken=(tenantId:string)=>new SignJWT({kind:'booking-form'}).setProtectedHeader({alg:'HS256'}).setIssuer('bigant-form').setAudience(tenantId).setIssuedAt(Math.floor(now().getTime()/1000)).setExpirationTime(Math.floor(now().getTime()/1000)+7200).sign(key);
  app.get('/public/:slug',async request=>{
    const {slug}=slugParam.parse(request.params);const id=await tenantFromSlug(slug);
    return withTenant(id,async()=>{
      const tenant=await db.tenant.findFirstOrThrow({select:{name:true,slug:true,timezone:true,phone:true,address:true,logo_url:true,primary_color:true,locale_default:true}});
      const settings=await db.tenantSettings.findFirstOrThrow();
      return {...tenant,total_capacity:settings.total_capacity,max_party_size:Math.min(settings.total_capacity,settings.max_covers_per_slot),max_advance_days:settings.max_advance_days,cancellation_deadline_hours:settings.cancellation_deadline_hours,auto_confirm:settings.auto_confirm,opening_hours:await db.openingHours.findMany({select:{weekday:true,start_time:true,end_time:true}}),form_token:await formToken(id)};
    });
  });
  app.get('/public/:slug/availability',async request=>{
    const {slug}=slugParam.parse(request.params);const query=availabilityQuery.parse(request.query);const id=await tenantFromSlug(slug);
    return withTenant(id,async()=>availabilityResult(await loadAvailability(db,query.date,query.party_size,now())));
  });
  app.post('/public/:slug/reservations',{config:writeLimit},async(request,reply)=>{
    const {slug}=slugParam.parse(request.params);const data=publicBookingInput.parse(request.body);const id=await tenantFromSlug(slug);
    try {
      const {payload}=await jwtVerify(data.form_token,key,{algorithms:['HS256'],issuer:'bigant-form',audience:id,currentDate:now(),requiredClaims:['exp','iat']});
      if(data.website||payload.kind!=='booking-form'||typeof payload.iat!=='number'||now().getTime()/1000-payload.iat<2) throw new Error('BOT');
    } catch {throw new DomainError('INVALID_INPUT',400);}
    const created=await createReservation(id,data,now());
    reply.code(201).header('Cache-Control','no-store');
    return {id:created.id,status:created.status,reserved_at:created.reserved_at,party_size:created.party_size,cancel_token:created.cancel_token};
  });
  app.get('/public/reservations/:cancelToken',async(request,reply)=>{
    const {cancelToken}=tokenParam.parse(request.params);const resolved=await resolveCancellation(cancelToken);
    if(!resolved) throw new DomainError('NOT_FOUND',404);
    reply.header('Cache-Control','no-store').header('Referrer-Policy','no-referrer');
    return withTenant(resolved.tenant_id,()=>cancellationView(resolved.id,now()));
  });
  const cancel=async(token:string)=>{
    const resolved=await resolveCancellation(token);if(!resolved) throw new DomainError('NOT_FOUND',404);
    return cancelPublic(resolved.tenant_id,resolved.id,now());
  };
  app.post('/public/reservations/:cancelToken/cancel',{config:writeLimit},async(request)=>cancel(tokenParam.parse(request.params).cancelToken));
  // Alias previsto da MISSIONS.md; SPEC usa il suffisso /cancel.
  app.post('/public/reservations/:cancelToken',{config:writeLimit},async(request)=>cancel(tokenParam.parse(request.params).cancelToken));
  app.get('/staff/availability',{config:staffConfig},request=>withStaff(app,request,async()=>{
    const query=staffAvailabilityQuery.parse(request.query);const input=await loadAvailability(db,query.date,query.party_size,now());
    if(query.table_group_id){const group=await db.tableGroup.findUnique({where:{id:query.table_group_id},include:groupInclude});if(!group?.active)throw new DomainError('TABLE_UNAVAILABLE');input.settings={...input.settings,auto_assign_tables:false};input.manualGroup={...group,tables:group.members.map(m=>m.table)};}
    return availabilityResult(input);
  }));
  app.get('/reservations',{config:staffConfig},request=>withStaff(app,request,async()=>{
    const query=reservationQuery.parse(request.query);return listReservations(query.date,query.status);
  }));
  app.post('/reservations',{config:staffConfig},(request,reply)=>withStaff(app,request,async claims=>{
    const result=await createReservation(claims.tenant_id,staffBookingInput.parse(request.body),now(),claims.sub);reply.code(201);return result;
  }));
  app.patch('/reservations/:id',{config:staffConfig},request=>withStaff(app,request,async claims=>patchReservation(claims.tenant_id,idParam.parse(request.params).id,reservationPatch.parse(request.body),now(),claims.sub)));
  app.delete('/reservations/:id',{config:staffConfig},request=>withStaff(app,request,async claims=>patchReservation(claims.tenant_id,idParam.parse(request.params).id,{status:'cancelled'},now(),claims.sub)));
}
