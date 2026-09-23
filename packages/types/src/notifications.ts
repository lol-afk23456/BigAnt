import { z } from 'zod';
const mail = z.email().max(254);
export const notificationSettingsInput = z.object({
  sms_enabled: z.boolean(), sms_monthly_cap: z.number().int().min(0).max(10000),
  reminder_hours_before: z.number().int().min(1).max(72),
  retention_months: z.number().int().min(1).max(120), privacy_contact_email: mail.nullable(),
}).strict();
export const customerQuery = z.object({q:z.string().trim().max(120).default(''),cursor:z.uuid().optional()}).strict();
export const customerPatch = z.object({
  notes:z.string().max(2000).optional(), marketing_consent:z.boolean().optional(),
}).strict().refine(v=>Object.keys(v).length>0);
export const pushInput = z.object({
  endpoint:z.url().max(2048), keys:z.object({
    p256dh:z.string().regex(/^[A-Za-z0-9_-]{87}=?$/), auth:z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/),
  }).strict(),
}).strict();
export interface NotificationSettings {sms_enabled:boolean;sms_monthly_cap:number;reminder_hours_before:number;retention_months:number;privacy_contact_email:string|null}
export interface NotificationOverview {mode:'demo'|'live';sms_used:number;sms_cap:number;sms_fallbacks:number;queued:number;failed:number;uncertain:number;simulated:number;accepted:number;push_configured:boolean}
export interface DeliveryRecord {id:string;channel:'email'|'sms'|'push';event_name:string;status:'queued'|'processing'|'sent'|'failed'|'uncertain'|'simulated'|'skipped';attempts:number;created_at:string;fallback:boolean}
export interface CustomerRecord {id:string;full_name:string;phone_e164:string|null;email:string|null;notes:string;marketing_consent:boolean;marketing_consent_at:string|null;total_visits:number;no_show_count:number;last_visit_at:string|null;anonymized_at:string|null}
export interface CustomerReservationHistory {items:Array<{id:string;reserved_at:string;party_size:number;status:'pending'|'confirmed'|'seated'|'completed'|'no_show'|'cancelled';source:'direct'|'phone'|'staff'}>;has_more:boolean}
export interface PrivacyVenue {name:string;slug:string;address:string|null;phone:string|null;contact_email:string|null;retention_months:number;demo:boolean}
