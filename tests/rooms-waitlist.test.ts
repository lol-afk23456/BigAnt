import { afterAll,afterEach,beforeAll,beforeEach,expect,test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { admin,fixtures,secret } from './helpers';
import { buildApp } from '../apps/api/src/app';
import { disconnectDatabase } from '../packages/database/src/index';
import { serviceWindows,chooseTable } from '../packages/core/src/index';
import { serverClock } from '../apps/api/src/clock';
import { retention } from '../apps/api/src/privacy';
let app:ReturnType<typeof buildApp>,ids:string[],tokens:string[],tables:string[][],groups:string[],clock:Date,hash:string;
const headers=(n=0)=>({authorization:`Bearer ${tokens[n]}`});
const instant='2026-09-21T10:00:00.000Z';
beforeAll(async()=>{await fixtures();hash=(await admin.staffUser.findFirstOrThrow({where:{email:'owner@santalucia.test'}})).password_hash;});
beforeEach(async()=>{
 ids=[];tokens=[];tables=[];groups=[];clock=new Date(instant);app=buildApp({secret,now:()=>clock});
 for(let n=0;n<2;n++){
  const slug=`room-${randomUUID()}`;const tenant=await admin.tenant.create({data:{name:'Locale sala',slug,type:'restaurant',tenantSettings:{create:{min_lead_time_min:0,max_covers_per_slot:40,total_capacity:40,auto_assign_tables:true}},staffUser:{create:{email:'owner@room.test',full_name:'Titolare',role:'owner',password_hash:hash}},openingHours:{create:Array.from({length:7},(_,weekday)=>({weekday,start_time:new Date('1970-01-01T12:00:00Z'),end_time:new Date('1970-01-01T23:00:00Z'),label:'Servizio sala'}))},restaurantTable:{create:[{name:'A',zone:'Interno',max_capacity:4},{name:'B',zone:'Interno',max_capacity:4}]}}});ids.push(tenant.id);
  tables.push((await admin.restaurantTable.findMany({where:{tenant_id:tenant.id},orderBy:{name:'asc'}})).map(t=>t.id));
  const login=await app.inject({method:'POST',url:'/auth/login',payload:{slug,email:'owner@room.test',password:'bigant2026'}});expect(login.statusCode).toBe(200);tokens.push(login.json().access_token);
  const group=await app.inject({method:'POST',url:'/table-groups',headers:headers(n),payload:{name:'A + B',min_capacity:5,max_capacity:8,table_ids:tables[n]}});expect(group.statusCode).toBe(201);groups.push(group.json().id);
 }
});
afterEach(async()=>{await app.close();await admin.tenant.deleteMany({where:{id:{in:ids}}});});
afterAll(async()=>{await admin.$disconnect();await disconnectDatabase();});
const book=(index:number,fields:Record<string,unknown>,n=0)=>app.inject({method:'POST',url:'/reservations',headers:headers(n),payload:{full_name:`Ospite sala ${index}`,email:`sala${index}@example.test`,phone:`333123${String(index).padStart(4,'0')}`,party_size:2,reserved_at:instant,...fields}});
async function waiting(party_size=6,surname='Rossi',n=0){const list=await app.inject({url:'/waitlist?date=2026-09-21',headers:headers(n)});expect(list.statusCode).toBe(200);const service=list.json().services[0];return app.inject({method:'POST',url:'/waitlist',headers:headers(n),payload:{surname,party_size,service_date:service.date,service_key:service.key}});}

test('venti assegnazioni parallele singolo/combinazione: ogni componente occupato una volta',async()=>{
 const responses=await Promise.all(Array.from({length:20},(_,n)=>book(n,n%2?{table_id:tables[0]![0]}:{table_group_id:groups[0],party_size:6})));
 expect(responses.filter(r=>r.statusCode===201)).toHaveLength(1);expect(responses.filter(r=>r.statusCode===409)).toHaveLength(19);
 const reservation=await admin.reservation.findFirstOrThrow({where:{tenant_id:ids[0]}});
 if(reservation.table_group_id)expect(await admin.reservationTable.count({where:{reservation_id:reservation.id}})).toBe(2);
});
test('gruppi esterni, inattivi, duplicati o troppo capienti rifiutati; componenti e snapshot conservati',async()=>{
 const invalid={name:'Non consentita',min_capacity:1,max_capacity:9,table_ids:tables[0]};
 expect((await app.inject({method:'POST',url:'/table-groups',headers:headers(),payload:invalid})).statusCode).toBe(400);
 expect((await app.inject({method:'POST',url:'/table-groups',headers:headers(),payload:{...invalid,max_capacity:8,table_ids:[tables[0]![0],tables[1]![0]]}})).statusCode).toBe(400);
 expect((await app.inject({method:'PATCH',url:`/table-groups/${groups[0]}`,headers:headers(),payload:{table_ids:tables[1]}})).statusCode).toBe(400);
 expect((await book(20,{table_group_id:groups[1],party_size:6})).statusCode).toBe(409);
 const created=await book(21,{table_group_id:groups[0],party_size:6});expect(created.statusCode).toBe(201);expect(created.json().assignedTables.map((t:{table_name:string})=>t.table_name).sort()).toEqual(['A','B']);
 await app.inject({method:'PATCH',url:`/table-groups/${groups[0]}`,headers:headers(),payload:{name:'Nome nuovo',active:false}});
 await admin.restaurantTable.update({where:{id:tables[0]![0]},data:{name:'A nuovo'}});
 const edited=await app.inject({method:'PATCH',url:`/reservations/${created.json().id}`,headers:headers(),payload:{internal_notes:'Nota nuova'}});expect(edited.statusCode).toBe(200);expect(edited.json().table_group_name).toBe('A + B');expect(edited.json().assignedTables.map((t:{table_name:string})=>t.table_name).sort()).toEqual(['A','B']);
 expect((await book(22,{table_group_id:groups[0],party_size:6,reserved_at:'2026-09-21T15:00:00Z'})).statusCode).toBe(409);
});
test('assegnazione singola automatica invariata; cambio combinazione libera i componenti e preserva durata',async()=>{
 const groupedSlots=await app.inject({url:`/staff/availability?date=2026-09-21&party_size=6&table_group_id=${groups[0]}`,headers:headers()});expect(groupedSlots.statusCode).toBe(200);expect(groupedSlots.json().slots[0].available).toBe(true);
 const joined=await book(1,{table_group_id:groups[0],party_size:6});expect(joined.statusCode).toBe(201);const id=joined.json().id;
 expect((await book(2,{})).statusCode).toBe(409);
 await admin.tenantSettings.update({where:{tenant_id:ids[0]!},data:{turn_duration_min:120}});
 const change=await app.inject({method:'PATCH',url:`/reservations/${id}`,headers:headers(),payload:{table_id:tables[0]![0],party_size:4}});expect(change.statusCode).toBe(200);expect(change.json()).toMatchObject({duration_min:90,table_group_id:null,assignedTables:[]});
 const single=await book(3,{});expect(single.statusCode).toBe(201);expect(single.json().table_id).toBe(tables[0]![1]);
 const physical=[{id:'A',max_capacity:4,min_capacity:1,active:true}];expect(chooseTable(physical,[{table_id:null,table_ids:['A'],reserved_at:clock,duration_min:90,party_size:6,status:'confirmed'}],clock,90,2)).toBeUndefined();
});
test('lista FIFO, servizi e tenant isolati, nuovi ingressi possibili a sala piena',async()=>{
 expect((await book(1,{table_group_id:groups[0],party_size:6})).statusCode).toBe(201);
 const first=await waiting(2,'Primo');const second=await waiting(6,'Secondo');expect(first.statusCode).toBe(201);expect(second.statusCode).toBe(201);
 const list=(await app.inject({url:'/waitlist?date=2026-09-21',headers:headers()})).json();expect(list.entries.map((r:{surname:string})=>r.surname)).toEqual(['Primo','Secondo']);expect(list.entries[0].placements[0].starts_at).toBe('2026-09-21T11:30:00.000Z');
 expect((await app.inject({url:'/waitlist?date=2026-09-21',headers:headers(1)})).json().entries).toEqual([]);
 expect((await app.inject({url:'/waitlist?date=2026-09-22',headers:headers()})).json().entries).toEqual([]);
 expect((await app.inject({method:'POST',url:`/waitlist/${first.json().id}/seat`,headers:headers(1),payload:{reserved_at:instant,table_id:tables[1]![0]}})).statusCode).toBe(404);
 expect((await app.inject({url:'/waitlist?date=2026-09-21'})).statusCode).toBe(401);
});
test('doppio accomodamento in concorrenza crea una sola prenotazione, senza recapiti o notifiche',async()=>{
 const queued=await waiting();expect(queued.statusCode).toBe(201);const id=queued.json().id;
 const attempts=await Promise.all(Array.from({length:20},()=>app.inject({method:'POST',url:`/waitlist/${id}/seat`,headers:headers(),payload:{reserved_at:instant,table_group_id:groups[0]}})));
 expect(attempts.filter(r=>r.statusCode===200)).toHaveLength(1);expect(attempts.filter(r=>r.statusCode===409)).toHaveLength(19);
 const seated=attempts.find(r=>r.statusCode===200)!.json();expect(seated).toMatchObject({status:'seated',source:'staff',customer:{full_name:'Rossi',email:null,phone_e164:null,marketing_consent:false}});expect(seated.assignedTables).toHaveLength(2);
 expect(await admin.notificationLog.count({where:{tenant_id:ids[0]}})).toBe(0);
 expect((await app.inject({method:'PATCH',url:`/reservations/${seated.id}`,headers:headers(),payload:{status:'completed'}})).statusCode).toBe(200);
 expect((await app.inject({method:'PATCH',url:`/waitlist/${id}/left`,headers:headers()})).statusCode).toBe(409);
 const next=await waiting();expect((await app.inject({method:'POST',url:`/waitlist/${next.json().id}/seat`,headers:headers(),payload:{reserved_at:instant,table_group_id:groups[0]}})).statusCode).toBe(200);
});
test('servizio fotografato dopo cambio orari, oltre mezzanotte e DST; nessun accomodamento su chiusura',async()=>{
 const queued=await waiting(2);expect(queued.statusCode).toBe(201);
 const replace=await app.inject({method:'PUT',url:'/opening-hours',headers:headers(),payload:[{weekday:1,start_time:'19:00',end_time:'23:00'}]});expect(replace.statusCode).toBe(200);
 const list=(await app.inject({url:'/waitlist?date=2026-09-21',headers:headers()})).json();expect(list.services.some((s:{key:string;archived:boolean})=>s.key===queued.json().service_key&&s.archived)).toBe(true);expect(list.entries).toHaveLength(1);
 expect((await app.inject({method:'POST',url:`/waitlist/${queued.json().id}/seat`,headers:headers(),payload:{reserved_at:instant,table_id:tables[0]![0]}})).statusCode).toBe(409);
 clock=new Date('2026-09-21T22:10Z');
 const venue=await admin.tenant.findUniqueOrThrow({where:{id:ids[0]!}});tokens[0]=(await app.inject({method:'POST',url:'/auth/login',payload:{slug:venue.slug,email:'owner@room.test',password:'bigant2026'}})).json().access_token;
 await app.inject({method:'PUT',url:'/opening-hours',headers:headers(),payload:[{weekday:1,start_time:'20:00',end_time:'02:00'}]});
 const night=await app.inject({method:'POST',url:'/waitlist',headers:headers(),payload:{service_key:'2026-09-21:20:00-02:00',service_date:'2026-09-21',surname:'Notturno',party_size:2}});expect(night.statusCode).toBe(201);
 const tomorrow=await app.inject({url:'/waitlist?date=2026-09-22',headers:headers()});expect(tomorrow.json().entries.some((r:{id:string})=>r.id===night.json().id)).toBe(true);
 const serviceDay=await app.inject({url:'/waitlist?date=2026-09-21',headers:headers()});
 for(const result of [serviceDay,tomorrow]){
  const entry=result.json().entries.find((r:{id:string})=>r.id===night.json().id);
  expect(entry.placements.length).toBeGreaterThan(0);
  expect(entry.placements[0].starts_at).toBe('2026-09-21T22:15:00.000Z');
 }
 const overnight=serviceWindows('2026-09-22','Europe/Rome',[{weekday:1,start_time:'20:00',end_time:'02:00'}]);expect(overnight).toHaveLength(1);expect(overnight[0]).toMatchObject({date:'2026-09-21',start:'2026-09-21T18:00:00.000Z',end:'2026-09-22T00:00:00.000Z'});
 const dst=serviceWindows('2026-10-25','Europe/Rome',[{weekday:0,start_time:'01:00',end_time:'03:00'}]);expect(new Date(dst[0]!.end).getTime()-new Date(dst[0]!.start).getTime()).toBe(3*3600000);
});
test('tavoli inattivi o ridotti invalidano nuove combinazioni; owner e staff hanno permessi distinti',async()=>{
 await admin.restaurantTable.update({where:{id:tables[0]![0]},data:{active:false}});expect((await book(1,{table_group_id:groups[0],party_size:6})).statusCode).toBe(409);
 await admin.restaurantTable.update({where:{id:tables[0]![0]},data:{active:true,max_capacity:1}});expect((await book(2,{table_group_id:groups[0],party_size:6})).statusCode).toBe(409);
 await admin.staffUser.create({data:{tenant_id:ids[0]!,email:'staff@room.test',full_name:'Operatore',role:'staff',password_hash:hash}});const tenant=await admin.tenant.findUniqueOrThrow({where:{id:ids[0]!}});const login=await app.inject({method:'POST',url:'/auth/login',payload:{slug:tenant.slug,email:'staff@room.test',password:'bigant2026'}});const staff={authorization:`Bearer ${login.json().access_token}`};
 expect((await app.inject({url:'/table-groups',headers:staff})).statusCode).toBe(200);expect((await app.inject({method:'PATCH',url:`/table-groups/${groups[0]}`,headers:staff,payload:{active:false}})).statusCode).toBe(403);
 expect((await app.inject({method:'PATCH',url:`/table-groups/${groups[1]}`,headers:headers(),payload:{active:false}})).statusCode).toBe(404);
});
test('anonimizzazione e retention cancellano anche cognomi della fila, preservando lo storico',async()=>{
 const queued=await waiting(2);const seat=await app.inject({method:'POST',url:`/waitlist/${queued.json().id}/seat`,headers:headers(),payload:{reserved_at:instant,table_id:tables[0]![0]}});expect(seat.statusCode).toBe(200);
 expect((await app.inject({method:'DELETE',url:`/customers/${seat.json().customer.id}`,headers:headers()})).statusCode).toBe(200);
 expect((await admin.waitlistEntry.findUniqueOrThrow({where:{id:queued.json().id}})).surname).toBe('Cliente anonimizzato');
 const old=await admin.waitlistEntry.create({data:{tenant_id:ids[0]!,surname:'Vecchio cognome',party_size:2,service_key:'old',service_date:new Date('2023-01-01'),service_start:new Date('2023-01-01T10:00Z'),service_end:new Date('2023-01-01T20:00Z'),status:'left'}});
 await retention(ids[0]!,clock);await retention(ids[0]!,clock);expect((await admin.waitlistEntry.findUniqueOrThrow({where:{id:old.id}})).surname).toBe('Cliente anonimizzato');expect(await admin.auditLog.count({where:{tenant_id:ids[0],action:'retention.waitlist.month'}})).toBe(1);
});

test('orologio browser vietato in produzione o sul database di sviluppo',()=>{
 const env={BIGANT_TEST_CLOCK:'2026-09-21T10:00Z',NOTIFICATION_MODE:'demo',DATABASE_URL:'postgresql://local/bigant_test',NODE_ENV:'test'};
 expect(serverClock(env)().toISOString()).toMatch(/^2026-09-21T10:00:/);
 expect(()=>serverClock({...env,NODE_ENV:'production'})).toThrow('TEST_CLOCK_FORBIDDEN');
 expect(()=>serverClock({...env,DATABASE_URL:'postgresql://local/bigant'})).toThrow('TEST_CLOCK_FORBIDDEN');
 expect(()=>serverClock({...env,NOTIFICATION_MODE:'live'})).toThrow('TEST_CLOCK_FORBIDDEN');
});
