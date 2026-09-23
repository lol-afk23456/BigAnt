# Cosa manca per la messa in produzione

Verifica del repository: 17 settembre 2026. Questo documento descrive il codice presente e le evidenze ancora da ottenere; non certifica ambienti o fornitori che non sono stati attivati.

**No, collegare i servizi esterni non basta.** Il prodotto funziona nella demo locale, ma restano lavoro tecnico M6, configurazione operativa e collaudo reale M5/M6. Installazione di un plugin, pubblicazione su GitHub e acquisto di hosting non chiudono questi passaggi.

## Già presente e verificato localmente

- Prenotazioni progressive, disponibilità/capienza/ritmo, lock contro overbooking, disdetta e agenda staff.
- Isolamento tenant nel data layer e FK composte, autenticazione con revoca e rotazione, ruoli owner/staff verificati dai test.
- Menu IT/EN, quattro template, immagini ricompresse, visibilità separata dall’esaurimento.
- Feedback privati, collegamento Google senza filtro sul voto, gestione card.
- Sala/combinazioni e attesa per servizio, occupazione dei componenti e accomodamento atomico.
- Outbox, worker, idempotenza, quota SMS/fallback; export, anonimizzazione e retention; manifest/PWA e registrazione push.

Gli adattatori email/SMS/push esistono. Oggi producono invii simulati. I test automatici controllano il software su database locale e browser desktop con viewport mobile: non dimostrano recapito, continuità del servizio o uso su telefoni fisici. L’ultimo cancello effettivo e i conteggi sono in [PROGRESS](PROGRESS.md).

## Lavori da chiudere prima di un cliente operativo

| ID / priorità | Punto concreto oggi | Lavoro necessario | Evidenza per chiuderlo |
| --- | --- | --- | --- |
| P01 · bloccante | Nessun ambiente remoto operativo; `pnpm local` è un launcher Mac | Ambiente EU separato di collaudo e produzione; web, API, worker, DB, immagini e segreti; riavvio automatico e procedure deploy/rollback | Applicazione disponibile a Mac spento, anche dopo riavvio; nessun seed demo nel rilascio reale |
| P02 · bloccante | `trustProxy:false` e limiti in memoria; richieste browser passano dalle rewrite Next e letture SSR dall’API interna | Definire proxy fidati e identità del client attraverso tutti i passaggi, incluso SSR; bloccare accesso diretto non previsto e header IP falsificabili. Store condiviso solo se ci sono più repliche | Più utenti non condividono involontariamente il limite; falsi header non lo aggirano; 429 corretto e coerente fra repliche |
| P03 · bloccante | Next imposta nosniff/referrer, ma non CSP/HSTS; cookie staff Secure già presenti | HTTPS, dominio canonico, CSP compatibile con Next e HSTS sul punto di ingresso scelto; controllare anche le risposte web/errori | Browser senza violazioni che rompono i flussi; redirect HTTP, cookie e header verificati sull’URL pubblico |
| P04 · bloccante | Tenant/staff esistono nello schema; manca una procedura consegnabile per crearli e recuperare/cambiare password | Provisioning controllato del primo locale e operatori, credenziali uniche, cambio/recupero password, revoca e sospensione. Login dedicato supporta lo slug reale; il selettore root rimane demo | Locale creato senza usare credenziali demo; prova cambio/recupero/revoca. Per il pilot è sufficiente una procedura amministrativa documentata e verificata |
| P05 · bloccante | Foto su filesystem locale; nessun backup remoto/ripristino provato | Storage/volume EU persistente; copie separate cifrate di DB e foto, retention, accessi e obiettivi di recupero concordati; migrazioni additive e rollback applicativo | Ripristino in ambiente separato: prenotazioni, clienti, impostazioni e immagini recuperati; tempo e perdita dati misurati |
| P06 · bloccante | `/health` restituisce solo `ok`; errori applicativi non monitorati, worker segnala errori senza alert | Controllo DB e stato/ritardo della coda, disponibilità esterna, spazio disco, certificati e backup; errori filtrati in EU e destinatario dell’alert | Interrompere API/worker nel collaudo: alert ricevuto e problema diagnosticabile; nessun nome, contatto, note o token negli eventi |
| P07 · bloccante | Trasporti simulati; `sent` dei provider significa accettato, non recapitato | Account/regione/verifiche EU, dominio mittente e DNS richiesti dal provider, mittente/Reply-To; prove email e SMS reali. Gestire o riconciliare rimbalzi/esiti dal provider, con correlazione e senza reinvii incerti | Conferma, attesa, disdetta e promemoria ricevuti da destinatari autorizzati; rifiuto/timeout/quota/fallback verificati; esito incerto gestito |
| P08 · bloccante M5 | Manifest e push presenti, nessuna evidenza su Android/iPhone fisici | Collaudo HTTPS su dispositivi reali, installazione, permessi negati/revoca, ricezione/background e riapertura autenticata. Verificare filiera push EU: non basta attivare un flag | Installazione e ricezione documentate sui due sistemi; nessun dettaglio ospite mostrato senza accesso |
| P09 · bloccante | Informativa generata in bozza; dati privacy/locale e contratti non validati | Testi e ruoli validati, contatto privacy/assistenza, accordi di trattamento e retention approvata; regioni di DB/storage/code/log/backup e metadati dei fornitori documentate | Documentazione firmata/approvata e configurazioni verificabili prima dei dati personali reali |
| P10 · prima del pilot | Disponibilità legge tutte le prenotazioni attive del tenant, anche storiche; upload senza pulizia orfani/quota disco; aggiornamenti ogni 30 secondi | Misurare volumi attesi e query sotto lock; restringere letture se necessario senza perdere sovrapposizioni notturne; limiti disco/upload e pulizia sicura; foto reali e rete mobile | Nessun overbooking sotto concorrenza; tempi accettabili ai volumi concordati; menu ≥90/LCP<2s sul profilo previsto; niente crescita disco incontrollata |
| P11 · bloccante | Prima CI GitHub avviata con la distribuzione; esito in PROGRESS. Nessun collaudo dell'ambiente di produzione | Cancello sul commit da rilasciare, collaudo end-to-end remoto, separazione DB test/produzione, controllo dipendenze e segreti | Tutti i comandi verdi; versioni/commit e risultati registrati; rollback provato nel collaudo |
| P12 · chiusura MVP | Nessuna prova completa documentata con un locale indipendente dai soci | Primo ristoratore, prenotazione vera, conferma dal telefono e feedback da card durante un servizio | Esito SPEC §13 scritto in PROGRESS, senza conservare dati personali nelle evidenze |

**P13 - Prima del pilot, creazione idempotente:** due invii separati della stessa prenotazione possono creare due righe quando la prima risposta si perde dopo il commit. Il lock di disponibilità protegge capienza e tavoli, non identifica lo stesso tentativo. Implementare una chiave stabile e replay sicuro della ricevuta, con scadenza e confronto payload; verificare risposta persa/retry, tenant differenti e notifiche senza duplicati. Vedi B16. Il frontend evita doppi clic durante l'invio, ma questo non chiude il caso di rete.

P07 comprende una decisione da chiudere con il provider: il codice attuale registra l’accettazione della richiesta e non ha webhook di recapito/rimbalzo. Per il pilot occorre almeno una riconciliazione documentata; l’automazione degli esiti richiede ulteriore sviluppo. Analogamente, P04 non impone di costruire subito la console agenzia: il provisioning iniziale può essere amministrativo, con controlli e audit. La console rimane B09.

**Evidenza P10, consegna GitHub del 17 settembre:** la copertina attualmente caricata nella demo Mac (variante 960 WebP circa 120 KB) ha prodotto performance 82/100, LCP 3626 ms, di cui 3138 ms di download, con il profilo mobile previsto. È una prova diversa dal precedente 91/100/LCP 1319 ms con immagini sintetiche. Le foto esistenti sono conservate; budget/varianti delle immagini vanno migliorati e ricollaudati prima del lancio. Esiti dei runner Linux in PROGRESS: non considerare un test funzionale verde una certificazione delle prestazioni.

**Aggiornamento P10, review locale del 23 settembre:** documento menu HTML senza runtime React e nuove derivate delle copertine, originali conservati. Stesso profilo e stessa foto reale: **100/100, LCP 1304 ms**, TBT/CLS 0. Cancello E2E sintetico: **100/100, LCP 762 ms**; nove flussi verdi. Miglioramento verificato sul Mac; nessuna nuova misura remota/Linux o su telefoni fisici, nessun deploy. Quote, pulizia, capacità e backup restano da completare.

## Servizi effettivamente necessari

Dominio/DNS/HTTPS, hosting EU, PostgreSQL, immagini persistenti, backup separati, email transazionali, caselle di risposta/assistenza e monitoraggio. SMS e Web Push completano il perimetro notifiche della SPEC, con configurazione, costi e prove propri. Worker e coda usano già PostgreSQL: nessun servizio di code aggiuntivo è obbligatorio per il pilot.

Google richiede il Place ID corretto e link/card del locale; questo MVP non sincronizza recensioni pubblicate né prenotazioni da canali terzi. Per usare la PWA non occorre un’app nativa. I fornitori in [SERVIZI_ESTERNI](SERVIZI_ESTERNI.md) sono candidati: budget, regioni e condizioni vanno confermati sull’account scelto. Nessuna nuova stima commerciale viene introdotta da questo controllo del codice.

## Ordine pratico e responsabilità

1. **Prova locale con dati inventati:** eseguire il protocollo, registrare difetti, correggere i problemi bloccanti. Possiamo farlo ora.
2. **Preparazione tecnica M6:** P02–P06/P10 e procedura di rilascio, anche prima di acquistare i servizi; decidere architettura e obiettivi di recupero in base ai volumi.
3. **Ambiente EU di collaudo:** account/dominio/HTTPS e credenziali, dati inventati; chiudere recapito e telefoni M5. Preparare backup/monitoraggio e simulare incidenti.
4. **Pilot reale:** testi e accessi pronti, ripristino e alert riusciti, cancello verde, operatore formato; servizio con il primo ristoratore.

Lavoro tecnico e documentazione possono proseguire autonomamente. Riccardo/soci devono indicare: dominio e DNS, intestatario account, budget, locali/volumi iniziali, primo locale con contatti/Place ID, responsabile manutenzione e dispositivi disponibili. Non inviare segreti in chat; inserirli nel gestore dell’ambiente. Acquisti e attivazione dei messaggi reali avvengono dopo una configurazione concreta concordata.

Non c’è ancora un tempo di attivazione affidabile: il numero di righe di codice è solo una parte. DNS/account, verifica dei fornitori, telefoni, restore e disponibilità del ristoratore condizionano il calendario. Registrare durate effettive del collaudo; non promettere produzione in poche ore sulla base della velocità della demo.

## Regola di rilascio

Per la produzione tutti i punti bloccanti devono avere evidenza e responsabile, P10 deve essere dimensionato per il pilot, e M5/M6 devono chiudere i propri criteri. Se il prodotto funziona sul Mac ma manca ripristino, recapito o collaudo operativo, lo stato resta **demo locale verificata / produzione da completare**. Nuove funzioni come console agenzia, piantina Pro, pagamenti o integrazione cassa non sono condizioni per il primo pilot.

Riferimenti del controllo: `apps/web/next.config.ts`, `apps/web/components/staff-login.tsx`, `apps/api/src/app.ts`, `apps/api/src/server.ts`, `apps/api/src/reservations/service.ts`, `apps/api/src/notifications/{config,channels,worker}.ts`, `apps/api/src/menu.ts`, `scripts/local.mjs`, `.env.example` e [MISSIONS M5–M6](MISSIONS.md).
