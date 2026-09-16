import type { FastifyInstance } from 'fastify';
import { db, reservationTransaction } from '@bigant/database';
import { DomainError } from '@bigant/core';
import { settingsInput, openingHoursInput, blackoutInput, tableInput, idParam, type StaffClaims } from '@bigant/types';
import { withStaff } from './staff.js';
const time=(value:string)=>new Date(`1970-01-01T${value}:00Z`);
const owner=(claims:StaffClaims)=>{if(claims.role!=='owner') throw new DomainError('FORBIDDEN',403);};
export function settingsRoutes(app:FastifyInstance) {
 const config={rateLimit:false as const};
 app.get('/auth/me',{config},request=>withStaff(app,request,async claims=>{
  const user=await db.staffUser.findUniqueOrThrow({where:{id:claims.sub},select:{id:true,full_name:true,role:true}});
  const tenant=await db.tenant.findFirstOrThrow({select:{id:true,name:true,slug:true,timezone:true,locale_default:true}});
  return {...user,tenant};
 }));
 app.get('/settings',{config},request=>withStaff(app,request,async()=>db.tenantSettings.findFirstOrThrow()));
 app.patch('/settings',{config},request=>withStaff(app,request,async claims=>{
  owner(claims);const data=settingsInput.parse(request.body);
  return reservationTransaction(claims.tenant_id,async tx=>{
   const result=await tx.tenantSettings.update({where:{tenant_id:claims.tenant_id},data});
   await tx.auditLog.create({data:{tenant_id:claims.tenant_id,staff_user_id:claims.sub,action:'settings.update',entity_type:'TenantSettings',entity_id:claims.tenant_id}});return result;
  });
 }));
 app.get('/opening-hours',{config},request=>withStaff(app,request,async()=>{
  const rows=await db.openingHours.findMany({orderBy:[{weekday:'asc'},{start_time:'asc'}]});return rows.map(r=>({...r,start_time:r.start_time.toISOString().slice(11,16),end_time:r.end_time.toISOString().slice(11,16)}));
 }));
 app.put('/opening-hours',{config},request=>withStaff(app,request,async claims=>{
  owner(claims);const data=openingHoursInput.parse(request.body);
  return reservationTransaction(claims.tenant_id,async tx=>{
   await tx.openingHours.deleteMany({});
   await tx.openingHours.createMany({data:data.map(r=>({...r,tenant_id:claims.tenant_id,start_time:time(r.start_time),end_time:time(r.end_time)}))});
   await tx.auditLog.create({data:{tenant_id:claims.tenant_id,staff_user_id:claims.sub,action:'opening-hours.update',entity_type:'TenantSettings',entity_id:claims.tenant_id}});return {saved:true};
  });
 }));
 app.get('/blackouts',{config},request=>withStaff(app,request,async()=>{
  const rows=await db.blackoutDate.findMany({orderBy:{date:'asc'}});return rows.map(r=>({...r,date:r.date.toISOString().slice(0,10),start_time:r.start_time?.toISOString().slice(11,16)??null,end_time:r.end_time?.toISOString().slice(11,16)??null}));
 }));
 app.post('/blackouts',{config},request=>withStaff(app,request,async claims=>{
  owner(claims);const data=blackoutInput.parse(request.body);
  return reservationTransaction(claims.tenant_id,async tx=>{
   const result=await tx.blackoutDate.create({data:{...data,tenant_id:claims.tenant_id,date:new Date(`${data.date}T00:00:00Z`),start_time:data.start_time?time(data.start_time):null,end_time:data.end_time?time(data.end_time):null}});
   await tx.auditLog.create({data:{tenant_id:claims.tenant_id,staff_user_id:claims.sub,action:'blackout.create',entity_type:'BlackoutDate',entity_id:result.id}});return result;
  });
 }));
 app.delete('/blackouts/:id',{config},request=>withStaff(app,request,async claims=>{
  owner(claims);const {id}=idParam.parse(request.params);
  return reservationTransaction(claims.tenant_id,async tx=>{
   const row=await tx.blackoutDate.findUnique({where:{id}});if(!row) throw new DomainError('NOT_FOUND',404);
   await tx.blackoutDate.delete({where:{id}});await tx.auditLog.create({data:{tenant_id:claims.tenant_id,staff_user_id:claims.sub,action:'blackout.delete',entity_type:'BlackoutDate',entity_id:id}});return {deleted:true};
  });
 }));
 app.get('/tables',{config},request=>withStaff(app,request,async()=>db.restaurantTable.findMany({orderBy:{name:'asc'}})));
 app.post('/tables',{config},request=>withStaff(app,request,async claims=>{
  owner(claims);return db.restaurantTable.create({data:{...tableInput.parse(request.body),tenant_id:claims.tenant_id}});
 }));
 app.patch('/tables/:id',{config},request=>withStaff(app,request,async claims=>{
  owner(claims);const {id}=idParam.parse(request.params);const data=tableInput.parse(request.body);
  return reservationTransaction(claims.tenant_id,async tx=>{
   if(!await tx.restaurantTable.findUnique({where:{id}})) throw new DomainError('NOT_FOUND',404);
   return tx.restaurantTable.update({where:{id},data});
  });
 }));
}
