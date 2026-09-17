import { DateTime } from 'luxon';
import type { ReservationStatus } from './availability.js';

// Stessa regola per il canale originale e per il passaggio da SMS a email.
export function reservationNotificationIsCurrent(event:string,reservation:{status:ReservationStatus;reserved_at:Date},eventReservedAt:unknown,now:Date) {
 if(event==='reminder')return reservation.status==='confirmed'&&eventReservedAt===reservation.reserved_at.toISOString()&&reservation.reserved_at>now;
 if(event==='pending')return reservation.status==='pending';
 if(event==='created'||event==='confirmed')return ['confirmed','seated','completed'].includes(reservation.status);
 return true;
}

export function calendarPeriod(now:Date,zone:string,retentionMonths=24) {
 const local=DateTime.fromJSDate(now,{zone});const start=local.startOf('month');
 return {period:local.toFormat('yyyy-MM'),start:start.toJSDate(),end:start.plus({months:1}).toJSDate(),cutoff:local.minus({months:retentionMonths}).toJSDate()};
}
