# Sala e lista d’attesa — analisi e comportamento standard

Richiesta del 17 settembre 2026, analizzata durante M4 prima di modificare il motore. La precisazione dell’utente richiede di evitare sovrapposizioni e peggioramenti. La successiva autorizzazione «finisci tutto» avvia M5S dopo il cancello automatico locale M5; stato e prove in PROGRESS.

| Esigenza | Già presente | Estensione M5S |
| --- | --- | --- |
| Distinguere le sale | Zona del tavolo (`RestaurantTable.zone`), editabile dal titolare | Filtro/raggruppamento per zona, riusando il campo esistente |
| Prendere prenotazioni facilmente | Form cliente progressivo, creazione operatore da telefonata, agenda per giorno, vista Orari | Misurare la prova operatore prima di ridisegnare il form |
| Capire se un tavolo è adatto | Capienza minima/massima, attivo/disattivo e occupazione sovrapposta | Nessun secondo motore di disponibilità |
| Assegnare un tavolo | Scelta manuale e automatica del singolo tavolo libero più piccolo compatibile | Combinazioni di tavoli esplicitamente consentite dal ristoratore |
| Evitare overbooking | Rivalidazione in transazione con lock del locale, controlli capienza/ritmo/tavolo | Occupazione di ogni tavolo fisico della combinazione nello stesso controllo |
| Gestire chi aspetta fuori | Non presente | Lista d’attesa riservata allo staff per giorno e servizio |

## Comportamento standard

**Sala.** Usare le zone già esistenti. Il titolare indica combinazioni consentite e capienza effettiva: due tavoli vicini non sono automaticamente unibili. L’operatore sceglie una combinazione; il backend verifica tutti i tavoli coinvolti. Le prenotazioni esistenti mantengono assegnazione e durata storica. Cambiare una combinazione futura non deve cambiare i tavoli occupati da una prenotazione già assegnata.

**Lista d’attesa.** Cognome, coperti e ora di arrivo, suddivisi per servizio del locale. Proposta iniziale: ordine di arrivo con gruppi compatibili evidenziati; scelta finale dell’operatore. Inserire un ospite in attesa non occupa un tavolo. La successiva assegnazione deve rivalidare disponibilità, capienza e ritmo in transazione, anche se un altro operatore interviene nello stesso momento.

Il servizio della lista è quello del locale (pranzo/cena o apertura continuata), distinto dai turni del personale. Ogni ingresso conserva giorno d’inizio, orari UTC ed etichetta del servizio; vecchie liste restano consultabili dopo il cambio orari e i servizi oltre mezzanotte compaiono anche il giorno successivo. La lista non richiede account cliente, SMS, pagamenti o contatti obbligatori.

Durante un servizio oltre mezzanotte le alternative restano aggiornate anche lasciando l’agenda sul giorno d’inizio. La scelta nel modulo di accomodamento identifica tavolo/combinazione **e orario**, non la posizione nell’elenco: se un aggiornamento elimina quella proposta, il pulsante si disabilita e invita a scegliere nuovamente. Non viene assegnata in silenzio un’altra alternativa.

## Scelte risolte per procedere

Il successivo «finisci tutto se non hai dubbi o cose da confermare» consente di usare le proposte iniziali: FIFO con compatibilità evidenziata e combinazioni assegnate manualmente. Dichiarate in DECISIONS D12 e missione M5S. M4 non viene riscritta; il nuovo blocco parte dopo il cancello automatico locale M5.

Modello e criteri in SPEC §16 e MISSIONS M5S. I componenti della combinazione sono immutabili: nuova configurazione per cambiare struttura. Le occupazioni e il nome della combinazione sono fotografati nella prenotazione. Ogni ingresso in attesa conserva il servizio con il giorno d’inizio, compresi quelli oltre mezzanotte; i vecchi ingressi restano consultabili dopo la modifica degli orari.

## Verifiche di accettazione

- Tavolo singolo e componente di una combinazione non possono essere assegnati due volte nella stessa finestra, anche in concorrenza.
- Combinazioni con tavoli di un altro tenant, inattivi o non consentiti vengono rifiutate.
- Prenotazioni e API esistenti conservate; isolamento tenant su tutti i nuovi modelli.
- Attesa separata fra locali, giorni e servizi; ordine stabile e assegnazione senza salti automatici decisi dal software.
- Percorso operatore rapido a 375 px; un solo scenario frontend essenziale, regole nel backend.
- Cancello generale verde prima di riavviare la prova con i dati conservati.

**Pro futuro:** piantina disegnabile a blocchi e struttura grafica del locale. Non necessaria per configurare le combinazioni semplici, rinviata nel BACKLOG.

**Esito:** M5S completata localmente; ultimo ricontrollo 100 backend/7 browser, compreso aggiornamento del modulo aperto, e prova a 375 px in PROGRESS. Gli avvii conservano i dati. Servizi esterni e telefoni fisici non verificati da questo blocco.
