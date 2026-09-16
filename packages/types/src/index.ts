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
