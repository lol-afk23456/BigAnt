import { DateTime } from 'luxon';

export interface AvailabilitySettings {
  slot_granularity_min: number; turn_duration_min: number; max_covers_per_slot: number;
  total_capacity: number; min_lead_time_min: number; max_advance_days: number; auto_assign_tables: boolean;
}
export interface Opening { weekday: number; start_time: string; end_time: string; capacity_override?: number | null }
export interface Blackout { date: string; start_time: string | null; end_time: string | null }
export interface Table { id: string; min_capacity: number; max_capacity: number; active: boolean }
export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
export interface Occupancy { reserved_at: Date; duration_min: number; party_size: number; status: ReservationStatus; table_id: string | null }
export interface AvailabilityInput {
  date: string; timezone: string; partySize: number; now: Date; settings: AvailabilitySettings;
  openingHours: Opening[]; blackouts: Blackout[]; tables: Table[]; existingReservations: Occupancy[];
}
export type SlotReason = 'closed' | 'too_soon' | 'too_far' | 'full' | 'pacing_limit' | 'no_table';
export interface Slot { starts_at: string; time: string; offset: string; available: boolean; reason?: SlotReason; table_id?: string }
export const activeStatuses: ReservationStatus[] = ['pending','confirmed','seated'];
const minute = 60_000;
export const overlaps = (start: number, end: number, otherStart: number, otherEnd: number) => start < otherEnd && end > otherStart;
export function dateInZone(instant: Date, zone: string): string {
  return DateTime.fromJSDate(instant, {zone}).toISODate()!;
}
export function addDays(date: string, days: number): string { return DateTime.fromISO(date, {zone:'UTC'}).plus({days}).toISODate()!; }
export function dayBounds(date: string, zone: string) {
  const start = DateTime.fromISO(date, {zone}).startOf('day');
  return { start: start.toJSDate(), end: start.plus({days:1}).toJSDate() };
}
// In autunno il servizio copre entrambe le occorrenze dell'ora ripetuta.
function boundary(date: string, time: string, zone: string, end: boolean): number {
  const value = DateTime.fromISO(`${date}T${time}`, {zone});
  const choices = value.getPossibleOffsets().map(d => d.toMillis());
  return end ? Math.max(...choices) : Math.min(...choices);
}
function interval(date: string, start: string, end: string, zone: string) {
  return {start:boundary(date,start,zone,false),end:boundary(end <= start ? addDays(date,1) : date,end,zone,true)};
}
export function chooseTable(tables: Table[], reservations: Occupancy[], start: Date, duration: number, partySize: number): Table | undefined {
  const from = start.getTime(), to = from + duration * minute;
  return tables.filter(table => table.active && table.min_capacity <= partySize && table.max_capacity >= partySize && !reservations.some(r => activeStatuses.includes(r.status) && r.table_id === table.id && overlaps(from,to,r.reserved_at.getTime(),r.reserved_at.getTime()+r.duration_min*minute)))
    .sort((a,b) => a.max_capacity-b.max_capacity || a.id.localeCompare(b.id))[0];
}
export function computeAvailability(input: AvailabilityInput): Slot[] {
  const {date,timezone,partySize,now,settings,openingHours,blackouts,tables,existingReservations} = input;
  if (settings.slot_granularity_min <= 0 || settings.turn_duration_min <= 0 || partySize < 1) return [];
  const {start:dayStart,end:dayEnd} = dayBounds(date,timezone);
  const reservations = existingReservations.filter(r => activeStatuses.includes(r.status));
  const closures = blackouts.map(b => b.start_time !== null && b.end_time !== null ? interval(b.date,b.start_time,b.end_time,timezone) : {start:dayBounds(b.date,timezone).start.getTime(),end:dayBounds(b.date,timezone).end.getTime()});
  const slots = new Map<number,Slot>();
  for (const serviceDate of [addDays(date,-1),date]) {
    const weekday = DateTime.fromISO(serviceDate,{zone:timezone}).weekday % 7;
    for (const opening of openingHours.filter(o=>o.weekday===weekday)) {
      const service = interval(serviceDate,opening.start_time,opening.end_time,timezone);
      for (let start=service.start;start+settings.turn_duration_min*minute<=service.end;start+=settings.slot_granularity_min*minute) {
        if (start<dayStart.getTime() || start>=dayEnd.getTime()) continue;
        const end=start+settings.turn_duration_min*minute;
        const local=DateTime.fromMillis(start,{zone:timezone});
        const concurrent=reservations.filter(r=>overlaps(start,end,r.reserved_at.getTime(),r.reserved_at.getTime()+r.duration_min*minute));
        const pace=reservations.filter(r=>r.reserved_at.getTime()===start).reduce((sum,r)=>sum+r.party_size,0);
        const table=chooseTable(tables,reservations,new Date(start),settings.turn_duration_min,partySize);
        let reason: SlotReason | undefined;
        if (closures.some(b=>overlaps(start,end,b.start,b.end))) reason='closed';
        else if (start<now.getTime()+settings.min_lead_time_min*minute) reason='too_soon';
        else if (start>now.getTime()+settings.max_advance_days*86400000) reason='too_far';
        else if (concurrent.reduce((sum,r)=>sum+r.party_size,0)+partySize>(opening.capacity_override ?? settings.total_capacity)) reason='full';
        else if (pace+partySize>settings.max_covers_per_slot) reason='pacing_limit';
        else if (settings.auto_assign_tables && !table) reason='no_table';
        const slot: Slot={starts_at:new Date(start).toISOString(),time:local.toFormat('HH:mm'),offset:local.toFormat('ZZ'),available:!reason,...(reason?{reason}:{}),...(settings.auto_assign_tables&&table&&!reason?{table_id:table.id}:{})};
        // Con orari sovrapposti prevale il servizio che può accogliere il gruppo.
        if (!slots.get(start)?.available) slots.set(start,slot);
      }
    }
  }
  return [...slots.entries()].sort(([a],[b])=>a-b).map(([,slot])=>slot);
}
