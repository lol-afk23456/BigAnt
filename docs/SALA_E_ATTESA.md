# Sala e lista d’attesa — analisi prima dell’estensione

Richiesta del 17 settembre 2026, durante M4. Questo documento è un’analisi: non dichiara nuove funzioni implementate. La precisazione successiva dell’utente richiede di verificare sovrapposizioni prima di cambiare ciò che funziona.

| Esigenza | Già presente | Aggiunta effettiva da valutare |
| --- | --- | --- |
| Distinguere le sale | Zona del tavolo (`RestaurantTable.zone`), editabile dal titolare | Filtro/raggruppamento per zona, riusando il campo esistente |
| Prendere prenotazioni facilmente | Form cliente progressivo, creazione operatore da telefonata, agenda per giorno, vista Orari | Misurare la prova operatore prima di ridisegnare il form |
| Capire se un tavolo è adatto | Capienza minima/massima, attivo/disattivo e occupazione sovrapposta | Nessun secondo motore di disponibilità |
| Assegnare un tavolo | Scelta manuale e automatica del singolo tavolo libero più piccolo compatibile | Combinazioni di tavoli esplicitamente consentite dal ristoratore |
| Evitare overbooking | Rivalidazione in transazione con lock del locale, controlli capienza/ritmo/tavolo | Occupazione di ogni tavolo fisico della combinazione nello stesso controllo |
| Gestire chi aspetta fuori | Non presente | Lista d’attesa riservata allo staff per giorno e servizio |

## Prima versione proposta

**Sala.** Usare le zone già esistenti. Il titolare indica combinazioni consentite e capienza effettiva: due tavoli vicini non sono automaticamente unibili. L’operatore sceglie una combinazione; il backend verifica tutti i tavoli coinvolti. Le prenotazioni esistenti mantengono assegnazione e durata storica. Cambiare una combinazione futura non deve cambiare i tavoli occupati da una prenotazione già assegnata.

**Lista d’attesa.** Cognome, coperti e ora di arrivo, suddivisi per servizio del locale. Proposta iniziale: ordine di arrivo con gruppi compatibili evidenziati; scelta finale dell’operatore. Inserire un ospite in attesa non occupa un tavolo. La successiva assegnazione deve rivalidare disponibilità, capienza e ritmo in transazione, anche se un altro operatore interviene nello stesso momento.

Il servizio della lista è quello del locale (pranzo/cena o apertura continuata), distinto dai turni del personale. Va definito come mantenere lo storico se gli orari vengono modificati e come gestire servizi oltre mezzanotte. La lista non richiede account cliente, SMS, pagamenti o contatti obbligatori.

## Scelte chieste, ancora da raccogliere

- Ordine di arrivo con compatibilità evidenziata, oppure compatibilità come primo criterio di ordinamento.
- Assegnazione manuale delle combinazioni, oppure anche automatica quando nessun tavolo singolo basta.

Queste preferenze non bloccano M4. Proposta iniziale: ordine di arrivo e assegnazione manuale. Prima di implementare l’estensione, dettagliare modello dati, migrazione additiva e criteri di accettazione in SPEC/MISSIONS sulla base della scelta.

## Verifiche necessarie prima di chiudere l’estensione

- Tavolo singolo e componente di una combinazione non possono essere assegnati due volte nella stessa finestra, anche in concorrenza.
- Combinazioni con tavoli di un altro tenant, inattivi o non consentiti vengono rifiutate.
- Prenotazioni e API esistenti conservate; isolamento tenant su tutti i nuovi modelli.
- Attesa separata fra locali, giorni e servizi; ordine stabile e assegnazione senza salti automatici decisi dal software.
- Percorso operatore rapido a 375 px; un solo scenario frontend essenziale, regole nel backend.
- Cancello generale verde prima di riavviare la prova con i dati conservati.

**Pro futuro:** piantina disegnabile a blocchi e struttura grafica del locale. Non necessaria per configurare le combinazioni semplici, rinviata nel BACKLOG.
