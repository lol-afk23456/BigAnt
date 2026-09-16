# BigAnt Book — M0

Fondamenta del monorepo. Nessuna schermata di prodotto e nessun motore di prenotazione.

## Avvio locale

Richiede Node 22 (vedi `.nvmrc`) e pnpm 10.32.1. Con nvm: `nvm install && nvm use`, poi `corepack enable`.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
pnpm db:local
```

Lasciare PostgreSQL in quel terminale; Ctrl+C lo ferma senza cancellare i dati in `.local/postgres`. Il database ascolta solo su loopback. In alternativa utilizzare PostgreSQL 16 già disponibile e impostare `DATABASE_URL` e `TEST_DATABASE_URL`.

In un secondo terminale, dalla radice:

```sh
pnpm db:migrate
pnpm generate
pnpm seed
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

`pnpm test` applica le migrazioni a un database separato con nome terminante in `_test` (default `bigant_test`). Non esegue reset o cancellazioni sul database di sviluppo. I test usano PostgreSQL reale.

Per sviluppo: `pnpm dev`. API su 3001 e web su 3000. Per API compilata: `pnpm --filter @bigant/api start`; per web compilato: `pnpm --filter @bigant/web start`.

## Autenticazione

`POST /auth/login` con JSON `{ "slug": "trattoria-santa-lucia", "email": "owner@santalucia.test", "password": "bigant2026" }`. Secondo locale: slug `lido-miseno`, email `owner@lidomiseno.test`, stessa password demo. Gli account demo non sono destinati alla produzione; il seed si rifiuta di partire con `NODE_ENV=production`.

Access JWT di 15 minuti nella risposta; refresh JWT nel cookie `__Secure-bigant_refresh`, HttpOnly, Secure, SameSite=Lax, durata massima della sessione 30 giorni. `POST /auth/refresh` ruota il refresh atomicamente, `POST /auth/logout` revoca la sessione. Conservare l'access token solo in memoria. Per utilizzare il cookie nel browser serve HTTPS anche nell'ambiente di sviluppo. Nessun pannello di accesso è previsto in M0.

Il login richiede lo slug perché l'email è unica per tenant. Cinque tentativi per email normalizzata ogni 15 minuti. Il rate limit M0 è in memoria e richiede una singola istanza; lo store condiviso prima di più repliche è nel backlog.

## Confine del data layer

Le applicazioni importano soltanto `@bigant/database`. `db` richiede `withTenant(tenantId, callback)` e impone il filtro su letture, scritture, aggregati e transazioni. Senza contesto la query fallisce. `Tenant` è filtrato sul suo `id`; tutte le altre tabelle su `tenant_id`.

Il contesto deriva dai claim verificati con `app.authenticateStaff(request)`, mai da un tenant inviato nel body. SQL raw, cambi di identità e scritture relazionali annidate sono rifiutati. Le relazioni si scrivono usando FK scalari: i vincoli composti PostgreSQL impediscono riferimenti tra tenant. Letture con `include` sono ammesse attraverso queste relazioni vincolate.

Le sole operazioni privilegiate sono migrazione, seed e risoluzione pre-login dello slug (restituisce id e stato, non dati di dominio). Il client Prisma non filtrato non è esportato. Non è RLS PostgreSQL: codice con accesso diretto alle credenziali DB resta privilegiato. ESLint vieta import diretti di Prisma nelle app.

## Documenti e perimetro

`AGENTS.md`, `docs/SPEC.md`, `docs/MISSIONS.md` sono i documenti operativi; gli originali ricevuti sono conservati in `files/`. Stato e decisioni utente sono in `docs/PROGRESS.md`, rinvii in `docs/BACKLOG.md`.

La SPEC enumera 14 modelli di dominio, non 12. Sono tutti presenti, più `StaffSession` per rotazione e revoca persistente dei refresh. Il telefono cliente è nullable per l'anonimizzazione prevista da SPEC §8; email e telefono saranno entrambi obbligatori nell'input pubblico, come richiesto dall'utente.

Nessun servizio remoto, invio email/SMS, storage o telemetria applicativa configurato. La residenza EU dell'ambiente di produzione va verificata in M6.
