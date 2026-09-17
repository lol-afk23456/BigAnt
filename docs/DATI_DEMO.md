# Dati per capire e provare BigAnt Book

Aggiornamento: 17 settembre 2026. Tutte le identità, le richieste e i messaggi sono inventati. Non telefonare ai numeri demo: un numero formalmente valido può appartenere a qualcuno. Le notifiche restano simulate.

## Cosa trovi nell’app

| Locale | Differenza da osservare | Accesso staff |
| --- | --- | --- |
| [Trattoria Santa Lucia](http://localhost:3000/r/trattoria-santa-lucia/staff?view=reservations) | 40 posti; turno 90 minuti; ritmo 12; conferma automatica | `owner@santalucia.test` / `bigant2026` |
| [Lido Miseno](http://localhost:3000/r/lido-miseno/staff?view=reservations) | 120 posti; turno 120 minuti; ritmo 25; conferma manuale | `owner@lidomiseno.test` / `bigant2026` |

Nell’agenda cerca **DEMO**. Apri il dettaglio: note e note interne spiegano cosa provare. Gli esempi vengono aggiunti alla prima fascia valida da oggi, preferendo la cena, entro i prossimi otto giorni. Se oggi non ha spazio, controlla domani e i giorni successivi. Il comando di preparazione stampa giorno e ora effettivi: non forza orari, chiusure, capienza, ritmo o tavoli occupati.

| Nome nell’agenda | Persone | Cosa provare |
| --- | --- | --- |
| **DEMO · Giulia Rossi** | 2 | Coppia: al Lido confermare; poi portare al tavolo e completare |
| **DEMO · Famiglia Bianchi** | 4 | Note per il seggiolone, modifica e assegnazione di un tavolo compatibile |
| **DEMO · Gruppo Esposito** | 6 | Assegnazione manuale della combinazione; occupazione di entrambi i tavoli |

Gli esempi prenotazione sono futuri: inizialmente confermati a Santa Lucia e da confermare al Lido, secondo le impostazioni attuali. Non dichiariamo ospiti già arrivati prima del servizio. Le prove precedenti mantengono i loro stati. La combinazione Santa Lucia usa Tavolo 5 + Tavolo 6; il Lido Tavolo 29 + Tavolo 30, con capienza effettiva di sei. È una disposizione inventata per il test, da non copiare nella sala di un cliente senza verificarla.

**Serie già inserita il 17 settembre 2026:** tutti e tre i casi, in entrambi i locali, sono nell’agenda del **17 settembre alle 19:00**. Coppia e famiglia sono da assegnare al tavolo, come consentito dalle impostazioni attuali; il gruppo ha già la combinazione. L’attesa Santa Lucia è nel servizio **Cena, 19:00–23:30**; quella Lido nel **Servizio continuato, 11:00–23:00**. Per una prova in un’altra data aggiorna gli esempi con il comando sotto.

Se la lista Santa Lucia sembra vuota, nel campo **Servizio** scegli **Cena**: gli esempi non sono nella lista del pranzo.

In **Apri lista d’attesa**, seleziona il servizio indicato dal comando: **DEMO Costa (2)**, **DEMO Conti (4)**, **DEMO Gallo (6)**, in quest’ordine. Sono ingressi dimostrativi preparati per oggi oppure domani, senza recapiti. Prima dell’apertura non vengono proposti tavoli; durante il servizio compaiono le alternative compatibili. Se rimane meno tempo di un turno completo, usa un altro servizio. Non vengono accomodati automaticamente.

In **Clienti** i placeholder originali diventano nomi leggibili, per esempio Giulia Rossi e Marco Rossi. I tre casi guidati hanno il prefisso DEMO e recapiti `.test` distinti per locale. In **Recensioni** trovi esempi come attesa lunga, tavolo vicino al passaggio, menu/allergeni utili e accoglienza positiva: i messaggi permettono di capire cosa leggere e annotare. Le note già scritte dal ristoratore restano conservate.

Il menu contiene già piatti IT/EN, prezzi, allergeni ed esempi di esaurito. Per distinguere occhio/esaurito e provare immagini/template, segui il protocollo. Non aggiungiamo copie di categorie o piatti a ogni avvio. Ingredienti e allergeni sono dimostrativi, da validare prima dell’uso reale.

## Come aggiornare gli esempi senza azzerare le prove

Con database locale attivo, dalla cartella del progetto:

```sh
pnpm seed
pnpm demo:examples
```

Su questo Mac il terminale avviato dal launcher ha il runtime predisposto. In un terminale nuovo, se `pnpm` non è riconosciuto:

```sh
export PATH="$PWD/.local/runtime/bin:$PWD/.local/tooling/node_modules/.bin:$PATH"
```

`seed` aggiorna esclusivamente i placeholder con firma originale e mai modificati. Non cambia i contatti, gli ID o le prenotazioni esistenti. `demo:examples` aggiunge una serie per locale e giorno, protetta dallo stesso lock delle prenotazioni. Ripeterlo nello stesso giorno non ripristina le modifiche dell’operatore e non duplica i casi. Il giorno successivo aggiunge nuovi casi: la cronologia precedente resta. Se una combinazione demo è stata disattivata, resta disattivata.

Il comando rifiuta database remoti, produzione e notifiche live. Se le tue impostazioni impediscono un caso, stampa il motivo e le conserva. Può riusare i recapiti dei casi guidati, conservando nomi e note modificati. Non confondere questo aggiornamento con `demo:reset --confirm`, che elimina le prove dei due demo.

I dati del seed iniziale restano uno storico di stati misti creato attorno al giorno dell’installazione: non è una simulazione in tempo reale del servizio. Per valutare il comportamento attuale usa i casi DEMO guidati e le nuove prenotazioni del [protocollo](PROTOCOLLO_TEST.md).
