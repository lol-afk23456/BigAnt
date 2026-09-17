import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest';
import { admin, fixtures } from './helpers.js';
import { populateDemoExamples } from '../apps/api/src/demo-examples.js';
import { db, withTenant } from '../packages/database/src/index.js';
import { loadAvailability } from '../apps/api/src/reservations/service.js';
import { computeAvailability, dateInZone, addDays } from '../packages/core/src/index.js';
const now = new Date(`${dateInZone(new Date(), 'Europe/Rome')}T10:00:00Z`);
let tenants: string[] = [];
let ids: Record<string, string[]> = {};
beforeAll(async () => { tenants = (await fixtures()).map(t => t.id); });
beforeEach(async () => {
 const where = { tenant_id: { in: tenants } };
 ids = {
  customers: (await admin.customer.findMany({ where })).map(r => r.id),
  reservations: (await admin.reservation.findMany({ where })).map(r => r.id),
  groups: (await admin.tableGroup.findMany({ where })).map(r => r.id),
  waiting: (await admin.waitlistEntry.findMany({ where })).map(r => r.id),
  audit: (await admin.auditLog.findMany({ where })).map(r => r.id),
  notifications: (await admin.notificationLog.findMany({ where })).map(r => r.id),
  blackouts: (await admin.blackoutDate.findMany({ where })).map(r => r.id),
 };
});
afterEach(async () => {
 const extra = (key: string) => ({ tenant_id: { in: tenants }, id: { notIn: ids[key]! } });
 await admin.waitlistEntry.deleteMany({ where: extra('waiting') });
 await admin.notificationLog.deleteMany({ where: extra('notifications') });
 await admin.reservation.deleteMany({ where: extra('reservations') });
 await admin.customer.deleteMany({ where: extra('customers') });
 const groups = await admin.tableGroup.findMany({ where: extra('groups') });
 await admin.tableGroupMember.deleteMany({ where: { tenant_id: { in: tenants }, group_id: { in: groups.map(g => g.id) } } });
 await admin.tableGroup.deleteMany({ where: extra('groups') });
 await admin.auditLog.deleteMany({ where: extra('audit') });
 await admin.blackoutDate.deleteMany({ where: extra('blackouts') });
});
afterAll(() => admin.$disconnect());

test('esempi validi nei due tenant, idempotenti anche in concorrenza e conservativi dopo le prove', async () => {
 const baseline = await admin.reservation.findMany({ where: { tenant_id: { in: tenants } }, orderBy: { id: 'asc' } });
 const runs = await Promise.all([populateDemoExamples(now), populateDemoExamples(now)]);
 for (const [index, tenantId] of tenants.entries()) {
  expect(runs.map(run => run[index]!.created).sort()).toEqual([false, true]);
  const rows = await admin.reservation.findMany({ where: { tenant_id: tenantId, id: { notIn: ids.reservations } }, include: { assignedTables: true, customer: true } });
  expect(rows).toHaveLength(3);
  expect(rows.map(r => r.party_size).sort()).toEqual([2, 4, 6]);
  for (const row of rows) {
   expect(row.status).toBe(index ? 'pending' : 'confirmed');
   expect(row.reserved_at.getTime()).toBeGreaterThanOrEqual(now.getTime());
   await withTenant(tenantId, async () => {
    const input = await loadAvailability(db, dateInZone(row.reserved_at, 'Europe/Rome'), row.party_size, now, row.id);
    if (row.table_group_id) input.settings = { ...input.settings, auto_assign_tables: false };
    expect(computeAvailability(input).find(s => s.starts_at === row.reserved_at.toISOString())?.available).toBe(true);
   });
  }
  expect(rows.find(r => r.party_size === 6)?.assignedTables).toHaveLength(2);
  const waiting = await admin.waitlistEntry.findMany({ where: { tenant_id: tenantId, id: { notIn: ids.waiting } }, orderBy: { created_at: 'asc' } });
  expect(waiting.map(w => w.party_size)).toEqual([2, 4, 6]);
  expect(await admin.customer.count({ where: { tenant_id: tenantId, id: { notIn: ids.customers } } })).toBe(3);
  const edited = await admin.reservation.update({ where: { id: rows[0]!.id }, data: { notes: 'Prova modificata dal ristoratore', status: 'cancelled' } });
  const customer = await admin.customer.update({ where: { id: edited.customer_id }, data: { full_name: 'Nome modificato nella prova' } });
  const queue = await admin.waitlistEntry.update({ where: { id: waiting[0]!.id }, data: { surname: 'Cognome modificato', status: 'left' } });
  await populateDemoExamples(now);
  expect(await admin.reservation.findUniqueOrThrow({ where: { id: edited.id } })).toEqual(edited);
  expect(await admin.customer.findUniqueOrThrow({ where: { id: customer.id } })).toEqual(customer);
  expect(await admin.waitlistEntry.findUniqueOrThrow({ where: { id: queue.id } })).toEqual(queue);
 }
 expect(await admin.reservation.findMany({ where: { id: { in: baseline.map(r => r.id) } }, orderBy: { id: 'asc' } })).toEqual(baseline);
});

test('chiusure e configurazione rispettate: non forza disponibilità né crea prenotazioni impossibili', async () => {
 const today = dateInZone(now, 'Europe/Rome');
 for (const tenant_id of tenants) for (let day = 0; day <= 7; day++) await admin.blackoutDate.create({ data: { tenant_id, date: new Date(`${addDays(today, day)}T00:00:00Z`), reason: 'Chiusura prova' } });
 const settings = await admin.tenantSettings.findMany({ where: { tenant_id: { in: tenants } } });
 const results = await populateDemoExamples(now);
 for (const result of results) expect(result.details).toMatchObject({ bookings: [], waiting: [], skipped: expect.arrayContaining([expect.stringContaining('nessuna disponibilità')]) });
 expect(await admin.reservation.count({ where: { tenant_id: { in: tenants } } })).toBe(ids.reservations!.length);
 expect(await admin.customer.count({ where: { tenant_id: { in: tenants } } })).toBe(ids.customers!.length);
 expect(await admin.tenantSettings.findMany({ where: { tenant_id: { in: tenants } } })).toEqual(settings);
});

test('capienza e ritmo ridotti escludono anche ingressi in attesa incompatibili',async()=>{
 const settings=await admin.tenantSettings.findMany({where:{tenant_id:{in:tenants}}});
 try{
  await admin.tenantSettings.updateMany({where:{tenant_id:{in:tenants}},data:{total_capacity:4,max_covers_per_slot:4}});
  await populateDemoExamples(now);
  const where={tenant_id:{in:tenants}};
  expect(await admin.waitlistEntry.findMany({where:{...where,id:{notIn:ids.waiting},party_size:{gt:4}}})).toHaveLength(0);
  expect(await admin.waitlistEntry.count({where:{...where,id:{notIn:ids.waiting}}})).toBe(4);
  expect(await admin.reservation.findMany({where:{...where,id:{notIn:ids.reservations},party_size:{gt:4}}})).toHaveLength(0);
 }finally{for(const row of settings)await admin.tenantSettings.update({where:{tenant_id:row.tenant_id},data:row});}
});
