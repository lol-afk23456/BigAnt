# Prova BigAnt Book sul Mac — 15–20 minuti

## Avvio

Doppio clic su **Avvia BigAnt.command** nella cartella del progetto. Su questo Mac il runtime locale è predisposto in `.local`, senza cambiare Node di sistema. Attendi il messaggio e apri **http://localhost:3000** in Chrome. Tieni il terminale aperto; Ctrl+C ferma le app e conserva i dati. La prima build può richiedere diversi minuti su questo Mac. Gli avvii successivi riusano la build se codice e configurazione non cambiano.

Su un altro Mac: installa Node 22 e pnpm 10, poi dalla cartella del repository esegui `pnpm install` e `pnpm local`. Il launcher crea `.env` con una chiave casuale solo se assente, avvia PostgreSQL locale, applica migrazioni e seed e compila le app. Non sovrascrive `.env` esistente.

| Locale | Accesso staff | Password |
| --- | --- | --- |
| Trattoria Santa Lucia | owner@santalucia.test | bigant2026 |
| Lido Miseno | owner@lidomiseno.test | bigant2026 |

La homepage offre entrambi i percorsi. Sono accessi dimostrativi, da non usare in produzione. Nessuna email o SMS viene spedito. Conserva il link mostrato dopo la prenotazione.

## Percorso da provare

1. **Cliente Santa Lucia, 3 minuti.** Dalla home scegli “Prenota come ospite”. Tocca il numero di persone, seleziona una data tra domani e dopodomani e un orario. I contatti appaiono solo dopo la scelta. Inserisci nome, email e telefono inventati ma formalmente validi (per esempio `prova@example.test` e `3331234567`). Apri “Aggiungi una richiesta”, prenota e controlla la conferma immediata. Copia/apri il link di gestione.
2. **Disdetta, 1 minuto.** Dalla gestione annulla la prenotazione. Lo stato deve diventare “Prenotazione disdetta”. Per evitare il termine di disdetta, usa un appuntamento almeno due giorni nel futuro.
3. **Lido e staff, 4 minuti.** Prenota come ospite al Lido: deve apparire “Richiesta ricevuta”. Accedi al suo pannello, scegli lo stesso giorno: trova la richiesta in cima, confermala, apri il dettaglio e assegna un tavolo. Ricarica la pagina: la sessione deve restare attiva. Prova anche ricerca nome/telefono e vista “Orari”.
4. **Telefonata, 2 minuti.** Nel pannello crea una prenotazione manuale. Scegli uno slot libero, inserisci contatti e salva. Apri il dettaglio per correggere note o numero di persone: una modifica incompatibile deve essere rifiutata senza sovraprenotare.
5. **Impostazioni, 3 minuti.** Apri Impostazioni, modifica ritmo o termine di disdetta e salva. Inserisci una chiusura completa per oggi; apri la pagina ospiti in un'altra scheda: deve saltare al primo giorno utile. Seleziona nuovamente oggi: devono comparire le due date alternative più vicine, se esistono nella finestra prenotabile. Rimuovi la chiusura; prova “Annulla azione” entro 5 secondi.
6. **Tavoli, 2 minuti.** Aggiungi un tavolo, cambia zona/capienza e disattivalo. I tavoli disattivati restano visibili allo staff ma non sono proposti per nuove assegnazioni automatiche.
7. **Lingua e mobile, 2 minuti.** Cambia IT/EN su cliente e pannello. Riduci la finestra o usa la vista dispositivo di Chrome a 375 px: niente scorrimento orizzontale, pulsanti persone toccabili e form leggibile.
8. **Isolamento, 1 minuto.** Esci dal Lido ed entra in Santa Lucia. Le prenotazioni create al Lido non devono esserci. Usa logout prima di cambiare locale: aprire un link con `?locale=` non sostituisce una sessione già attiva.

## Dati e ripartenza

Il seed iniziale crea due locali completi con prenotazioni distribuite attorno al giorno dell'installazione. Avvii successivi conservano tutte le prove. Se vuoi ripartire da zero, ferma le app e usa `pnpm demo:reset --confirm`: **cancella tutti i dati dei due locali demo e li ricrea con date aggiornate**. Il comando rifiuta ambienti di produzione e database remoti. Gli altri tenant non vengono eliminati.

Non eseguire il reset mentre altri stanno provando. Per i test automatici il database separato `bigant_test` è ricreato per gli scenari browser: non usare quel database per le tue prove manuali.

## Se qualcosa non va

- Porta 3000/3001 occupata: chiudi la precedente finestra del launcher e rilancia. Non avviare due copie.
- Usa `localhost`, non l'indirizzo LAN del Mac: i cookie staff sono Secure. La prova verificata è Chrome su localhost; per condivisione in rete occorre HTTPS.
- Giorno vuoto: controlla data, persone, chiusure e limiti nelle impostazioni. I tavoli non vengono uniti automaticamente.
- Errore di rete: verifica che terminale e API siano ancora attivi, poi Riprova.
- Per segnalare un problema: locale, schermata, passi, risultato atteso e risultato visto. Evita contatti reali nelle schermate condivise.

## Risultato atteso

Il cliente può richiedere/prenotare e disdire; lo staff può gestire giorno, stati, tavoli, orari e chiusure. La homepage demo e le guide facilitano una prima prova; hosting, notifiche reali, privacy/retention completa, PWA, menu e recensioni appartengono alle missioni successive.
