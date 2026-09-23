import { randomBytes } from 'node:crypto';
import { resolveTenant, reservationTransaction } from '@bigant/database';
import { addDays, computeAvailability, dateInZone, groupAvailable, serviceWindows } from '@bigant/core';
import { loadAvailability } from './reservations/service.js';
import { groupInclude, snapshotGroup } from './rooms.js';
import { reservationCreated } from './notifications/outbox.js';

const venues = ['trattoria-santa-lucia', 'lido-miseno'];
const cases = [
  { name: 'DEMO · Giulia Rossi', party: 2, notes: 'Coppia. Provare il percorso Conferma → Al tavolo → Completa.' },
  { name: 'DEMO · Famiglia Bianchi', party: 4, notes: 'Famiglia di quattro persone. Richiesta dimostrativa: un seggiolone.' },
  { name: 'DEMO · Gruppo Esposito', party: 6, notes: 'Sei persone: combinazione consentita di due tavoli. Verificare che entrambi risultino occupati.' },
];

// Preparazione esplicita della demo: nessun dato operativo viene cancellato o aggiornato.
export async function populateDemoExamples(now = new Date()) {
  const results = [];
  for (const [index, slug] of venues.entries()) {
    const tenant = await resolveTenant(slug);
    if (!tenant) { results.push({ slug, created: false, details: { skipped: 'Locale demo assente: eseguire pnpm seed.' } }); continue; }
    results.push(await reservationTransaction(tenant.id, async tx => {
      const venue = await tx.tenant.findFirstOrThrow();
      const today = dateInZone(now, venue.timezone);
      const marker = `demo.examples.v1:${today}`;
      const previous = await tx.auditLog.findFirst({ where: { action: marker } });
      if (previous) return { slug, created: false, details: previous.metadata };
      const seed = await tx.auditLog.findFirst({ where: { action: 'seed', metadata: { path: ['demo'], equals: true } } });
      if (!seed || venue.status !== 'active') return { slug, created: false, details: { skipped: 'Locale non identificato come demo attiva.' } };
      const owner = await tx.staffUser.findFirstOrThrow({ where: { role: 'owner' } });
      const settings = await tx.tenantSettings.findFirstOrThrow();
      const groupMarker = await tx.auditLog.findFirst({ where: { action: 'demo.examples.group.v1' } });
      let group = groupMarker ? await tx.tableGroup.findUnique({ where: { id: groupMarker.entity_id }, include: groupInclude }) : null;
      if (!groupMarker) {
        const tableNames = index ? ['Tavolo 29', 'Tavolo 30'] : ['Tavolo 5', 'Tavolo 6'];
        const tables = await tx.restaurantTable.findMany({ where: { name: { in: tableNames }, active: true }, orderBy: { name: 'asc' } });
        // La coppia è un esempio per i soli tavoli del seed; non deduce unioni da sale modificate.
        if (tables.length === 2 && tables.every(t => t.max_capacity === 4 && t.zone === (index ? 'Terrazza' : 'Sala'))) {
          const created = await tx.tableGroup.create({ data: { tenant_id: tenant.id, name: `DEMO · ${tableNames.join(' + ')} · 6 posti`, min_capacity: 5, max_capacity: 6 } });
          await tx.tableGroupMember.createMany({ data: tables.map(t => ({ tenant_id: tenant.id, group_id: created.id, table_id: t.id })) });
          group = await tx.tableGroup.findUniqueOrThrow({ where: { id: created.id }, include: groupInclude });
          await tx.auditLog.create({ data: { tenant_id: tenant.id, staff_user_id: owner.id, action: 'demo.examples.group.v1', entity_type: 'TableGroup', entity_id: created.id } });
        }
      }
      const bookings = [];
      const skipped: string[] = [];
      for (const [caseIndex, example] of cases.entries()) {
        if (example.party === 6 && !group?.active) { skipped.push(`${example.name}: combinazione assente o disattivata.`); continue; }
        const phone = `+393200000${index}${caseIndex}0`;
        const email = `demo.caso${caseIndex + 1}@${slug}.test`;
        const existingCustomer = await tx.customer.findFirst({ where: { phone_e164: phone } });
        if (existingCustomer && existingCustomer.email !== email) { skipped.push(`${example.name}: recapito demo già usato da una prova diversa.`); continue; }
        let booked = false;
        for (let offset = 0; offset <= 7 && !booked; offset++) {
          const date = addDays(today, offset);
          const input = await loadAvailability(tx, date, example.party, now);
          if (example.party === 6) input.settings = { ...input.settings, auto_assign_tables: false };
          const slots = computeAvailability(input).filter(s => s.available);
          // La cena rende riconoscibili gli esempi; se modificata, usare la prima fascia valida.
          const slot = [...slots.filter(s => s.time >= '19:00'), ...slots.filter(s => s.time < '19:00')].find(s => example.party !== 6 || group && groupAvailable({ ...group, tables: group.members.map(m => m.table) }, input.existingReservations, new Date(s.starts_at), input.settings.turn_duration_min, example.party));
          if (!slot) continue;
          const customer = existingCustomer ?? await tx.customer.create({ data: { tenant_id: tenant.id, full_name: example.name, phone_e164: phone, email, notes: `DEMO GUIDATA · ${example.notes} Recapiti inventati: non contattare.` } });
          const chosenGroup = example.party === 6 ? group : null;
          const reservation = await tx.reservation.create({ data: { tenant_id: tenant.id, customer_id: customer.id, reserved_at: new Date(slot.starts_at), party_size: example.party, duration_min: input.settings.turn_duration_min, status: settings.auto_confirm ? 'confirmed' : 'pending', source: 'staff', table_id: chosenGroup ? null : slot.table_id ?? null, table_group_id: chosenGroup?.id ?? null, table_group_name: chosenGroup?.name ?? null, notes: example.notes, internal_notes: 'DEMO GUIDATA · Dati inventati. Questa prenotazione usa le normali regole di disponibilità.', cancel_token: randomBytes(32).toString('hex') }, include: { customer: true } });
          if (chosenGroup) await snapshotGroup(tx, tenant.id, reservation.id, chosenGroup);
          await reservationCreated(tx, tenant.id, reservation, now);
          bookings.push({ name: customer.full_name, date, time: slot.time, party: example.party, status: reservation.status, table: chosenGroup?.name ?? input.tables.find(t => t.id === reservation.table_id)?.name ?? 'Da assegnare' });
          booked = true;
        }
        if (!booked) skipped.push(`${example.name}: nessuna disponibilità nei prossimi otto giorni, impostazioni conservate.`);
      }
      const waiting = [];
      for (const date of [today, addDays(today, 1)]) {
        const input = await loadAvailability(tx, date, 2, now);
        const service = serviceWindows(date, input.timezone, input.openingHours).find(s => s.date === date && new Date(s.end).getTime() >= now.getTime() + input.settings.turn_duration_min * 60000 && computeAvailability({ ...input, existingReservations: [], settings: { ...input.settings, min_lead_time_min: 0, auto_assign_tables: false } }).some(slot => slot.available && new Date(slot.starts_at) >= new Date(s.start) && new Date(slot.starts_at).getTime() + input.settings.turn_duration_min * 60000 <= new Date(s.end).getTime()));
        if (!service) continue;
        const order: string[] = [];
        for (const [position, party] of [2, 4, 6].entries()) {
          const surname = ['DEMO Costa', 'DEMO Conti', 'DEMO Gallo'][position]!;
          if (party > Math.min(settings.total_capacity, settings.max_covers_per_slot)) { skipped.push(`${surname}: coperti superiori a capienza o ritmo configurati.`); continue; }
          await tx.waitlistEntry.create({ data: { tenant_id: tenant.id, surname, party_size: party, service_date: new Date(`${service.date}T00:00:00Z`), service_key: service.key, service_label: service.label, service_start: new Date(service.start), service_end: new Date(service.end), created_at: new Date(now.getTime() - (3 - position) * 60000) } });
          order.push(`${surname} (${party})`);
        }
        waiting.push({ date: service.date, service: service.label, order: order.join(', '), start: service.start, end: service.end });
        break;
      }
      if (!waiting.length) skipped.push('Lista d’attesa: nessun servizio valido oggi/domani.');
      const details = { bookings, waiting, skipped };
      await tx.auditLog.create({ data: { tenant_id: tenant.id, staff_user_id: owner.id, action: marker, entity_type: 'Tenant', entity_id: tenant.id, metadata: details } });
      return { slug, created: true, details };
    }));
  }
  return results;
}
