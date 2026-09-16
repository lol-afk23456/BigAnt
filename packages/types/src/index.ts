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
