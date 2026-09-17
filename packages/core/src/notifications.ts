import { DateTime } from 'luxon';
export function calendarPeriod(now:Date,zone:string,retentionMonths=24) {
 const local=DateTime.fromJSDate(now,{zone});const start=local.startOf('month');
 return {period:local.toFormat('yyyy-MM'),start:start.toJSDate(),end:start.plus({months:1}).toJSDate(),cutoff:local.minus({months:retentionMonths}).toJSDate()};
}
