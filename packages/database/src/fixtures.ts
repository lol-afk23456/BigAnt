import { randomBytes } from 'node:crypto';
import { PrismaClient, type ReservationStatus } from '@prisma/client';
import argon2 from 'argon2';
import { DateTime } from 'luxon';
import { demoMenus,demoDish } from './demo-menu.js';
import { demoCustomerName, demoComments } from './demo-people.js';

export const demos = [
  { slug: 'trattoria-santa-lucia', name: 'Trattoria Santa Lucia', email: 'owner@santalucia.test', type: 'restaurant' as const, capacity: 40, tables: 12, duration: 90, pacing: 12, auto: true, categories: 5, items: 28, customers: 40, reservations: 80, reviews: 25 },
  { slug: 'lido-miseno', name: 'Lido Miseno', email: 'owner@lidomiseno.test', type: 'beach_club' as const, capacity: 120, tables: 30, duration: 120, pacing: 25, auto: false, categories: 3, items: 14, customers: 60, reservations: 150, reviews: 40 },
];
const time = (hours: number, minutes = 0) => new Date(Date.UTC(1970, 0, 1, hours, minutes));

export async function seedDemo(client: PrismaClient) {
  const password_hash = await argon2.hash('bigant2026', { type: argon2.argon2id });
  const tenants = [];
  const today = DateTime.now().setZone('Europe/Rome').startOf('day');
  for (const [index, demo] of demos.entries()) {
    const existing = await client.tenant.findUnique({ where: { slug: demo.slug } });
    if (existing) { await upgradeDemoMenu(client,existing.id,index,demo.items);await upgradeDemoPeople(client,existing.id,index,demo.customers);tenants.push(existing); continue; }
    const tenant = await client.$transaction(async tx => {
      const tenant = await tx.tenant.create({ data: { name: demo.name, slug: demo.slug, type: demo.type, plan: 'full', google_place_id: `test-place-${index}` } });
      const tenant_id = tenant.id;
      const staff = await tx.staffUser.create({ data: { tenant_id, email: demo.email, password_hash, full_name: `Titolare ${demo.name}`, role: 'owner' } });
      await tx.tenantSettings.create({ data: { tenant_id, total_capacity: demo.capacity, turn_duration_min: demo.duration, max_covers_per_slot: demo.pacing, auto_confirm: demo.auto } });
      for (let weekday = 0; weekday < 7; weekday++) {
        await tx.openingHours.create({ data: { tenant_id, weekday, start_time: time(index ? 11 : 12), end_time: time(index ? 23 : 15), label: index ? 'Servizio continuato' : 'Pranzo' } });
        if (!index) await tx.openingHours.create({ data: { tenant_id, weekday, start_time: time(19), end_time: time(23,30), label: 'Cena' } });
      }
      await tx.blackoutDate.create({ data: { tenant_id, date: new Date(`${today.plus({days:14}).toISODate()}T00:00:00Z`), reason: `Chiusura demo ${demo.name}` } });
      const tables = [];
      for (let n = 0; n < demo.tables; n++) tables.push(await tx.restaurantTable.create({ data: { tenant_id, name: `Tavolo ${n + 1}`, max_capacity: index ? 4 : n < 4 ? 2 : 4, zone: index ? 'Terrazza' : 'Sala' } }));
      const customers = [];
      for (let n = 0; n < demo.customers; n++) customers.push(await tx.customer.create({ data: { tenant_id, full_name: demoCustomerName(index,n), notes:'DEMO · Persona inventata. Nessun recapito da contattare.',phone_e164: `+393${index}${String(n).padStart(8,'0')}`, email: `cliente${n}@tenant${index}.test` } }));
      const categories = [];
      for (const [sort_order,category] of demoMenus[index]!.entries()) categories.push(await tx.menuCategory.create({ data: { tenant_id, name_it:category.name_it,name_en:category.name_en,sort_order } }));
      for (let n = 0; n < demo.items; n++) {const {category,dish}=demoDish(index,n);await tx.menuItem.create({ data: { tenant_id, category_id:categories[category]!.id,...dish,sort_order:n,is_available:n%9!==0 } });}
      const statuses: ReservationStatus[] = ['pending','confirmed','seated','completed','cancelled','no_show'];
      const reservations = [];
      for (let n = 0; n < demo.reservations; n++) reservations.push(await tx.reservation.create({ data: { tenant_id, customer_id: customers[n % customers.length]!.id, table_id: tables[n % tables.length]!.id, reserved_at: today.plus({days:Math.floor(n / 6)-4,hours:19,minutes:(n%6)*15}).toJSDate(), duration_min: demo.duration, party_size: 2, status: statuses[n % statuses.length]!, source: 'direct', cancel_token: randomBytes(32).toString('hex') } }));
      const card = await tx.nFCCard.create({ data: { tenant_id, card_uid: `demo-${demo.slug}`, label: 'Cassa' } });
      for (let n = 0; n < demo.reviews; n++) await tx.review.create({ data: { tenant_id, customer_id: customers[n % customers.length]!.id, nfc_card_id: card.id, channel: n % 3 ? 'private' : 'google_redirect', rating: n % 3 ? n % 5 + 1 : null, comment: n % 3 ? demoComments[n % 5] : null } });
      await tx.notificationLog.create({ data: { tenant_id, reservation_id: reservations[0]!.id, type: 'confirmation', channel: 'email', recipient: demo.email, status: 'failed' } });
      await tx.auditLog.create({ data: { tenant_id, staff_user_id: staff.id, action: 'seed', entity_type: 'Tenant', entity_id: tenant_id, metadata: { demo: true } } });
      // Fixture revocata: nessuna credenziale utilizzabile nel seed.
      await tx.staffSession.create({ data: { tenant_id, staff_user_id: staff.id, refresh_hash: randomBytes(32).toString('hex'), expires_at: new Date('2026-01-01T00:00:00Z'), revoked_at: new Date('2026-01-01T00:00:00Z') } });
      return tenant;
    }, { timeout: 30000 });
    tenants.push(tenant);
  }
  return tenants;
}

async function upgradeDemoPeople(client:PrismaClient,tenant_id:string,index:number,count:number){
 await client.$transaction(async tx=>{
  for(let n=0;n<count;n++)await tx.customer.updateMany({where:{tenant_id,full_name:`Cliente demo ${index+1}-${n+1}`,phone_e164:`+393${index}${String(n).padStart(8,'0')}`,email:`cliente${n}@tenant${index}.test`,notes:'',allergies:null,marketing_consent:false,total_visits:0,no_show_count:0,last_visit_at:null,anonymized_at:null,updated_at:{equals:tx.customer.fields.created_at}},data:{full_name:demoCustomerName(index,n),notes:'DEMO · Persona inventata. Nessun recapito da contattare.'}});
  for(let rating=1;rating<=5;rating++)await tx.review.updateMany({where:{tenant_id,channel:'private',rating,comment:'Feedback dimostrativo',staff_seen_at:null,staff_response:null,updated_at:{equals:tx.review.fields.created_at}},data:{comment:demoComments[rating-1]}});
 },{timeout:30000});
}

async function upgradeDemoMenu(client:PrismaClient,tenant_id:string,index:number,count:number){
 // Aggiornamento conservativo dei soli placeholder originali mai modificati.
 // Il confronto sulle colonne avviene nella scrittura, anche in caso di edit
 // concorrente; né prenotazioni né piatti dell’utente vengono ricreati.
 await client.$transaction(async tx=>{
  for(const [sort_order,definition] of demoMenus[index]!.entries()){
   const legacy={tenant_id,name_it:`Categoria demo ${sort_order+1}`,name_en:`Demo category ${sort_order+1}`,sort_order,active:true,updated_at:{equals:tx.menuCategory.fields.created_at}};
   const category=await tx.menuCategory.findFirst({where:legacy});if(!category)continue;
   for(let n=sort_order;n<count;n+=demoMenus[index]!.length){
    await tx.menuItem.updateMany({where:{tenant_id,category_id:category.id,name_it:`Piatto demo ${index+1}-${n+1}`,name_en:`Demo dish ${index+1}-${n+1}`,description_it:null,description_en:null,price_cents:800+n*50,image_url:null,allergens:{equals:['1']},dietary:{equals:[]},is_visible:true,is_available:n%9!==0,is_featured:false,sort_order:n,updated_at:{equals:tx.menuItem.fields.created_at}},data:demoDish(index,n).dish});
   }
   await tx.menuCategory.updateMany({where:{...legacy,id:category.id},data:{name_it:definition.name_it,name_en:definition.name_en}});
  }
 },{timeout:30000});
}
