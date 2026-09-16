import { DateTime } from 'luxon';
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import type { ReservationStatus } from './availability.js';
export * from './availability';
export class DomainError extends Error {
  constructor(public code: 'INVALID_IMAGE' | 'CATEGORY_NOT_EMPTY' | 'INVALID_PHONE' | 'INVALID_TRANSITION' | 'SLOT_UNAVAILABLE' | 'PACING_LIMIT' | 'TABLE_UNAVAILABLE' | 'CANCELLATION_CLOSED' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_INPUT', public statusCode = 409) { super(code); }
}
export function normalizePhone(value: string): string {
  const phone = parsePhoneNumberFromString(value.trim().replace(/^00/,'+'),{defaultCountry:'IT',extract:false});
  if (!phone?.isValid() || phone.ext) throw new DomainError('INVALID_PHONE',400);
  return phone.number;
}
const transitions: Record<ReservationStatus,ReservationStatus[]> = {
  pending:['confirmed','cancelled'], confirmed:['seated','cancelled','no_show'], seated:['completed'], completed:[], cancelled:[], no_show:[],
};
export function assertTransition(from: ReservationStatus,to: ReservationStatus) {
  if (!transitions[from].includes(to)) throw new DomainError('INVALID_TRANSITION');
}

// Conversioni al bordo UI: mai dipendere dal fuso del browser.
export function dateTimeInZone(instant:string, zone:string):string {
  return DateTime.fromISO(instant,{zone}).toFormat("yyyy-MM-dd'T'HH:mm");
}
export function dateTimeToUTC(value:string, zone:string):string|null {
  const parsed=DateTime.fromISO(value,{zone});
  if (!parsed.isValid || parsed.toFormat("yyyy-MM-dd'T'HH:mm")!==value) return null;
  return parsed.getPossibleOffsets().sort((a,b)=>a.toMillis()-b.toMillis())[0]!.toUTC().toISO();
}
