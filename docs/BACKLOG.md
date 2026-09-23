# Backlog

## Priorità dei prossimi blocchi

| ID | Priorità / fase | Risultato da verificare |
| --- | --- | --- |
| B01 | M3C, completato | Ingresso dedicato, sezione staff persistente, avviso sessione di altro locale e menu senza reload; cancello in PROGRESS.md |
| B02 | M4, completato | Feedback Google/privato, card e dashboard; card condivisa soggetta al limite dieci minuti, esplicitato nel pannello |
| B03 | M5, implementato | Chiave notifiche per evento/canale/destinatario, tentativi e gestione degli esiti incerti |
| B04 | M5 locale verificata, prove reali pendenti | Email/SMS/push, PWA, privacy/export/anonimizzazione; verifica su iPhone e Android fisici |
| B05 | Prima di un pilot remoto | Proxy fidati/rate limit per più clienti, budget immagini, storage persistente e prestazioni con foto reali |
| B06 | M6 | Fornitori verificati EU, account/dominio, backup ripristinato, alert e primo locale reale |
| B07 | M5S, completato | Sale tramite zone e combinazioni di tavoli configurate dal ristoratore; assegnazione semplice con controllo occupazione |
| B08 | M5S, completato | Lista d’attesa per servizio: cognome, coperti, ordine di arrivo e compatibilità con tavoli liberi |
| B09 | Dopo il pilot MVP, agenzia | Console amministrativa BigAnt: onboarding locali, piano/stato, configurazione servizi e consumi; identità amministrativa distinta, permessi e audit obbligatori |
| B13 | Dopo la prova del primo ristorante, da prioritizzare | Lista d'attesa online per date esaurite, distinta dalla fila fisica B08: richiesta del cliente, contatto e offerta di un posto quando disponibile; nessuna prenotazione implicita né sovrascrittura della fila del servizio |
| B14 | Dopo la prova del primo ristorante, da prioritizzare | Chiusure di tavolo/zona alle sole prenotazioni online, mantenendo la gestione manuale; permesso distinto da `active`, con stessi controlli di occupazione, capienza e ritmo |
| B15 | Dopo la prova del primo ristorante, da prioritizzare | Modifica autonoma di data/coperti da parte del cliente tramite collegamento sicuro; conservazione dell'appuntamento originale se il nuovo posto non è più disponibile, rivalidazione atomica e notifiche idempotenti |

Il controllo del 17 settembre è tradotto in punti P01–P12 in [MESSA_IN_PRODUZIONE](MESSA_IN_PRODUZIONE.md), con distinzione fra codice, configurazione e prove. Nessuna attivazione M6 viene dichiarata dal completamento dei dati demo/documenti M5C.

## Dettagli e vincoli

- B13–B15 nascono dalla review del 23 settembre in [REVIEW_PRODOTTO_SUPERB](REVIEW_PRODOTTO_SUPERB.md). Sono proposte da validare con il primo locale, non funzioni implementate o condizioni aggiuntive per completare questa review. B13 non sostituisce la fila fisica: prima dello sviluppo definire contatti minimi, scadenza dell'offerta e assenza di automatismi che promettano un tavolo. B14 non può aggirare i vincoli del motore. B15 è una proposta di miglioramento BigAnt: la ricerca non dimostra la sua presenza come funzione autonoma in Superb. Piantina Pro e acconti restano nelle voci di fase 2 già presenti, senza duplicati.

- Richiesta agenzia del 17 settembre: il multi-tenant esiste, la console dell’agenzia ancora no. La prima versione deve gestire attivazione/sospensione, configurazioni mancanti e consumi senza concedere accesso implicito ai dati degli ospiti. Eventuali interventi nei locali richiedono autorizzazione, scope esplicito e audit. Il lavoro M5/sala continua; nessuna console amministrativa anticipata in questo blocco.

- M1 completata: motore, concorrenza, stati, telefono E.164 e API.
- M2 completata: interfaccia e cancello finale verdi. Email e telefono obbligatori in input; colonne nullable per anonimizzazione M5.
- M3 completata: menu, quattro template e visibilità separata dall’esaurimento, approvati dall’utente. M4 completata; M5 locale con cancello automatico verde, M5S completata e M6 da attivare.
- M5: notifiche reali, privacy, cancellazione/retention e consenso; dati sanitari esclusi dagli export non necessari.
- B03 implementato: nuova migrazione M5, evento/canale/destinatario unici, esiti incerti senza reinvio cieco e tentativi solo dopo rifiuto certo. Il cancello locale è in PROGRESS; attivazione fornitori e recapito reale restano B04/B06.
- M6: store condiviso per rate limit se si avviano più repliche API; proxy fidati e TLS; infrastruttura e log esclusivamente EU. In M0 una sola istanza, rate limit in memoria.
- M6: credenziali DB con privilegi minimi e verifica residenza EU; nessun servizio remoto è provisionato da M0.
- Fase 2 esclusa: fidelity, pagamenti/acconti, sincronizzazione canali, voce, multi-sede, turni, agenti AI e cassa.
- Estensione richiesta dall’utente il 17 settembre: gestione sala e lista d’attesa semplice dopo M4. La successiva precisazione chiede di evitare duplicazioni o peggioramenti: analisi in [SALA_E_ATTESA.md](SALA_E_ATTESA.md), nessun codice sala/prenotazioni cambiato in M4. La lista riguarda i servizi del locale, non i turni del personale. Il successivo «finisci tutto» consente di procedere con FIFO, compatibilità evidenziata e assegnazione manuale; M5S conclusa dopo il cancello automatico locale M5; dettagli e verifiche in PROGRESS. Piantina a blocchi disegnabile rinviata alle funzioni Pro future.

- M5–M6: la scelta Resend della SPEC va rivista per il vincolo EU: i metadati/log restano USA anche scegliendo Irlanda. Verificare anche metadati Sentry, filiera SMS, CDN/log e backup; dettagli in SERVIZI_ESTERNI.md.
- M6: onboarding di tenant reali e scelta locale al login oltre i due demo; recovery password e processo di gestione account da definire. Attualmente il pannello di prova propone i soli due tenant seed.
- M6: dimensionare query disponibilità sullo storico reale e infrastruttura in base ai volumi prima del lancio; ora i dati attivi del tenant vengono letti per rivalidare sotto lock.

- M6: immagini menu locali da trasferire a storage persistente EU; includere foto nei backup, pulizia file orfani e controllo limite disco. Aggiornamento pubblico periodico: dimensionare rate limit/proxy per richieste SSR aggregate prima del deploy.

- B05, evidenza del 17 settembre durante la consegna GitHub: il benchmark della copertina attualmente caricata sul Mac ha dato 82/100 e LCP 3626 ms sul profilo 750/250 Kbps, 150 ms, CPU 4×. Il download della variante 960 WebP da circa 120 KB assorbe 3138 ms. Il precedente 91/100 su immagini sintetiche non prova questo caso. Definire un budget per le copertine/foto e verificare qualità, varianti e download con foto realistiche; non rimuovere o alterare le foto dell'operatore per far passare il test. Anche il primo benchmark del runner Linux è fallito: dettagli/report nel blocco consegna di PROGRESS.

- M3C: script di aggiornamento menu servito come asset esterno. M6: verificare la CSP del deploy e prestazioni/cache su immagini reali e infrastruttura remota.

- B05, aggiornamento M5R del 23 settembre: documento menu senza runtime React, derivate 320/640/768/960 e limiti media separati. Benchmark sul Mac con la stessa copertina originale conservata: 100/100, LCP 1304 ms, TBT/CLS 0; E2E sintetico 100/100, LCP 762 ms, soglie invariate. Il problema misurato localmente è risolto; restano misure remote, storage/backup, quote e proxy prima del pilot. Review non pubblicata e CI Linux non rieseguita.

- B16 · Prima del pilot: idempotenza della creazione prenotazione per risposta persa dopo commit. Il lock evita overbooking ma non riconosce due tentativi della stessa richiesta; richiede chiave stabile tenant/form, verifica del payload, replay sicuro della ricevuta e test della risposta persa. Niente retry automatico cieco nel frattempo.
- B17 · UX successiva: form pubblico aperto oltre due ore. Il token anti-bot scade e oggi restituisce INVALID_INPUT: rinnovare il token preservando il draft e distinguere la scadenza dagli altri errori.
- B18 · UX successiva: conservare la lingua fra ingressi, prenotazione e menu SSR con una preferenza non sensibile e coerente con URL/accessibilità; oggi il selettore va ripetuto cambiando pagina.
