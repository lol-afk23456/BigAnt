# BigAnt Book - Prova collaboratori

## Edizione della review - 23 settembre 2026

**Obiettivo:** verificare che un ospite sappia prenotare e che un ristoratore sappia gestire il servizio senza spiegazioni. Dedica 30-40 minuti al percorso principale, poi 20 minuti ai controlli aggiuntivi. Il tempo è indicativo; annota quanto impieghi davvero.

Una piattaforma, due locali dimostrativi: pagine pubbliche e pannello sono dedicati al singolo locale. Tema scuro, accenti arancioni, italiano e inglese.

### Prima di iniziare

- Usa la versione della review sul Mac di Riccardo. Questa edizione non è ancora stata pubblicata su GitHub: un clone di main può contenere la consegna precedente. Chiedi al referente quale versione provare.
- Apri [BigAnt locale](http://localhost:3000). Sul Mac di Riccardo avvia con doppio clic su **Avvia BigAnt.command** e lascia aperto il terminale. Il launcher usa Node e pnpm già predisposti.
- Per aggiungere esempi, apri un secondo terminale nella cartella BigAnt. Sul Mac originale esegui prima `export PATH="$PWD/.local/runtime/bin:$PWD/.local/tooling/node_modules/.bin:$PATH"`, poi `pnpm demo:examples`. Annota giorno e servizio stampati; le prove precedenti restano.
- Usa una finestra normale per lo staff e una in incognito per il cliente. Per due staff contemporanei servono profili browser separati.
- Ogni clone ha un database proprio. Le prove fatte su un Mac non compaiono sugli altri. Non cancellare `.local/` e non eseguire reset.

### Accessi demo

| Locale | Email staff | Password |
| --- | --- | --- |
| Trattoria Santa Lucia | owner@santalucia.test | bigant2026 |
| Lido Miseno | owner@lidomiseno.test | bigant2026 |

Santa Lucia conferma automaticamente. Il Lido richiede la decisione dello staff. Questi sono accessi dimostrativi, non credenziali da usare in produzione.

### Dati da usare

Scegli un prefisso personale, per esempio **TEST-RG**. Usa nomi inventati, `test.rg@example.test` e `3201234567`. Cambia telefono per un secondo ospite: il sistema riconosce il cliente dal numero. Non chiamare numeri demo. Nessuna email, SMS o push viene recapitata nella modalità locale.

Scrivi prima del test: nome tester, data, browser/dispositivo, locale e versione (`git rev-parse --short HEAD`; annotare anche eventuale versione locale non pubblicata).

<!-- page -->

## 1. Dal cliente alla prenotazione

### C01 - Santa Lucia, conferma immediata

Apri [Prenota Santa Lucia](http://localhost:3000/r/trattoria-santa-lucia/prenota) in incognito. Senza aiuto, scegli 2 persone, dopodomani e un orario libero. Prima della fascia non devono apparire i contatti; dopo la scelta il form li rivela.

Inserisci il nome TEST, email e telefono. Scrivi una richiesta facoltativa, per esempio "Un seggiolone, se disponibile". Prova prima a inviare senza privacy o un contatto, poi completa. Lascia marketing deselezionato.

**Atteso:** nome del locale evidente, pulsanti persone facili da toccare, email e telefono obbligatori, errori comprensibili, conferma immediata con giorno/orario corretti. Conserva privatamente il link di gestione. Il riepilogo non è una prova di email ricevuta.

### C02 - Lido, richiesta e decisione

Ripeti al [Lido Miseno](http://localhost:3000/r/lido-miseno/prenota), con un secondo telefono. Leggi il testo prima di premere **Invia la richiesta**. Apri il link di gestione e lascialo aperto.

Accedi allo staff Lido, scegli lo stesso giorno, attendi l'aggiornamento o premi **Aggiorna agenda**. Conferma la richiesta. Torna al cliente e premi **Aggiorna lo stato**.

**Atteso:** all'inizio il tavolo non è dichiarato confermato. Dopo la decisione dello staff lo stato diventa confermato; nessuna seconda prenotazione. Quando la pagina è visibile, una richiesta pendente controlla lo stato ogni 30 secondi.

### C03 - Cambiare idea e disdire

Nel link di C01 avvia la disdetta e premi **Annulla azione** entro cinque secondi. Verifica che sia ancora confermata. Ripeti e lascia completare la disdetta, prima del termine indicato.

**Atteso:** disdetta nella gestione e nell'agenda aggiornata; una rilettura non modifica ancora lo stato. Dopo la scadenza il cliente deve contattare il locale. Per il test scegli dopodomani, evitando una prenotazione imminente.

### Domande da annotare, senza suggerire la risposta

"Sto chiedendo un tavolo o è già confermato?" "Dove trovo il giorno scelto?" "Se non c'è posto, come continuo?" Registra le parole del tester e il punto dove esita.

<!-- page -->

## 2. Il servizio del ristoratore

### C04 - Agenda viva e telefonata

Apri l'agenda sul giorno scelto. In un'altra finestra crea una nuova prenotazione TEST con telefono distinto. Tieni visibile l'agenda: deve comparire entro il ciclo di 30 secondi oppure usando **Aggiorna agenda**, senza perdere giorno e ricerca. Il contatore "Da confermare" filtra le richieste; **Mostra tutte le prenotazioni** ripristina la vista.

Da **Nuova prenotazione** inserisci una telefonata. Assegna un tavolo compatibile. Leggi le richieste ospite e aggiungi una nota interna alla visita.

**Atteso:** i dati restano dopo il riavvio; il dettaglio distingue richieste, note della visita e note del profilo. Una fascia che nel frattempo non è più disponibile va riselezionata senza perdere i contatti già scritti.

### C05 - Accomoda, libera e consulta l'ospite

Su una prenotazione dedicata simula il servizio: conferma, **Accomoda**, **Libera tavolo**. In Clienti cerca lo stesso ospite e apri **Dettagli ospite**.

**Atteso:** visita completata conteggiata una volta, ultima visita e prenotazioni recenti consultabili. Lo storico mostra fino a 20 prenotazioni con stato, data, persone e origine. Le prenotazioni pendenti o confermate non aumentano le visite: il conteggio cresce dopo **Libera tavolo**, anche simulando il servizio su una data futura. Le note del profilo sono interne.

### C06 - Combinazioni e fila esterna

In Tavoli controlla le zone e una combinazione demo: deve elencare i tavoli fisici che si possono unire. In agenda usa il collegamento **Lista d'attesa** e scegli il servizio stampato da `demo:examples`.

Durante il servizio aggiungi un cognome TEST con 2 persone. Se esiste una soluzione, scegli tavolo/combinazione e premi **Accomoda**. Se l'alternativa cambia mentre la finestra è aperta, sceglila di nuovo.

**Atteso:** fila in ordine d'arrivo, niente telefono o email richiesti, suggerimenti compatibili e decisione manuale. Un solo accomodamento crea una prenotazione "Al tavolo". Una combinazione occupa tutti i componenti; liberarla li rende di nuovo utilizzabili.

Prima/dopo il servizio, o quando non resta tempo sufficiente, l'assenza di suggerimenti può essere corretta: segna **DA RIPETERE NEL SERVIZIO**. Questa è una fila di ospiti presenti, non una lista d'attesa online.

<!-- page -->

## 3. Menu e feedback

### C07 - Occhio diverso da esaurito

Nel pannello Menu crea una categoria TEST e un piatto bilingue, prezzo 12,50 euro, allergeni corretti e foto JPEG/PNG/WebP sotto 5 MB. Apri il menu pubblico in un'altra finestra e scorri al piatto.

Segna il piatto esaurito; tieni la pagina pubblica visibile e attendi fino a 30 secondi, verificando l'etichetta. Poi nascondilo con l'occhio, attendi il nuovo aggiornamento e verifica che sparisca. Infine ripubblicalo e rendilo disponibile.

**Atteso:** esaurito resta visibile con l'etichetta **Al momento esaurito**; nascosto sparisce. Il documento si aggiorna conservando il punto di lettura per quanto possibile; prezzo, allergeni e traduzioni restano coerenti. Non c'è un ripristino automatico il giorno dopo.

### C08 - Aspetto e lettura mobile

Annota template, colore e copertina iniziali. Prova Essenziale, Pop, Elegante e Pub. Cambia lingua e usa il collegamento Allergeni. Verifica a 375 px: niente testo tagliato, scorrimento orizzontale o foto rotte. Controlla la stessa foto dopo un reload. Ripristina le impostazioni iniziali.

**Atteso:** quattro caratteri grafici diversi, sempre scuri; stessi contenuti e prezzi. I nomi lunghi restano leggibili. Una nuova copertina può avere un ritaglio panoramico: verificane la composizione prima di salvarla per un locale reale.

### C09 - Feedback senza filtro sul voto

Apri una card demo di Santa Lucia. Prima di scegliere devono esserci Google e messaggio privato con lo stesso peso. Seleziona il privato, prova un voto basso e poi alto senza inviare: Google non deve dipendere dal voto. Invia un commento TEST e segnalo letto nello staff.

**Atteso:** feedback anonimo, nota staff interna, avviso nell'agenda aggiornato. Una card non consente un secondo invio entro dieci minuti. I Place ID demo mostrano un esito locale: non pubblicano recensioni. Al Lido Google può non essere configurato; in quel caso il solo privato è corretto.

### Ripristino

Elimina solo piatto e categoria TEST creati da te; ripristina aspetto, disponibilità e card. Non modificare esempi usati da altri tester. L'occhio e l'esaurimento non sono la cancellazione del piatto.

<!-- page -->

## 4. Controlli aggiuntivi mirati

### C10 - Tastiera e recupero errori

Apri un dettaglio con la tastiera. Tab e Shift+Tab restano nella finestra; Escape la chiude e riporta il focus al comando iniziale. Avvia una disdetta staff e prova **Annulla azione**: durante quei cinque secondi deve restare raggiungibile.

Se sai usare gli strumenti del browser, interrompi temporaneamente la rete durante una lettura disponibilità. Ripristinala e premi **Riprova**: giorno e dati compilati restano. Non simulare perdita della risposta dopo l'invio definitivo: è un caso tecnico distinto, ancora registrato fra i lavori prima della produzione.

**Atteso:** nessun campo fuori schermo o dietro la tastiera; errori nel punto in cui puoi risolverli. Un link di gestione palesemente non valido deve spiegare che non è disponibile.

### C11 - Clienti, consenso e riservatezza

Usa un ospite TEST sacrificabile. Verifica ricerca, note, visite e storico; provoca una ricerca senza risultati e torna a tutti. Esporta il CSV: non deve contenere note libere o allergie.

Prova **Anonimizza ospite** e annulla entro cinque secondi. Solo se puoi perdere quei dati, ripeti fino al completamento.

**Atteso:** anonimizzazione rimuove nome/contatti/testi liberi e invalida il vecchio link; preserva prenotazioni e conteggi. Una volta completata è irreversibile. Il consenso marketing non può essere inventato dall'operatore; se presente può essere revocato.

### C12 - Locale, notifiche e persistenza

Con sessione Lido apri lo staff Santa Lucia: deve avvisare che sei in un altro locale. Cambia accesso esplicitamente; il tuo ospite Lido non deve apparire in Santa Lucia.

In Notifiche controlla gli stati **Simulato**, **In coda**, **Esito da verificare**, se presenti: nella prova normale possono comparire solo messaggi **Simulato**, cioè senza recapito. Riavvia normalmente l'app e verifica dati e foto.

**Atteso:** separazione locali, logout effettivo, dati conservati. L'installazione PWA e la ricezione push richiedono prove su telefoni fisici e configurazione dedicata: non sono dimostrate dal ridimensionamento della finestra Mac.

<!-- page -->

## 5. Consegnare un riscontro utile

### Registro da copiare

| Caso | Locale / giorno | PASS, FAIL o NON ESEGUITO | Evidenza / cosa ti ha fermato |
| --- | --- | --- | --- |
| C01-C03 | | | |
| C04-C06 | | | |
| C07-C09 | | | |
| C10-C12 | | | |

Per ogni difetto scrivi **passi, risultato atteso, risultato visto, frequenza**. Aggiungi screenshot con dati inventati. Non condividere password reali, file `.env`, link di gestione personali o CSV con clienti veri.

**Bloccante:** prenotazione persa/duplicata, dati di un altro locale, doppia occupazione, impossibilità di confermare o disdire. **Rilevante:** un percorso non termina o richiede aiuto. **Minore:** problema di testo o aspetto senza blocco. Non marcare PASS un caso non eseguito.

### Decisione dopo il test

Il collaudo collaboratori riesce quando i casi applicabili passano, quelli non eseguiti sono dichiarati e le difficoltà d'uso sono registrate. Un referente deve riprovare le correzioni. La rapidità dello sviluppo non sostituisce questa evidenza.

### Cosa manca per un locale vero

Servono ancora ambiente EU e HTTPS, account individuali e recupero, backup di database/foto con ripristino provato, monitoraggio e allarmi, fornitori e recapito reale, privacy, collaudo su Android/iPhone e primo servizio con il ristoratore. Il retry dopo una risposta di creazione persa richiede una protezione specifica contro i duplicati.

La review migliora la demo. Non completa automaticamente M5 su telefoni o M6. Console agenzia, lista d'attesa online, blocco tavoli solo per il canale online, cambio data autonomo del cliente, piantina Pro e pagamenti restano lavori successivi.

### Riferimenti

- [Repository BigAnt](https://github.com/lol-afk23456/BigAnt): clone e consegna precedente; la nuova review va distribuita solo dopo il collaudo.
- `docs/GUIDA_TESTER.md`: installazione Mac/Linux e percorso Windows da collaudare.
- `docs/PROGRESS.md`: versione e comandi effettivamente verificati.
- `docs/REVIEW_PRODOTTO_SUPERB.md`: confronto su fonti ufficiali e priorità.
- `docs/MESSA_IN_PRODUZIONE.md`: lavori tecnici e operativi ancora aperti.

Il PDF di questa guida rimane sul Mac e viene condiviso separatamente dal codice.
