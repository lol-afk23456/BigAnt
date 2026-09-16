# BigAnt Book

Prototipo multi-tenant per prenotazioni e menu di ristoranti e lidi. Next.js + Fastify + PostgreSQL 16, TypeScript, Prisma, pnpm/Turborepo. Interfaccia scura con accenti arancioni, italiano e inglese. Stato dei cancelli e decisioni: [PROGRESS](docs/PROGRESS.md).

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

Santa Lucia conferma automaticamente; Lido richiede conferma dello staff. La home seleziona i demo; ogni locale ha un ingresso dedicato `/r/:slug` con prenotazione, menu e accesso staff `/r/:slug/staff`. Nel login dedicato non si sceglie un altro locale. Non vengono spediti messaggi. [Guida di prova in 20–25 minuti](docs/PROVA_LOCALE.md).

Il seed conserva le prove precedenti. I vecchi placeholder del menu mai modificati vengono aggiornati a contenuti IT/EN dimostrativi; piatti modificati, foto e prenotazioni vengono conservati. Ricette/prezzi/allergeni seed non sono un menu reale verificato. Per ricreare intenzionalmente i **soli due locali demo cancellandone tutte le prove**: `pnpm demo:reset --confirm`, ad app ferme. Funziona soltanto su database locali chiamati `bigant` o `bigant_test`; vietato in produzione. Le prenotazioni ricreate hanno date relative a oggi.

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

M0–M3 implementate: fondamenta, motore prenotazioni, cliente/staff, impostazioni/tavoli e menu digitale. Consolidamento M3C concluso e cancello verde. M4 recensioni, M5 notifiche/PWA/privacy e M6 produzione restano da costruire. [Missioni](docs/MISSIONS.md), [specifica](docs/SPEC.md), [backlog](docs/BACKLOG.md). Gli originali ricevuti sono archiviati in `files/`; i documenti operativi correnti sono in `docs/`. [Indice documentazione](docs/README.md), [decisioni approvate](docs/DECISIONS.md).

Il repository è locale: **nessuna pubblicazione GitHub**. Condividerlo permetterà ai soci di clonare il codice; per una prova via link servirà un ambiente ospitato. `.env`, database, runtime, dipendenze e artefatti sono esclusi da Git. [Report servizi da collegare](docs/SERVIZI_ESTERNI.md).

## Menu digitale (M3)

Dal pannello, voce **Menu**: categorie/piatti IT/EN, riordino, prezzi in centesimi, allergeni, foto e disponibilità. Il titolare sceglie quattro template scuri, colore e copertina in **Aspetto del menu**. Il comando occhio nasconde un piatto dalla risposta pubblica senza marcarlo esaurito; esaurito resta visibile in grigio. Le pagine pubbliche sono `/r/:slug/menu`, renderizzate sul server e aggiornate ogni 30 secondi quando visibili, anche al ritorno sulla scheda, senza reload del documento e conservando il punto di lettura.

Upload JPEG/PNG/WebP fino a 5 MB, validazione del formato reale, ricompressione e rimozione metadati con Sharp. File in `.local/menu-images` o `MENU_IMAGE_DIR` (percorso assoluto): includerli nei backup, non in Git. Nessun bucket cloud necessario per la prova locale. La migrazione M3 aggiunge solo colonne e vincoli, senza reset.

`pnpm test:e2e` include un solo scenario browser aggiuntivo per tutto il menu, con quattro screenshot mobile e Lighthouse. Il test usa immagini sintetiche nel database separato. `pnpm test:menu-performance [URL-locale]` permette di ripetere il cancello sulla pagina avviata: performance ≥ 90 e LCP < 2 s, profilo mobile con throttling DevTools applicato da Chrome: download 750 Kbps, upload 250 Kbps, latenza 150 ms e CPU 4×. Report in `test-results/menu-lighthouse.json`. Lighthouse usa Chrome installato; in CI il test indica esplicitamente il Chromium di Playwright.
