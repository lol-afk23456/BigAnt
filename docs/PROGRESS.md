# Avanzamento BigAnt Book

## Pubblicazione console M5A — 24 settembre 2026

Richiesta successiva dell'utente: «pusha sul repo». Autorizzata la pubblicazione della console su `origin/main`, con push ordinario da `master` locale e conservazione del commit precedente sui documenti locali. Fetch eseguito: nessuna divergenza con il remoto. Codice, migrazione, test e guide inclusi; PDF, credenziali, `.env`, database e runtime locali restano esclusi. Nessun deploy o invio reale autorizzato da questa pubblicazione.

Il cancello applicativo resta quello M5A sotto: 122 test backend, 10 scenari browser, typecheck/lint/build verdi. In questo blocco cambiano solo questa registrazione e la numerazione della sezione console in SPEC; non è necessario ripetere il cancello. I normali controlli GitHub Actions restano attivi; il loro esito remoto va verificato sul commit pubblicato e non si deduce dalle verifiche locali.

## M5A — console amministratore, 24 settembre 2026 — completata localmente

Richiesta esplicita dell'utente: sviluppare la console amministrativa per gestire i locali clienti. Realizzati identità/sessioni separate, onboarding transazionale con link monouso, anagrafica, piano/canone/scadenze/note, configurazione servizi, operatori e revoca accessi, consumi aggregati, checklist e audit. Nuova migrazione additiva; il client tenant rifiuta tutti i modelli Platform e la console non restituisce dati personali degli ospiti. UI IT/EN in `/admin`, attivazione in `/attiva-accesso`, guida `CONSOLE_AMMINISTRATORE.md` e comandi di bootstrap.

Prima verifica: 121 test backend verdi, build/tipi/lint verdi; flusso console completo passato nel browser e screenshot desktop/375px ispezionati. La migrazione additiva è applicata alla demo: impronte di tutte le 20 tabelle precedenti identiche, inclusi 244 prenotazioni, 107 ospiti, 42 tavoli e 42 piatti. Creato amministratore locale con password casuale in `.local/admin-access.txt`, non versionata.

Il collaudo aggiuntivo ha rilevato un 429 sul refresh del gestore dopo più accessi nello stesso minuto: il limite precedente era condiviso per IP. Corretto mantenendo cinque richieste/minuto per sessione JWT verificata, anche attraverso rotazioni, e un limite IP distinto per richieste non autenticate; nuovo test di regressione. Il login staff ora prende anche il lock del locale e rivalida ruolo, password e stato prima di creare la sessione, per serializzarsi con la sospensione/recupero accessi della console. Correzioni verificate nel cancello finale seguente. Nessun invio esterno o pubblicazione.

| Verifica finale M5A | Esito |
| --- | --- |
| `pnpm typecheck` | Verde, incluso controllo root/test |
| `pnpm lint` | Verde, nessun warning |
| `pnpm test` | 122/122 in 13 file; 31 di isolamento tenant, 6 console, 7 autenticazione |
| `pnpm build` | Verde, artefatti correnti e riusati dal launcher |
| `pnpm test:e2e` | 10/10, 2,5 minuti; nessuna soglia o protezione disabilitata |
| Lighthouse menu | 100/100, LCP 1329 ms; stesso benchmark sintetico previsto |
| Demo originale | Login console, due locali, servizi e riepilogo verificati in Chrome desktop/375px; nessun errore JavaScript né overflow, logout riuscito |
| Conservazione dati | Tutte le impronte delle 20 tabelle precedenti identiche anche dopo il riavvio e il seed |
| Accesso amministratore locale | `admin@bigant.test`, password casuale in `.local/admin-access.txt`, permessi 0600 ed esclusione Git verificati |

Demo web/API/worker nuovamente attivi su 3000/3001, PostgreSQL originale su 55432, sei migrazioni applicate e nessuna pendente. Console: `http://localhost:3000/admin`. Screenshot della demo originale e report Lighthouse in `.local/console-review-20260924/`, esclusi da Git. Guida nuova `CONSOLE_AMMINISTRATORE.md`; README, guida tester, SPEC, MISSIONS, BACKLOG e punti di produzione allineati. Il precedente PDF resta invariato e locale.

**Confine consegnato:** amministrazione dei locali e accessi, senza consultazione degli ospiti dalla console o impersonificazione. Piani/canoni/scadenze sono registrazioni commerciali, senza addebiti, fatture o rinnovi automatici. M5 fisica/M6, account amministrativi definitivi, hosting EU/HTTPS, backup e fornitori reali restano da completare. Nessun push o deploy richiesto/eseguito in questa attività.

## Stato al 23 settembre 2026

**M0–M4 e consolidamento M3C completati.** M3 include i quattro template e il comando occhio approvati dall’utente. M5 implementata localmente, cancello automatico verde; M5S sala/attesa e M5C dati guidati/documenti verificate. M5R review prodotto completata sul Mac con nuova guida collaboratori. Invii/dispositivi reali e M6 non attivi.

## Riepilogo della demo M5R, prima dell'estensione M5A

- M0–M4 e M3C (consolidamento richiesto dall’utente) conclusi. M5 locale verificata, requisito fisico/live ancora pendente; M5S conclusa.
- Cliente: prenotazione progressiva, consensi, privacy e disdetta; staff: agenda, stati, tavoli/combinazioni, attesa per servizio, impostazioni, menu, Clienti e Notifiche.
- Menu: quattro template scuri, colore/copertina, allergeni, IT/EN, occhio separato da esaurito.
- Recensioni M4: due scelte pubbliche prima del voto, feedback anonimo, card e lettura/note interne. Cancello finale verde.
- Sala/attesa M5S: zone riusate, combinazioni manuali con occupazione di tutti i componenti e snapshot; FIFO e accomodamento atomico senza recapiti inventati. Vedi [comportamento](SALA_E_ATTESA.md).
- Ambiente locale Mac; dati demo persistenti. Servizi esterni dell'app e account reali non attivati. Pubblicazione GitHub della review M5R richiesta il 23 settembre: dettagli nel blocco finale. Il PDF resta escluso da Git.
- Ultimo cancello M5R: **110/110 backend, 9/9 browser**, build/typecheck/lint verdi. Lighthouse locale **100/100, LCP 762 ms** con foto sintetiche e **100/100, LCP 1304 ms** con la copertina reale conservata, stesso profilo mobile rallentato. La CI remota non è stata rieseguita per questa review.
- Demo guidata: aggiunti tre casi per locale il 23 settembre alle 19:00 e tre ingressi in attesa per locale; esempi precedenti conservati. Confronto completo invariato per le 238 prenotazioni, 107 clienti, 42 tavoli e 42 piatti preesistenti; ora 244 prenotazioni. [Dati](DATI_DEMO.md), [nuovo collaudo](COLLAUDO_COLLABORATORI_2026-09.md), [produzione](MESSA_IN_PRODUZIONE.md).
- Documenti operativi: [indice](README.md), [decisioni](DECISIONS.md), [prova locale](PROVA_LOCALE.md), [servizi esterni](SERVIZI_ESTERNI.md).

Le sezioni seguenti sono lo storico dei blocchi: riferimenti a una pagina vuota o a missioni non ancora avviate descrivono quel momento, non lo stato attuale.

## Storico M0 — realizzato

- Repository Git e monorepo pnpm 10.32.1 + Turborepo; Node 22.23.2, TypeScript strict.
- API Fastify con healthcheck e autenticazione staff; Next.js App Router + Tailwind con pagina vuota. Nessuna schermata o logica di prodotto.
- Tutti i modelli di SPEC §3, indici, FK composte e vincoli SQL; migrazione `202609160001_m0` applicata a PostgreSQL 16.14 locale, database `bigant` e `bigant_test`.
- Prisma extension con contesto tenant obbligatorio, filtro imposto su letture/scritture/aggregati e transazioni. Query senza contesto, raw SQL, cambio tenant e scritture relazionali annidate rifiutati.
- Argon2id, JWT access 15 minuti, refresh in cookie HttpOnly/Secure/SameSite=Lax; sessioni persistenti con hash, rotazione atomica, scadenza massima 30 giorni e revoca al logout. Utenti disabilitati e tenant sospesi non possono usare la sessione.
- Login limitato a 5 tentativi per email normalizzata ogni 15 minuti. Sesto tentativo: HTTP 429 con errore tradotto. Header di sicurezza; log applicativi disabilitati per evitare dati personali.
- Seed ripetibile per Trattoria Santa Lucia e Lido Miseno: rispettivamente 40/60 clienti, 80/150 prenotazioni, 12/30 tavoli, 5/3 categorie, 28/14 piatti, 25/40 recensioni; impostazioni, orari, chiusura demo, card NFC, log e staff distinti.
- Vitest con PostgreSQL reale, Playwright minimale, ESLint senza warning e workflow GitHub Actions. Workflow predisposto, non eseguito su GitHub perché non è stato pubblicato alcun repository remoto.
- README, `.env.example`, PROGRESS e BACKLOG.

### Decisioni tecniche M0

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

### Verifiche M0

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

### Documentazione servizi esterni — 16 settembre 2026

Su richiesta dell’utente, riscritto `SERVIZI_ESTERNI.md` come guida dedicata per Riccardo e soci: prova sul Mac, demo via link, attivazione reale, matrice dei servizi, email transazionali/caselle Reply-To, SMS, infrastruttura, backup, push e Google/QR/NFC. Include informazioni mancanti, responsabilità, prezzi verificati e sequenza delle integrazioni.

Ricontrollate fonti ufficiali Scaleway, Hetzner, Twilio, Resend, Cloudflare, Sentry, Google e WebKit. Scaleway TEM Essential resta candidato email; hosting Hetzner EU confrontato con Scaleway/PostgreSQL gestito. Nessuna scelta contrattuale definitiva: EU di log/metadati, filiera SMS/push, budget e intestatario account restano da verificare prima dell’attivazione. Aggiornato BACKLOG sulla deduplicazione NotificationLog da rivedere prima di M5, senza modificare migrazioni applicate.

Verifica di questo blocco limitata a documenti, coerenza e link: nessun nuovo cancello applicativo eseguito. Nessun codice, dipendenza, account, invio reale, deploy o pubblicazione GitHub modificato/attivato. **Confine invariato: M0–M3 concluse, M4–M6 da iniziare.** Le proposte della guida non equivalgono a una missione implementata.

## M3C — consolidamento della demo, cancello superato

Il «continua» dell’utente è stato applicato al consolidamento della prova M0–M3 e della documentazione prima di M4.

- Ingresso `/r/[slug]` dedicato al locale, con prenotazione, menu e accesso staff. Brand e ritorni cliente conducono all’ingresso del proprio locale. La home `/` resta un selettore dichiaratamente demo.
- Pannello `/r/[slug]/staff`: login con locale fisso; sezione in `?view=` conservata al reload e con avanti/indietro. L’ingresso staff precedente rimane compatibile e viene ricondotto al percorso del locale autenticato.
- Una sessione di un altro locale mostra l’account attivo prima di caricare l’agenda, con accesso al suo pannello oppure cambio account. Il filtro tenant nel data layer resta obbligatorio e verificato.
- Menu ancora renderizzato sul server; aggiornamento pubblico ogni 30 secondi se visibile e al ritorno sulla scheda. Un asset esterno confronta i dati e sostituisce il contenuto mantenendo documento, piatti invariati, focus e punto di lettura. Un errore temporaneo conserva il menu leggibile e riprova.
- Il codice del pannello è caricato solo entrando nell’area staff. Nessuna nuova dipendenza o migrazione.
- Contenuti menu seed IT/EN dimostrativi per entrambi i locali. L’aggiornamento conserva ID, prove, foto e piatti modificati: interviene solo sulle firme dei placeholder originali con timestamp mai modificato, anche in caso di modifiche concorrenti. Ricette/prezzi/allergeni richiedono conferma del locale prima dell’uso reale.
- Aggiunti indice documenti e registro decisioni. SPEC, MISSIONS, README, prova locale e BACKLOG allineati; stato corrente separato dallo storico. La guida servizi esterni rimane dedicata alle integrazioni future e ai dati necessari per attivarle.

### Verifiche finali M3C

| Comando/verifica | Esito |
| --- | --- |
| `pnpm typecheck` | Verde: sette app/pacchetti e test |
| `pnpm lint` | Verde, zero warning |
| `pnpm test` | 65/65, sette file, PostgreSQL reale separato |
| `pnpm build` | Verde, build produzione finale |
| `pnpm test:e2e` | 4/4; ultima esecuzione circa 1,7 minuti |
| Lighthouse nel test menu | 99/100; LCP 788 ms |
| QA visiva ingressi/login | Chrome a 375 e 1440 px, screenshot ispezionati, nessun overflow orizzontale |
| Coerenza documenti | Link locali validi e `git diff --check` verde |

Gli scenari browser esistenti sono stati estesi senza aggiungere una suite frontend: ingresso dedicato Lido, ritorno alla sezione menu, refresh, avanti/indietro, avviso account diverso e cambio account. Il comando occhio su una pagina aperta verifica che restino lo stesso documento e il punto di lettura (scarto inferiore a 3 px). Un nuovo test backend significativo verifica l’aggiornamento ripetibile dei placeholder e la conservazione dei piatti modificati.

Il valore Lighthouse finale usa il profilo DevTools mobile documentato in M3 (750/250 Kbps, latenza 150 ms, CPU 4×) e immagini sintetiche nel database di test. Non misura foto reali o infrastruttura remota. Gli screenshot dei template Essenziale e Pub sono stati ispezionati a 375 px; i quattro stili restano coperti dallo scenario browser.

### Riavvio e punto di ripresa M3C

`pnpm local` riavviato sul database di sviluppo `bigant`: nessuna migrazione pendente, due tenant conservati, seed conservativo e build verificata riutilizzata. Web su 3000, API su 3001; PostgreSQL locale preesistente conservato. HTTP 200 su home, ingressi dedicati, login, menu e vetrine API di entrambi i locali. La demo viene lasciata in esecuzione. Prova da `/r/trattoria-santa-lucia` oppure `/r/lido-miseno`; accessi nella guida locale.

**Confine:** M3C concluso; M4 recensioni è il prossimo blocco e non è iniziato. Successivamente M5 notifiche/PWA/privacy e M6 attivazione EU. Prove su telefoni fisici, foto reali, rate limit dietro proxy e fornitori/account reali restano nel BACKLOG. Nessun invio reale, servizio cloud, deploy o pubblicazione GitHub eseguito.

## M4 — recensioni e card, cancello superato il 17 settembre 2026

Avviata su richiesta di continuare, con cancello M3C verde. Implementazione e cancello finale completati.

- Pagina cliente dedicata `/r/:slug/feedback`, card facoltativa. Due pulsanti affiancati con gli stessi token e dimensioni, mostrati prima del voto; form privato progressivo, voto 1–5 e messaggio facoltativo. Link copiabile e invito a procedere con calma più tardi. IT/EN, stati caricamento/errore e link indisponibile.
- Input pubblici stretti: voto/commento accettati solo nel canale privato; il canale Google registra rating null. Feedback anonimi, nessun recapito richiesto o Customer associato automaticamente. Le note staff non escono dai percorsi autenticati.
- Destinazione Google costruita da Place ID, origine e percorso verificati nel client. I Place ID seed `test-place-*` producono un esito locale senza aprire Google. Il contatore misura accessi al link, non recensioni pubblicate. Policy ufficiali ricontrollate e citate in SPEC.
- Rate limit IP 30/min letture feedback e 5/min invii. Un invio ogni dieci minuti per card, condiviso dai due canali: controllo persistente sull’ultimo invio in transazione con lock DB, Retry-After, rivalidazione card attiva e tenant. Nessun cooldown consumato dall’apertura della pagina.
- Pannello Recensioni: filtri canale/voto/letto, paginazione 50 righe, lettura idempotente e nota interna. Segnalazioni di tutti i privati non letti in agenda e navigazione, aggiornate ogni 30 secondi quando visibile e al ritorno sulla scheda; evidenza aggiuntiva dei voti 1–2. Nessun voto condiziona i canali o esclude le segnalazioni.
- Gestione card: UID casuale dal server, nome, link copiabile, aperture e ultima apertura, disattivazione con undo e riattivazione. Modifiche owner con audit; consultazione staff. Aperture includono reload e non sono persone uniche. Programmazione NFC e generazione fisica QR non eseguite dal progetto.
- Migrazione additiva `202609170001_m4_reviews`: indici Review/NFCCard, nessuna modifica ai dati o alle migrazioni applicate. Nessuna dipendenza aggiunta.
- Notifica M4 interna al pannello: email/push reali e idempotenza delle consegne rimangono M5. Nessun invio o status sent fittizio.

### Verifiche M4

- `pnpm test`: 72/72, otto file, PostgreSQL reale nel database separato. Sette nuovi test su scelta senza voto, Google senza Place ID, anonimi di ogni voto, note private, card inattive/esterne, rate limit, ruoli, filtri e paginazione. Venti invii paralleli sulla stessa card: uno riesce; cooldown conservato dopo riavvio e sblocco al millisecondo del limite.
- `pnpm typecheck`, `pnpm lint` (zero warning) e `pnpm build`: verdi sulla versione finale.
- Un solo scenario frontend aggiunto per M4. Primo tentativo fermato da selettore ambiguo dell’alert (errore card più annunciatore Next): selettore reso univoco; scenario M4 passato isolatamente. I quattro scenari preesistenti sono passati anche nel primo tentativo completo. Ultimo `pnpm test:e2e`: **5/5**, circa 2,1 minuti. Lighthouse menu: **100/100, LCP 1338 ms**, profilo DevTools mobile M3 con immagini sintetiche locali; infrastruttura/foto reali ancora da misurare.
- Screenshot pubblico e recensioni staff a 375 px ispezionati: scelte equivalenti, nessun overflow orizzontale. Link locali della documentazione validi e diff senza errori di whitespace.

### Spunti sala/lista d’attesa e precisazione dell’utente

Richiesti durante M4 senza interromperla, poi precisato di evitare duplicazioni o peggioramenti. Scritta [SALA_E_ATTESA.md](SALA_E_ATTESA.md) e aggiunti B07/B08: zone, capienze, form operatore e assegnazione dei singoli tavoli sono già presenti. Combinazioni consentite e attesa per servizio sarebbero aggiunte effettive; la piantina a blocchi resta Pro futura. Preferenze chieste su ordinamento e assegnazione gruppi, non ancora ricevute. Nessun codice sala/attesa implementato: motore disponibilità, service prenotazioni ed editor tavoli invariati in questo blocco. I test di regressione coprono prenotazione, conferma, assegnazione tavolo e impostazioni.

### Riavvio della demo M4

`pnpm local` ha applicato la migrazione additiva M4 al database di sviluppo `bigant`, conservato i due tenant con seed idempotente e riutilizzato la build finale verificata. Web su 3000 e API su 3001 lasciati in esecuzione; PostgreSQL preesistente conservato. HTTP 200 su feedback e relativa API per entrambi i locali. Verificate anche recensioni e card con i dati persistenti a 1440 px e card a 375 px, senza overflow orizzontale. Nessuna recensione o card aggiunta dalla verifica sui dati di sviluppo.

**Confine:** M4 conclusa, prima di M5 e delle estensioni sala/attesa. Nessun servizio esterno attivato, reset dati sviluppo o pubblicazione GitHub.
## M5 — cancello automatico locale verde il 17 settembre 2026

Richiesta «finisci tutto se non hai dubbi o cose da confermare». M4 aveva cancello verde. Avviata M5 con trasporto predefinito demo, senza account, spesa o invii reali.

- Nuova migrazione `202609170002_m5_notifications`: evento/canale/destinatario unici, tentativi e stati processing/uncertain/simulated/skipped, consensi/lingua prenotazione, retention e contatto privacy; PushSubscription con FK tenant/staff. Audit di sistema con attore nullo, senza attribuzione fittizia al titolare.
- Outbox inserita atomicamente nella transazione di prenotazione/feedback. Coda PostgreSQL, risveglio API sugli eventi e worker ogni cinque minuti; nessun nuovo Redis necessario. Promemoria distinto per orario di arrivo; eventi obsoleti scartati. Tetto mensile SMS atomico, fallback email senza doppia consegna.
- Trasporti demo, TEM fr-par, SMS candidato IE1 sostituibile in una classe e Web Push con libreria standard; nessun canale reale abilitato. Esito accepted distinto da recapito. Timeout/worker interrotto → uncertain; solo rifiuto 429 riprovabile tre volte con lo stesso ID.
- Sezioni Notifiche e Clienti, privacy pubblica per locale, consensi separati, timestamp e IT/EN. CSV con protezione formule, esclusione allergie/note e audit. Anonimizzazione idempotente anche di testo libero, recapiti consegne e link di disdetta; storico/contatori conservati. Retention persistente mensile a piccoli lotti, senza trattare clienti recenti/futuri/attivi.
- PWA per locale, istruzioni installazione/consenso, shell offline generica; niente cache di API/pagine ospiti. La prova Android/iPhone fisici e il recapito con credenziali reali restano da eseguire e non sono sostituiti dai test simulati.
- Guida dedicata [NOTIFICHE_E_PRIVACY](NOTIFICHE_E_PRIVACY.md), `.env.example` aggiornato; informativa dichiarata bozza da validare prima dell’uso reale. Console agenzia registrata in B09, non implementata durante M5.

`pnpm test`: **84/84**, nove file, database di test separato; tutti i precedenti test passano. Undici nuovi test notifiche/privacy e nuovo modello nell’isolamento. Lint verde. Tipi/build/browser finali ancora in completamento in questo punto dello storico; non dichiarata M5 conclusa né M6 avviata.

### Verifiche finali M5 e confine

Sulla versione finale: `pnpm typecheck`, `pnpm lint` (zero warning), `pnpm test` **84/84** in nove file, `pnpm build` e `pnpm test:e2e` **6/6** verdi. Il nuovo scenario è passato prima isolatamente; corretta la dicitura del pulsante cliente da Dettagli prenotazione a Dettagli ospite. Backend verifica anche il trasferimento esplicito della sottoscrizione su dispositivo condiviso. Screenshot Notifiche a 375 px ispezionato, nessun overflow. Lighthouse menu **94/100, LCP 1563 ms**, stesso profilo locale mobile documentato M3, immagini sintetiche. Migrazioni già applicate non modificate; link documentali e diff check verdi.

**Confine:** software M5 locale verificato, requisito installazione/push Android/iOS fisici e invii reali ancora pendenti; M5 non dichiarata completamente accettata in produzione. Dev non ancora migrato/riavviato in questo punto, test svolti su bigant_test. Si prosegue con M5S autorizzata dopo questo cancello automatico; M6 richiede account/dominio, verifiche EU e locale reale. Nessun servizio esterno, pubblicazione GitHub o reset dello sviluppo.

## M5S — sala e attesa, cancello verde il 17 settembre

Avviata dopo il cancello automatico locale M5, autorizzata dal «finisci tutto». Scelte iniziali dichiarate: FIFO con compatibilità evidenziata e combinazioni manuali. Zone, tavoli, agenda e motore originali riusati. Nuova migrazione additiva `202609170003_m5s_rooms_waitlist`: TableGroup/Member, ReservationTable e WaitlistEntry con FK composte e vincoli; applicata per ora soltanto al database di test. Nessuna prenotazione storica riscritta.

Configurazioni immutabili per membri/capienza, nome e occupazioni fotografate per prenotazione. Form telefonata e dettaglio consentono la combinazione; scelta automatica pubblica resta sui singoli tavoli. Attesa per servizio con cognome/coperti, storico oltre mezzanotte e dopo cambio orari. Accomodamento atomico crea la prenotazione seated senza recapiti o consensi inventati; anonimizzazione/retention rimuovono anche i cognomi della fila.

Primo blocco backend sala: otto test passati, incluse venti assegnazioni fisiche concorrenti e venti accomodamenti dello stesso ingresso. Suite finale generale e unico scenario frontend a 375 px in corso: M5S non ancora dichiarata conclusa. Orologio browser controllato soltanto con NODE_ENV=test, database `_test` e modalità demo; vietato in produzione e sul database di sviluppo.

### Verifiche finali M5S

- `pnpm typecheck`, `pnpm lint` senza warning, `pnpm test` **97/97** (dieci file), `pnpm build`, `pnpm test:e2e` **7/7** (circa 2,3 minuti) verdi. Tutti gli scenari precedenti conservati; un solo scenario browser aggiuntivo. Nove test sala/attesa e quattro modelli aggiunti al test obbligatorio di isolamento.
- Concorrenza fisica singolo/combinazione, doppio accomodamento, occupazione e liberazione, componenti inattivi/ridotti/esterni, ruoli, dati storici dopo rinomina/disattivazione, FIFO, apertura cambiata, ingresso dopo mezzanotte, DST e rimozione cognomi con anonimizzazione/retention. Il motore rimane unico e l’assegnazione automatica singola è verificata.
- Browser: filtro zona, nuova combinazione, telefonata da sei coperti, attesa senza email/telefono, assegnazione gruppo, dettaglio componenti, completamento e storico, EN e assenza overflow a 375 px. Scenario passato prima isolatamente; screenshot combinazioni/attesa ispezionati. Lighthouse menu finale **100/100, LCP 1001 ms**, immagini sintetiche e profilo DevTools mobile M3: non una misura del futuro hosting o di telefoni reali.
- `git diff --check` verde, link locali documentali validi. Launcher verifica anche l’artefatto worker prima di riusare una build. Nessuna dipendenza aggiunta in M5S.

### Riavvio e conservazione dei dati

`pnpm local` ha applicato M5 e M5S allo sviluppo con migrazioni additive, conservato il seed e riusato la build finale. Web 3000, API 3001 e worker ogni cinque minuti in esecuzione; PostgreSQL preesistente conservato. Prima/dopo: **2 tenant, 101 clienti, 232 prenotazioni, 42 tavoli, 42 piatti, 65 recensioni, 2 card**, conteggi identici. HTTP 200 su home, staff, privacy, manifest e API health. Nessun reset, nuova prenotazione o card nella verifica dello sviluppo.

**Punto di arresto:** software locale fino a M5S verificato e demo attiva. M5 resta da accettare sui telefoni fisici con HTTPS e recapito reale; M6 non iniziata né dichiarata conclusa. Per attivarla servono dominio/account, fornitori e filiera verificati EU, testi/dati del primo locale reale, budget/volumi e prova di backup/ripristino. Console agenzia B09: prevista, ancora da costruire con identità/permessi/audit distinti. Piantina Pro rinviata. Servizi esterni, GitHub, deploy e invii reali non attivati.

## Ricontrollo e correzioni M5/M5S — 17 settembre 2026

Richiesta «Ricontrolla tutto e continua»: riletti documenti e stato Git, riesaminati accessi/tenant, motore prenotazioni, sala/attesa, notifiche/privacy, menu, PWA e confini di attivazione. Nessuna nuova missione di prodotto avviata.

**Correzioni confermate.**

- Il fallback SMS→email poteva riattivare un promemoria della vecchia data dopo lo spostamento della prenotazione, usando nella nuova email la data aggiornata. Ora il worker verifica prima la validità dell’evento; regola pura condivisa anche col controllo finale. Nessun fallback per un evento obsoleto, nessun consumo SMS prenotato per quell’evento.
- Un promemoria rimasto in coda oltre l’arrivo previsto poteva partire al riavvio del worker. Ora viene scartato su entrambi i canali.
- Dopo mezzanotte, restando nell’agenda del giorno d’inizio, un servizio ancora aperto perdeva i suggerimenti per la fila. Ora le fasce si calcolano sul giorno corrente nel fuso del locale, conservando identità/storico del servizio.
- Il modulo di accomodamento usava l’indice dell’alternativa. Un aggiornamento poteva cambiare tavolo/orario senza una nuova scelta: ora conserva identità e fascia; se scompaiono disabilita l’azione e invita a scegliere di nuovo, IT/EN.

**Prove.** Prima della correzione quattro verifiche backend fallivano: due casi fallback (tetto raggiunto/SMS disabilitati), promemoria scaduto e attesa oltre mezzanotte. Dopo la correzione sono verdi. Il solo scenario browser sala/attesa già presente verifica anche un aggiornamento del modulo aperto, simulando in modo deterministico una fascia cambiata nella risposta API; la successiva assegnazione usa il backend reale di test.

| Comando | Risultato |
| --- | --- |
| `pnpm typecheck` | Passato; corretta un’importazione del tipo nel test browser |
| `pnpm lint` | Passato, zero warning |
| `pnpm test` | 100/100, dieci file; inclusi 26 test di isolamento tenant |
| `pnpm build` | API, worker e Next.js di produzione compilati |
| `pnpm test:e2e` | 7/7, 2,1 minuti, viewport 375 px |
| Lighthouse nel test menu | 99/100, LCP 1035 ms; misura locale simulata, non rete o telefono reale |
| Collegamenti Markdown locali / `git diff --check` | Passati |

**Documentazione.** Stato corrente e checkbox M0–M3 allineati al cancello. Rimossi riferimenti obsoleti alla ricerca prenotazioni nell’URL; spiegate le correzioni in SALA_E_ATTESA e NOTIFICHE_E_PRIVACY. SERVIZI_ESTERNI distingue componenti già implementati, ambiente di collaudo M5 e attivazione M6, con informazioni ed evidenze necessarie a ciascun passaggio. Nessuna nuova verifica di prezzi o contratti esterni in questo blocco.

**Demo riavviata.** `pnpm local` in esecuzione: web 3000, API 3001, worker; nessuna migrazione pendente. Conteggi prima/dopo identici: 2 tenant, 101 clienti, 232 prenotazioni, 42 tavoli, 42 piatti, 65 recensioni, 2 card; combinazioni e attesa demo ancora vuote. Home, staff/menu Santa Lucia, prenotazione/privacy/manifest Lido e health API rispondono HTTP 200. I test hanno usato soltanto `bigant_test`; la demo `bigant` non è stata resettata.

**Confine successivo.** Nessuna migrazione o nuova dipendenza. Prima del pilot online servono dominio/budget/intestatario, scelta e verifica EU degli account, destinatari autorizzati, iPhone/Android. Prima dei dati reali restano anche proxy/rate limit, header HTTPS, accessi/recovery, backup database+foto con ripristino, alert e documenti del locale. I dettagli sono B04–B06 e SERVIZI_ESTERNI; B09 agenzia resta dopo il pilot. Nessun acquisto, invio reale, deploy o pubblicazione GitHub eseguito.

## M5C — dati demo comprensibili e protocollo, 17 settembre 2026

Richiesta: esempi chiari nell’app, analisi concreta di ciò che manca per la produzione e protocollo di test. Nessuna attivazione di servizi o nuova funzione fuori perimetro.

### Realizzato e decisioni

- Seed con 100 nomi inventati distinti fra i due tenant e feedback privati pertinenti al voto. Aggiornamento dei soli placeholder con contatti/firma originali e timestamp mai modificato; note/letture/risposte dell’operatore protette. ID e contatti conservati.
- `pnpm demo:examples`: tre prenotazioni coppia/famiglia/gruppo per locale, due combinazioni dimostrative, FIFO 2/4/6 nel primo servizio valido oggi/domani. Tutte le disponibilità rivalidate con il motore esistente nel lock del tenant; chiusure, durata, capienza, ritmo e componenti occupati rispettati. Capienza/ritmo ridotti escludono anche gli ingressi in attesa incompatibili.
- Marker audit per locale/giorno rende l’inserimento idempotente anche in concorrenza. Ripetere nello stesso giorno conserva le modifiche; un nuovo giorno aggiunge una serie. Nessun reset, nessuna modifica automatica delle impostazioni o delle combinazioni disattivate.
- CLI limitata a DB locali `bigant`/`bigant_test`, fuori produzione e solo notifiche demo. Test manuale negativo: produzione, host remoto e modalità live rifiutati prima delle query. I recapiti sono inventati; nessun messaggio reale inviato.
- Dati aggiunti il 17 settembre: Giulia Rossi (2), Famiglia Bianchi (4), Gruppo Esposito (6), ore 19:00 in entrambi i locali. Santa confermata, Lido pending. Coppia/famiglia da assegnare secondo le impostazioni attuali; gruppo sui Tavoli 5+6 / 29+30. Attesa nella Cena Santa e nel continuato Lido.
- Documenti nuovi: DATI_DEMO, MESSA_IN_PRODUZIONE e PROTOCOLLO_TEST; indice, avvio, servizi, decisioni e missioni allineati. Protocollo con prima prova 20–25 minuti, casi T01–T15 e prove remote T16–T20. Verificati i link locali dei dieci documenti aggiornati.
- Analisi produzione P01–P12 basata sul codice: accessi/provisioning e recovery, proxy/limiti, HTTPS/CSP/HSTS, backup DB/foto e restore, monitoraggio DB/coda/alert, recapito/rimbalzi, telefoni, privacy/configurazioni EU, carico e rilascio. Non basta inserire le chiavi dei fornitori. La console agenzia resta B09; nessun M6 dichiarato concluso.
- Runner in `scripts/` e incluso nel typecheck root; logica esempi nel contesto API riusa disponibilità, gruppi/snapshot e outbox. Nessuna dipendenza o migrazione nuova; sette scenari frontend esistenti, nessun nuovo scenario aggiunto.

### Evidenze e cancello finale

| Comando / verifica | Esito |
| --- | --- |
| `pnpm typecheck` | Verde, incluso script e test nuovi |
| `pnpm lint` | Verde, zero warning |
| `pnpm test` | 104/104 in 11 file, 54,38 s; 26 isolamento tenant |
| `pnpm test:e2e` | 7/7, 2,4 minuti, viewport 375 px |
| `pnpm build` | Verde; artefatti/impronta aggiornati |
| Lighthouse incluso E2E | 91/100, LCP 1319 ms; profilo mobile M3, foto sintetiche locali |
| Confronto dati demo prima/dopo | 232 prenotazioni precedenti, 42 tavoli e 42 piatti identici; clienti/feedback già modificati conservati |
| Ripetizione comando sul DB demo | Nessun duplicato, `created:false` per entrambi |
| Totali DB demo | 238 prenotazioni, 107 clienti, 65 recensioni, 42 tavoli, 42 piatti, 2 combinazioni, 6 ingressi in attesa; nessun placeholder Cliente demo residuo |
| Riavvio locale | Web e API HTTP 200; cinque migrazioni applicate, nessuna pendente |
| Controllo app aggiornata | Login nei due locali, tre casi agenda e tre ingressi attesa visibili nel servizio corretto; screenshot Chrome desktop ispezionati |

Confronti conservativi in `.local/demo-examples-before.json` e `.local/demo-examples-verification.json`, esclusi da Git. Il launcher locale è riavviato e conserva le prove. I punteggi Lighthouse variano tra esecuzioni; non sono una misura di telefoni o hosting reali.

Il collegamento UI integrato non si inizializzava per un errore del sandbox; controllo completato con Chrome/Playwright locale. Nel controllo aggiuntivo i selettori sono stati corretti per l’elemento summary e il select con label contenente opzioni, poi scelto il servizio Cena a Santa Lucia. Non sono emersi difetti applicativi; screenshot in `.local/demo-guidata-*.png`. Il protocollo esplicita il servizio per evitare di cercare la fila della cena nel pranzo.

**Punto di arresto:** M5C locale completata. Prossimo lavoro: eseguire il protocollo con Riccardo/soci, correggere difetti e preparare la configurazione EU di collaudo per M5/M6 quando dominio, budget, account, volumi e dispositivi saranno disponibili. GitHub, acquisti, messaggi reali, deploy e console agenzia non attivati.

## Consegna GitHub e guida tester - 17 settembre 2026

Richiesta esplicita: pubblicare il progetto su `https://github.com/lol-afk23456/BigAnt.git` e preparare un PDF con funzioni, accessi e clone/avvio locale. La richiesta aggiorna il precedente vincolo di non pubblicare prima della prova locale; non autorizza un deploy o invii reali.

### Preparato e verificato

- Repository di destinazione controllato autenticandosi con `lol-afk23456`: vuoto e pubblico. Configurato `origin`; ramo remoto previsto `main`, senza force push. Accesso GitHub CLI completato dall'utente nel browser; helper configurato solo per questo repository, credenziali/runtime esclusi da Git. HTTPS salvato e SSH iniziali non consentivano il push; dopo il login il dry-run è riuscito.
- `docs/GUIDA_TESTER.md` e `output/pdf/BigAnt_Book_Guida_Tester.pdf`: 8 pagine, 19 collegamenti nella versione finale, funzioni implementate, differenze demo/live, versioni esatte, comandi clone/installazione/avvio, accessi, esempi, prova iniziale, aggiornamenti e problemi. WSL/telefoni dichiarati da collaudare. Tutte le pagine renderizzate e controllate anche dopo la nota finale GitHub; testo, link, accessi e comandi validati con pypdf.
- README e indice aggiornati. pnpm installato alla versione 10.32.1 anziché affidarsi a un Corepack non predisposto; runtime Node 22.23.2. Doppio clic del launcher originale distinto dall'avvio terminale su un computer nuovo.
- Controllata la storia Git: 570 oggetti, nessun percorso riservato tracciato né corrispondenza nei principali pattern di token/chiavi private. `.env`, `.local/`, database, foto runtime, dipendenze e artefatti intermedi non pubblicati. Anche `tmp/pdfs/` esclusa; PDF finale incluso.

### Prova da un clone pulito

Clone temporaneo separato in `/private/tmp/bigant-tester-clone-20260917`, senza runtime/dipendenze del checkout. Usati Node/pnpm installati, come strumenti esterni al clone. `pnpm install --frozen-lockfile` riuscito; PostgreSQL nuovo su 55433, generate, tutte le cinque migrazioni, seed e build riusciti (7 task, nessuna cache, 56,21 s). `demo:examples` ha creato i tre casi e l'attesa in entrambi i locali, senza casi saltati.

Web/API temporanei su 3300/3301: home, prenotazione, entrambi i menu e staff HTTP 200; health OK; login dei due owner e agenda con DEMO verificati attraverso le rewrite web. Porte diverse per conservare demo e DB originali su 3000/3001/55432. Questa è una verifica di installazione e avvio puliti su questo Mac, non una prova di Windows/Apple Silicon o un nuovo cancello completo: il cancello applicativo resta quello M5C sopra (104 backend, 7 browser, tipi/lint/build verdi). Nessun codice applicativo o migrazione modificati in questo blocco.

**Pubblicazione riuscita:** commit di consegna `8dd7a62` caricato con tutta la storia su `origin/main`; `HEAD` remoto e predefinito verificati. Clone HTTPS dal repository remoto riuscito, senza `.env` o `.local`; PDF identico all'originale (SHA256 `3ec7cf672671501b86930633b5e348b8c41df3b40430c8ab85c0c47df9fac52e`). Test temporanei chiusi; demo originale ancora HTTP 200 su 3000.

**Primo controllo remoto:** run GitHub `35224700238` fallita al seed: mancava `pnpm generate` prima di importare Prisma. Corretto il workflow aggiungendo il passaggio esplicito prima delle migrazioni/seed, come già fa il launcher locale. Nessun codice di dominio cambiato. Nuova esecuzione da verificare sul commit di correzione; produzione e servizi esterni dell'app restano non attivati.

**Secondo controllo remoto:** run `35224988305`, commit `8b3c620`: generate/migrazioni/seed, typecheck, lint, backend e build verdi. E2E: sei scenari verdi; lo scenario menu supera le azioni funzionali ma fallisce il benchmark mobile Linux. Il runner non conservava il report e l'errore del sottoprocesso nascondeva i valori: aggiunti score/LCP all'errore e upload del solo report Lighthouse in caso di fallimento. Soglie invariate (≥90, LCP<2 s). Verifica seguente necessaria; nessuna CI interamente verde dichiarata.

**Audit aggiuntivo Mac con la copertina attualmente caricata:** 82/100, LCP 3626 ms, FCP 1,9 s, TBT 310 ms, CLS 0. LCP è la copertina: variante 960 WebP circa 120 KB, 3138 ms di download sul profilo previsto. Nessun dato, impostazione o foto modificato; prova non equivalente alle immagini sintetiche del cancello M5C. Evidenza registrata in B05/P10; non dichiarata la produzione o un nuovo cancello complessivo verde. `pnpm lint` dopo la sola modifica della diagnostica: verde.

**Controllo remoto con report:** run [35225616152](https://github.com/lol-afk23456/BigAnt/actions/runs/35225616152), commit `206c017`: typecheck/lint/test/backend/build verdi; E2E sei scenari verdi, quello menu supera le azioni funzionali ma il benchmark resta fallito: **95/100, LCP 2349 ms**, TBT 0, CLS 0, nessun warning Lighthouse. LCP è la copertina sintetica: circa 24 ms TTFB, 178 ms ritardo richiesta, 246 ms download e 1901 ms ritardo prima della visualizzazione. È diverso dal caso Mac con foto attuale. Report scaricato in `.local/ci-35225616152/menu-lighthouse.json`, non incluso in Git; artefatto CI disponibile per sette giorni. Soglie mantenute: nessun aggiramento o nuova missione conclusa.

**Punto di arresto della consegna:** codice/storia/seed e PDF su GitHub pubblico, clone e avvio puliti Mac verificati, guide allineate e demo originale conservata. PDF aggiornato con il limite prestazionale Linux ancora aperto; B05/P10 da affrontare prima del pilot, con foto realistiche e misura del ritardo di visualizzazione. Produzione, invii reali, dispositivi fisici e console agenzia restano fuori dalla consegna. L'ultimo aggiornamento riguarda esclusivamente documenti/PDF e lascia attivi i normali controlli a ogni push; non dichiara verde il commit o la CI completa. La revisione automatica ha rifiutato il tentativo di saltare la ripetizione della CI sul solo aggiornamento documentale; usata la pubblicazione standard senza bypass.

### Precisazione successiva: PDF soltanto locale

L'utente ha chiesto «non mettere questo pdf su github» dopo il primo caricamento. Conservato `output/pdf/BigAnt_Book_Guida_Tester.pdf` sul Mac; rimosso dall'indice Git e aggiunto a `.gitignore` perché non venga reincluso. Tolti i collegamenti al PDF da README/indice; la guida Markdown ai tester resta nel repository. La rimozione corrente non cancella il PDF dai commit precedenti già pubblicati: non eseguita una riscrittura forzata della storia senza una richiesta esplicita che copra tale operazione.

## M5R - review prodotto, 23 settembre 2026

Obiettivo attivo: revisione generale, confronto con fonti ufficiali Superb, copy/UX/UI e nuova guida ai collaboratori. Perimetro e cancello in MISSIONS M5R; nessun acquisto, invio live o nuova pubblicazione GitHub.

### Primo blocco implementato

- Prenotazione progressiva conservata: nome locale evidente, richiesta manuale distinta dalla conferma, draft contatti/consensi mantenuto su cambio fascia e 409, retry sul giorno scelto, input bloccati durante invio, ricevuta basata sul server e copia link con alternativa. Disdetta con aggiornamento stato, termine e link malformato comprensibili.
- Agenda con polling30s/ritorno tab, aggiornamento manuale e dati precedenti conservati durante rilettura; contatori come filtri, richieste/note visibili, Accomoda/Libera tavolo, collegamento alla fila. Mobile più compatto. Dialog nativi con focus, Escape e ritorno; durante undo il resto del pannello è inerte e il pulsante Annulla riceve focus.
- Scheda ospite: visite/no-show/ultima visita e storico recente protetto da autenticazione/tenant. Endpoint limitato a20righe e campi operativi, senza token/recapiti/testi liberi; test isolamento, proiezione e ruolo staff. Consenso non inventato; anonimizzazione esistente conservata.
- Menu: derivate panoramiche 320/640/768/960px, originali conservati e derivazione delle foto legacy. Limiti separati JSON30/media120/upload5. Aggiornamento senza SubtleCrypto in LAN, race API/HTML corretta senza snapshot incoerente. Copy esaurito non promette reset automatico.
- Clock outbox coerente con API/worker: due_at e created_at espliciti; passaggio del clock da tutti gli eventi, promemoria e fallback. Il precedente test fissato al21settembre falliva quando now() del DB superava il clock del test. La prova resta fissata nel passato e ora copre anche scadenza futura/duplicato senza anticiparla.
- Confronto documentato in REVIEW_PRODOTTO_SUPERB; B13-B15 distinguono lista online, chiusure solo online e rischedulazione autonoma dalla fila/sala attuale. B16/P13 evidenzia la creazione duplicata dopo risposta persa: nessuna promessa che il lock di disponibilità la risolva. B17 token form scaduto e B18 lingua tra pagine rimandati.
- Nuova guida COLLAUDO_COLLABORATORI_2026-09, casiC01-C12; PDF locale di6pagine generato, tutte renderizzate e controllate. Non tracciato e non pubblicato. Nessuna pretesa di collaudo già eseguito dai collaboratori.

### Stato verifiche intermedio

Typecheck/lint iniziali verdi. Suite backend completa108/108 in11file,51,91s, dopo correzione clock. Build preliminare verde. Primo passaggio browser ha individuato locator da aggiornare ai nuovi testi, un test che puntava anche all'annunciatore Next, e verifiche undo eseguite prima del rebuild relativo: corretti/in integrazione. Prestazione menu95/100 ma LCP2417ms su foto sintetica, ancora oltre soglia: provider locale e sole immagini leggere non bastano. In corso documento menu HTML senza idratazione React per rimuovere la causa del ritardo. Non dichiarare il cancello chiuso finché build ed E2E finali non passano.

Demo web/API fermati temporaneamente per il cancello; PostgreSQL e dati originali conservati. Riavvio, screenshot e misura della copertina reale ancora da completare.

### Chiusura del blocco e cancello finale

Il menu pubblico ora è un documento HTML generato da un Route Handler Next, con escaping centralizzato e colore validato: nessun runtime React da attendere per leggere i piatti. Usa il foglio condiviso `public/bigant.css`, importato anche dalle schermate interattive, e il solo script di aggiornamento. Lingua e navigazione alle categorie funzionano senza JavaScript; con JavaScript gli aggiornamenti mantengono focus e posizione per quanto possibile. Test specifici coprono escaping e la race fra risposta API e documento HTML. Nessuna nuova dipendenza o migrazione.

| Comando / verifica finale | Esito |
| --- | --- |
| `pnpm typecheck` | Verde, incluso il controllo TypeScript root |
| `pnpm lint` | Verde, zero warning; controllo mirato ripetuto dopo l'ultimo locator E2E |
| `pnpm test` | 110/110 in 12 file, 71,09 s; inclusi 26 test di isolamento tenant |
| `pnpm test:e2e` | 9/9, 2,3 minuti; retry 503/409, stati, dialog/undo, menu, privacy, feedback e sala |
| `pnpm build` | Verde, 1 minuto 14 secondi; impronta coerente al riavvio |
| Lighthouse nel cancello E2E | 100/100, LCP 762 ms, TBT 0, CLS 0; immagini sintetiche |
| Lighthouse con foto reale già caricata | 100/100, LCP 1304 ms, TBT 0, CLS 0; originale conservato, variante panoramica più leggera |
| Ispezione Chrome desktop e 375 px | Prenotazione, agenda, menu reale, dettagli prenotazione/ospite, tavoli e impostazioni; nessun overflow orizzontale o errore browser nei percorsi controllati |
| Conservazione dati | Hash di tutte le righe precedenti identici: 238 prenotazioni, 107 clienti, 42 tavoli, 42 piatti; sei nuove prenotazioni demo per oggi |
| Riavvio `pnpm local` | Web/API/worker demo attivi, cinque migrazioni applicate, nessuna pendente; DB originale conservato |
| Guida collaboratori e PDF | C01-C12; sei pagine renderizzate e ispezionate, quattro link; PDF ignorato da Git e conservato soltanto sul Mac |

Entrambi i benchmark usano 750/250 Kbps, latenza 150 ms e CPU 4×: soglie mantenute (≥90, LCP<2 s). La misura con foto reale migliora il precedente 82/100 e 3626 ms, ma non dimostra prestazioni di hosting o telefoni fisici. Report, screenshot e confronti locali sono in `.local/review-20260923/`, esclusa da Git. Nessuna email, SMS o push reale inviata.

**Decisioni finali:** mantenere un unico motore di sala e disponibilità; ridurre il carico del menu senza rimuovere foto o aggiornamenti; usare dialog nativi per focus/tastiera; rendere coerente il clock dell'outbox invece di spostare la data dei test. La guida chiarisce che una visita simulata su una data futura viene conteggiata dopo Libera tavolo e che gli stati di notifica non sono tutti presenti nella demo normale.

**Punto di arresto:** M5R completata localmente; app pronta alla prova dei collaboratori. Nessun push della review o del PDF. Per il pilot restano M5 sui dispositivi, M6 e i punti di MESSA_IN_PRODUZIONE, inclusa l'idempotenza della creazione dopo risposta persa (P13/B16). Nessuna console agenzia, lista online, piantina Pro o pagamenti introdotti. La prossima attività utile è raccogliere i riscontri C01-C12 e chiudere i difetti emersi prima della configurazione live.

Codice della review registrato nei commit locali `69992ab` (API/notifiche/storico) e `8ad1ed1` (interfaccia/menu e verifiche); documentazione consegnata in un commit separato. Nessun file `.env`, database, immagine caricata o PDF aggiunto al repository.

## Distribuzione della review M5R su GitHub - 23 settembre 2026

Successiva richiesta esplicita: «pusha su github». Autorizzata la pubblicazione della review su `https://github.com/lol-afk23456/BigAnt.git`, ramo `main`; resta valido il vincolo di non pubblicare il PDF. Questa richiesta aggiorna il precedente confine locale di M5R, senza autorizzare un deploy o invii reali.

Preparazione: checkout pulito, fetch del remoto e nessuna divergenza (tre commit locali nuovi rispetto a `origin/main`). Pubblicazione ordinaria fast-forward da `master` locale a `main`, senza force push. Frontend, backend, test e documenti inclusi; PDF, `.env`, database, foto caricate e runtime locali esclusi. Guida Markdown aggiornata per identificare la versione da provare; il PDF locale resta l'edizione consegnata prima del push.

Il cancello locale resta quello M5R sopra (110 backend, nove browser, tipi/lint/build verdi): nessuna modifica applicativa in questo blocco e nessuna ripetizione superflua. GitHub Actions esegue le verifiche normalmente sul push; il suo stato va controllato sulla run del commit pubblicato e non è dedotto dall'esito locale. Nessun criterio M5 fisico/M6 chiuso da questa distribuzione.

### Analisi competitiva in PDF - 23 settembre 2026

Su richiesta dell'utente, creato `output/pdf/BigAnt_Book_Confronto_Superb_2026-09.pdf`: sei pagine con nucleo comune, differenze, priorità, posizionamento e fonti ufficiali pubbliche Superb consultate nella data indicata. Il report chiarisce che Superb e una piattaforma piu ampia (POS, pagamenti, marketing e takeaway) e che BigAnt va prima portato in pilot in modo affidabile, poi esteso scegliendo una sola esigenza osservata. Il PDF e stato renderizzato e ispezionato pagina per pagina, ha quattro collegamenti alle fonti ed e esplicitamente escluso da Git; nessun codice, test, servizio esterno o configurazione di produzione e stato modificato.
