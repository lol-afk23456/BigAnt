import { z } from 'zod';
export const cardUid=z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/);
export const feedbackQuery=z.object({card:cardUid.optional()}).strict();
// Solo il canale privato può ricevere un voto. Nessun dato guida la scelta.
export const publicReviewInput=z.discriminatedUnion('channel',[
 z.object({channel:z.literal('google_redirect'),card_uid:cardUid.optional()}).strict(),
 z.object({channel:z.literal('private'),card_uid:cardUid.optional(),rating:z.number().int().min(1).max(5),comment:z.string().trim().max(2000).default('')}).strict(),
]);
export const reviewQuery=z.object({rating:z.coerce.number().int().min(1).max(5).optional(),seen:z.enum(['true','false']).optional(),channel:z.enum(['private','google_redirect']).optional(),cursor:z.uuid().optional()}).strict();
export const reviewPatch=z.object({seen:z.literal(true).optional(),staff_response:z.string().trim().max(2000).nullable().optional()}).strict().refine(value=>Object.keys(value).length>0);
export const cardInput=z.object({label:z.string().trim().min(1).max(80)}).strict();
export const cardPatch=z.object({label:cardInput.shape.label.optional(),active:z.boolean().optional()}).strict().refine(value=>Object.keys(value).length>0);
export interface FeedbackOptions {tenant:{name:string;slug:string};google_available:boolean;google_demo:boolean;card_uid:string|null;card_label:string|null}
export interface ReviewReceipt {id:string;channel:'private'|'google_redirect';redirect_url?:string;google_demo?:boolean}
export interface ReviewRecord {id:string;rating:number|null;comment:string|null;channel:'private'|'google_redirect';staff_seen_at:string|null;staff_response:string|null;created_at:string;nfc_card:{label:string}|null}
export interface ReviewList {items:ReviewRecord[];next_cursor:string|null}
export interface ReviewSummary {unseen_private:number;unseen_low:number;private_total:number;google_redirects:number}
export interface CardRecord {id:string;card_uid:string;label:string;active:boolean;last_tapped_at:string|null;tap_count:number}
