import type { FastifyInstance } from 'fastify';
import { db,reservationTransaction,type TenantTransaction } from '@bigant/database';
import { groupAvailable,DomainError,type AvailabilityInput } from '@bigant/core';
import { groupInput,groupPatch,idParam } from '@bigant/types';
import { withStaff } from './staff.js';
export const groupInclude={members:{include:{table:true},orderBy:{table_id:'asc' as const}}};
export async function checkGroup(tx:TenantTransaction,input:AvailabilityInput,id:string,instant:Date,duration:number) {
 const group=await tx.tableGroup.findUnique({where:{id},include:groupInclude});
 if(!group||!groupAvailable({...group,tables:group.members.map(m=>m.table)},input.existingReservations,instant,duration,input.partySize))throw new DomainError('TABLE_UNAVAILABLE');
 return group;
}
export async function snapshotGroup(tx:TenantTransaction,tenantId:string,reservationId:string,group:Awaited<ReturnType<typeof checkGroup>>|null) {
 await tx.reservationTable.deleteMany({where:{reservation_id:reservationId}});
 if(group)await tx.reservationTable.createMany({data:group.members.map(m=>({tenant_id:tenantId,reservation_id:reservationId,table_id:m.table_id,table_name:m.table.name}))});
}
export function roomRoutes(app:FastifyInstance){
 const config={rateLimit:false as const};
 app.get('/table-groups',{config},request=>withStaff(app,request,()=>db.tableGroup.findMany({include:groupInclude,orderBy:{name:'asc'}})));
 app.post('/table-groups',{config},(request,reply)=>withStaff(app,request,async claims=>{
  if(claims.role!=='owner')throw new DomainError('FORBIDDEN',403);const data=groupInput.parse(request.body);
  const result=await reservationTransaction(claims.tenant_id,async tx=>{
   const tables=await tx.restaurantTable.findMany({where:{id:{in:data.table_ids},active:true}});
   if(tables.length!==data.table_ids.length||data.max_capacity>tables.reduce((sum,t)=>sum+t.max_capacity,0))throw new DomainError('INVALID_INPUT',400);
   const group=await tx.tableGroup.create({data:{tenant_id:claims.tenant_id,name:data.name,min_capacity:data.min_capacity,max_capacity:data.max_capacity}});
   await tx.tableGroupMember.createMany({data:data.table_ids.map(table_id=>({tenant_id:claims.tenant_id,group_id:group.id,table_id}))});
   await tx.auditLog.create({data:{tenant_id:claims.tenant_id,staff_user_id:claims.sub,action:'table-group.create',entity_type:'TableGroup',entity_id:group.id}});
   return tx.tableGroup.findUniqueOrThrow({where:{id:group.id},include:groupInclude});
  });reply.code(201);return result;
 }));
 app.patch('/table-groups/:id',{config},request=>withStaff(app,request,async claims=>{
  if(claims.role!=='owner')throw new DomainError('FORBIDDEN',403);const {id}=idParam.parse(request.params);const data=groupPatch.parse(request.body);
  return reservationTransaction(claims.tenant_id,async tx=>{
   const group=await tx.tableGroup.findUnique({where:{id},include:groupInclude});if(!group)throw new DomainError('NOT_FOUND',404);
   if(data.active&&(!group.members.every(m=>m.table.active)||group.max_capacity>group.members.reduce((sum,m)=>sum+m.table.max_capacity,0)))throw new DomainError('TABLE_UNAVAILABLE');
   const result=await tx.tableGroup.update({where:{id},data,include:groupInclude});
   await tx.auditLog.create({data:{tenant_id:claims.tenant_id,staff_user_id:claims.sub,action:'table-group.update',entity_type:'TableGroup',entity_id:id}});return result;
  });
 }));
}
