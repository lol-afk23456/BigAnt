import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { db,reservationTransaction } from '@bigant/database';
import { computeAvailability,chooseTable,groupAvailable,dateInZone,serviceWindows,dayBounds,DomainError } from '@bigant/core';
import { idParam,waitlistQuery,waitlistInput,seatingInput,type Placement,type ServiceWindow } from '@bigant/types';
import { withStaff } from './staff.js';
import { loadAvailability,requireSlot,checkTable } from './reservations/service.js';
import { checkGroup,groupInclude,snapshotGroup } from './rooms.js';

export function waitlistRoutes(app:FastifyInstance,now:()=>Date){
 const config={rateLimit:false as const};
 app.get('/waitlist',{config},request=>withStaff(app,request,async()=>{
  const {date}=waitlistQuery.parse(request.query);const clock=now();const input=await loadAvailability(db,date,1,clock);
  const bounds=dayBounds(date,input.timezone);
  const rows=await db.waitlistEntry.findMany({where:{service_start:{lt:bounds.end},service_end:{gt:bounds.start}},orderBy:[{created_at:'asc'},{id:'asc'}]});
  const services:ServiceWindow[]=serviceWindows(date,input.timezone,input.openingHours).map(s=>({...s,archived:false}));
  for(const row of rows)if(!services.some(s=>s.key===row.service_key))services.push({key:row.service_key,date:row.service_date.toISOString().slice(0,10),label:row.service_label,start:row.service_start.toISOString(),end:row.service_end.toISOString(),archived:true});
  services.sort((a,b)=>a.start.localeCompare(b.start));
  const groups=await db.tableGroup.findMany({where:{active:true},include:groupInclude});
  const entries=rows.map(row=>{
   const placements:Placement[]=[];
   // Suggerire solo durante il servizio; la rivalidazione decisiva avviene al clic.
   if(row.status==='waiting'&&!row.anonymized_at&&clock>=row.service_start&&clock<row.service_end){
    const candidate={...input,partySize:row.party_size,settings:{...input.settings,min_lead_time_min:0,auto_assign_tables:false}};
    for(const slot of computeAvailability(candidate).filter(s=>s.available&&new Date(s.starts_at)>=row.service_start&&new Date(new Date(s.starts_at).getTime()+input.settings.turn_duration_min*60000)<=row.service_end)){
     const start=new Date(slot.starts_at);const duration=input.settings.turn_duration_min;
     for(const table of input.tables)if(chooseTable([table],input.existingReservations,start,duration,row.party_size))placements.push({kind:'table',id:table.id,name:table.name??table.id,starts_at:slot.starts_at,max_capacity:table.max_capacity});
     for(const group of groups)if(groupAvailable({...group,tables:group.members.map(m=>m.table)},input.existingReservations,start,duration,row.party_size))placements.push({kind:'group',id:group.id,name:group.name,starts_at:slot.starts_at,max_capacity:group.max_capacity});
     if(placements.length)break;
    }
   }
   return {...row,placements:placements.sort((a,b)=>a.max_capacity-b.max_capacity||a.name.localeCompare(b.name))};
  });
  return {now:clock,services,entries};
 }));
 app.post('/waitlist',{config},(request,reply)=>withStaff(app,request,async claims=>{
  const data=waitlistInput.parse(request.body);const clock=now();
  const row=await reservationTransaction(claims.tenant_id,async tx=>{
   const input=await loadAvailability(tx,data.service_date,data.party_size,clock);
   const service=serviceWindows(data.service_date,input.timezone,input.openingHours).find(s=>s.date===data.service_date&&s.key===data.service_key);
   if(!service||clock>=new Date(service.end)||data.party_size>Math.min(input.settings.total_capacity,input.settings.max_covers_per_slot)||!computeAvailability({...input,date:service&&clock>=new Date(service.start)?dateInZone(clock,input.timezone):data.service_date,existingReservations:[],settings:{...input.settings,min_lead_time_min:0,auto_assign_tables:false}}).some(s=>s.available&&new Date(s.starts_at)>=new Date(service.start)&&new Date(s.starts_at)<new Date(service.end)))throw new DomainError('SLOT_UNAVAILABLE');
   const result=await tx.waitlistEntry.create({data:{tenant_id:claims.tenant_id,surname:data.surname,party_size:data.party_size,service_key:service.key,service_date:new Date(`${service.date}T00:00:00Z`),service_label:service.label,service_start:new Date(service.start),service_end:new Date(service.end)}});
   await tx.auditLog.create({data:{tenant_id:claims.tenant_id,staff_user_id:claims.sub,action:'waitlist.create',entity_type:'WaitlistEntry',entity_id:result.id}});return result;
  });reply.code(201);return row;
 }));
 app.patch('/waitlist/:id/left',{config},request=>withStaff(app,request,async claims=>reservationTransaction(claims.tenant_id,async tx=>{
  const {id}=idParam.parse(request.params);const row=await tx.waitlistEntry.findUnique({where:{id}});if(!row)throw new DomainError('NOT_FOUND',404);
  if(row.status!=='waiting')throw new DomainError('INVALID_TRANSITION');
  const result=await tx.waitlistEntry.update({where:{id},data:{status:'left'}});
  await tx.auditLog.create({data:{tenant_id:claims.tenant_id,staff_user_id:claims.sub,action:'waitlist.left',entity_type:'WaitlistEntry',entity_id:id}});return result;
 })));
 app.post('/waitlist/:id/seat',{config},request=>withStaff(app,request,async claims=>{
  const {id}=idParam.parse(request.params);const data=seatingInput.parse(request.body);const clock=now();
  return reservationTransaction(claims.tenant_id,async tx=>{
   const row=await tx.waitlistEntry.findUnique({where:{id}});if(!row)throw new DomainError('NOT_FOUND',404);
   if(row.status!=='waiting'||row.anonymized_at)throw new DomainError('INVALID_TRANSITION');
   const instant=new Date(data.reserved_at);
   if(clock<row.service_start||clock>=row.service_end||instant<row.service_start||instant>=row.service_end)throw new DomainError('SLOT_UNAVAILABLE');
   const tenant=await tx.tenant.findFirstOrThrow();const input=await loadAvailability(tx,dateInZone(instant,tenant.timezone),row.party_size,clock);
   input.settings={...input.settings,min_lead_time_min:0,auto_assign_tables:false};
   if(instant.getTime()+input.settings.turn_duration_min*60000>row.service_end.getTime())throw new DomainError('SLOT_UNAVAILABLE');
   requireSlot(input,instant);
   const group=data.table_group_id?await checkGroup(tx,input,data.table_group_id,instant,input.settings.turn_duration_min):null;
   if(data.table_id)checkTable(input,data.table_id,instant,input.settings.turn_duration_min);
   const customer=await tx.customer.create({data:{tenant_id:claims.tenant_id,full_name:row.surname}});
   const reservation=await tx.reservation.create({data:{tenant_id:claims.tenant_id,customer_id:customer.id,table_id:data.table_id??null,table_group_id:group?.id??null,table_group_name:group?.name??null,reserved_at:instant,duration_min:input.settings.turn_duration_min,party_size:row.party_size,status:'seated',source:'staff',locale:tenant.locale_default,cancel_token:randomBytes(32).toString('hex')}});
   if(group)await snapshotGroup(tx,claims.tenant_id,reservation.id,group);
   await tx.waitlistEntry.update({where:{id},data:{status:'seated',reservation_id:reservation.id}});
   await tx.auditLog.create({data:{tenant_id:claims.tenant_id,staff_user_id:claims.sub,action:'waitlist.seat',entity_type:'WaitlistEntry',entity_id:id,metadata:{reservation_id:reservation.id}}});
   return tx.reservation.findUniqueOrThrow({where:{id:reservation.id},include:{customer:true,table:true,assignedTables:true}});
  });
 }));
}
