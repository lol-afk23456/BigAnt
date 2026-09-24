import { afterAll, beforeAll, expect, test } from 'vitest';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { admin, fixtures, loggedApp, login } from './helpers.js';
import { db, withTenant, TenantScopeError, disconnectDatabase } from '../packages/database/src/index.js';

let a: string;
let b: string;
const roomFixtures:{groups:string[];assignments:string[];waiting:string[]}={groups:[],assignments:[],waiting:[]};
const queries = {
  Tenant: () => db.tenant.findMany(), StaffUser: () => db.staffUser.findMany(),
  TenantSettings: () => db.tenantSettings.findMany(), OpeningHours: () => db.openingHours.findMany(),
  BlackoutDate: () => db.blackoutDate.findMany(), RestaurantTable: () => db.restaurantTable.findMany(),
  Customer: () => db.customer.findMany(), Reservation: () => db.reservation.findMany(),
  MenuCategory: () => db.menuCategory.findMany(), MenuItem: () => db.menuItem.findMany(),
  Review: () => db.review.findMany(), NFCCard: () => db.nFCCard.findMany(),
  NotificationLog: () => db.notificationLog.findMany(), AuditLog: () => db.auditLog.findMany(),
  StaffSession: () => db.staffSession.findMany(), PushSubscription: () => db.pushSubscription.findMany(),
  TableGroup:()=>db.tableGroup.findMany(),TableGroupMember:()=>db.tableGroupMember.findMany(),ReservationTable:()=>db.reservationTable.findMany(),WaitlistEntry:()=>db.waitlistEntry.findMany(),
};
const platformQueries={PlatformAdmin:()=>db.platformAdmin.findMany(),PlatformSession:()=>db.platformSession.findMany(),PlatformAccount:()=>db.platformAccount.findMany(),PlatformAudit:()=>db.platformAudit.findMany(),PlatformAccessLink:()=>db.platformAccessLink.findMany()};
beforeAll(async () => { const tenants = await fixtures(); a = tenants[0]!.id; b = tenants[1]!.id;
 for(const tenant_id of [a,b]){const staff=await admin.staffUser.findFirstOrThrow({where:{tenant_id}});await admin.pushSubscription.create({data:{tenant_id,staff_user_id:staff.id,endpoint_hash:'isolation-demo',endpoint:'https://fcm.googleapis.com/demo-isolation',p256dh:'fixture',auth:'fixture',active:false}});}

 for(const tenant_id of [a,b]){
  const tables=await admin.restaurantTable.findMany({where:{tenant_id},take:2});
  const group=await admin.tableGroup.create({data:{tenant_id,name:'Isolamento fixture',min_capacity:1,max_capacity:4,active:false}});roomFixtures.groups.push(group.id);
  await admin.tableGroupMember.createMany({data:tables.map(t=>({tenant_id,group_id:group.id,table_id:t.id}))});
  const reservation=await admin.reservation.findFirstOrThrow({where:{tenant_id}});
  roomFixtures.assignments.push((await admin.reservationTable.create({data:{tenant_id,reservation_id:reservation.id,table_id:tables[0]!.id,table_name:'Fixture isolamento'}})).id);
  roomFixtures.waiting.push((await admin.waitlistEntry.create({data:{tenant_id,surname:'Fixture isolamento',party_size:2,service_key:'isolation',service_date:new Date('2026-09-21'),service_start:new Date('2026-09-21T10:00Z'),service_end:new Date('2026-09-21T20:00Z'),status:'left'}})).id);
 }
 });
afterAll(async () => { await admin.waitlistEntry.deleteMany({where:{id:{in:roomFixtures.waiting}}});await admin.reservationTable.deleteMany({where:{id:{in:roomFixtures.assignments}}});await admin.tableGroupMember.deleteMany({where:{group_id:{in:roomFixtures.groups}}});await admin.tableGroup.deleteMany({where:{id:{in:roomFixtures.groups}}});await admin.pushSubscription.deleteMany({where:{tenant_id:{in:[a,b]},endpoint_hash:'isolation-demo'}}); await admin.$disconnect(); await disconnectDatabase(); });

test('ogni modello dello schema è coperto', () => {
  expect([...Object.keys(queries),...Object.keys(platformQueries)].sort()).toEqual(Prisma.dmmf.datamodel.models.map(m => m.name).sort());
});
for(const [model,query] of Object.entries(platformQueries))test(`${model}: accesso vietato anche con contesto tenant valido`,async()=>{
 await expect(query()).rejects.toBeInstanceOf(TenantScopeError);
 for(const tenant of [a,b])await expect(withTenant(tenant,async()=>await query())).rejects.toBeInstanceOf(TenantScopeError);
});
for (const [model, query] of Object.entries(queries)) {
  test(`${model}: token A e B isolati, query senza contesto fallisce`, async () => {
    const app = loggedApp();
    // Endpoint registrato solo nel test: nessuna API di prodotto anticipata.
    app.get('/test/model', async request => {
      const claims = await app.authenticateStaff(request);
      return withTenant(claims.tenant_id, async () => await query());
    });
    try {
      for (const second of [false, true]) {
        const auth = await login(app, second);
        expect(auth.statusCode).toBe(200);
        const response = await app.inject({ url: '/test/model', headers: { authorization: `Bearer ${auth.json<{access_token:string}>().access_token}` } });
        expect(response.statusCode).toBe(200);
        const rows = response.json<Array<{ id?: string; tenant_id?: string }>>();
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.every(row => (model === 'Tenant' ? row.id : row.tenant_id) === (second ? b : a))).toBe(true);
      }
      await expect(query()).rejects.toBeInstanceOf(TenantScopeError);
    } finally { await app.close(); }
  });
}

test('findUnique, OR, aggregati, update/deleteMany non raggiungono il tenant B', async () => {
  const other = await admin.customer.findFirstOrThrow({ where: { tenant_id: b } });
  await withTenant(a, async () => {
    expect(await db.customer.findUnique({ where: { id: other.id } })).toBeNull();
    await expect(db.customer.findUniqueOrThrow({ where: { id: other.id } })).rejects.toThrow();
    expect(await db.customer.findMany({ where: { OR: [{ id: other.id }, { tenant_id: b }] } })).toEqual([]);
    await expect(db.customer.findMany({ where: { tenant_id: b } })).rejects.toBeInstanceOf(TenantScopeError);
    expect(await db.customer.count({ where: { id: other.id } })).toBe(0);
    expect((await db.customer.aggregate({ where: { id: other.id }, _count: true }))._count).toBe(0);
    expect(await db.customer.groupBy({ by: ['tenant_id'], where: { id: other.id } })).toEqual([]);
    await expect(db.customer.update({ where: { id: other.id }, data: { notes: 'NO' } })).rejects.toThrow();
    await expect(db.customer.delete({ where: { id: other.id } })).rejects.toThrow();
    expect((await db.customer.updateMany({ where: { id: other.id }, data: { notes: 'NO' } })).count).toBe(0);
    expect((await db.customer.deleteMany({ where: { id: other.id } })).count).toBe(0);
    expect(await db.customer.updateManyAndReturn({ where: { id: other.id }, data: { notes: 'NO' } })).toEqual([]);
  });
  expect(await admin.customer.findUnique({ where: { id: other.id } })).toEqual(other);
});

test('tenant iniettato nelle create; cambio tenant, raw SQL e scritture annidate vietati', async () => {
  await withTenant(a, async () => {
    // Cast intenzionale: simula un chiamante che omette tenant_id anche a runtime.
    const created = await db.customer.create({ data: { full_name: 'Prova isolamento' } as Prisma.CustomerUncheckedCreateInput });
    try {
      expect(created.tenant_id).toBe(a);
      await expect(db.customer.update({ where: { id: created.id }, data: { tenant_id: b } })).rejects.toBeInstanceOf(TenantScopeError);
      await expect(db.customer.create({ data: { tenant_id: b, full_name: 'NO' } })).rejects.toBeInstanceOf(TenantScopeError);
      await expect(db.customer.createMany({ data: [{ tenant_id: b, full_name: 'NO' }] })).rejects.toBeInstanceOf(TenantScopeError);
      await expect(db.tenant.update({ where: { id: a }, data: { customer: { deleteMany: {} } } })).rejects.toBeInstanceOf(TenantScopeError);
      await expect(db.customer.update({ where: { id: created.id }, data: { tenant: { connect: { id: b } } } })).rejects.toBeInstanceOf(TenantScopeError);
      await expect(db.$queryRaw`SELECT * FROM "Customer"`).rejects.toBeInstanceOf(TenantScopeError);
      await expect(db.$executeRaw`SELECT 1`).rejects.toBeInstanceOf(TenantScopeError);
      await expect(db.$queryRawUnsafe('SELECT 1')).rejects.toBeInstanceOf(TenantScopeError);
      await expect(db.$executeRawUnsafe('SELECT 1')).rejects.toBeInstanceOf(TenantScopeError);
      expect(() => withTenant(b, () => null)).toThrow(TenantScopeError);
    } finally { await db.customer.delete({ where: { id: created.id } }); }
  });
});

test('FK composte impediscono relazioni tra tenant, anche fuori extension', async () => {
  const other = await admin.customer.findFirstOrThrow({ where: { tenant_id: b } });
  await expect(withTenant(a, () => db.reservation.create({ data: { tenant_id: a, customer_id: other.id, reserved_at: new Date(), duration_min: 90, party_size: 2, status: 'pending', source: 'staff', cancel_token: randomBytes(32).toString('hex') } }))).rejects.toThrow();
  const category = await admin.menuCategory.findFirstOrThrow({ where: { tenant_id: b } });
  await expect(admin.menuItem.create({ data: { tenant_id: a, category_id: category.id, name_it: 'NO', name_en: 'NO', price_cents: 1 } })).rejects.toThrow();
});

test('relazioni incluse e transazioni mantengono il contesto anche in parallelo', async () => {
  await Promise.all([a,b].map(tenant => withTenant(tenant, async () => {
    const rows = await db.reservation.findMany({ include: { customer: true, table: true, tenant: true } });
    expect(rows.every(row => row.tenant_id === tenant && row.customer.tenant_id === tenant && row.table?.tenant_id === tenant && row.tenant.id === tenant)).toBe(true);
    await db.$transaction(async tx => {
      expect((await tx.customer.findMany()).every(row => row.tenant_id === tenant)).toBe(true);
      await expect(tx.$queryRaw`SELECT 1`).rejects.toBeInstanceOf(TenantScopeError);
    });
  })));
});

test('upsert e createMany impongono tenant e non sovrascrivono record estranei', async () => {
  const other = await admin.customer.findFirstOrThrow({ where: { tenant_id: b } });
  await withTenant(a, async () => {
    await expect(db.customer.upsert({ where: { id: other.id }, create: { id: other.id, tenant_id: a, full_name: 'NO' }, update: { full_name: 'NO' } })).rejects.toThrow();
    const rows = await db.customer.createManyAndReturn({ data: [{ full_name: 'Bulk test' }] as Prisma.CustomerCreateManyInput[] });
    expect(rows[0]!.tenant_id).toBe(a);
    const row = await db.customer.upsert({ where: { id: rows[0]!.id }, create: { tenant_id: a, full_name: 'Nuovo' }, update: { notes: 'test' } });
    expect(row.tenant_id).toBe(a);
    await db.customer.deleteMany({ where: { id: { in: rows.map(r => r.id) } } });
  });
  expect((await admin.customer.findUniqueOrThrow({ where: { id: other.id } })).full_name).toBe(other.full_name);
});
