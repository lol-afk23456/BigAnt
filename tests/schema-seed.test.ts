import { afterAll, beforeAll, expect, test } from 'vitest';
import { admin, fixtures } from './helpers.js';
import { demos,seedDemo } from '../packages/database/src/fixtures.js';
import { loginInput } from '../packages/types/src/index.js';
import { messages } from '../packages/i18n/src/index.js';
beforeAll(async () => { await fixtures(); });
afterAll(() => admin.$disconnect());
test('seed completo, distinto e ripetibile', async () => {
  const first = await fixtures(); const again = await fixtures();
  expect(first.map(t => t.id)).toEqual(again.map(t => t.id));
  expect(first[0]!.id).not.toBe(first[1]!.id);
  for (const [index, demo] of demos.entries()) {
    const tenant_id = first[index]!.id; const where = { tenant_id };
    expect(tenant_id[14]).toBe('7');
    expect(await admin.customer.count({where})).toBe(demo.customers);
    expect(await admin.reservation.count({where})).toBe(demo.reservations);
    expect(await admin.restaurantTable.count({where})).toBe(demo.tables);
    expect(await admin.menuCategory.count({where})).toBe(demo.categories);
    expect(await admin.menuItem.count({where})).toBe(demo.items);
    expect(await admin.review.count({where})).toBe(demo.reviews);
    const settings = await admin.tenantSettings.findUniqueOrThrow({where});
    expect([settings.total_capacity,settings.turn_duration_min,settings.max_covers_per_slot,settings.auto_confirm]).toEqual([demo.capacity,demo.duration,demo.pacing,demo.auto]);
    const staff = await admin.staffUser.findFirstOrThrow({where});
    expect(staff.email).toBe(demo.email);expect(staff.password_hash).toMatch(/^\$argon2id\$/);
  }
});
test('vincoli SQL: prezzo, rating, identità tenant e idempotenza notifiche', async () => {
  const tenant = await admin.tenant.findFirstOrThrow();
  const tenant_id = tenant.id;
  const category = await admin.menuCategory.findFirstOrThrow({where:{tenant_id}});
  await expect(admin.menuItem.create({data:{tenant_id,category_id:category.id,name_it:'Test',name_en:'Test',price_cents:-1}})).rejects.toThrow();
  await expect(admin.review.create({data:{tenant_id,channel:'google_redirect',rating:5}})).rejects.toThrow();
  await expect(admin.tenant.update({where:{id:tenant_id},data:{slug:'changed-slug'}})).rejects.toThrow();
  const reservation = await admin.reservation.findFirstOrThrow({where:{tenant_id}});
  const data = {tenant_id,reservation_id:reservation.id,type:'reminder' as const,channel:'email' as const,recipient:'demo@example.test',event_key:'test-stable-reminder',recipient_hash:'test-recipient'};
  const first = await admin.notificationLog.create({data});
  try {
    await expect(admin.notificationLog.create({data})).rejects.toThrow();
    await admin.notificationLog.update({where:{id:first.id},data:{status:'failed'}});
    await expect(admin.notificationLog.create({data})).rejects.toThrow();
    const retried = await admin.notificationLog.create({data:{...data,channel:'sms'}});
    await admin.notificationLog.delete({where:{id:retried.id}});
  } finally { await admin.notificationLog.delete({where:{id:first.id}}); }
});
test('validazione condivisa e cataloghi lingue coerenti', () => {
 expect(loginInput.safeParse({slug:'../no',email:'invalid',password:''}).success).toBe(false);
 expect(Object.keys(messages.it)).toEqual(Object.keys(messages.en));
});

test('aggiornamento menu demo conserva piatti modificati e identità esistenti',async()=>{
 const tenant=await admin.tenant.findUniqueOrThrow({where:{slug:demos[0]!.slug}});
 const category=await admin.menuCategory.findFirstOrThrow({where:{tenant_id:tenant.id,sort_order:0}});
 const first=await admin.menuItem.findFirstOrThrow({where:{category_id:category.id,sort_order:0}});
 const edited=await admin.menuItem.findFirstOrThrow({where:{category_id:category.id,sort_order:5}});
 try{
  await admin.menuCategory.update({where:{id:category.id},data:{name_it:'Categoria demo 1',name_en:'Demo category 1',updated_at:category.created_at}});
  for(const [row,n] of [[first,0],[edited,5]] as const)await admin.menuItem.update({where:{id:row.id},data:{name_it:`Piatto demo 1-${n+1}`,name_en:`Demo dish 1-${n+1}`,description_it:n===5?'Ricetta modificata durante la prova':null,description_en:null,price_cents:800+n*50,allergens:['1'],dietary:[],updated_at:row.created_at}});
  await seedDemo(admin);
  expect(await admin.menuItem.findUniqueOrThrow({where:{id:first.id}})).toMatchObject({name_it:'Bruschette al pomodoro',name_en:'Tomato bruschetta',price_cents:600,category_id:category.id});
  expect(await admin.menuItem.findUniqueOrThrow({where:{id:edited.id}})).toMatchObject({name_it:'Piatto demo 1-6',description_it:'Ricetta modificata durante la prova',price_cents:1050});
  const before=await admin.menuItem.findUniqueOrThrow({where:{id:first.id}});await seedDemo(admin);
  expect(await admin.menuItem.findUniqueOrThrow({where:{id:first.id}})).toEqual(before);
 }finally{
  await admin.menuCategory.update({where:{id:category.id},data:category});
  await admin.menuItem.update({where:{id:first.id},data:first});
  await admin.menuItem.update({where:{id:edited.id},data:edited});
 }
});
