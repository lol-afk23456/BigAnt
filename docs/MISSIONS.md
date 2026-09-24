# MISSIONS.md — missioni M0–M6

Sette blocchi di lavoro autonomo. Ognuno è pensato per una sessione lunga, con criteri di accettazione verificabili da comando.

**Stato al 17 settembre 2026:** M0–M3 e consolidamento M3C completati, con verifiche in [PROGRESS.md](PROGRESS.md). M4 completata; M5 locale con cancello automatico verde, prove live/fisiche pendenti. M5S sala/attesa completata e verificata dopo il cancello automatico locale M5. M6 da attivare. Le checkbox indicano criteri verificati: il ricontrollo del 17 settembre conferma il cancello locale. Il requisito M5 sui telefoni fisici e i criteri M6 restano aperti.

**Regola:** nessuna missione inizia prima che la precedente abbia il cancello verde. Se una missione non entra in una sessione, fermati a un punto coerente (test verdi, commit pulito), aggiorna `PROGRESS.md` e riprendi da lì.

---

## M0 — Fondamenta

**Obiettivo.** Repo funzionante, schema completo, isolamento tenant garantito dall'infrastruttura. Nessuna funzionalità di prodotto.

**Da fare**
- Monorepo pnpm + Turborepo con la struttura di AGENTS.md
- `apps/api` Fastify con healthcheck, `apps/web` Next.js con pagina vuota
- Schema Prisma completo: tutti i 14 modelli di SPEC §3, più StaffSession per revoca/rotazione, con indici e vincoli
- Prima migrazione applicata
- Prisma client extension che **inietta e impone `tenant_id`** su ogni operazione
- Autenticazione staff: login, refresh, logout, argon2id, rate limit sul login
- Seed con i due tenant di AGENTS.md
- Setup Vitest, Playwright, ESLint, GitHub Actions
- `docs/PROGRESS.md` e `docs/BACKLOG.md` inizializzati

**Criteri di accettazione**
- [x] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` tutti verdi
- [x] `pnpm seed` crea due tenant con dati completi e distinti
- [x] `tenant-isolation.test.ts`: per ogni modello, una query con token del tenant A non restituisce mai righe del tenant B
- [x] Una query scritta di proposito senza contesto tenant **fallisce**; nel contesto il filtro tenant è imposto anche se omesso dal chiamante
- [x] Login funziona, token scade, refresh funziona, 6° tentativo di login bloccato

**Non fare.** Nessuna interfaccia, nessuna logica di prenotazione, nessun menu.

---

## M1 — Motore prenotazioni

**Obiettivo.** La logica corretta, senza interfaccia. È la missione più difficile: se sbagli qui, sbagli tutto.

**Da fare**
- `packages/core/availability.ts` — funzione **pura** come da SPEC §4, con i cinque controlli: apertura, finestra temporale, capienza, **ritmo di servizio**, tavolo disponibile
- Assegnazione automatica tavolo: il libero con `max_capacity` minima fra quelli compatibili
- Creazione prenotazione con rivalidazione **dentro transazione** e advisory lock: due richieste simultanee sull'ultima fascia non devono produrre overbooking
- Macchina a stati con transizioni ammesse (SPEC §3.8); transizione illegale → 409
- Normalizzazione telefono in E.164 e deduplica cliente
- Endpoint: `GET /public/:slug/availability`, `POST /public/:slug/reservations`, `GET|POST /public/reservations/:cancelToken`, più CRUD autenticato

**Criteri di accettazione**
- [x] Test dei casi limite, tutti verdi: cambio ora legale (26 ottobre, 29 marzo), prenotazione a cavallo di due servizi, gruppo più grande di ogni tavolo, servizio oltre la mezzanotte, blackout parziale, locale chiuso
- [x] Test di concorrenza: 20 richieste parallele sull'ultima fascia → esattamente una riesce
- [x] Test del ritmo: con `max_covers_per_slot = 12`, la 13ª persona sulla stessa fascia riceve `PACING_LIMIT`
- [x] Nessuna disponibilità → risposta con le 2 date alternative più vicine, non un errore
- [x] `availability.ts` non importa Prisma né fa chiamate di rete

**Non fare.** Nessuna pagina, nessuna email. Solo motore e API.

---

## M2 — Interfaccia prenotazioni

**Obiettivo.** Il cliente prenota, lo staff gestisce.

**Da fare**
- Pagina pubblica `/r/:slug/prenota`: mobile-first, colonna singola, un CTA, nessuna registrazione
- Pagina di disdetta via `cancelToken`
- Pannello staff: dashboard "oggi" con in cima ciò che richiede decisione, lista/calendario, creazione manuale da telefonata, modifica stato, assegnazione tavolo
- Impostazioni locale: orari, chiusure, capienza, ritmo, turno, conferma automatica, termine disdetta
- Gestione tavoli
- Stati vuoto, caricamento ed errore su ogni schermata
- Stringhe in `it` ed `en`

**Criteri di accettazione**
- [x] E2E Playwright: un visitatore prenota, riceve la conferma a schermo, apre il link di disdetta e annulla
- [x] E2E: lo staff accede, vede la prenotazione appena creata, la conferma, assegna un tavolo
- [x] Nessuna disponibilità → vengono proposte due date alternative
- [x] Verificato a 375px di larghezza
- [x] Nessuna stringa italiana hardcoded nei componenti

**Non fare.** Nessuna email o SMS reale: log del payload, invio arriva in M5.

---

## M3 — Menu digitale

**Obiettivo.** La missione più semplice. Usala per prendere ritmo.

**Da fare**
- Pagina pubblica `/r/:slug/menu`, generata lato server, immagini WebP con `srcset`
- Categorie e piatti dal pannello, con riordino
- Prezzo in centesimi, allergeni (i 14 UE), etichette dietetiche
- `is_available` = esaurito visibile in grigio; `is_visible` separato = comando occhio
- Quattro template scuri, colore e copertina, come approvato dall’utente
- `is_featured` in cima
- Upload immagini: whitelist MIME, max 5 MB, ricompressione server, nome randomizzato
- Multilingua it/en con selettore

**Criteri di accettazione**
- [x] E2E: lo staff crea categoria e piatto con foto, la pagina pubblica lo mostra
- [x] Un piatto segnato esaurito appare in grigio con etichetta, non sparisce
- [x] Lighthouse mobile sulla pagina menu: performance ≥ 90, LCP < 2s
- [x] Il cambio lingua non ricarica dati sbagliati

---

## M3C — Consolidamento della demo, approvato dall’utente

**Obiettivo.** Demo dedicata al locale e documentazione coerente, prima di aggiungere M4.

**Da fare**
- Ingresso pubblico e login staff dedicati al locale; compatibilità dell’ingresso demo precedente
- Sezione staff conservata al reload e avanti/indietro
- Avviso per sessione di un altro locale prima di caricare l’agenda
- Aggiornamento menu senza reload del documento, mantenendo il punto di lettura
- Contenuti seed bilingui dimostrativi, aggiornamento dei soli placeholder originali mai modificati
- Indice documenti, registro decisioni, SPEC/README/stato corrente allineati

**Criteri di accettazione**
- [x] Cancello generale verde
- [x] Scenari browser esistenti estesi a ingresso dedicato, reload/back staff e sessione di un altro locale
- [x] Occhio su pagina già aperta: documento e punto di lettura conservati
- [x] Test seed: piatti modificati e identità esistenti conservati, aggiornamento ripetibile

**Confine.** Prova su Chrome/Mac e viewport mobile; installazione/push su telefoni fisici e misure con foto reali restano successive. Nessun servizio acquistato, invio reale o deploy.

---

## M4 — Raccolta recensioni

**Obiettivo.** Conforme alle policy Google. Leggi SPEC §5 prima di iniziare.

**Da fare**
- `GET /public/:slug/feedback?card=:cardUid` → pagina unica con **due opzioni affiancate di pari dignità visiva**, mostrate a tutti, senza chiedere prima il voto
- Opzione Google: redirect a `writereview`, registra `channel = google_redirect`, `rating = null`
- Opzione privata: form voto 1–5 + commento, registra `channel = private`, segnalazione interna al titolare; email/push reali M5
- Gestione card NFC dal pannello
- Dashboard recensioni con evidenza delle private non ancora viste
- Rate limit per `card_uid` e per IP

**Prova locale:** Place ID seed dimostrativi: registra l’accesso e mostra esito sul Mac. Destinazione Google reale da configurare prima dell’attivazione; nessuna recensione pubblicata automaticamente. Gestione card owner, lettura staff; aperture link distinte da persone uniche.

**Criteri di accettazione**
- [x] Test che verifica che **nessun endpoint** chiede o riceve il voto prima di presentare le due opzioni
- [x] I due pulsanti hanno le stesse dimensioni e lo stesso peso visivo (test di snapshot o assertion sui token di stile)
- [x] Nessun testo suggerito per la recensione, nessun incentivo, nessuna parola tipo "positiva" o "5 stelle" nella pagina
- [x] `google_place_id` nullo → viene mostrata solo l'opzione privata
- [x] Secondo invio dalla stessa card entro 10 minuti → bloccato

**Non fare.** Non reintrodurre `review_positive_threshold` né `routed_public`. Se li trovi nel codice o nello schema, rimuovili.

---

## M5 — Notifiche e PWA

**Obiettivo.** Il sistema parla con le persone e sta sulla schermata home del titolare.

**Da fare**
- Astrazione `NotificationChannel` con implementazioni email, SMS, push — **il fornitore SMS deve essere sostituibile cambiando una sola classe**
- Email transazionali: conferma, attesa di conferma, disdetta
- SMS promemoria con job schedulato ogni 5 minuti (mai `setTimeout`)
- Idempotenza: nuova migrazione per evento stabile e consegna evento/canale/destinatario; insert in `NotificationLog` prima dell’invio, gestione dei tentativi e degli esiti incerti
- Tetto SMS mensile per tenant → oltre il tetto, degrada a email e segnala nel pannello
- PWA: manifest, service worker, installabile, Web Push per nuova prenotazione e nuova recensione privata
- Export CSV clienti e cancellazione cliente con anonimizzazione, entrambi con `AuditLog`
- Job mensile di retention/anonimizzazione
- Informativa privacy per tenant, consenso marketing **separato e non pre-spuntato**

**Criteri di accettazione**
- [x] Doppio tentativo di invio dello stesso promemoria → un solo messaggio spedito
- [x] Superato `sms_monthly_cap` → l'invio passa a email, il pannello lo mostra
- [x] Cambiare fornitore SMS richiede di modificare un solo file
- [ ] La PWA si installa e riceve una push su Android e su iOS 16.4+
- [x] Export produce un CSV valido e scrive in `AuditLog`
- [x] Cancellazione cliente anonimizza senza rompere lo storico prenotazioni

---

**Esito locale:** cancello automatico verde in PROGRESS. Il requisito sui telefoni fisici e il recapito reale rimangono pendenti; M5 non dichiarata completamente accettata in produzione.

## M5S — sala e attesa, autorizzata dall’utente

Prima dell’attivazione M6, dopo il cancello automatico locale M5. Richiesta del 17 settembre e successivo «finisci tutto»: usare ordine di arrivo con compatibilità evidenziata e assegnazione manuale delle combinazioni. Nessuna piantina Pro o console agenzia inclusa.

**Da fare**
- Riusare `RestaurantTable.zone` per filtrare la sala, senza secondo modello di sala.
- Combinazioni consentite configurate dall’owner; componenti fisici espliciti e capienza effettiva. Membri immutabili dopo la creazione; per una nuova combinazione creare una nuova configurazione e disattivare la precedente.
- Assegnazione staff sullo stesso lock e motore capienza/ritmo; ogni tavolo componente occupato. Snapshot nome e tavoli della prenotazione, così le configurazioni future non cambiano lo storico.
- Lista d’attesa per giorno e servizio: cognome, coperti e arrivo. FIFO stabile; compatibilità suggerita, decisione operatore. Accomodamento crea una prenotazione staff senza recapiti inventati e rivalida dentro la stessa transazione.
- Servizio fotografato negli ingressi in attesa, conservato se cambiano gli orari; oltre mezzanotte attribuito al giorno d’inizio. Visibilità solo staff; storico attesa anonimo dopo il periodo di retention.

**Criteri**
- [x] Tavolo singolo/componente occupati una sola volta nella stessa finestra, anche in concorrenza.
- [x] Gruppi esterni/inattivi o con componenti non disponibili rifiutati; vecchie prenotazioni e assegnazione automatica singola conservate.
- [x] Attesa separata per tenant/giorno/servizio, FIFO stabile; doppio accomodamento produce una sola prenotazione.
- [x] Nessun contatto richiesto/inventato per l’attesa, nessun SMS automatico.
- [x] Un solo scenario browser sala/attesa a 375 px; cancello generale verde.

---

## M5C — dati demo e protocollo, richiesti il 17 settembre

**Obiettivo:** rendere comprensibile la prova locale, conservando le prove già salvate; chiarire i lavori necessari prima della produzione.

**Da fare:** nomi/feedback inventati leggibili, aggiornamento conservativo, comando locale esplicito per casi prenotazione/combinazione/attesa validi e idempotenti; guida ai dati, analisi P01–P12 e protocollo con passi/risultati attesi.

**Criteri:**
- [x] Cancello generale verde e app riavviata sul Mac.
- [x] Esempi inseriti nei due demo senza alterare prenotazioni, tavoli e menu delle prove precedenti.
- [x] Test di idempotenza/concorrenza, conservazione modifiche e rispetto chiusure verdi.
- [x] Documenti dati/test/produzione coerenti con codice ed evidenze.

**Confine:** nessun account acquistato, invio live, deploy o console agenzia; criteri M5 fisici e M6 ancora aperti.

## M5R — revisione prodotto e collaudo collaboratori, 23 settembre

Richiesta esplicita: review generale, confronto con Superb, miglioramento copy/UX/UI e nuova guida di prova. Intervento sulle funzioni esistenti; le estensioni di prodotto emerse dal confronto restano nel BACKLOG.

**Da fare:** recupero errori prenotazione senza perdere scelte/contatti; ricevuta coerente e stato aggiornabile; agenda aggiornata automaticamente, azioni durante servizio, scheda ospite con storico essenziale; dialog e leggibilità mobile; menu leggero con immagini reali e aggiornamento affidabile; confronto motivato e nuova guida ai collaboratori.

**Criteri:**
- [x] Cancello generale verde, senza abbassare le soglie Lighthouse.
- [x] Verifiche mirate su retry rete/conflitto, tastiera dialog, storico isolato e aggiornamento menu/agenda.
- [x] Ispezione desktop/375 px e benchmark sulla copertina reale conservata.
- [x] Nuovo documento tester, PDF verificato e conservato solo sul Mac; produzione e funzioni future distinte dai risultati locali.

**Confine:** nessun acquisto, pubblicazione remota o invio reale; M5 fisica e M6 restano aperte. L’obiettivo è una demo più solida e verificabile, non la replica completa di Superb.

## M5A — Console amministrativa BigAnt, richiesta il 24 settembre

L’utente autorizza ora B09: gestione dei locali clienti con identità amministrativa separata.

**Da fare:** accesso amministratore separato, elenco/ricerca locali, onboarding con titolare, stato e piano, condizioni commerciali e scadenze, configurazione servizi, gestione operatori e recupero accessi, consumi aggregati, checklist di attivazione e audit. Nessuna consultazione dei dati personali degli ospiti dalla console; nessuna impersonificazione. Canoni registrati per gestione commerciale, senza addebiti automatici.

**Criteri:**
- [x] Sessioni amministrative separate e revocabili; utenti dei locali esclusi dalla console.
- [x] Creazione locale transazionale, gestione stato/accessi e audit verificati.
- [x] Dati commerciali riservati alla console; isolamento tenant invariato.
- [x] Consumi reali aggregati e distinzione invii simulati, accettati e falliti.
- [x] Interfaccia IT/EN, desktop e 375 px; guide e cancello generale aggiornati.

**Esito locale:** 122 test backend, 10 scenari browser, typecheck/lint/build verdi. Lighthouse menu 100/100, LCP 1329 ms. Migrazione additiva applicata conservando tutte le righe precedenti; credenziali amministratore locali casuali e guida dedicate. Nessuna pubblicazione remota o attivazione dei pagamenti/invii reali. Rapporto in PROGRESS.

## M6 — Messa in produzione

**Obiettivo.** Un locale vero, in EU, con i backup attivi.

**Da fare**
- Deploy: configurazione scelta e verificata in EU per web, API, database, worker/storage/log/backup; candidati e vincoli in SERVIZI_ESTERNI.md
- Variabili d'ambiente documentate in `.env.example`
- Backup automatici del database, con un ripristino provato davvero almeno una volta
- Monitoraggio errori verificato EU con filtro dei dati personali; Sentry SaaS EU non è una scelta già approvata
- Dominio, HTTPS, header di sicurezza (CSP, HSTS, X-Content-Type-Options)
- Onboarding guidato del primo tenant reale
- Pagina di stato o almeno un alert quando l'API non risponde

**Criteri di accettazione**
- [ ] Nessun servizio con dati personali fuori dalla regione EU (verificato nelle console dei fornitori)
- [ ] Ripristino da backup eseguito su ambiente di prova, con esito documentato in `PROGRESS.md`
- [ ] Nessun dato personale visibile negli eventi Sentry
- [ ] Il criterio di completamento dell'MVP di SPEC §13 è soddisfatto

---

## Riepilogo

| Missione | Blocco | Rischio | Il punto critico |
|---|---|---|---|
| M0 | Fondamenta | Alto | L'isolamento tenant imposto dall'infrastruttura |
| M1 | Motore prenotazioni | **Il più alto** | Ritmo di servizio e concorrenza |
| M2 | Interfaccia prenotazioni | Medio | Che la sala lo usi davvero durante il servizio |
| M3 | Menu | Basso | Velocità di caricamento |
| M4 | Recensioni | Medio | Conformità Google, non funzionalità |
| M5 | Notifiche e PWA | Medio | Idempotenza e costo SMS |
| M6 | Produzione | Medio | Backup e residenza dei dati |

Se il tempo finisce prima di M6, il taglio si fa su M3 (il menu può essere un PDF per qualche settimana), mai su M1.
