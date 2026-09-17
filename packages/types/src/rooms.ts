import { z } from 'zod';
export const groupInput=z.object({name:z.string().trim().min(1).max(80),min_capacity:z.number().int().min(1).max(500),max_capacity:z.number().int().min(1).max(500),table_ids:z.array(z.uuid()).min(2).max(12)}).strict().refine(v=>v.min_capacity<=v.max_capacity&&new Set(v.table_ids).size===v.table_ids.length);
export const groupPatch=z.object({name:z.string().trim().min(1).max(80).optional(),active:z.boolean().optional()}).strict().refine(v=>Object.keys(v).length>0);
export const waitlistQuery=z.object({date:z.iso.date()}).strict();
export const waitlistInput=z.object({service_key:z.string().max(80),service_date:z.iso.date(),surname:z.string().trim().min(1).max(120),party_size:z.number().int().min(1).max(500)}).strict();
export const seatingInput=z.object({reserved_at:z.iso.datetime({offset:true}),table_id:z.uuid().optional(),table_group_id:z.uuid().optional()}).strict().refine(v=>!!v.table_id!==!!v.table_group_id);
export interface GroupRecord {id:string;name:string;min_capacity:number;max_capacity:number;active:boolean;members:Array<{table_id:string;table:{name:string;zone:string|null;active:boolean;max_capacity:number}}>}
export interface ServiceWindow {key:string;date:string;label:string|null;start:string;end:string;archived:boolean}
export interface Placement {kind:'table'|'group';id:string;name:string;starts_at:string;max_capacity:number}
export interface WaitlistRecord {anonymized_at:string|null;id:string;surname:string;party_size:number;created_at:string;status:'waiting'|'seated'|'left';service_key:string;service_start:string;service_end:string;reservation_id:string|null;placements:Placement[]}
export interface WaitlistResponse {now:string;services:ServiceWindow[];entries:WaitlistRecord[]}
