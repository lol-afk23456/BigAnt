# Prova BigAnt Book sul Mac — 35–40 minuti

## Avvio

Doppio clic su **Avvia BigAnt.command** nella cartella del progetto. Su questo Mac il runtime locale è predisposto in `.local`, senza cambiare Node di sistema. Attendi il messaggio e apri **http://localhost:3000** in Chrome. Tieni il terminale aperto; Ctrl+C ferma le app e conserva i dati. La prima build può richiedere diversi minuti su questo Mac. Gli avvii successivi riusano la build se codice e configurazione non cambiano.

Su un altro Mac: installa Node 22 e pnpm 10, poi dalla cartella del repository esegui `pnpm install` e `pnpm local`. Il launcher crea `.env` con una chiave casuale solo se assente, avvia PostgreSQL locale, applica migrazioni e seed e compila le app. Non sovrascrive `.env` esistente.

| Locale | Accesso staff | Password |
| --- | --- | --- |
| Trattoria Santa Lucia | owner@santalucia.test | bigant2026 |
| Lido Miseno | owner@lidomiseno.test | bigant2026 |

La homepage è il selettore dei due demo. Apri il locale: il suo ingresso `/r/:slug` offre prenotazione, menu e pannello staff dedicato. Link diretti: [Santa Lucia](http://localhost:3000/r/trattoria-santa-lucia) e [Lido Miseno](http://localhost:3000/r/lido-miseno). Sono accessi dimostrativi, da non usare in produzione. Nessuna email o SMS viene spedito. Conserva il link mostrato dopo la prenotazione.

## Percorso da provare

1. **Cliente Santa Lucia, 3 minuti.** Dalla home scegli “Apri il locale” per Santa Lucia, poi “Prenota il tavolo”. Tocca il numero di persone, seleziona una data tra domani e dopodomani e un orario. I contatti appaiono solo dopo la scelta. Inserisci nome, email e telefono inventati ma formalmente validi (per esempio `prova@example.test` e `3331234567`). Apri “Aggiungi una richiesta”, accetta la presa visione della privacy (obbligatoria), lascia il marketing deselezionato, prenota e controlla la conferma immediata. Copia/apri il link di gestione.
2. **Disdetta, 1 minuto.** Dalla gestione annulla la prenotazione. Lo stato deve diventare “Prenotazione disdetta”. Per evitare il termine di disdetta, usa un appuntamento almeno due giorni nel futuro.
3. **Lido e staff, 4 minuti.** Prenota come ospite al Lido: deve apparire “Richiesta ricevuta”. Accedi al suo pannello, scegli lo stesso giorno: trova la richiesta in cima, confermala, apri il dettaglio e assegna un tavolo. Ricarica la pagina: la sessione e la sezione aperta devono restare attive. Cambia sezione e prova Indietro/Avanti del browser. Prova anche ricerca nome/telefono e vista “Orari”.
4. **Telefonata, 2 minuti.** Nel pannello crea una prenotazione manuale. Scegli uno slot libero, inserisci contatti e salva. Apri il dettaglio per correggere note o numero di persone: una modifica incompatibile deve essere rifiutata senza sovraprenotare.
5. **Impostazioni, 3 minuti.** Apri Impostazioni, modifica ritmo o termine di disdetta e salva. Inserisci una chiusura completa per oggi; apri la pagina ospiti in un'altra scheda: deve saltare al primo giorno utile. Seleziona nuovamente oggi: devono comparire le due date alternative più vicine, se esistono nella finestra prenotabile. Rimuovi la chiusura; prova “Annulla azione” entro 5 secondi.
6. **Tavoli, 2 minuti.** Aggiungi un tavolo, cambia zona/capienza e disattivalo. I tavoli disattivati restano visibili allo staff ma non sono proposti per nuove assegnazioni automatiche.
7. **Lingua e mobile, 2 minuti.** Cambia IT/EN su cliente e pannello. Riduci la finestra o usa la vista dispositivo di Chrome a 375 px: niente scorrimento orizzontale, pulsanti persone toccabili e form leggibile.
8. **Isolamento, 1 minuto.** Esci dal Lido ed entra in Santa Lucia. Le prenotazioni create al Lido non devono esserci. Apri l’ingresso staff di Santa Lucia mentre sei ancora nel Lido: compare l’avviso di sessione attiva, senza agenda. Scegli “Esci e accedi a questo locale” per cambiare account. Il parametro legacy `?locale=` non cambia una sessione già attiva.

## Dati e ripartenza

Il seed iniziale crea due locali completi con prenotazioni distribuite attorno al giorno dell'installazione. Avvii successivi conservano tutte le prove. Il menu ha nomi, descrizioni e prezzi dimostrativi IT/EN: ingredienti e allergeni vanno verificati dal titolare prima di un uso reale. I soli vecchi placeholder originali mai modificati vengono aggiornati, senza reset. Se vuoi ripartire da zero, ferma le app e usa `pnpm demo:reset --confirm`: **cancella tutti i dati dei due locali demo e li ricrea con date aggiornate**. Il comando rifiuta ambienti di produzione e database remoti. Gli altri tenant non vengono eliminati.

Non eseguire il reset mentre altri stanno provando. Per i test automatici il database separato `bigant_test` è ricreato per gli scenari browser: non usare quel database per le tue prove manuali.

## Se qualcosa non va

- Porta 3000/3001 occupata: chiudi la precedente finestra del launcher e rilancia. Non avviare due copie.
- Usa `localhost`, non l'indirizzo LAN del Mac: i cookie staff sono Secure. La prova verificata è Chrome su localhost; per condivisione in rete occorre HTTPS.
- Giorno vuoto: controlla data, persone, chiusure e limiti nelle impostazioni. I tavoli non vengono uniti automaticamente.
- Errore di rete: verifica che terminale e API siano ancora attivi, poi Riprova.
- Per segnalare un problema: locale, schermata, passi, risultato atteso e risultato visto. Evita contatti reali nelle schermate condivise.

## Risultato atteso

Il cliente può richiedere/prenotare, disdire e lasciare feedback privato; lo staff può gestire giorno, stati, tavoli, orari, chiusure, menu, card e lettura dei feedback. La homepage demo e le guide facilitano una prima prova; Notifiche simulate, privacy e PWA sono disponibili nella prova M5. Hosting, recapito reale e verifica su telefoni fisici richiedono servizi configurati.


## Menu digitale — prova M3

Nel pannello apri **Menu**. Aggiungi una categoria con nome IT/EN e un piatto con prezzo, descrizioni, allergeni e foto. Le frecce riordinano categorie e piatti; la rimozione offre cinque secondi per annullare. Una categoria va svuotata prima di eliminarla.

- **Aspetto del menu**: scegli Essenziale, Pop, Elegante o Pub; cambia colore e aggiungi una copertina. Premi Salva modifiche. Tutti gli stili restano scuri.
- **Esaurito**: il piatto resta pubblico in grigio e con etichetta.
- **Occhio**: nasconde il piatto dal menu pubblico, conservando tutti i dati. Toccalo di nuovo per ripubblicarlo. Le API cambiano al salvataggio; una pagina già aperta si aggiorna ogni 30 secondi quando visibile, oppure al ritorno sulla scheda, senza reload del documento. Scorri fino a un piatto più in basso, modifica un piatto sopra di lui e verifica che il punto di lettura venga mantenuto.
- **Apri il menu pubblico**: verifica lingua, foto, prezzi e allergeni. Prova anche a 375 px. Nessun altro locale è proposto nella pagina del menu.

Link diretti: http://localhost:3000/r/trattoria-santa-lucia/menu e http://localhost:3000/r/lido-miseno/menu.

Foto ammesse: JPEG, PNG e WebP fino a 5 MB. Il server produce tre varianti WebP. Le foto sono sul Mac in `.local/menu-images` (o `MENU_IMAGE_DIR`), **non sono incluse in GitHub**. Per trasferire i dati della demo occorre anche trasferire database e immagini.

## Recensioni e card — prova M4, 5 minuti

1. Nel pannello del locale apri **Card NFC**, crea una card con nome «Prova cassa» e apri il suo link. Vedrai Google e privato affiancati, prima di qualsiasi voto. La card demo «Cassa» è già presente.
2. Scegli **Scrivi a noi in privato**, tocca un voto da 1 a 5 e invia un messaggio inventato. Non servono nome, email o telefono. Google resta disponibile anche dopo aver scelto un voto, fino all’invio.
3. Torna al pannello: l’agenda segnala i feedback privati da leggere entro 30 secondi quando visibile o al ritorno sulla scheda. In **Recensioni** trovi il messaggio; aggiungi una nota interna e segna come letto. Il messaggio esce dal filtro «Da leggere» e resta in «Letti». La nota non viene inviata né pubblicata.
4. Ricarica il link della stessa card e prova un altro invio entro dieci minuti: deve essere bloccato con un messaggio che invita a tornare più tardi. Il limite è condiviso fra gli ospiti che usano la stessa card e fra i due canali. Per la prova simultanea usa card diverse.
5. Apri il [feedback diretto Santa Lucia](http://localhost:3000/r/trattoria-santa-lucia/feedback) senza card e scegli Google. Con il Place ID demo il clic viene registrato e compare un esito sul Mac; Google non viene aperto. Un Place ID reale richiede la verifica della scheda prima dell’attivazione. «Accessi a Google» non significa «recensioni pubblicate».
6. Disattiva una card e prova undo entro cinque secondi. Lasciando completare la disattivazione, il suo link deve risultare indisponibile. Riattivala per tornare a usarlo; lo storico rimane. Prova anche lingua EN e larghezza 375 px.

Nessuna email o push reale parte in M4. Il link copiato può essere scritto sulla card NFC o usato per creare un QR: la programmazione fisica non viene eseguita dal progetto. Le aperture della card includono i reload e non contano persone uniche.

## Notifiche e privacy — prova M5, 5 minuti

1. Crea una prenotazione manuale futura, poi apri **Notifiche**. La conferma compare **Simulato**: nessun messaggio parte. Gli esiti del provider, quando abilitato, indicano accettazione e non prova di recapito.
2. Come titolare, salva contatto privacy, anticipo promemoria e retention. SMS disponibile per piani Pro/Full; nella demo la quota e i fallback si verificano automaticamente nel database di test. Non attivare live per una prova.
3. Apri **Clienti**, cerca un ospite inventato e scarica CSV. L’export non include note o allergie. In **Dettagli ospite** modifica le note o revoca il marketing; non si può inventare un consenso positivo da telefonata.
4. Su un ospite di prova, scegli **Anonimizza ospite**: hai cinque secondi per annullare. Dopo l’esecuzione contatti e testi liberi vengono rimossi, storico e conteggi restano. Il vecchio link di disdetta viene invalidato. L’azione completata non è reversibile.
5. Da **Notifiche** prova le istruzioni di installazione. Il manifest appartiene al locale; la pagina offline è generica e non conserva nomi o prenotazioni. Push disabilitate finché non sono configurate. Android/iPhone reali richiedono la prova HTTPS descritta nella [guida notifiche/privacy](NOTIFICHE_E_PRIVACY.md).

Il launcher avvia anche il worker ogni cinque minuti. La retention opera in piccoli lotti con registro persistente. Il valore iniziale di 24 mesi è una configurazione di prodotto da validare; l’informativa è una bozza, non un testo legale approvato.
