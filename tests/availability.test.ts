import { describe, expect, test } from 'vitest';
import { computeAvailability, chooseTable, normalizePhone, assertTransition, type AvailabilityInput } from '../packages/core/src/index.js';
const settings = { slot_granularity_min: 15, turn_duration_min: 90, max_covers_per_slot: 12, total_capacity: 40, min_lead_time_min: 60, max_advance_days: 60, auto_assign_tables: false };
function input(overrides: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return { date: '2026-09-20', timezone: 'Europe/Rome', partySize: 2, now: new Date('2026-09-19T08:00:00Z'), settings, openingHours: [{weekday:0,start_time:'12:00',end_time:'15:00'}], blackouts: [], tables: [{id:'small',min_capacity:1,max_capacity:2,active:true},{id:'large',min_capacity:1,max_capacity:8,active:true}], existingReservations: [], ...overrides };
}
const reservation = (start: string, size=2, duration=90, table_id: string|null=null) => ({ reserved_at: new Date(start),party_size:size,duration_min:duration,status:'confirmed' as const,table_id });
test('genera soltanto fasce che terminano entro lo stesso servizio', () => {
 const slots=computeAvailability(input({openingHours:[{weekday:0,start_time:'12:00',end_time:'15:00'},{weekday:0,start_time:'19:00',end_time:'23:30'}]}));
 expect(slots[0]!.time).toBe('12:00');expect(slots.some(s=>s.time==='13:30')).toBe(true);expect(slots.some(s=>s.time==='13:45')).toBe(false);expect(slots.some(s=>s.time==='15:00')).toBe(false);expect(slots.at(-1)!.time).toBe('22:00');
});
test('giorno chiuso e chiusura totale non producono disponibilità',()=>{
 expect(computeAvailability(input({openingHours:[]}))).toEqual([]);
 expect(computeAvailability(input({blackouts:[{date:'2026-09-20',start_time:null,end_time:null}]})).every(s=>!s.available&&s.reason==='closed')).toBe(true);
});
test('blackout parziale verifica tutta la permanenza e bordi senza sovrapposizione',()=>{
 const slots=computeAvailability(input({blackouts:[{date:'2026-09-20',start_time:'13:30',end_time:'14:00'}]}));
 expect(slots.find(s=>s.time==='12:00')!.available).toBe(true);
 expect(slots.find(s=>s.time==='12:15')!.reason).toBe('closed');
});
test('capienza usa tutta la finestra; pacing limita solo gli inizi simultanei',()=>{
 const full=computeAvailability(input({existingReservations:[reservation('2026-09-20T09:30:00Z',39)]}));
 expect(full[0]!.reason).toBe('full');
 const paced=computeAvailability(input({partySize:1,existingReservations:[reservation('2026-09-20T10:00:00Z',12)]}));
 expect(paced[0]!.reason).toBe('pacing_limit');expect(paced[1]!.available).toBe(true);
});
test('capienza override e stati terminali',()=>{
 expect(computeAvailability(input({openingHours:[{weekday:0,start_time:'12:00',end_time:'15:00',capacity_override:1}]}))[0]!.reason).toBe('full');
 expect(computeAvailability(input({existingReservations:[{...reservation('2026-09-20T10:00:00Z',40),status:'cancelled'}]}))[0]!.available).toBe(true);
});
test('anticipo minimo e massimo',()=>{
 expect(computeAvailability(input({now:new Date('2026-09-20T09:30:00Z')}))[0]!.reason).toBe('too_soon');
 expect(computeAvailability(input({now:new Date('2026-01-01T00:00:00Z')}))[0]!.reason).toBe('too_far');
});
test('gruppo maggiore di ogni tavolo dipende dalla assegnazione automatica',()=>{
 expect(computeAvailability(input({partySize:10}))[0]!.available).toBe(true);
 expect(computeAvailability(input({partySize:10,settings:{...settings,auto_assign_tables:true}}))[0]!.reason).toBe('no_table');
});
test('sceglie il tavolo libero più piccolo e considera min_capacity',()=>{
 const data=input();
 expect(chooseTable(data.tables,[],new Date('2026-09-20T10:00:00Z'),90,2)?.id).toBe('small');
 expect(chooseTable(data.tables,[reservation('2026-09-20T10:00:00Z',2,90,'small')],new Date('2026-09-20T10:00:00Z'),90,2)?.id).toBe('large');
 expect(chooseTable([{id:'x',min_capacity:4,max_capacity:8,active:true}],[],new Date(),90,2)).toBeUndefined();
});
test('servizio oltre mezzanotte: date civili e prenotazioni del giorno prima',()=>{
 const data=input({openingHours:[{weekday:6,start_time:'22:00',end_time:'02:00'}]});
 const slots=computeAvailability(data);expect(slots.map(s=>s.time)).toEqual(['00:00','00:15','00:30']);
 expect(computeAvailability({...data,existingReservations:[reservation('2026-09-19T21:45:00Z',39)]})[0]!.reason).toBe('full');
});
describe('cambio ora Europe/Rome',()=>{
 test('29 marzo: nessuna fascia nell’ora inesistente, durata reale preservata',()=>{
  const slots=computeAvailability(input({date:'2026-03-29',now:new Date('2026-03-28T00:00:00Z'),openingHours:[{weekday:0,start_time:'00:00',end_time:'05:00'}],settings:{...settings,turn_duration_min:60}}));
  expect(slots.some(s=>s.time.startsWith('02:'))).toBe(false);expect(slots.some(s=>s.time==='03:00')).toBe(true);
 });
 test('25 ottobre 2026 e 26 ottobre 2025: distingue le due 02:00',()=>{
  for(const date of ['2026-10-25','2025-10-26']) {
   const slots=computeAvailability(input({date,now:new Date(`${date.slice(0,4)}-10-01T00:00:00Z`),openingHours:[{weekday:0,start_time:'00:00',end_time:'05:00'}],settings:{...settings,turn_duration_min:60}}));
   const repeated=slots.filter(s=>s.time==='02:00');expect(repeated).toHaveLength(2);expect(repeated[0]!.starts_at).not.toBe(repeated[1]!.starts_at);
  }
 });
 test('30 marzo e 26 ottobre 2026: giorni successivi regolari',()=>{
  for(const date of ['2026-03-30','2026-10-26']) {
   const slots=computeAvailability(input({date,now:new Date(`${date.slice(0,7)}-01T00:00:00Z`),openingHours:[{weekday:1,start_time:'00:00',end_time:'05:00'}],settings:{...settings,turn_duration_min:60}}));
   expect(slots.filter(s=>s.time==='02:00')).toHaveLength(1);
  }
 });
});
test('telefono E.164, prefisso italiano e zero significativo dei fissi',()=>{
 expect(normalizePhone('333 123 4567')).toBe('+393331234567');expect(normalizePhone('0039 3331234567')).toBe('+393331234567');expect(normalizePhone('02 12345678')).toBe('+390212345678');expect(()=>normalizePhone('123')).toThrow();
});
test('macchina a stati rifiuta riapertura e salto di stato',()=>{
 expect(()=>assertTransition('pending','confirmed')).not.toThrow();expect(()=>assertTransition('pending','completed')).toThrow();expect(()=>assertTransition('cancelled','confirmed')).toThrow();expect(()=>assertTransition('seated','completed')).not.toThrow();
});
