# Protocollo di test BigAnt Book

Versione 17 settembre 2026. Per Riccardo e soci; usare dati inventati. Questo protocollo verifica i flussi e rende i difetti riproducibili. Il cancello locale e l’accettazione in produzione sono due verifiche con evidenze diverse.

## Preparazione — 5 minuti

1. Su un clone nuovo segui [GUIDA_TESTER](GUIDA_TESTER.md), poi avvia `pnpm local`; sul Mac originale è disponibile anche **Avvia BigAnt.command** con runtime predisposto. Attendi l’indirizzo e apri `http://localhost:3000`. Mantieni il terminale aperto. Non avviare una seconda copia.
2. Sul Mac originale gli esempi guidati sono predisposti per questa sessione; in un clone nuovo aggiungili con `pnpm demo:examples` in un secondo terminale, a database attivo. Per una prova in un altro giorno usa `pnpm seed` e `pnpm demo:examples`. Il comando stampa le date effettive e gli eventuali casi saltati. Leggi [DATI_DEMO](DATI_DEMO.md).
3. Usa una finestra normale per lo staff e una finestra in incognito per il cliente. Per confrontare contemporaneamente i due staff, servono profili browser separati: due schede normali condividono i cookie e non rappresentano due sessioni isolate.
4. Scegli un codice per la prova, per esempio **PROVA-A**. Per nuovi ospiti usa `PROVA-A Anna Verdi`, `prova.a@example.test`, `3201234567`. Per un secondo cliente cambia nome, email e telefono (`prova.b@example.test`, `3201234568`). Non contattare questi numeri e non attivare notifiche live.
5. Annotare data/ora, locale, giorno dell’agenda, lingua/browser e versione del software. Una fascia proposta può cambiare se un altro tester prenota. Non usare `bigant_test` per prove manuali e non resettare i demo condivisi.

| Locale | Staff | Password | Agenda |
| --- | --- | --- | --- |
| Santa Lucia | `owner@santalucia.test` | `bigant2026` | [Apri](http://localhost:3000/r/trattoria-santa-lucia/staff?view=reservations) |
| Lido Miseno | `owner@lidomiseno.test` | `bigant2026` | [Apri](http://localhost:3000/r/lido-miseno/staff?view=reservations) |

## Prima prova — circa 20–25 minuti

Esegui T01, T02, T03, T04, T09 e T11. Se questi passano, hai verificato il percorso principale cliente → staff → menu → feedback. Il test completo aggiunge i casi seguenti e richiede circa 60–90 minuti, oltre alle prove d’attesa durante il servizio. Non assegnare “passato” a un caso non eseguito.

## Casi e risultati attesi

### T01 — dati comprensibili e locale corretto

Accedi a Santa Lucia, apri il giorno stampato da `demo:examples` e cerca **DEMO**. Apri Giulia Rossi, Famiglia Bianchi e Gruppo Esposito: devono mostrare 2/4/6 persone e note che spiegano la prova. In Tavoli trova la combinazione demo; in Clienti cerca Giulia; in Recensioni apri un messaggio dimostrativo.

**Atteso:** dati leggibili, riferiti al locale selezionato; il gruppo mostra due tavoli componenti. Un esempio saltato deve essere spiegato dall’output, senza forzare la configurazione. Gli stati modificati in prove precedenti restano tali.

### T02 — prenotazione Santa Lucia, consensi e contatti

In incognito apri [Prenota Santa Lucia](http://localhost:3000/r/trattoria-santa-lucia/prenota). Tocca 2 persone e scegli un giorno fra dopodomani e i giorni seguenti, dentro la finestra prenotabile. Seleziona una fascia libera, compila i contatti PROVA-A, apri la richiesta facoltativa e scrivi “Un seggiolone, se disponibile”. Prima di inviare prova a lasciare email/telefono vuoti e privacy non accettata; poi completa correttamente. Lascia marketing deselezionato. Attendi almeno due secondi di compilazione.

**Atteso:** campi rivelati progressivamente, persone con pulsanti; senza contatti/privacy non si prenota. Marketing inizialmente vuoto. Un solo invio corretto dà conferma immediata e link di gestione. Nell’agenda dello stesso giorno compare una sola prenotazione confermata, con orario corretto, note e recapiti. Conserva il link privatamente per T03; non inserirlo nel report condiviso.

### T03 — disdetta e ripetizione

Apri il link di T02 e disdici prima del termine indicato. Ricarica la gestione e l’agenda. Un secondo accesso/annullamento non deve creare un altro evento operativo.

**Atteso:** stato disdetto nel cliente e nello staff; posto liberato. Se il termine è già passato, appare il messaggio con l’alternativa di contattare il locale, senza modificare la prenotazione. Per la prova ordinaria usa dopodomani così il termine non ostacola il test. La verifica tecnica della ripetizione/idempotenza è anche automatizzata.

### T04 — richiesta Lido, conferma e persistenza

In incognito crea una prenotazione PROVA-B al [Lido](http://localhost:3000/r/lido-miseno/prenota). Accedi al Lido nella finestra staff, seleziona il giorno scelto, conferma la richiesta e assegna un tavolo libero compatibile. Vai al Menu, ricarica e usa Indietro/Avanti. Esci, poi riaccedi.

**Atteso:** cliente vede richiesta ricevuta, prima dell’azione staff lo stato è da confermare; dopo diventa confermato. Tavolo, stato e note persistono. La sezione resta coerente con `view` e navigazione browser. Non considerare la schermata di successo una prova di email ricevuta.

### T05 — telefonata e stati della prenotazione

Da Nuova prenotazione crea PROVA-C con contatti distinti e fascia libera. Modifica note/coperti entro una capienza valida. Prova poi un numero incompatibile con il tavolo o uno spostamento su fascia chiusa/occupata. Su una prenotazione dedicata percorri Conferma, Al tavolo, Completa; su un’altra usa Assente solo quando la prova rappresenta un ospite che non arriva.

**Atteso:** modifiche valide salvate; quelle incompatibili rifiutate senza alterare i dati precedenti. Dopo Completa il tavolo si libera e la visita viene conteggiata una volta; una transizione non ammessa non procede. Per una simulazione realistica esegui gli stati di arrivo durante il servizio, senza confonderli con appuntamenti futuri.

### T06 — chiuso/pieno e alternative invitanti

Fotografa le impostazioni iniziali. Aggiungi una chiusura completa per oggi; apri una nuova pagina prenotazione. Seleziona poi esplicitamente oggi. Rimuovi la chiusura e prova undo entro cinque secondi; infine rimuovila davvero per ripristinare il locale. Non abbassare permanentemente la capienza per simulare un pieno.

**Atteso:** ingresso automatico sul primo giorno utile; selezionando il giorno chiuso compaiono le due date disponibili più vicine, quando esistono nella finestra prenotabile, con tono che invita a scegliere. Se la finestra non ha disponibilità, il messaggio deve offrire il contatto del locale quando presente. Nessuna schermata vuota. La capienza/ritmo piena e la concorrenza sono coperti dai test automatici: non dichiararli provati manualmente solo per avere inserito una chiusura.

### T07 — combinazione e tavoli occupati

In Tavoli apri la combinazione demo; in agenda apri Gruppo Esposito e annota fascia e componenti. Durante il test tenta una nuova prenotazione manuale su uno dei componenti nella stessa finestra di occupazione, usando un contatto diverso; ripeti sull’altro. Completa il gruppo in una prova di servizio, poi riprova una fascia compatibile. Se l’app filtra già il tavolo occupato, il filtro corretto è l’esito UI atteso; la forzatura dell’API è verificata automaticamente.

**Atteso:** entrambi i tavoli occupati dal gruppo; nessuna doppia assegnazione. Completa libera entrambi. Il cliente pubblico di sei persone non viene automaticamente assegnato a questa unione quando nessun singolo tavolo può contenerlo. Le combinazioni sono una scelta dell’operatore. Ripristina eventuali tavoli/gruppi di prova disattivati.

### T08 — attesa, ordine e decisione operatore

Apri la lista d’attesa sul giorno/servizio stampato dal comando: Costa (2), Conti (4), Gallo (6). Prima dell’apertura osserva l’assenza dei suggerimenti. Durante il servizio premi Aggiorna alternative, seleziona tavolo/combinazione e orario compatibili per Costa, poi Accomoda. Verifica la prenotazione Al tavolo e lo storico. Per Conti prova È andato via con undo; poi lascia completare l’azione su un ingresso dedicato.

**Atteso:** FIFO stabile, nessun telefono/email richiesto, nessuna occupazione finché si è in attesa; un solo accomodamento e prenotazione. Gallo può usare solo una soluzione da sei posti o una combinazione consentita e libera. La scelta resta manuale, senza salto automatico della fila. Cambiare alternativa deve cambiare davvero ciò che viene inviato; se la disponibilità cambia, occorre riselezionare prima di procedere. Nessun SMS automatico.

**Condizione:** fuori dal servizio o con tempo residuo insufficiente, annotare “da ripetere nel servizio”, non “errore” o “passato”. Al Lido il servizio continuato rende più facile la prima prova. Il caso notturno e il doppio clic concorrente sono coperti anche dai test backend; modificarne gli orari nella demo richiede ripristinarli alla fine.

### T09 — menu: occhio diverso da esaurito

Dal pannello crea categoria **PROVA-A** / **TEST-A** e piatto “Burger di prova” / “Test burger”, prezzo 12,50 €, descrizioni, allergeni e foto JPEG/PNG/WebP sotto 5 MB. Apri il menu pubblico in un’altra finestra e scorri fino al piatto. Segnalo esaurito; attendi fino a 30 secondi con pagina visibile. Poi usa l’occhio; ripubblicalo e togli esaurito. Prova lingua EN.

**Atteso:** prezzo 12,50 €, categoria/foto/allergeni corretti; esaurito resta grigio con etichetta; nascosto sparisce; ripubblicato torna con lo stato corretto. Aggiornamento senza reload dell’intero documento e mantenendo il punto di lettura. Il piatto non compare nel menu dell’altro locale. File non ammesso o troppo grande dà un errore comprensibile e lascia intatti i dati precedenti. Alla fine rimuovi il piatto, poi la categoria.

### T10 — quattro template, colore e copertina

Annota aspetto iniziale, poi salva Essenziale, Pop, Elegante e Pub uno alla volta, verificando il menu pubblico già aperto. Cambia colore e copertina; verifica IT/EN e larghezza 375 px. Ripristina aspetto iniziale.

**Atteso:** design riconoscibili e tutti scuri; piatti, prezzi, allergeni, stato nascosto/esaurito e lingua invariati. Nessun testo tagliato o scorrimento orizzontale. Una foto sostituita resta disponibile dopo riavvio, non solo nell’anteprima.

### T11 — feedback e card, nessun filtro sul voto

Da Card NFC crea **PROVA-A**, apri il link e osserva la schermata prima di scegliere. Apri il form privato, seleziona 1 e poi 5 senza inviare; controlla che la scelta Google non dipenda dal voto. Invia “PROVA-A · servizio lento, personale gentile”. Nel pannello leggi il feedback, aggiungi nota e segna letto. Riprova un invio dalla stessa card entro dieci minuti. Prova disattivazione con undo, poi disattivazione effettiva e riattivazione.

**Atteso:** Google/privato con stesso peso prima del voto; nessun incentivo o testo suggerito. Messaggio anonimo segnalato entro 30 secondi quando visibile, conservato nei letti; nota interna mai pubblicata. Secondo invio card bloccato; card disattiva non utilizzabile. I Place ID demo registrano il clic e mostrano esito locale: non pubblicano recensioni. Se Google non è configurato, il solo privato è il comportamento atteso. Non recensire un locale reale per questa prova.

### T12 — clienti, CSV e anonimizzazione

Crea un ospite **PROVA-PRIVACY** distinto, con una prenotazione dedicata, note e nessun consenso marketing. Cerca il cliente dal pannello, scarica CSV e controlla intestazioni/contatti: note e allergie non devono comparire. Prova Anonimizza e undo entro cinque secondi; verifica dati conservati. Poi ripeti lasciando completare l’azione, esclusivamente sull’ospite sacrificabile. Riapri agenda, dettaglio e vecchio link di gestione.

**Atteso:** export valido; dopo l’azione effettiva nome anonimizzato, contatti/testi liberi rimossi, prenotazione storica conservata e vecchio link invalidato. L’azione completata non è reversibile. Non selezionare i casi guidati necessari ad altri tester. Il conteggio storico rimane: non aspettarti la cancellazione fisica di tutte le righe. Audit e retention mensile sono verificati automaticamente; il protocollo non richiede di attendere 24 mesi.

### T13 — sessioni, separazione locali e logout

Con sessione Lido attiva apri l’ingresso staff Santa Lucia. Poi scegli esplicitamente di cambiare accesso e cerca PROVA-B del Lido nell’agenda Santa Lucia. Esci e prova a tornare al pannello/reload.

**Atteso:** avviso di sessione di un altro locale prima di mostrare l’agenda; nessun dato Lido dentro Santa Lucia. Logout revoca l’accesso, reload richiede login. Le prove API tentano anche ID di un altro tenant e sessioni revocate: sono parte del cancello automatico.

### T14 — lingua, tastiera, mobile e offline

Ripeti una prenotazione e la lettura menu a 375 px, IT/EN. Usa Tab/Shift+Tab/Invio: focus visibile, label e pulsanti raggiungibili. Se installata/registrata la PWA, interrompi la rete e riapri una sua pagina; ripristina la rete e controlla accesso/dati.

**Atteso:** persone toccabili, nessun overflow, date/orari corretti nel fuso del locale; prezzi/allergeni e messaggi coerenti. Offline generico senza nomi o prenotazioni memorizzati. La viewport del Mac non chiude la prova telefoni: installazione/push Android e iPhone è T17.

### T15 — notifiche simulate e persistenza al riavvio

Crea una prenotazione futura dedicata, apri Notifiche e osserva la consegna. Il worker periodico può richiedere fino a cinque minuti; un’azione di prenotazione tramite API normalmente lo sveglia. Ferma il launcher con Ctrl+C, riavvialo e controlla prenotazione, note, menu/foto e lista. Non rilanciare un reset.

**Atteso:** messaggi in stato Simulato, nessuna email/SMS/push reale e nessun invio duplicato dopo reload/riavvio. Gli esempi vecchi possono avere una riga legacy fallita: non è una prova di consegna reale o un nuovo errore del provider. Se rimane In coda oltre il ciclo, annotare e controllare il worker. Le prove automatiche coprono promemoria spostati/scaduti, quota, fallback e timeout.

## Prove da fare sul collaudo remoto

Queste non passano sul solo Mac. Richiedono M6 preparata e servizi autorizzati, account e dispositivi: dettaglio dei prerequisiti in [MESSA_IN_PRODUZIONE](MESSA_IN_PRODUZIONE.md).

| Caso | Procedura | Atteso / evidenza |
| --- | --- | --- |
| T16 · account reali e operatore | Creare locale e owner con credenziali uniche, più utente staff; provare cambio/recupero password, revoca/sospensione; verificare che staff non possa modificare configurazioni owner o esportare/anonimizzare | Procedura di onboarding/recupero completata e permessi corretti; la verifica dei ruoli API locale è già automatizzata |
| T17 · recapito e dispositivi | Destinatari autorizzati: attesa/conferma/disdetta/promemoria ricevuti; SMS/quota/fallback; installare PWA su Android e iPhone, negare poi accordare permessi, ricevere push e aprire da background | Messaggi ricevuti davvero, nessun doppione; dispositivi/OS/ora/esito annotati; dato privato protetto da autenticazione. Non bastano `sent` o risposta HTTP del provider |
| T18 · backup e incidente | Fare backup DB/foto, ripristinare su ambiente separato; fermare API e worker, verificare alert; riavviare e riconciliare coda, controllare immagini; provare rollback applicativo | Dati recuperati, tempi/perdita misurati, alert ricevuto, nessun reinvio cieco o dato personale nei log |
| T19 · rete e carico | HTTPS/header/cookie; almeno due client distinti dietro proxy, limiti e falsi header; foto vere e rete rallentata; volumi/utenti concordati con concorrenza sull’ultima disponibilità | Limiti per client corretti, nessun overbooking, menu sul target, API/coda senza ritardo crescente; risorse e tempi documentati |
| T20 · primo servizio reale | Ristoratore esterno ai soci: cliente vero prenota, operatore conferma dal telefono, feedback da card a fine serata | SPEC §13 soddisfatta con consenso e documenti pronti; annotazione dell’esito senza nomi/recapiti nell’evidenza |

## Cancello automatico per ogni rilascio

Con PostgreSQL locale attivo, launcher fermo per liberare la porta API, eseguire in sequenza:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Vitest/Playwright usano il database separato `bigant_test`: non eseguirli contemporaneamente. Il successo significa test verdi sul commit provato. Lighthouse su foto sintetiche non prova le foto/rete del cliente. Dopo il cancello riavvia `pnpm local`; i dati manuali in `bigant` restano.

## Registro risultati e decisione

Copia questa tabella per ciascuna sessione, aggiungendo una riga per ogni caso:

| Caso | Locale / giorno servizio | Browser/dispositivo | Esito: PASS / FAIL / NON ESEGUITO | Evidenza / difetto |
| --- | --- | --- | --- | --- |
| T01 | | | | |
| T02 | | | | |

Un difetto deve riportare **caso, passi, atteso, visto, frequenza** e screenshot con soli dati inventati. Non condividere token di gestione, CSV o contatti reali. Classificare:

- **Bloccante:** perdita/esposizione dati, cross-tenant, overbooking/doppio accomodamento, impossibilità di prenotare/confermare, notifiche duplicate o restore fallito. Ferma il lancio e correggi.
- **Rilevante:** un flusso secondario non termina o richiede una soluzione manuale. Correggi e riprova il caso e i flussi coinvolti prima del pilot, salvo rinvio esplicito concordato.
- **Minore:** difetto visivo/testuale senza perdita di funzionalità. Registra priorità e soluzione.

Alla fine ripristina impostazioni, orari, piatti/card/tavoli di prova, senza azzerare il database. La prova locale è accettata quando T01–T15 applicabili passano e le condizioni non eseguite sono dichiarate. La produzione richiede inoltre T16–T20, cancello automatico verde e chiusura dei punti bloccanti M5/M6: non usare una prima prova di venti minuti come autorizzazione al lancio.
