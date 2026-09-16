# BigAnt Book — Specifica tecnica operativa

**Versione:** 3.0 — settembre 2026
**Destinatario:** agente di sviluppo / sviluppatore
**Documento correlato:** `BigAnt_Book_Sintesi.html` (strategia, mercato, modello di business)

Questo file è la fonte di verità tecnica. Dove Dossier e SPEC divergono, vince SPEC.

---

## 0. Regole non negoziabili

Da rileggere prima di ogni sessione di lavoro.

1. **Il perimetro della sezione 2 è vincolante.** Nulla della lista "fuori perimetro" va implementato, nemmeno parzialmente, nemmeno se sembra veloce. Se emerge la necessità: annotare in `docs/BACKLOG.md`, non scrivere codice.
2. **Nessuna query senza `tenant_id`.** Il filtro è imposto a livello di data layer, non lasciato al chiamante. Esiste un test che lo verifica e deve restare verde.
3. **Ordine di costruzione:** vedi `MISSIONS.md`. Nessuna missione inizia prima che la precedente sia verde. Ogni modulo funzionante su tenant di prova prima del successivo.
4. **La logica di disponibilità è una funzione pura** in `packages/core`, senza accesso al database, testabile in isolamento.
5. **Nessuna stringa visibile all'utente finale hardcoded.** Tutto in file di traduzione (`it`, `en`).
6. **Ogni notifica inviata viene registrata** prima dell'invio, per garantire idempotenza.
7. **Endpoint pubblici sempre rate-limited.** Sono esposti a internet senza autenticazione.

---

## 1. Stack

| Layer | Tecnologia |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Backend | Node.js 22 LTS, TypeScript strict, Fastify |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Web | Next.js (App Router), Tailwind CSS |
| Mobile | **PWA installabile** (no app nativa nell'MVP) — Web Push su Android e iOS 16.4+ |
| Auth staff | JWT access (15 min) + refresh token httpOnly (30 gg) |
| Validazione | Zod, schemi condivisi in `packages/types` |
| Code queue | BullMQ + Redis (o pg-boss se si vuole evitare Redis in MVP) |
| Email | Resend |
| SMS | Twilio |
| Storage immagini | Cloudflare R2 + trasformazione on-the-fly |
| Hosting | Vercel (web), Railway o Fly.io (api + db + redis) |
| Errori | Sentry |
| Test | Vitest (unit), Playwright (e2e sui 3 flussi pubblici) |

### Struttura repository

```
bigant-book/
├── apps/
│   ├── web/          Next.js — dashboard + pagine pubbliche
│   └── api/          Fastify — API REST
├── packages/
│   ├── database/     schema.prisma, migrazioni, seed
│   ├── types/        tipi + schemi Zod condivisi
│   ├── core/         logica di dominio pura (availability, review routing)
│   └── ui/           componenti condivisi web
└── docs/
    ├── SPEC.md       questo file
    └── BACKLOG.md    tutto ciò che è stato rimandato
```

---

## 2. Perimetro

### Dentro l'MVP

- Prenotazioni: creazione, modifica, disdetta, calcolo disponibilità in tempo reale
- Gestione capienza, ritmo di servizio (pacing), orari, chiusure straordinarie
- Tavoli e assegnazione (automatica opzionale, manuale sempre disponibile)
- Menu digitale pubblico via QR, multilingua it/en
- Recensioni con card NFC e instradamento per voto
- Scheda cliente condivisa fra moduli, deduplicata per telefono
- Pannello web per staff
- PWA installabile per il titolare: lettura + conferma/disdetta + push
- Email di conferma, promemoria SMS, notifiche interne
- Multi-tenant con isolamento verificato
- Export dati e cancellazione cliente (obbligo GDPR)

### Fuori perimetro — non implementare

Ordinazione al tavolo · pagamento del conto · fidelity digitale · sincronizzazione TheFork/Google/OpenTable · assistente vocale · acconti e carta a garanzia · multi-sede sotto stesso brand · gestione turni personale · agenti AI · integrazione POS/cassa · app per il cliente finale.

---

## 3. Modello dati

Convenzioni: PK `id` UUID v7. Ogni tabella (tranne `StaffUser` a livello globale? no — anche quella) ha `tenant_id`. Timestamp `created_at`, `updated_at`. Soft delete solo dove indicato.

### 3.1 Tenant

| Campo | Tipo | Vincoli |
|---|---|---|
| id | uuid | PK |
| name | text | required |
| slug | text | unique, lowercase, kebab-case, immutabile dopo creazione |
| type | enum | `restaurant` \| `bar` \| `hotel` \| `beach_club` |
| timezone | text | default `Europe/Rome` |
| locale_default | enum | `it` \| `en`, default `it` |
| logo_url | text | nullable |
| primary_color | text | hex, default `#0E2B2F` |
| address | text | nullable |
| phone | text | nullable |
| google_place_id | text | nullable — serve per il redirect recensioni |
| plan | enum | `trial` \| `base` \| `pro` \| `full` |
| status | enum | `active` \| `suspended` \| `cancelled` |
| created_at / updated_at | timestamptz | |

Index: `slug` unique.

### 3.2 StaffUser

| Campo | Tipo | Vincoli |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK → Tenant, cascade |
| email | citext | unique insieme a tenant_id |
| password_hash | text | argon2id |
| full_name | text | |
| role | enum | `owner` \| `staff` |
| last_login_at | timestamptz | nullable |
| status | enum | `active` \| `disabled` |

Index: `(tenant_id, email)` unique.

### 3.3 TenantSettings

Riga singola per tenant. Tutti i parametri che il locale regola da solo.

| Campo | Tipo | Default | Note |
|---|---|---|---|
| tenant_id | uuid | | PK e FK |
| slot_granularity_min | int | 15 | granularità delle fasce prenotabili |
| turn_duration_min | int | 90 | quanto resta occupato un tavolo |
| max_covers_per_slot | int | 12 | **pacing** — coperti che possono iniziare nella stessa fascia |
| total_capacity | int | 40 | coperti totali del locale |
| min_lead_time_min | int | 60 | anticipo minimo per prenotare |
| max_advance_days | int | 60 | quanto in là si può prenotare |
| auto_confirm | boolean | true | se false, prenotazione nasce `pending` |
| cancellation_deadline_hours | int | 2 | oltre il quale il cliente deve telefonare |
| auto_assign_tables | boolean | false | assegnazione automatica tavolo |
| reminder_hours_before | int | 4 | quando parte il promemoria |
| sms_enabled | boolean | false | solo piani pro/full |
| sms_monthly_cap | int | 300 | tetto oltre il quale si degrada a email |

### 3.4 OpeningHours

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK |
| weekday | int | 0=domenica … 6=sabato |
| start_time | time | es. `12:00` |
| end_time | time | es. `15:00` |
| capacity_override | int | nullable — capienza specifica per questa fascia |
| label | text | nullable — "Pranzo", "Cena" |

Più righe per stesso weekday = più servizi nello stesso giorno.

### 3.5 BlackoutDate

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK |
| date | date | |
| start_time / end_time | time | nullable — se null, chiusura di tutta la giornata |
| reason | text | nullable, visibile solo allo staff |

### 3.6 RestaurantTable

Nome `RestaurantTable` e non `Table`: `table` è parola riservata in SQL.

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK |
| name | text | "Tavolo 4", "Camera 12" |
| min_capacity | int | default 1 — evita di dare un tavolo da 8 a una coppia |
| max_capacity | int | |
| zone | text | nullable — "Sala", "Dehors", "Terrazza" |
| active | boolean | default true |

### 3.7 Customer

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK — **il cliente appartiene al locale, mai condiviso fra tenant** |
| full_name | text | |
| phone_e164 | text | normalizzato `+39...`, chiave di deduplica |
| email | citext | nullable |
| notes | text | note interne staff |
| allergies | text | nullable — **dato sanitario, vedi §8** |
| marketing_consent | boolean | default false |
| marketing_consent_at | timestamptz | nullable |
| total_visits | int | denormalizzato, aggiornato a prenotazione completata |
| no_show_count | int | denormalizzato |
| last_visit_at | timestamptz | nullable |

Index: `(tenant_id, phone_e164)` unique.

### 3.8 Reservation

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK |
| customer_id | uuid | FK |
| table_id | uuid | FK nullable |
| reserved_at | timestamptz | data+ora di inizio, **sempre in UTC, convertita con timezone del tenant** |
| duration_min | int | copiato da settings alla creazione, così modifiche future non alterano lo storico |
| party_size | int | ≥ 1 |
| status | enum | `pending` \| `confirmed` \| `seated` \| `completed` \| `cancelled` \| `no_show` |
| source | enum | `direct` \| `staff` \| `phone` — altri valori riservati fase 2 |
| notes | text | richieste del cliente |
| internal_notes | text | visibili solo allo staff |
| cancel_token | text | random, usato nel link di disdetta |
| cancelled_by | enum | nullable: `customer` \| `staff` |
| created_at / updated_at | timestamptz | |

Index: `(tenant_id, reserved_at)`, `(tenant_id, status)`, `cancel_token` unique.

**Transizioni di stato ammesse:**
```
pending   → confirmed | cancelled
confirmed → seated | cancelled | no_show
seated    → completed
```
Qualsiasi altra transizione → errore 409.

### 3.9 MenuCategory / MenuItem

**MenuCategory:** id, tenant_id, name_it, name_en, sort_order, active.

**MenuItem:**

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK |
| category_id | uuid | FK |
| name_it / name_en | text | |
| description_it / description_en | text | nullable |
| price_cents | int | **mai float** |
| image_url | text | nullable |
| allergens | text[] | codici dei 14 allergeni UE |
| dietary | text[] | `vegetarian`, `vegan`, `gluten_free`, `spicy` |
| is_available | boolean | default true — "esaurito" |
| is_featured | boolean | default false |
| sort_order | int | |

### 3.10 Review

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK |
| customer_id | uuid | nullable — recensione anonima ammessa |
| nfc_card_id | uuid | nullable — da quale card arriva |
| rating | int | 1–5, **nullable** (null se il cliente è andato su Google) |
| comment | text | nullable |
| channel | enum | `google_redirect` \| `private` |
| staff_seen_at | timestamptz | nullable |
| staff_response | text | nullable — nota interna, non pubblicata |

### 3.11 NFCCard

id, tenant_id, card_uid (unique), label ("Tavolo 3", "Cassa"), active, last_tapped_at, tap_count.

### 3.12 NotificationLog

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK |
| reservation_id | uuid | nullable FK |
| type | enum | `confirmation` \| `reminder` \| `cancellation` \| `low_review_alert` |
| channel | enum | `email` \| `sms` \| `push` |
| recipient | text | |
| status | enum | `queued` \| `sent` \| `failed` |
| provider_id | text | nullable, id del provider per debug |
| sent_at | timestamptz | nullable |

Index: `(reservation_id, type)` unique **parziale su status != 'failed'** → garantisce idempotenza.

### 3.13 AuditLog

id, tenant_id, staff_user_id, action, entity_type, entity_id, metadata (jsonb), ip, created_at.
Obbligatorio su: export clienti, cancellazione cliente, modifica impostazioni, cancellazione prenotazione.

---

## 4. Algoritmo di disponibilità

Funzione pura in `packages/core/availability.ts`. Nessun accesso DB: riceve tutto come input.

```ts
computeAvailability(input: {
  date: string;              // YYYY-MM-DD nel fuso del tenant
  partySize: number;
  now: Date;
  settings: TenantSettings;
  openingHours: OpeningHours[];
  blackouts: BlackoutDate[];
  tables: RestaurantTable[];
  existingReservations: Reservation[];  // stato confirmed|pending|seated
}): Slot[]
```

### Procedimento

1. **Genera le fasce candidate.** Per ogni `OpeningHours` del giorno della settimana corrispondente, genera fasce da `start_time` a `end_time - turn_duration_min`, a passi di `slot_granularity_min`.

2. **Per ogni fascia applica i cinque controlli.** Una fascia è disponibile solo se li supera tutti.

   **a. Apertura.** La fascia cade dentro un `OpeningHours` e non è coperta da un `BlackoutDate` (né totale né parziale).

   **b. Finestra temporale.**
   ```
   slot_start >= now + min_lead_time_min
   slot_start <= now + max_advance_days
   ```

   **c. Capienza.** Somma dei coperti delle prenotazioni attive la cui finestra `[reserved_at, reserved_at + duration)` si sovrappone a `[slot_start, slot_start + turn_duration)`, più `partySize`, deve essere `<= capacity` (dove `capacity` = `capacity_override` della fascia se presente, altrimenti `total_capacity`).

   **d. Ritmo di servizio (pacing).** Somma dei coperti delle prenotazioni che **iniziano** esattamente in questa fascia, più `partySize`, deve essere `<= max_covers_per_slot`.

   > Questo controllo è ciò che distingue un calendario da un sistema di prenotazione. Un locale da 60 coperti non può servirne 60 alle 20:30. Senza pacing la cucina si blocca e il ristoratore abbandona il sistema entro una settimana.

   **e. Tavolo disponibile.** Solo se `auto_assign_tables = true`: deve esistere almeno un tavolo attivo con `min_capacity <= partySize <= max_capacity`, non occupato da prenotazioni sovrapposte.

3. **Restituisci** l'elenco delle fasce con flag `available` e, quando non disponibile, un `reason` machine-readable (`closed`, `too_soon`, `full`, `pacing_limit`, `no_table`) — serve per debug e per messaggi utili, non va mostrato grezzo.

### Assegnazione automatica del tavolo

Quando attiva: scegliere il tavolo **libero con `max_capacity` minima fra quelli che soddisfano `min_capacity <= partySize <= max_capacity`**. Questo evita di bruciare il tavolo da 8 per una coppia. Se nessuno soddisfa, la prenotazione si crea comunque senza tavolo e lo staff assegna a mano.

### Casi limite da testare (scrivere i test prima del codice)

- Cambio ora legale: 25 e 26 ottobre, 29 e 30 marzo
- Prenotazione a cavallo di due fasce di servizio (pranzo/cena)
- `partySize` maggiore di qualsiasi tavolo → disponibile se `auto_assign_tables=false`, non disponibile se `true`
- Servizio che supera la mezzanotte (`end_time` 01:00)
- Blackout parziale che copre metà servizio
- Due richieste simultanee sull'ultima fascia disponibile → **serve lock a livello DB, vedi sotto**

### Concorrenza

La creazione della prenotazione deve rivalidare la disponibilità **dentro una transazione** con `SELECT ... FOR UPDATE` sulle prenotazioni del tenant nella finestra interessata, oppure con un advisory lock `pg_advisory_xact_lock(hash(tenant_id, slot))`. Calcolare la disponibilità e poi inserire senza lock produce overbooking sotto carico.

---

## 5. Raccolta recensioni — versione conforme

> **Attenzione.** La versione precedente di questa specifica descriveva un flusso che chiedeva il voto e instradava solo i voti alti verso Google. Quella pratica si chiama *review gating*, è vietata dalle policy di Google, e le recensioni raccolte così possono essere rimosse fino alla sospensione del profilo dell'attività. Il danno ricadrebbe sul profilo del cliente, non sul nostro. **Non implementare quel flusso.**

### Flusso corretto

```
tap NFC / scan QR
  → GET /public/:slug/feedback?card=:cardUid
  → pagina unica che offre a TUTTI, senza filtri e senza chiedere prima il voto,
    due azioni affiancate con pari dignità visiva:

      [ Lascia una recensione su Google ]      [ Scrivi a noi in privato ]

  → "Google"  : redirect a googleReviewUrl(google_place_id)
                 registra Review { channel: 'google_redirect', rating: null }
  → "Privato" : form con voto 1–5 + commento
                 registra Review { channel: 'private', rating, comment }
                 notifica al titolare
```

### Regole vincolanti

- **Nessuna domanda sul voto prima di mostrare le due opzioni.** Il voto non può mai determinare quale strada viene proposta.
- **Pari dignità visiva.** Stessa dimensione, stesso peso, stesso colore di sfondo per i due pulsanti. Nessun ordine che suggerisca una preferenza.
- **Nessun incentivo.** Mai sconti, omaggi o punti in cambio di una recensione: vietato da Google e sanzionabile.
- **Nessun testo suggerito** da copiare nella recensione.
- **Nessuna pressione sul momento.** La pagina non deve indurre a completare la recensione mentre il personale è in attesa: includere sempre un "puoi farlo con calma più tardi" con link condivisibile.
- Il campo `routed_public` della v2 **va rimosso** e sostituito da `channel` enum (`google_redirect` | `private`).

### Cosa il locale ottiene comunque

Il valore per il ristoratore non cambia molto: chi è scontento tende comunque a scegliere il canale privato, e il titolare riceve la segnalazione in tempo reale. Quello che si perde è il controllo artificiale sulla media, che non era nostro da dare.

**URL Google:** `https://search.google.com/local/writereview?placeid={google_place_id}`. Se `google_place_id` è nullo, mostrare solo l'opzione privata.

**Anti-abuso:** rate limit per `card_uid` (max 1 invio ogni 10 minuti) e per IP.

---

## 6. API

### Pubbliche — nessuna auth, tenant risolto dallo slug

| Metodo | Path | Note |
|---|---|---|
| GET | `/public/:slug` | dati vetrina: nome, logo, colore, orari |
| GET | `/public/:slug/availability?date=&party_size=` | fasce disponibili |
| POST | `/public/:slug/reservations` | crea prenotazione |
| GET | `/public/reservations/:cancelToken` | dettaglio per pagina di disdetta |
| POST | `/public/reservations/:cancelToken/cancel` | disdetta dal cliente |
| GET | `/public/:slug/menu?lang=it` | menu completo |
| POST | `/public/:slug/reviews` | invio voto/recensione |

Rate limit: 30 req/min per IP sugli endpoint di lettura, 5 req/min sulle POST.
Anti-bot sul POST prenotazione: honeypot field + verifica tempo di compilazione minimo (un bot compila in <2s). Niente CAPTCHA nell'MVP.

### Autenticate — JWT, tenant dal token

```
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

GET    /reservations?date=&status=&q=
POST   /reservations                      (creazione manuale da telefonata)
PATCH  /reservations/:id                  (modifica, cambio stato, assegna tavolo)
DELETE /reservations/:id

GET    /customers?q=
GET    /customers/:id
PATCH  /customers/:id
DELETE /customers/:id                     (GDPR — audit obbligatorio)
GET    /customers/export                  (CSV — audit obbligatorio)

GET    /menu
POST   /menu/categories
PATCH  /menu/categories/:id
DELETE /menu/categories/:id
POST   /menu/items
PATCH  /menu/items/:id
DELETE /menu/items/:id
POST   /menu/items/:id/image              (upload)

GET    /reviews?rating=&seen=
PATCH  /reviews/:id                       (segna come vista, nota interna)

GET    /tables
POST   /tables
PATCH  /tables/:id

GET    /settings
PATCH  /settings
GET    /opening-hours
PUT    /opening-hours                     (sostituisce l'intero set)
POST   /blackouts
DELETE /blackouts/:id

GET    /nfc-cards
POST   /nfc-cards

GET    /stats/today                       (dashboard)
```

**Formato errori — uniforme ovunque:**
```json
{ "error": { "code": "SLOT_UNAVAILABLE", "message": "Questa fascia non è più disponibile.", "details": {} } }
```
Il campo `message` è già in lingua e mostrabile all'utente. Mai esporre stack trace o messaggi del database.

---

## 7. Notifiche

| Evento | Canale | Quando |
|---|---|---|
| Prenotazione creata (auto_confirm=true) | email al cliente | immediato |
| Prenotazione creata (auto_confirm=false) | email "in attesa di conferma" + push allo staff | immediato |
| Prenotazione confermata dallo staff | email + SMS al cliente | immediato |
| Promemoria | SMS se abilitato, altrimenti email | `reminder_hours_before` prima |
| Disdetta dal cliente | push + email allo staff | immediato |
| Recensione ≤ soglia | push + email al titolare | immediato |

**Idempotenza.** Prima di inviare, inserire in `NotificationLog`. Se la insert viola l'unique `(reservation_id, type)`, l'invio è già avvenuto: non rispedire. Un promemoria mandato due volte è peggio di uno non mandato.

**Tetto SMS.** Contatore mensile per tenant. Superato `sms_monthly_cap`, degrada silenziosamente a email e segnala nel pannello.

**Job schedulati.** Un worker ogni 5 minuti cerca le prenotazioni che entrano nella finestra del promemoria. Non usare `setTimeout`: il processo si riavvia.

---

## 8. Privacy e obblighi

Impianto: **il locale è titolare del trattamento, BigAnt è responsabile.**

Implementazioni obbligatorie nell'MVP:

- **Informativa privacy** generata per tenant, raggiungibile dal form pubblico prima dell'invio.
- **Consenso marketing separato** dalla prenotazione. Due checkbox distinte, quella marketing **non pre-spuntata**. Salvare `marketing_consent_at`.
- **Allergie = dato sanitario.** Campo opzionale, con avviso esplicito sul perché viene chiesto. Escluso dagli export non necessari.
- **Retention.** Job mensile che anonimizza i `Customer` senza prenotazioni da N mesi (default 24, configurabile): nome → "Cliente anonimizzato", telefono ed email → null, mantenendo il conteggio visite per le statistiche.
- **Cancellazione su richiesta:** `DELETE /customers/:id` anonimizza (non elimina, per non rompere lo storico prenotazioni) e scrive in `AuditLog`.
- **Export:** `GET /customers/export` produce CSV completo. È un obbligo, ed è anche un argomento di vendita contro chi trattiene i dati.
- **Audit** su export, cancellazione, modifica impostazioni.

Fuori codice ma prima del primo cliente pagante: atto di nomina a responsabile allegato al contratto, uguale per tutti i tenant.

---

## 9. Sicurezza e residenza dei dati

**Tutti i servizi che trattano dati personali devono essere configurati in regione europea.** Vale per database, storage immagini, code, log e monitoraggio. È un requisito, non una preferenza: i clienti sono locali italiani e il titolare del trattamento è il locale.


- Password: argon2id. Mai md5/sha.
- Refresh token in cookie `httpOnly`, `secure`, `sameSite=lax`.
- `cancel_token`: 32 byte random, non derivabile dall'id.
- Rate limit su login: 5 tentativi per email ogni 15 minuti.
- Upload immagini: whitelist MIME, dimensione max 5MB, ricompressione lato server, nome file randomizzato.
- Headers: CSP, HSTS, X-Content-Type-Options.
- Nessun dato personale nei log applicativi né nelle query string.
- **Test di isolamento tenant** in CI: crea due tenant, popola entrambi, verifica che ogni endpoint autenticato con il token del tenant A non restituisca mai righe del tenant B. Questo test deve esistere dal primo giorno.

---

## 10. UX — vincoli implementativi

### Pagine pubbliche
- Mobile-first, colonna singola, un solo CTA primario visibile senza scroll.
- Il verbo del bottone resta coerente: "Prenota il tavolo" → toast "Prenotato".
- Target di tocco ≥ 44×44px.
- Menu: render lato server, immagini in WebP con `srcset`, LCP < 2s su 3G simulata.
- Piatti esauriti: mostrati in grigio con etichetta, **mai nascosti**.
- **Nessuna registrazione richiesta**, mai.
- Nessuna disponibilità → non un errore: proporre le 2 date più vicine con posto.

### Pannello staff
- Home = solo oggi, in cima ciò che richiede decisione (da confermare, recensioni negative non viste).
- Azioni distruttive: undo per 5 secondi invece di dialog di conferma.
- Empty state = istruzione ("Nessuna prenotazione oggi. Aggiungine una se arriva una telefonata."), non illustrazione.
- Errori: cosa è successo + cosa fare. Mai codici, mai scuse.

### Branding
Il tenant controlla solo `logo_url` e `primary_color`. Tutto il resto è identico fra i clienti: coerenza = assistenza più semplice.

### Accessibilità
Contrasto ≥ 4.5:1, focus visibile, label vere nei form (non solo placeholder), `prefers-reduced-motion` rispettato.

---

## 11. Dati di prova

Il seed deve creare **due tenant completi e diversi**, non uno. Serve per rendere ovvio ogni errore di isolamento.

```
Tenant A — "Trattoria Santa Lucia" (restaurant)
  40 coperti, 12 tavoli, pranzo 12–15 e cena 19–23:30
  turn 90 min, pacing 12, auto_confirm true
  menu: 5 categorie, 28 piatti
  80 prenotazioni distribuite su 30 giorni, stati misti
  40 clienti, 25 recensioni

Tenant B — "Lido Miseno" (beach_club)
  120 coperti, 30 tavoli, servizio continuato 11–23
  turn 120 min, pacing 25, auto_confirm false
  menu: 3 categorie, 14 piatti
  150 prenotazioni, 60 clienti, 40 recensioni
```

Utenti: `owner@tenant-a.test` / `owner@tenant-b.test`, password `bigant2026`.

---

## 12. Definition of Done per modulo

Un modulo è finito quando **tutte** queste condizioni sono vere:

- [ ] Funziona end-to-end su entrambi i tenant di prova
- [ ] Test di isolamento tenant verde
- [ ] Test unitari sulla logica di dominio, casi limite inclusi
- [ ] Test e2e Playwright sul flusso pubblico principale
- [ ] Tutte le stringhe in `it` ed `en`
- [ ] Empty state, loading state ed error state implementati
- [ ] Verificato su viewport 375px
- [ ] Nessun dato personale fuori dalla regione EU
- [ ] Nessun `console.log` residuo, nessun TODO senza issue collegata

---

## 13. Criterio di completamento dell'MVP

L'MVP non è finito quando le funzioni esistono. È finito quando:

> un ristoratore che non è nessuno dei tre soci riceve una prenotazione vera da una persona vera, la conferma dal telefono, e a fine serata legge una recensione lasciata con la card.

Se questo accade una volta, il prodotto esiste. Prima di allora è un'ipotesi, e ogni funzione aggiunta in più è un'ipotesi costruita sopra un'altra ipotesi.

---

## 14. Backlog fase 2 — ordine di priorità

1. Fidelity digitale sulla stessa card NFC
2. Acconto / carta a garanzia contro i no-show
3. Sincronizzazione canali esterni (richiede accordo commerciale con TheFork)
4. Assistente vocale telefonico
5. Multi-sede sotto stesso brand
6. Layer agenti AI (orchestratore → agenti specializzati → strumenti, con gate di approvazione umana su tutto ciò che esce verso una persona)

Nessuno di questi punti va toccato prima che il criterio della sezione 13 sia soddisfatto.
