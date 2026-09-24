import { z } from 'zod';
import { notificationSettingsInput } from './notifications';
import { settingsInput } from './index';

export const consoleLogin = z.object({email:z.email().max(254).transform(v=>v.trim().toLowerCase()),password:z.string().min(1).max(256)}).strict();
export const securePassword = z.string().min(12).max(128);
export const consolePassword = z.object({current_password:z.string().min(1).max(256),password:securePassword}).strict();
const nullableEmail=z.email().max(254).nullable();
export const consoleProfileInput=z.object({
 name:z.string().trim().min(2).max(120),type:z.enum(['restaurant','bar','hotel','beach_club']),
 address:z.string().trim().max(300).nullable(),phone:z.string().trim().max(40).nullable(),
 google_place_id:z.string().trim().max(250).nullable(),locale_default:z.enum(['it','en']),
}).strict();
export const consoleAccountInput=z.object({
 plan:z.enum(['trial','base','pro','full']),contact_name:z.string().trim().max(120),contact_email:nullableEmail,
 monthly_fee_cents:z.number().int().min(0).max(100000000),trial_ends_at:z.iso.date().nullable(),renewal_at:z.iso.date().nullable(),notes:z.string().trim().max(5000),
}).strict();
export const consoleCreateInput=consoleProfileInput.extend({
 slug:z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
 owner_name:z.string().trim().min(2).max(120),owner_email:z.email().max(254),
 plan:z.enum(['trial','base','pro','full']).default('trial'),
}).strict();
export const consoleStatusInput=z.object({status:z.enum(['active','suspended','cancelled']),reason:z.string().trim().min(5).max(500)}).strict();
export const consoleSearchInput=z.object({q:z.string().trim().max(120).default(''),status:z.enum(['active','suspended','cancelled']).optional(),plan:z.enum(['trial','base','pro','full']).optional(),page:z.number().int().min(1).max(10000).default(1)}).strict();
export const consoleStaffInput=z.object({email:z.email().max(254),full_name:z.string().trim().min(2).max(120),role:z.enum(['owner','staff'])}).strict();
export const consoleStaffPatch=z.object({role:z.enum(['owner','staff']),status:z.enum(['active','disabled'])}).strict();
export const consoleServicesInput=z.object({booking:z.lazy(()=>settingsInput),notifications:notificationSettingsInput}).strict();
export const consoleAccessInput=z.object({token:z.string().regex(/^[a-f0-9]{64}$/),password:securePassword}).strict();
export const consoleAuditInput=z.object({tenant_id:z.uuid().optional(),page:z.number().int().min(1).max(10000).default(1)}).strict();

export type ConsoleCreateInput=z.infer<typeof consoleCreateInput>;
export type ConsoleProfileInput=z.infer<typeof consoleProfileInput>;
export type ConsoleAccountInput=z.infer<typeof consoleAccountInput>;
export type ConsoleSearchInput=z.infer<typeof consoleSearchInput>;
export type ConsoleStaffInput=z.infer<typeof consoleStaffInput>;
export type ConsoleServicesInput=z.infer<typeof consoleServicesInput>;
export interface ConsoleIdentity {id:string;full_name:string;email:string}
export interface ConsoleTenant extends ConsoleProfileInput {
 id:string;slug:string;timezone:string;plan:'trial'|'base'|'pro'|'full';status:'active'|'suspended'|'cancelled';created_at:string;
 account:Omit<ConsoleAccountInput,'plan'>|null;
 counts:{staff:number;tables:number;bookings:number;customers:number};
}
export interface ConsoleSearchResult {items:ConsoleTenant[];total:number;page:number;page_size:number}
export type ConsoleCheck='owner'|'hours'|'tables'|'phone'|'privacy'|'menu'|'google'|'auto_assignment';
export interface ConsoleStaff {id:string;full_name:string;email:string;role:'owner'|'staff';status:'active'|'disabled';last_login_at:string|null}
export interface ConsoleDetail extends ConsoleTenant {
 settings:ConsoleServicesInput['booking']&ConsoleServicesInput['notifications'];staff:ConsoleStaff[];
 checks:Array<{key:ConsoleCheck;complete:boolean}>;
 usage:{month:string;reservations:number;covers:number;cancelled:number;no_shows:number;sms_used:number;notifications:Array<{channel:string;status:string;count:number}>};
}
export interface ConsoleOverview {total:number;active:number;suspended:number;trial:number;mrr_cents:number;attention:number;due:Array<{id:string;name:string;date:string;kind:'trial'|'renewal'}>;recent:Array<{id:string;name:string;slug:string;created_at:string}>;mode:'demo'|'live'}
export interface ConsoleAuditRow {id:string;action:string;created_at:string;actor:string;tenant_name:string|null;metadata:Record<string,unknown>}
export interface ConsoleAccessResult {token:string;expires_at:string;slug:string}
