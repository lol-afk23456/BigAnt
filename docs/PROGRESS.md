# Avanzamento BigAnt Book

## Stato al 16 settembre 2026

**M0–M3 completate.** M3 include i quattro template e il comando occhio approvati dall’utente. Cancelli automatici verdi; M4–M6 non iniziate.

## Realizzato

- Repository Git e monorepo pnpm 10.32.1 + Turborepo; Node 22.23.2, TypeScript strict.
- API Fastify con healthcheck e autenticazione staff; Next.js App Router + Tailwind con pagina vuota. Nessuna schermata o logica di prodotto.
- Tutti i modelli di SPEC §3, indici, FK composte e vincoli SQL; migrazione `202609160001_m0` applicata a PostgreSQL 16.14 locale, database `bigant` e `bigant_test`.
- Prisma extension con contesto tenant obbligatorio, filtro imposto su letture/scritture/aggregati e transazioni. Query senza contesto, raw SQL, cambio tenant e scritture relazionali annidate rifiutati.
- Argon2id, JWT access 15 minuti, refresh in cookie HttpOnly/Secure/SameSite=Lax; sessioni persistenti con hash, rotazione atomica, scadenza massima 30 giorni e revoca al logout. Utenti disabilitati e tenant sospesi non possono usare la sessione.
- Login limitato a 5 tentativi per email normalizzata ogni 15 minuti. Sesto tentativo: HTTP 429 con errore tradotto. Header di sicurezza; log applicativi disabilitati per evitare dati personali.
- Seed ripetibile per Trattoria Santa Lucia e Lido Miseno: rispettivamente 40/60 clienti, 80/150 prenotazioni, 12/30 tavoli, 5/3 categorie, 28/14 piatti, 25/40 recensioni; impostazioni, orari, chiusura demo, card NFC, log e staff distinti.
- Vitest con PostgreSQL reale, Playwright minimale, ESLint senza warning e workflow GitHub Actions. Workflow predisposto, non eseguito su GitHub perché non è stato pubblicato alcun repository remoto.
- README, `.env.example`, PROGRESS e BACKLOG.

## Decisioni tecniche

1. La dicitura «12 entità» nei documenti non corrisponde alla lista: SPEC §3 enumera 14 modelli contando separatamente MenuCategory/MenuItem e includendo AuditLog. Implementati tutti, più StaffSession, necessaria a revoca e rotazione dei refresh.
2. Tenant è l'entità radice: il suo `id` è il confine; ogni altra tabella ha `tenant_id`. Non introdotta una colonna tenant_id autoreferenziale.
3. Un chiamante senza contesto tenant fallisce. All'interno di `withTenant`, l'extension inietta il filtro anche se la query lo omette. Il callback viene atteso all'interno del contesto perché PrismaPromise è lazy: questo comportamento è coperto dai test.
4. Le scritture annidate Prisma sono rifiutate perché non attraversano tutti gli hook dell'extension. Le FK scalari composte consentono operazioni esplicite e impediscono collegamenti tra tenant anche a livello SQL. Nessuna RLS dichiarata: credenziali DB, migrazioni e seed restano privilegiati.
5. Il solo lookup pre-login risolve uno slug in id/stato; non restituisce dati di dominio. Login con slug + email + password, essendo l'email unica per tenant.
6. UUID v7 generati da Prisma per gli id, date timestamptz, centesimi interi, citext per email, indice parziale NotificationLog dove status != failed, slug immutabile con trigger SQL.
7. Telefono Customer nullable per consentire l'anonimizzazione di SPEC §8. Email e telefono saranno entrambi obbligatori nell'input pubblico, secondo la decisione utente; nessun form o endpoint prenotazione è stato anticipato.
8. Credenziali demo secondo AGENTS.md (prevale su SPEC): `owner@santalucia.test`, `owner@lidomiseno.test`, password `bigant2026`. Seed transazionale per tenant; una seconda esecuzione conserva i dati esistenti senza duplicarli; proibito in NODE_ENV=production.
9. PostgreSQL locale incluso come strumento di sviluppo, senza modificare PostgreSQL/Node di sistema. `.local`, `.env`, store e artefatti esclusi da Git. Nessun servizio remoto o invio reale configurato; residenza EU da verificare al deploy M6.
10. Pacchetti condivisi consumati come TypeScript e controllati con tsc; API compilata in JavaScript con esbuild e dipendenze runtime esterne, web con build Next.js. Typegen precede il typecheck web anche su checkout pulito.
11. Rate limit M0 in memoria per una sola istanza. Store condiviso e configurazione proxy/TLS prima della distribuzione sono annotati nel backlog.

## Verifiche eseguite

Tutti con esito 0 su Node 22.23.2 e PostgreSQL 16.14:

| Comando | Risultato |
| --- | --- |
| `pnpm db:migrate` | Prima migrazione applicata |
| `pnpm seed` | Due tenant completi; seconda esecuzione senza duplicati |
| `pnpm typecheck` | Sette pacchetti/app e test TypeScript verificati |
| `pnpm lint` | Zero errori, zero warning |
| `pnpm test` | 30 test passati, 3 file |
| `pnpm build` | API JavaScript e Next.js di produzione compilati |
| `pnpm test:e2e` | 1 verifica HTTP della pagina vuota, nessun flusso di prodotto |
| `pnpm --filter @bigant/web typecheck` | Typegen e controllo tipi verificati |
| Smoke HTTP API compilata | Healthcheck e login di entrambi i tenant passati; processo chiuso |

`tenant-isolation.test.ts` verifica ogni modello con token A e B su route registrate **solo nei test**. Include query senza contesto, findUnique, aggregati, OR, update/delete, createMany, upsert, raw SQL, include, FK e transazioni parallele.

Auth: scadenza access, refresh, replay e concorrenza, logout, scadenza 30 giorni, sesto tentativo con IP diversi e maiuscole, JWT manomessi/tipo errato, utente disabilitato, errori localizzati e header. Verificati inoltre conteggi seed, UUID v7, Argon2id e vincoli SQL.

Nel terminale di questa sessione il Node di sistema era 12 e mancava pnpm: verifiche eseguite aggiungendo al PATH `/tmp/node-v22.23.2-darwin-x64/bin` e `/tmp/bigant-tooling/node_modules/.bin`. Per sessioni future usare `.nvmrc` e le istruzioni README. Test e migrazioni richiedono accesso al database locale; la sandbox del runner richiede escalation per connessioni/socket. Playwright emette soltanto il warning del runner per NO_COLOR/FORCE_COLOR, senza errori di test.

## Decisioni utente per M2 (approvate)

- Pagina unica: rivelare i campi progressivamente, non mostrarli tutti insieme; riepilogo vicino al pulsante finale.
- Partire da oggi; se pieno o chiuso, selezionare automaticamente il primo giorno utile, senza schermate vuote.
- Numero di persone tramite pulsanti toccabili, mai menu a tendina.
- Email e telefono entrambi obbligatori nel flusso di prenotazione.
- Richieste facoltative dietro «Aggiungi una richiesta».
- Nessuna disponibilità: proporre le due date alternative con tono invitante e possibilità di continuare.
- Test frontend leggeri, concentrati sui flussi essenziali.

Goal precedente, concluso: completare M1 e M2, testing locale Mac, repository pronto per GitHub senza pubblicazione, report servizi esterni. Tema esclusivamente scuro con accenti arancioni.

## M1 — cancello superato

M1 implementata il 16 settembre 2026. `pnpm typecheck`, `pnpm lint`, `pnpm test` (53 test), `pnpm build` e `pnpm test:e2e` (smoke M0) tutti con esito 0. M2 ora autorizzata dal goal.

- Motore puro in `packages/core/src/availability.ts`: aperture, limiti temporali, capienza/override, pacing, tavoli, blackout totali/parziali, servizi oltre mezzanotte. Date civili nel fuso del tenant; UTC nel database. Luxon distingue entrambe le occorrenze dell'ora ripetuta e salta l'ora inesistente; libphonenumber-js/max normalizza e valida E.164.
- Creazione e modifica sotto advisory lock PostgreSQL per tenant, transazione Read Committed: copre anche fasce distinte ma permanenze sovrapposte. 20 richieste concorrenti sull'ultimo posto: 1 risposta 201, 19 risposte 409.
- L'extension continua a vietare SQL raw alle app. Il solo helper interno di transazione apre una capability temporanea privata per eseguire il lock parametrizzato. Lookup pre-contesto del cancel token restituisce solo id/tenant, non dati personali.
- API vetrina/disponibilità/prenotazione/disdetta e CRUD staff; form token firmato per verificare almeno 2 secondi di compilazione e honeypot, rate limit pubblici. Nessuna email inviata.
- Query di disponibilità restituisce le prime due date successive utili entro la finestra del locale quando non ci sono posti. Non restituisce ID tavoli o ragioni interne dei blackout.
- Stato cancellato/completato non riapribile; disdetta cliente soggetta al termine; disdetta staff con audit. Modifiche conservano la durata storica e rivalidano tavolo/capienza. Conteggi visite/no-show aggiornati una volta tramite transizione serializzata.
- Ambiguità SPEC §4: prevalgono i cinque controlli e il criterio esplicito M1. Con assegnazione automatica e nessun tavolo compatibile lo slot non è prenotabile; senza assegnazione automatica può esserlo in base alla capienza. Assegnazione sceglie il tavolo libero più piccolo.
- Il 26 ottobre è cambio ora nel 2025; nel 2026 è il 25 ottobre. Test coprono entrambi, più 29/30 marzo e il giorno successivo al cambio autunnale.
- Nessuna ricerca di dati personali in query string: il filtro testuale staff sarà locale ai risultati della giornata in M2.


## M2 — cancello superato

- UI esclusivamente scura/arancione, catalogo IT/EN: homepage demo, pagina prenotazione progressiva, ricezione/conferma, link gestione e disdetta, login e dashboard staff, lista/orari, prenotazione telefonica, stati/tavoli/note, impostazioni/orari/chiusure e gestione tavoli.
- Saltare oggi se pieno/chiuso; persone tramite pulsanti; email e telefono richiesti; richieste facoltative collassate. I contatti digitati restano in memoria anche se occorre cambiare fascia.
- Access token solo in memoria; refresh coordinato; proxy Next same-origin. Cookie Secure invariato; login, refresh al reload e logout verificati in Chrome su localhost.
- Route impostazioni autenticate: mutazioni owner, isolamento tenant imposto, orari validati anche oltre mezzanotte, audit e lock per modifiche che influenzano la disponibilità.
- Orari modificati nel fuso del tenant, anche con browser in America/New_York; ora DST inesistente rifiutata, ambigua risolta alla prima occorrenza (se invariata conserva l'istante originale).
- Avvio `pnpm local`, launcher Mac e runtime isolato in `.local`; seed relativo a oggi e reset demo esplicito, solo locale. Nessuna pubblicazione GitHub.
- Guide `PROVA_LOCALE.md` e `SERVIZI_ESTERNI.md`, con verifica fonti ufficiali EU e distinzione servizi M5–M6. Resend Irlanda non significa archiviazione EU; annotato nel report.
- Test backend: **57/57 passati** su PostgreSQL reale, inclusi tre nuovi scenari impostazioni/permessi/isolamento e conversione fusi/DST. Typecheck, lint, build e flussi browser completati con esito 0.

- Reset del database demo di sviluppo **non eseguito**: la revisione automatica ha rifiutato la cancellazione dei due tenant perché potrebbe eliminare prove dell'utente. Alternativa adottata: dati esistenti conservati; nuovo seed relativo a oggi verificato soltanto nel database di test. Il comando di reset resta un'operazione esplicita per l'utente, non parte dell'avvio ordinario.


### Verifiche finali M2

| Comando/verifica | Esito |
| --- | --- |
| `pnpm typecheck` | Verde: pacchetti, web, API e test |
| `pnpm lint` | Verde, zero warning |
| `pnpm test` | 57/57, sei file, PostgreSQL reale |
| `pnpm build` | Verde: sette pacchetti/app, Next produzione |
| `pnpm test:e2e` | 3/3, Chrome su questo Mac; ultima esecuzione circa 1,5 minuti |
| QA visiva | Cliente e staff a 375 px, staff a 1440 px; screenshot ispezionati, nessun overflow orizzontale |

I due scenari browser provano campi progressivi/obbligatori, salto di oggi chiuso, due alternative, conferma immediata, disdetta dopo finestra undo, lingua EN, richiesta Lido, login/refresh al reload, conferma, assegnazione tavolo, impostazioni, creazione tavolo e logout. Browser in America/New_York, locali Europe/Rome. Un terzo smoke HTTP controlla la home. Nessuna suite frontend estesa.

Correzioni emerse durante la verifica: import dei pacchetti TS risolvibili da Next; header JSON solo quando c'è un body (refresh/disdetta/logout senza body); fixture E2E elimina prima i riferimenti NotificationLog; selettori dei test basati sul nome accessibile effettivo. Limite scenario 120 s e azione 15 s, senza rimuovere asserzioni. Le prime esecuzioni fallite non sono conteggiate come passate.

La build iniziale sul Mac è stata lenta (circa 17 minuti per Turbo nell'ultima ricompilazione completa). Il launcher confronta un'impronta dei sorgenti/configurazione, versione Node e origine API: riusa gli artefatti se invariati, ricompila se necessario. Non dipende da un runtime temporaneo in `/tmp`: Node e pnpm locali sono in `.local`, esclusi da Git.

Decisione calendario M2: agenda del giorno selezionato, con lista che porta in cima le richieste pendenti e vista Orari ordinata cronologicamente. Nessuna vista multi-sede o gestione turni aggiunta. Disdette cliente/staff e rimozioni prevedono undo di cinque secondi.

**Confine:** fermato a M2. M3–M6 non iniziate. Nessuna email/SMS/push reale, nessun deploy, nessun remote GitHub e nessun invito. Guide di prova e servizi esterni consegnate. Dati demo preesistenti conservati; seed relativo a oggi disponibile per nuove installazioni e verificato nel DB di test.


### Avvio locale e punto di arresto

`pnpm local` verificato sul database di sviluppo esistente: migrazioni senza modifiche pendenti, seed idempotente (due tenant conservati), impronta build invariata e nessuna ricompilazione. Web su 3000 e API su 3001, esplicitamente separati. HTTP 200 su home e vetrina pubblica di entrambi i locali tramite proxy Next. Arresto con Ctrl+C completato con esito 0; i processi web/API sono stati fermati per permettere il riavvio dell'app. PostgreSQL locale preesistente e dati conservati.

Dopo il riavvio di ChatGPT/Codex: aprire `Avvia BigAnt.command` da Finder, quindi `http://localhost:3000` in Chrome. Accessi e checklist in `docs/PROVA_LOCALE.md`; dipendenze esterne in `docs/SERVIZI_ESTERNI.md`. Il goal si ferma qui, prima di qualsiasi pubblicazione o missione M3.


## M3 — estensione approvata dall’utente

Il 16 settembre, dopo la prova M2, l’utente ha chiesto di continuare. M3 avviata con cancello M2 già verde. Ha poi approvato esplicitamente di includere subito quattro template e il comando occhio, estendendo il branding limitato della SPEC.

- Quattro stili scuri: Essenziale (bistrot/trattoria), Pop (pizzeria/informale), Elegante (ristorazione ricercata), Pub (birreria/burger bar). Un colore principale e una copertina per locale; arancione iniziale. I contenuti sono gli stessi per tutti gli stili.
- Visibilità `is_visible` indipendente da `is_available`: occhio esclude il piatto dalla risposta pubblica; esaurito lo lascia visibile in grigio. Salvataggio immediato sul DB, risposte senza cache; pagina aperta aggiornata ogni 30 secondi se visibile e al ritorno sulla scheda.
- Nuova migrazione additiva `202609160002_m3_menu`, senza modificare M0 né azzerare i dati. Applicata prima al database dei test e, dopo il cancello verde, al database di sviluppo tramite launcher.
- API CRUD/riordino atomico con contesto tenant; gestione menu consentita allo staff, aspetto/copertina al titolare con audit. Categorie non vuote non eliminabili; rimozioni con undo di cinque secondi nel pannello.
- Upload binario autenticato, JPEG/PNG/WebP fino a 5 MB, formato reale verificato con Sharp, limite pixel, niente immagini animate. Ricompressione in tre misure WebP 320/640/960 e rimozione metadati. Nomi UUID, percorso per tenant; foto locali in `.local/menu-images`, variabile `MENU_IMAGE_DIR` opzionale.
- Foto e storage cloud non ancora collegati. Immagini precedenti non più referenziate non servite; pulizia fisica degli orfani rimandata alla gestione storage M6.
- SSR del menu dedicato al locale, IT/EN via URL, immagini responsive, categorie, evidenza, allergeni e dieta; form staff con prezzi convertiti da stringa decimale a centesimi senza arrotondamenti.

64 test backend verdi, inclusi 7 nuovi scenari menu. Build, flusso browser con quattro template e misura Lighthouse mobile completati: risultati nel cancello finale sotto.


### Verifica prestazioni M3

Il fallback di caricamento della route menu nascondeva il contenuto SSR in attesa degli script: rimosso. Il menu non importa più il router client per aggiornarsi: uno script minimo confronta ogni 30 secondi l’impronta dei dati pubblici e ricarica soltanto quando cambiano. Il rate limit dei dati menu è separato da quello delle immagini (entrambi 30/min per IP), per non far consumare alle foto il budget della lettura.

Lighthouse 13.4.1 viene eseguito **con throttling DevTools applicato da Chrome**, mobile, download 750 Kbps, upload 250 Kbps, latenza 150 ms e CPU 4×. Prima verifica dopo la correzione: **98/100, LCP 832 ms**, con copertina e foto sintetiche del test; non è una misura dell’infrastruttura di produzione né di foto reali. La proiezione alternativa Lantern aveva dato 89/100 e LCP circa 3,6 s dopo la correzione: è un metodo diverso e non va confuso con il risultato misurato con rete limitata. Il comando fissa esplicitamente il profilo e fallisce sotto 90 o con LCP ≥ 2 s; nessuna soglia ridotta.

Verifica generale e riavvio completati; dati preesistenti conservati.


### Cancello finale M3 — superato

| Verifica | Esito |
| --- | --- |
| `pnpm typecheck` | Verde, app/pacchetti e test |
| `pnpm lint` | Verde, zero warning |
| `pnpm test` | 64/64, sette file, PostgreSQL reale |
| `pnpm build` | Verde, web/API produzione |
| `pnpm test:e2e` | 4/4, inclusi i tre scenari M2 e un solo scenario menu completo |
| Lighthouse nel test menu | 97/100; LCP 915 ms, profilo DevTools sopra descritto |
| QA visiva | Quattro template ispezionati a 375 px, nessun overflow orizzontale |

L’ultima esecuzione completa del browser è terminata con esito 0 in circa 1,6 minuti. Le esecuzioni precedenti fallite sono state usate per correggere import del test, contatori delle API, fallback SSR e dipendenza dal router durante il primo rendering; non conteggiate come verdi. La misura 98/832 ms precedeva l’ultimo alleggerimento; il risultato finale è 97/915 ms. Immagini sintetiche, rete e CPU limitate localmente: verificare nuovamente immagini e infrastruttura reali prima di M6.

Il test menu prova categoria/piatto con foto, copertina, allergeni, prezzi, quattro stili, cambio lingua, esaurimento, occhio, aggiornamento di una pagina già aperta e separazione dal secondo locale. I test backend verificano anche riordino atomico, ID di un altro tenant, limite upload, formato reale, varianti WebP, foto nascoste accessibili solo allo staff, impostazioni owner e conservazione degli altri campi nelle PATCH.

**Confine:** M3 conclusa; M4 non avviata. Nessuna pubblicazione GitHub, nessun servizio cloud, email/SMS/push o dato reale aggiunto. Guide di prova e servizi esterni aggiornate. Foto locali e database restano fuori dal repository.


### Demo M3 riavviata

`pnpm local` ha applicato `202609160002_m3_menu` a `bigant`, conservato i due tenant con seed idempotente e riusato la build verificata. Web:3000 e API:3001 attivi. HTTP 200 sui menu di Santa Lucia e Lido, API del menu e pannello staff. Il progetto viene lasciato in esecuzione per la prova; nessun reset eseguito.
