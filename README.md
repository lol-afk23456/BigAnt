# BigAnt Book

Prototipo multi-tenant per prenotazioni, menu e feedback di ristoranti e lidi. Next.js + Fastify + PostgreSQL 16, TypeScript, Prisma, pnpm/Turborepo. Interfaccia scura con accenti arancioni, italiano e inglese. Stato dei cancelli e decisioni: [PROGRESS](docs/PROGRESS.md). Nuova [prova collaboratori](docs/COLLAUDO_COLLABORATORI_2026-09.md) e [review prodotto/Superb](docs/REVIEW_PRODOTTO_SUPERB.md) del 23 settembre.

## Avvio sul Mac

Su questo Mac: doppio clic su **Avvia BigAnt.command**, attendi l'avvio, poi apri **http://localhost:3000** in Chrome. Il runtime isolato è in `.local`: non modifica Node di sistema e non viene incluso in Git.

Repository per soci e tester: [lol-afk23456/BigAnt](https://github.com/lol-afk23456/BigAnt). [Guida tester](docs/GUIDA_TESTER.md). Il PDF consegnato all'utente resta sul Mac ed è escluso da Git.

Su un checkout nuovo servono **Git, Node 22.23.2** (`.nvmrc`) e **pnpm 10.32.1**. Installa Node con [nvm](https://github.com/nvm-sh/nvm) o dal [sito ufficiale](https://nodejs.org/en/download), scegliendo la versione richiesta. Con nvm, riapri il terminale dopo l'installazione e usa `nvm install` e `nvm use` nella cartella clonata. Per pnpm usa la versione fissata dal progetto ([installazione pnpm 10](https://pnpm.io/10.x/installation)).

```sh
git clone https://github.com/lol-afk23456/BigAnt.git
cd BigAnt
# Solo se usi nvm:
nvm install
nvm use
npm install --global pnpm@10.32.1
pnpm install --frozen-lockfile
pnpm local
```

`pnpm local` crea `.env` se assente con un JWT secret casuale, avvia PostgreSQL su loopback:55432, applica migrazioni e seed, ricompila solo se il codice è cambiato e avvia web:3000, API:3001 e worker notifiche ogni cinque minuti. Lascia aperto il terminale; Ctrl+C ferma i processi avviati dal launcher. I dati persistono in `.local/postgres`. Se PostgreSQL era già avviato separatamente, resta attivo.

I due locali demo:

| Locale | Email staff | Password |
| --- | --- | --- |
| Trattoria Santa Lucia | owner@santalucia.test | bigant2026 |
| Lido Miseno | owner@lidomiseno.test | bigant2026 |

Santa Lucia conferma automaticamente; Lido richiede conferma dello staff. La home seleziona i demo; ogni locale ha un ingresso dedicato `/r/:slug` con prenotazione, menu e accesso staff `/r/:slug/staff`. Nel login dedicato non si sceglie un altro locale. Non vengono spediti messaggi. [Guida di prova in 40–45 minuti](docs/PROVA_LOCALE.md).

Il seed conserva le prove precedenti. I vecchi placeholder del menu mai modificati vengono aggiornati a contenuti IT/EN dimostrativi; piatti modificati, foto e prenotazioni vengono conservati. Ricette/prezzi/allergeni seed non sono un menu reale verificato. Per ricreare intenzionalmente i **soli due locali demo cancellandone tutte le prove**: `pnpm demo:reset --confirm`, ad app ferme. Funziona soltanto su database locali chiamati `bigant` o `bigant_test`; vietato in produzione. Le prenotazioni ricreate hanno date relative a oggi.

Il seed aggiorna anche nomi e feedback originali mai modificati. `pnpm demo:examples`, con DB locale attivo e notifiche demo, aggiunge casi guidati coppia/famiglia/gruppo e lista d’attesa, rispettando disponibilità e prove precedenti. È ripetibile senza duplicati nello stesso giorno. [Dati già presenti](docs/DATI_DEMO.md), [protocollo di test](docs/PROTOCOLLO_TEST.md) e [lavori necessari prima della produzione](docs/MESSA_IN_PRODUZIONE.md).

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

Su macOS Playwright usa Chrome installato (compatibile anche con questo Mac macOS 13). Su Linux/CI: `pnpm exec playwright install --with-deps chromium`. Screenshot in `test-results/visual`, trace e schermate di errore in `test-results`, esclusi da Git. GitHub Actions esegue i controlli a ogni push/PR; l'esito della prima esecuzione remota è registrato in [PROGRESS](docs/PROGRESS.md).

`API_INTERNAL_URL` deve essere impostato **alla build** per la destinazione delle rewrite Next. Default locale: `http://127.0.0.1:3001`. Nessuna chiave segreta nel frontend. Il launcher locale fissa porte e loopback; non è un comando di deploy.

## Autenticazione e dati

`POST /auth/login` richiede slug, email, password. JWT access di 15 minuti tenuto in memoria; refresh HttpOnly/Secure/SameSite=Lax in `/auth`, rotazione atomica e revoca persistente. Cinque tentativi per email ogni 15 minuti. Il percorso browser locale usa `localhost`; cookie Secure non allentati. Per un link di rete serve HTTPS.

Il data layer impone contesto tenant su tutte le operazioni. `db` va usato dentro `withTenant`, con claim autenticati o tenant risolto dallo slug pubblico; senza contesto fallisce. FK composte impediscono relazioni fra tenant. Raw SQL, cambi tenant/identità e scritture relazionali annidate sono vietati. La transazione prenotazioni applica un advisory lock parametrizzato interno per tenant: capienza e disponibilità sono rivalidate prima di scrivere.

Migrazioni/seed e lookup minimali pre-contesto sono privilegiati. Il client Prisma senza filtro non è esportato alle app. Non è RLS: l'accesso diretto alle credenziali DB resta privilegiato. Nessun dato personale nei log applicativi; ricerca staff eseguita localmente sui risultati della giornata.

## Perimetro e condivisione

M0–M3 implementate: fondamenta, motore prenotazioni, cliente/staff, impostazioni/tavoli e menu digitale. Consolidamento M3C concluso e cancello verde. M4 recensioni conclusa; M5 notifiche/PWA/privacy verificata localmente con invii simulati, M5S sala/attesa conclusa. M5C aggiunge dati guidati e protocollo. Ultimo ricontrollo: 104 test backend e sette scenari browser, tipi/lint/build verdi. M6 produzione e verifica push fisiche restano da attivare. [Missioni](docs/MISSIONS.md), [specifica](docs/SPEC.md), [backlog](docs/BACKLOG.md). Gli originali ricevuti sono archiviati in `files/`; i documenti operativi correnti sono in `docs/`. [Indice documentazione](docs/README.md), [decisioni approvate](docs/DECISIONS.md).

Il repository di destinazione autorizzato il 17 settembre è [BigAnt su GitHub](https://github.com/lol-afk23456/BigAnt); l'esito della pubblicazione è registrato in [PROGRESS](docs/PROGRESS.md). Il clone ricrea dati demo indipendenti sul computer di ciascun tester; per una prova comune via link serve un ambiente ospitato. `.env`, database, foto locali, runtime, dipendenze, artefatti di build/test e PDF della guida sono esclusi dai file correnti di Git. [Report servizi da collegare](docs/SERVIZI_ESTERNI.md).

## Menu digitale (M3)

Dal pannello, voce **Menu**: categorie/piatti IT/EN, riordino, prezzi in centesimi, allergeni, foto e disponibilità. Il titolare sceglie quattro template scuri, colore e copertina in **Aspetto del menu**. Il comando occhio nasconde un piatto dalla risposta pubblica senza marcarlo esaurito; esaurito resta visibile in grigio. Le pagine pubbliche sono `/r/:slug/menu`, renderizzate sul server e aggiornate ogni 30 secondi quando visibili, anche al ritorno sulla scheda, senza reload del documento e conservando il punto di lettura.

Upload JPEG/PNG/WebP fino a 5 MB, validazione del formato reale, ricompressione e rimozione metadati con Sharp. File in `.local/menu-images` o `MENU_IMAGE_DIR` (percorso assoluto): includerli nei backup, non in Git. Nessun bucket cloud necessario per la prova locale. La migrazione M3 aggiunge solo colonne e vincoli, senza reset.

`pnpm test:e2e` include un solo scenario browser aggiuntivo per tutto il menu, con quattro screenshot mobile e Lighthouse. Il test usa immagini sintetiche nel database separato. `pnpm test:menu-performance [URL-locale]` permette di ripetere il cancello sulla pagina avviata: performance ≥ 90 e LCP < 2 s, profilo mobile con throttling DevTools applicato da Chrome: download 750 Kbps, upload 250 Kbps, latenza 150 ms e CPU 4×. Report in `test-results/menu-lighthouse.json`. Lighthouse usa Chrome installato; in CI il test indica esplicitamente il Chromium di Playwright.

## Recensioni e card (M4)

Feedback pubblico `/r/:slug/feedback?card=:cardUid`: Google e privato offerti prima del voto, con uguale peso. Il form privato richiede voto 1–5 e consente un messaggio anonimo; il pannello segnala i privati da leggere, conserva note interne e gestisce le card. Una card accetta un invio ogni dieci minuti sui due canali, con controllo nel database; il limite è condiviso fra gli ospiti. I Place ID seed sono dimostrativi e mostrano un esito locale. Accesso al link Google distinto da recensione pubblicata. Email/push reali M5. Guida in [PROVA_LOCALE](docs/PROVA_LOCALE.md).

Analisi delle sovrapposizioni e comportamento sala/attesa M5S in [SALA_E_ATTESA](docs/SALA_E_ATTESA.md). Zone e motore originali riusati, con estensione verificata senza sostituire l’assegnazione singola.

## Notifiche, PWA e privacy (M5 locale)

Outbox PostgreSQL persistente e worker; messaggi registrati prima dell’invio, quota SMS per locale e fallback email. La modalità demo predefinita produce esiti **simulated**, senza inviare email/SMS/push. Pannelli Notifiche e Clienti, CSV con audit, anonimizzazione e retention a lotti; informativa pubblica bozza e marketing separato. PWA dedicata al locale e offline generico, senza cache di dati ospiti. [Guida notifiche/privacy](docs/NOTIFICHE_E_PRIVACY.md).

Gli adattatori reali esistono, ma account/dominio, residenza EU, HTTPS e prove Android/iPhone sono necessari prima dell’attivazione. Il cancello locale non prova il recapito su un telefono fisico.

## Sala e attesa (M5S)

In **Tavoli**, filtro per zone esistenti e combinazioni consentite configurate dal titolare. Form operatore e dettaglio possono assegnarle; tutti i componenti vengono occupati sotto lo stesso lock, con nome e tavoli storici conservati. Il cliente automatico continua sui singoli tavoli.

Dall’agenda, **Apri lista d’attesa**: servizio, cognome/coperti, FIFO e suggerimenti compatibili. **Accomoda** rivalida e crea la prenotazione al tavolo senza contatti inventati; **Completa** libera i componenti. Nessun SMS automatico. [Comportamento e vincoli](docs/SALA_E_ATTESA.md), [prova locale](docs/PROVA_LOCALE.md).
