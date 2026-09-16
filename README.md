# BigAnt Book

Prototipo multi-tenant per prenotazioni di ristoranti e lidi. Next.js + Fastify + PostgreSQL 16, TypeScript, Prisma, pnpm/Turborepo. Interfaccia scura con accenti arancioni, italiano e inglese. Stato dei cancelli e decisioni: [PROGRESS](docs/PROGRESS.md).

## Avvio sul Mac

Su questo Mac: doppio clic su **Avvia BigAnt.command**, attendi l'avvio, poi apri **http://localhost:3000** in Chrome. Il runtime isolato è in `.local`: non modifica Node di sistema e non viene incluso in Git.

Su un checkout nuovo servono **Node 22** (`.nvmrc`) e **pnpm 10.32.1**. Con nvm: `nvm install && nvm use`, poi `corepack enable`.

```sh
pnpm install --frozen-lockfile
pnpm local
```

`pnpm local` crea `.env` se assente con un JWT secret casuale, avvia PostgreSQL su loopback:55432, applica migrazioni e seed, ricompila solo se il codice è cambiato e avvia web:3000 e API:3001. Lascia aperto il terminale; Ctrl+C ferma i processi avviati dal launcher. I dati persistono in `.local/postgres`. Se PostgreSQL era già avviato separatamente, resta attivo.

I due locali demo:

| Locale | Email staff | Password |
| --- | --- | --- |
| Trattoria Santa Lucia | owner@santalucia.test | bigant2026 |
| Lido Miseno | owner@lidomiseno.test | bigant2026 |

Santa Lucia conferma automaticamente; Lido richiede conferma dello staff. La home propone percorso cliente e pannello. Non vengono spediti messaggi. [Guida di prova in 15–20 minuti](docs/PROVA_LOCALE.md).

Il seed è idempotente: conserva le prove precedenti. Per ricreare intenzionalmente i **soli due locali demo cancellandone tutte le prove**: `pnpm demo:reset --confirm`, ad app ferme. Funziona soltanto su database locali chiamati `bigant` o `bigant_test`; vietato in produzione. Le prenotazioni ricreate hanno date relative a oggi.

## Sviluppo e verifiche

In alternativa al launcher, prepara `.env` da `.env.example`, genera un `JWT_SECRET` casuale e avvia `pnpm db:local` in un terminale. Nel secondo:

```sh
pnpm generate
pnpm db:migrate
pnpm seed
pnpm dev
```

Con PostgreSQL attivo:

```sh
pnpm typecheck
pnpm lint
pnpm test
NEXT_TELEMETRY_DISABLED=1 TURBO_TELEMETRY_DISABLED=1 pnpm build
pnpm test:e2e
```

Unit e integrazione usano PostgreSQL reale in `bigant_test`. Playwright ricrea i due tenant demo **solo nel database di test**, avvia API:3001 e web:3100 e verifica i percorsi browser a 375 px. Ferma il launcher prima degli E2E per liberare 3001; non eseguire Vitest e Playwright contemporaneamente sullo stesso DB.

Su macOS Playwright usa Chrome installato (compatibile anche con questo Mac macOS 13). Su Linux/CI: `pnpm exec playwright install --with-deps chromium`. Screenshot in `test-results/visual`, trace e schermate di errore in `test-results`, esclusi da Git. GitHub Actions è predisposto; non è stato eseguito sul remoto.

`API_INTERNAL_URL` deve essere impostato **alla build** per la destinazione delle rewrite Next. Default locale: `http://127.0.0.1:3001`. Nessuna chiave segreta nel frontend. Il launcher locale fissa porte e loopback; non è un comando di deploy.

## Autenticazione e dati

`POST /auth/login` richiede slug, email, password. JWT access di 15 minuti tenuto in memoria; refresh HttpOnly/Secure/SameSite=Lax in `/auth`, rotazione atomica e revoca persistente. Cinque tentativi per email ogni 15 minuti. Il percorso browser locale usa `localhost`; cookie Secure non allentati. Per un link di rete serve HTTPS.

Il data layer impone contesto tenant su tutte le operazioni. `db` va usato dentro `withTenant`, con claim autenticati o tenant risolto dallo slug pubblico; senza contesto fallisce. FK composte impediscono relazioni fra tenant. Raw SQL, cambi tenant/identità e scritture relazionali annidate sono vietati. La transazione prenotazioni applica un advisory lock parametrizzato interno per tenant: capienza e disponibilità sono rivalidate prima di scrivere.

Migrazioni/seed e lookup minimali pre-contesto sono privilegiati. Il client Prisma senza filtro non è esportato alle app. Non è RLS: l'accesso diretto alle credenziali DB resta privilegiato. Nessun dato personale nei log applicativi; ricerca staff eseguita localmente sui risultati della giornata.

## Perimetro e condivisione

M0: fondamenta. M1: motore. M2: cliente/staff, impostazioni e tavoli. Nessun menu, recensioni, notifica reale, PWA o deploy anticipato. [Missioni](docs/MISSIONS.md), [specifica](docs/SPEC.md), [backlog](docs/BACKLOG.md). Gli originali ricevuti sono in `files/`.

Il repository è locale: **nessuna pubblicazione GitHub**. Condividerlo permetterà ai soci di clonare il codice; per una prova via link servirà un ambiente ospitato. `.env`, database, runtime, dipendenze e artefatti sono esclusi da Git. [Report servizi da collegare](docs/SERVIZI_ESTERNI.md).
