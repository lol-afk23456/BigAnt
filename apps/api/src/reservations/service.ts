import { randomBytes } from 'node:crypto';
import { db, reservationTransaction, type TenantTransaction } from '@bigant/database';
import { computeAvailability, chooseTable, normalizePhone, assertTransition, DomainError, activeStatuses, dateInZone, addDays, dayBounds, type AvailabilityInput, type Slot } from '@bigant/core';
import type { StaffBookingInput, BookingInput, ReservationPatch } from '@bigant/types';

type Reader = TenantTransaction;
export async function loadAvailability(reader: Reader, date: string, partySize: number, now: Date, excludeId?: string): Promise<AvailabilityInput> {
  const [tenant,settings,openingHours,blackouts,tables,reservations] = await Promise.all([
    reader.tenant.findFirstOrThrow(),reader.tenantSettings.findFirstOrThrow(),reader.openingHours.findMany(),reader.blackoutDate.findMany(),reader.restaurantTable.findMany(),
    reader.reservation.findMany({where:{status:{in:activeStatuses},...(excludeId?{id:{not:excludeId}}:{})}}),
  ]);
  return {date,timezone:tenant.timezone,partySize,now,settings,openingHours:openingHours.map(o=>({...o,start_time:o.start_time.toISOString().slice(11,16),end_time:o.end_time.toISOString().slice(11,16)})),blackouts:blackouts.map(b=>({...b,date:b.date.toISOString().slice(0,10),start_time:b.start_time?.toISOString().slice(11,16)??null,end_time:b.end_time?.toISOString().slice(11,16)??null})),tables,existingReservations:reservations};
}
export function availabilityResult(input: AvailabilityInput) {
  const slots=computeAvailability(input);
  const alternatives: Array<{date:string;slots:Slot[]}> = [];
  if (!slots.some(s=>s.available)) {
    const today=dateInZone(input.now,input.timezone);
    const limit=addDays(today,input.settings.max_advance_days);
    for(let date=input.date<today?today:addDays(input.date,1);date<=limit&&alternatives.length<2;date=addDays(date,1)) {
      const future=computeAvailability({...input,date}).filter(s=>s.available);
      if(future.length) alternatives.push({date,slots:future});
    }
  }
  // L'id del tavolo non è un'informazione necessaria al cliente pubblico.
  const publicSlots=(values:Slot[])=>values.map(({starts_at,time,offset,available,reason})=>({starts_at,time,offset,available,...(reason?{reason}:{})}));
  return {date:input.date,timezone:input.timezone,slots:publicSlots(slots),alternatives:alternatives.map(a=>({...a,slots:publicSlots(a.slots)}))};
}
function requireSlot(input:AvailabilityInput, instant:Date) {
  const slot=computeAvailability(input).find(s=>new Date(s.starts_at).getTime()===instant.getTime());
  if(!slot?.available) throw new DomainError(slot?.reason==='pacing_limit'?'PACING_LIMIT':'SLOT_UNAVAILABLE');
  return slot;
}
function checkTable(input:AvailabilityInput, tableId:string, instant:Date, duration:number) {
  if(!chooseTable(input.tables.filter(t=>t.id===tableId),input.existingReservations,instant,duration,input.partySize)) throw new DomainError('TABLE_UNAVAILABLE');
}
export async function createReservation(tenantId:string, data:BookingInput|StaffBookingInput, now:Date, staffId?:string) {
  const phone=normalizePhone(data.phone);
  return reservationTransaction(tenantId,async tx=>{
    const tenant=await tx.tenant.findFirstOrThrow();
    if(tenant.status!=='active') throw new DomainError('NOT_FOUND',404);
    const instant=new Date(data.reserved_at);
    const input=await loadAvailability(tx,dateInZone(instant,tenant.timezone),data.party_size,now);
    const slot=requireSlot(input,instant);
    const requested='table_id' in data?data.table_id:undefined;
    if(requested) checkTable(input,requested,instant,input.settings.turn_duration_min);
    const settings=await tx.tenantSettings.findFirstOrThrow();
    // Per una prenotazione pubblica non si sovrascrivono i contatti già presenti.
    const customer=await tx.customer.upsert({where:{tenant_id_phone_e164:{tenant_id:tenantId,phone_e164:phone}},create:{tenant_id:tenantId,full_name:data.full_name,phone_e164:phone,email:data.email},update:staffId?{full_name:data.full_name,email:data.email}:{}});
    return tx.reservation.create({data:{tenant_id:tenantId,customer_id:customer.id,table_id:requested??slot.table_id??null,reserved_at:instant,duration_min:settings.turn_duration_min,party_size:data.party_size,status:settings.auto_confirm?'confirmed':'pending',source:staffId&&'source' in data?data.source:'direct',notes:data.notes,cancel_token:randomBytes(32).toString('hex')},include:{customer:true,table:true}});
  });
}
export async function patchReservation(tenantId:string,id:string,data:ReservationPatch,now:Date,staffId:string) {
  return reservationTransaction(tenantId,async tx=>{
    const current=await tx.reservation.findUnique({where:{id}});
    if(!current) throw new DomainError('NOT_FOUND',404);
    if(data.status) assertTransition(current.status,data.status);
    const geometry=data.reserved_at!==undefined||data.party_size!==undefined;
    if((geometry||data.table_id!==undefined)&&!activeStatuses.includes(current.status)) throw new DomainError('INVALID_TRANSITION');
    if(current.status==='seated'&&geometry) throw new DomainError('INVALID_TRANSITION');
    const tenant=await tx.tenant.findFirstOrThrow();
    const instant=data.reserved_at?new Date(data.reserved_at):current.reserved_at;
    const party=data.party_size??current.party_size;
    let tableId=data.table_id===undefined?current.table_id:data.table_id;
    if(geometry||data.table_id!==undefined) {
      const input=await loadAvailability(tx,dateInZone(instant,tenant.timezone),party,now,id);
      // La durata storica resta quella della prenotazione, anche se cambiano le impostazioni.
      input.settings={...input.settings,turn_duration_min:current.duration_min};
      if(geometry) {
        const slot=requireSlot(input,instant);
        if(data.table_id===undefined&&input.settings.auto_assign_tables) tableId=slot.table_id??null;
      }
      if(tableId) checkTable(input,tableId,instant,current.duration_min);
    }
    const updated=await tx.reservation.update({where:{id},data:{...data,reserved_at:instant,table_id:tableId,...(data.status==='cancelled'?{cancelled_by:'staff' as const}:{})},include:{customer:true,table:true}});
    if(data.status==='completed') await tx.customer.update({where:{id:current.customer_id},data:{total_visits:{increment:1},last_visit_at:current.reserved_at}});
    if(data.status==='no_show') await tx.customer.update({where:{id:current.customer_id},data:{no_show_count:{increment:1}}});
    if(data.status==='cancelled') await tx.auditLog.create({data:{tenant_id:tenantId,staff_user_id:staffId,action:'reservation.cancel',entity_type:'Reservation',entity_id:id}});
    return updated;
  });
}
export async function cancellationView(id:string,now:Date) {
  const reservation=await db.reservation.findUnique({where:{id}});
  if(!reservation) throw new DomainError('NOT_FOUND',404);
  const tenant=await db.tenant.findFirstOrThrow();
  if(tenant.status!=='active') throw new DomainError('NOT_FOUND',404);
  const settings=await db.tenantSettings.findFirstOrThrow();
  const canCancel=['pending','confirmed'].includes(reservation.status)&&now.getTime()<=reservation.reserved_at.getTime()-settings.cancellation_deadline_hours*3600000;
  return {reserved_at:reservation.reserved_at,party_size:reservation.party_size,status:reservation.status,can_cancel:canCancel,cancellation_deadline: new Date(reservation.reserved_at.getTime()-settings.cancellation_deadline_hours*3600000),tenant:{name:tenant.name,slug:tenant.slug,phone:tenant.phone,timezone:tenant.timezone}};
}
export async function cancelPublic(tenantId:string,id:string,now:Date) {
  return reservationTransaction(tenantId,async tx=>{
    const current=await tx.reservation.findUnique({where:{id}});
    if(!current) throw new DomainError('NOT_FOUND',404);
    const tenant=await tx.tenant.findFirstOrThrow();
    if(tenant.status!=='active') throw new DomainError('NOT_FOUND',404);
    if(current.status==='cancelled') return {status:'cancelled' as const};
    const settings=await tx.tenantSettings.findFirstOrThrow();
    if(now.getTime()>current.reserved_at.getTime()-settings.cancellation_deadline_hours*3600000) throw new DomainError('CANCELLATION_CLOSED');
    assertTransition(current.status,'cancelled');
    await tx.reservation.update({where:{id},data:{status:'cancelled',cancelled_by:'customer'}});
    return {status:'cancelled' as const};
  });
}
export async function listReservations(date:string,status?:AvailabilityInput['existingReservations'][number]['status']) {
  const tenant=await db.tenant.findFirstOrThrow();
  const bounds=dayBounds(date,tenant.timezone);
  return db.reservation.findMany({where:{reserved_at:{gte:bounds.start,lt:bounds.end},...(status?{status}:{})},include:{customer:true,table:true},orderBy:{reserved_at:'asc'}});
}
