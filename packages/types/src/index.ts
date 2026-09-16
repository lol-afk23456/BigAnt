import { z } from 'zod';
export const loginInput = z.object({
  slug: z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  email: z.email().max(254).transform(value => value.toLowerCase().trim()),
  password: z.string().min(1).max(256),
}).strict();
export const staffClaims = z.object({
  sub: z.uuid(), tenant_id: z.uuid(), sid: z.uuid(), role: z.enum(['owner','staff']),
  kind: z.enum(['access','refresh']),
});
export type StaffClaims = z.infer<typeof staffClaims>;

export const dateInput = z.iso.date();
export const availabilityQuery = z.object({ date: dateInput, party_size: z.coerce.number().int().min(1).max(500) }).strict();
export const reservationStatus = z.enum(['pending','confirmed','seated','completed','cancelled','no_show']);
const customerInput = {
  full_name: z.string().trim().min(2).max(120), phone: z.string().trim().min(5).max(40), email: z.email().max(254),
};
export const bookingInput = z.object({
  ...customerInput, reserved_at: z.iso.datetime({offset:true}), party_size: z.number().int().min(1).max(500), notes: z.string().trim().max(1000).default(''),
}).strict();
export const publicBookingInput = bookingInput.extend({ website: z.string().max(200).default(''), form_token: z.string().max(1500) }).strict();
export const staffBookingInput = bookingInput.extend({ source: z.enum(['staff','phone']).default('phone'), table_id: z.uuid().nullable().optional() }).strict();
export const reservationPatch = z.object({
  reserved_at: z.iso.datetime({offset:true}).optional(), party_size:z.number().int().min(1).max(500).optional(),
  status:reservationStatus.optional(), table_id:z.uuid().nullable().optional(), notes:z.string().max(1000).optional(), internal_notes:z.string().max(2000).optional(),
}).strict().refine(value=>Object.keys(value).length>0);
export const reservationQuery = z.object({ date:dateInput, status:reservationStatus.optional() }).strict();
export const idParam = z.object({id:z.uuid()});
export const slugParam = z.object({slug:z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)});
export const tokenParam = z.object({cancelToken:z.string().regex(/^[a-f0-9]{64}$/)});
export type BookingInput = z.infer<typeof bookingInput>;
export type StaffBookingInput = z.infer<typeof staffBookingInput>;
export type ReservationPatch = z.infer<typeof reservationPatch>;

export const settingsInput = z.object({
  slot_granularity_min:z.number().int().min(5).max(60),turn_duration_min:z.number().int().min(15).max(720),max_covers_per_slot:z.number().int().min(1).max(500),total_capacity:z.number().int().min(1).max(500),min_lead_time_min:z.number().int().min(0).max(10080),max_advance_days:z.number().int().min(1).max(365),auto_confirm:z.boolean(),cancellation_deadline_hours:z.number().int().min(0).max(168),auto_assign_tables:z.boolean(),
}).strict();
const clockInput=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const openingInput=z.object({weekday:z.number().int().min(0).max(6),start_time:clockInput,end_time:clockInput,capacity_override:z.number().int().min(1).max(500).nullable().default(null),label:z.string().max(80).nullable().default(null)}).strict().refine(v=>v.start_time!==v.end_time);
export const openingHoursInput=z.array(openingInput).max(28).superRefine((rows,ctx)=>{
 const minutes=(v:string)=>Number(v.slice(0,2))*60+Number(v.slice(3));
 const windows=rows.map(r=>({start:r.weekday*1440+minutes(r.start_time),end:r.weekday*1440+minutes(r.end_time)+(r.end_time<r.start_time?1440:0)}));
 for(let i=0;i<windows.length;i++) for(let j=i+1;j<windows.length;j++) for(const shift of [-10080,0,10080]) {
  if(windows[i]!.start<windows[j]!.end+shift&&windows[i]!.end>windows[j]!.start+shift) ctx.addIssue({code:'custom',message:'OVERLAPPING_HOURS',path:[j]});
 }
});
export const blackoutInput=z.object({date:dateInput,start_time:clockInput.nullable().default(null),end_time:clockInput.nullable().default(null),reason:z.string().max(200).nullable().default(null)}).strict().refine(v=>(v.start_time===null&&v.end_time===null)||(v.start_time!==null&&v.end_time!==null&&v.start_time!==v.end_time));
export const tableInput=z.object({name:z.string().trim().min(1).max(80),min_capacity:z.number().int().min(1).max(500),max_capacity:z.number().int().min(1).max(500),zone:z.string().max(80).nullable().default(null),active:z.boolean().default(true)}).strict().refine(v=>v.max_capacity>=v.min_capacity);
export type SettingsInput=z.infer<typeof settingsInput>;
export type OpeningInput=z.infer<typeof openingInput>;
export type BlackoutInput=z.infer<typeof blackoutInput>;
export type TableInput=z.infer<typeof tableInput>;

export interface PublicVenue {name:string;slug:string;timezone:string;phone:string|null;address:string|null;logo_url:string|null;primary_color:string;locale_default:'it'|'en';total_capacity:number;max_party_size:number;max_advance_days:number;cancellation_deadline_hours:number;auto_confirm:boolean;form_token:string}
export interface PublicSlot {starts_at:string;time:string;offset:string;available:boolean;reason?:string}
export interface AvailabilityResponse {date:string;timezone:string;slots:PublicSlot[];alternatives:Array<{date:string;slots:PublicSlot[]}>}
export interface BookingReceipt {id:string;status:z.infer<typeof reservationStatus>;reserved_at:string;party_size:number;cancel_token:string}
export interface CancellationDetails {reserved_at:string;party_size:number;status:z.infer<typeof reservationStatus>;can_cancel:boolean;cancellation_deadline:string;tenant:{name:string;slug:string;phone:string|null;timezone:string}}
export interface StaffProfile {id:string;full_name:string;role:'owner'|'staff';tenant:{id:string;name:string;slug:string;timezone:string;locale_default:'it'|'en'}}
export interface TableRecord extends TableInput {id:string}
export interface ReservationRecord extends BookingReceipt {duration_min:number;table_id:string|null;notes:string;internal_notes:string;source:'direct'|'phone'|'staff';customer:{id:string;full_name:string;phone_e164:string|null;email:string|null};table:TableRecord|null}
