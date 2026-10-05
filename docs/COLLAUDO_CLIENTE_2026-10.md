# BigAnt Book
## Guida al collaudo del cliente

**Demo locale da repository - 5 ottobre 2026**

BigAnt aiuta un locale a gestire prenotazioni, tavoli, lista d'attesa, menu digitale e feedback degli ospiti. Questa guida accompagna l'installazione di una copia di prova sul proprio computer e una sessione di collaudo di circa **45 minuti**, installazione esclusa. Le prove avanzate di tavoli e console richiedono altri 15-20 minuti.

### Quale pannello stai usando?

| Ruolo | Cosa fa | Accesso |
| --- | --- | --- |
| Ospite del locale | Prenota, consulta il menu, lascia feedback. Non si registra. | Pagine pubbliche del locale |
| Titolare / staff | Gestisce agenda, sala, menu e segnalazioni. Il titolare configura il locale. | Pannello del locale |
| Amministratore BigAnt | Gestisce locali clienti, operatori, servizi e condizioni commerciali. | Console separata /admin |

Il percorso principale di questa guida riguarda **ospite e titolare**. La console è una prova facoltativa sulla propria copia demo, descritta a pagina 7.

### Obiettivo della prova

Verificare che una prenotazione arrivi correttamente in agenda, che i tavoli non vengano assegnati due volte nello stesso intervallo, che il menu rispecchi le modifiche e che il titolare riesca a lavorare senza assistenza continua.

**È una demo funzionale locale.** Email, SMS e push non vengono recapitati. La prova non rappresenta un'attivazione del servizio per un ristorante reale.

Repository da clonare: [github.com/lol-afk23456/BigAnt](https://github.com/lol-afk23456/BigAnt).

Ogni clone ha dati autonomi. Le prenotazioni inserite qui non compaiono sul computer di BigAnt o di un altro tester. Database, foto caricate e password generate restano nella propria copia locale.

<!-- page -->

## 1. Installare e avviare

Il percorso verificato è **macOS Intel con Chrome**. Mac Apple Silicon è predisposto ma non provato su hardware dedicato in questo collaudo. La CI verifica l'applicazione su Linux; l'avvio locale Linux/WSL richiede una verifica separata. Windows nativo non è un percorso collaudato: concordare l'ambiente prima di iniziare.

### Prima installazione

Servono connessione internet, Git, **Node 22.23.2**, **pnpm 10.32.1** e Chrome. Installare la versione Node indicata; non sostituirla con una versione maggiore. Con nvm, dopo il clone usare `nvm install` e `nvm use` nella cartella BigAnt.

Aprire il terminale nella cartella in cui si vuole conservare il progetto:

```sh
git clone https://github.com/lol-afk23456/BigAnt.git
cd BigAnt
node --version
npm install --global pnpm@10.32.1
pnpm --version
pnpm install --frozen-lockfile
pnpm local
```

Il controllo Node deve indicare `v22.23.2`; quello pnpm `10.32.1`. Se GitHub richiede l'accesso, usare il proprio account autorizzato al repository. Non inserire password o token nei comandi da condividere.

Il primo avvio prepara database, struttura dati, due locali dimostrativi e applicazione. Può richiedere alcuni minuti. Non occorre installare PostgreSQL o Docker, copiare file dal computer di BigAnt o configurare servizi email/SMS.

**Attendere il messaggio di avvio e aprire [http://localhost:3000](http://localhost:3000) in Chrome.** Lasciare aperto il terminale. Se la pagina non risponde subito, attendere che web e API siano pronti.

### Fermare, riprendere e aggiornare

Per fermare: `Ctrl+C` nel terminale. Per riprendere: tornare nella cartella BigAnt, selezionare Node 22 e lanciare `pnpm local`. Le prove vengono conservate.

Per aggiornare, ad app ferme: `git pull --ff-only`, `pnpm install --frozen-lockfile`, `pnpm local`. In caso di modifiche locali o conflitti chiedere assistenza, senza reset forzati. Non cancellare `.local` e non usare comandi di reset durante il collaudo.

<!-- page -->

## 2. Accessi e preparazione

Aprire una finestra Chrome normale per il titolare e una **in incognito** per simulare l'ospite. Gli indirizzi seguenti funzionano sul computer in cui è in esecuzione BigAnt; non sono link da aprire da un altro computer o dal telefono.

### Due locali già pronti

**Trattoria Santa Lucia**

- Pannello: [localhost:3000/r/trattoria-santa-lucia/staff](http://localhost:3000/r/trattoria-santa-lucia/staff)
- Ospite: [localhost:3000/r/trattoria-santa-lucia](http://localhost:3000/r/trattoria-santa-lucia)
- Email: `owner@santalucia.test` - Password demo: `bigant2026`
- Su un clone nuovo: conferma automatica attiva, turno di 90 minuti.

**Lido Miseno**

- Pannello: [localhost:3000/r/lido-miseno/staff](http://localhost:3000/r/lido-miseno/staff)
- Ospite: [localhost:3000/r/lido-miseno](http://localhost:3000/r/lido-miseno)
- Email: `owner@lidomiseno.test` - Password demo: `bigant2026`
- Su un clone nuovo: conferma manuale, turno di 120 minuti.

Queste credenziali appartengono esclusivamente ai dati inventati della demo. Per passare da un locale all'altro uscire dalla sessione precedente o seguire l'avviso di cambio locale.

### Prima prenotazione

1. Scegliere un giorno futuro disponibile, preferibilmente almeno dopodomani. Annotare locale, giorno e servizio; selezionare lo stesso giorno anche nell'agenda staff.
2. Usare nomi inventati con un prefisso riconoscibile, per esempio `TEST-Luca`, email `test.luca@example.test` e un telefono di prova formalmente valido. Usare un contatto distinto per ogni ospite distinto.
3. In **Impostazioni**, verificare le due opzioni separate: **Conferma automatica** determina lo stato iniziale; **Assegna automaticamente il tavolo** controlla e occupa un tavolo compatibile.
4. Nei due locali creati dal seed l'assegnazione automatica è inizialmente disattivata. Per provare l'assegnazione fisica, attivarla e salvare prima delle nuove prenotazioni. Non assegna retroattivamente i tavoli alle vecchie prenotazioni.

Ogni telefonata va inserita nel pannello BigAnt. Non è presente una sincronizzazione con un altro gestionale: una prenotazione annotata altrove non blocca automaticamente la disponibilità qui.

<!-- page -->

## 3. Prenotazioni e agenda

### T01 - Prenotazione con conferma immediata

Come ospite di Santa Lucia scegliere 2 persone, il giorno preparato e una fascia disponibile. Provare prima a lasciare un contatto obbligatorio vuoto; poi compilare nome, email e telefono, leggere l'informativa e accettarne la presa visione. Lasciare facoltativo e deselezionato il marketing. Inviare una volta e conservare il link di gestione.

**Atteso:** i contatti obbligatori vengono controllati. Con conferma automatica attiva compare subito la prenotazione confermata. Nell'agenda del giorno corretto compare una sola riga con gli stessi dati; con assegnazione attiva è indicato un tavolo compatibile.

### T02 - Richiesta da confermare

Ripetere su Lido Miseno, mantenendo la conferma manuale. Entrare come titolare, scegliere il giorno e usare **Aggiorna agenda**. Aprire la richiesta e premere **Conferma**. Sul link ospite scegliere **Aggiorna lo stato**.

**Atteso:** prima la richiesta è **Da confermare**, poi **Confermata**. La schermata iniziale non promette una conferma già avvenuta. Anche una richiesta in attesa concorre all'occupazione disponibile.

### T03 - Telefonata e gestione della visita

Nel pannello usare **Nuova prenotazione** con un nuovo ospite TEST. Scegliere giorno, coperti e fascia libera; verificare il tavolo, aggiungere una nota interna e salvarla. Per la visita di prova usare i passaggi disponibili **Conferma**, **Accomoda** e **Libera tavolo**.

**Atteso:** origine **Telefono**, nota conservata e stato coerente. Un'assegnazione incompatibile con capienza o occupazione viene rifiutata. Completare una visita libera i tavoli associati; non usare questo comando su prenotazioni che devono ancora occupare la sala.

### T04 - Disdetta e annullamento dell'azione

Aprire il link di gestione di T01 e scegliere **Disdici la prenotazione**. Provare **Annulla azione** entro cinque secondi. Ripetere e lasciare completare l'operazione.

**Atteso:** il primo tentativo viene annullato, il secondo porta allo stato **Disdetta**, anche nell'agenda. La disdetta online è disponibile entro il termine indicato: usare una prenotazione futura. Il link di gestione è riservato; non allegarlo alle segnalazioni.

<!-- page -->

## 4. Tavoli e lista d'attesa

### T05 - Caso controllato: un tavolo da 2 e due da 4

Prova avanzata sul locale vuoto **TEST Sala**, creato con la procedura di pagina 7. Impostare 10 coperti totali, massimo 10 arrivi per fascia, turno 90 minuti, cena 19:00-23:30 nel giorno scelto. Nessuna chiusura in quella data. Attivare entrambe le opzioni automatiche e creare tre tavoli attivi: **T2** (minimo 1, massimo 2), **T4-A** e **T4-B** (minimo 1, massimo 4).

Scegliere un giorno futuro e creare, una alla volta, tre prenotazioni delle **21:00** con contatti distinti:

| Prenotazione | Risultato atteso |
| --- | --- |
| 2 persone | Occupa T2; gli altri due tavoli restano liberi. |
| 3 persone | Occupa uno dei tavoli da 4; resta un tavolo da 4 libero. |
| 4 persone | Occupa l'altro tavolo da 4. Tutti i tavoli sono occupati. |
| Nuova richiesta da 1 persona | Le 21:00 non sono più prenotabili, anche se 9 ospiti su 10 coperti lasciano una sedia nominale libera. |

La sedia vuota al tavolo della comitiva da 3 non è un tavolo separato. L'occupazione dura per il turno e riguarda anche fasce sovrapposte, non solo l'identica ora di inizio. Dopo una disdetta, le fasce compatibili tornano disponibili se tutti gli altri limiti lo consentono.

### T06 - Combinazione e lista d'attesa

In **Tavoli > Combinazioni consentite**, creare una combinazione con almeno due tavoli fisici. Assegnarla manualmente a una prenotazione compatibile: tutti i componenti devono risultare occupati e non riutilizzabili per una visita sovrapposta. Il percorso pubblico non unisce automaticamente più tavoli.

Nell'agenda aprire **Lista d'attesa**, scegliere giorno/servizio e inserire due cognomi TEST con coperti. Durante il servizio usare **Aggiorna alternative**, scegliere tavolo e orario, quindi **Accomoda**.

**Atteso:** ordine d'arrivo conservato, nessun recapito obbligatorio; l'attesa da sola non occupa tavoli. Accomodare crea una prenotazione **Al tavolo**. L'operatore decide a chi assegnare il posto; non partono messaggi automatici alla fila.

Se il servizio non è in corso o non resta un turno completo, segnare questa parte **NON ESEGUITA** e ripeterla nel servizio adatto, senza modificare l'orologio del computer.

<!-- page -->

## 5. Menu, feedback e notifiche

### T07 - Menu digitale in italiano e inglese

Nel pannello **Menu** creare una categoria e un piatto TEST, con nome e descrizione IT/EN, prezzo **12,50 euro** e allergeni di prova. Foto facoltativa: JPEG, PNG o WebP sotto 5 MB. Aprire il menu dalla pagina ospite e cambiare IT/EN. Provare anche un diverso tema in **Aspetto del menu**.

Segnare il piatto esaurito, verificarlo dal pubblico, poi nasconderlo con il comando occhio. Ripristinare le impostazioni iniziali alla fine.

**Atteso:** prezzo, traduzioni e allergeni corretti. Un piatto esaurito resta visibile con l'indicazione **Al momento esaurito**; un piatto nascosto scompare. Una pagina già aperta e visibile si aggiorna entro circa 30 secondi. L'esaurimento non si azzera automaticamente il giorno successivo.

### T08 - Feedback privato e card

Aprire la pagina feedback o un link card del locale di prova. Prima di scegliere un voto, verificare le opzioni Google e privato. Scegliere il privato, inviare un voto e un commento TEST. Nel pannello **Recensioni** trovare il messaggio, aggiungere una nota interna e segnarlo letto.

**Atteso:** le due opzioni hanno pari evidenza; se il locale non ha Google configurato viene offerto solo il privato. La nota interna non è pubblica. Una stessa card non consente un nuovo invio entro 10 minuti: usare card distinte per tester diversi.

Nei due locali demo, Google usa una destinazione dimostrativa: il clic viene registrato e mostra un esito locale. Non pubblicare recensioni su attività reali per eseguire il test. Il collegamento di una card è collaudabile dal browser; scrittura della tessera NFC e lettura fisica sono prove separate.

### T09 - Registro notifiche e aggiornamenti

Aprire **Notifiche** e cercare gli eventi generati dalle prove. Se sono ancora **In coda**, lasciare attivo il launcher e attendere il ciclo del worker, circa cinque minuti.

**Atteso:** le consegne simulate lavorate risultano **Simulato**. Nessuna email o SMS deve arrivare sul telefono o nella casella di posta. Agenda e feedback si aggiornano periodicamente; usare i pulsanti di aggiornamento per un controllo immediato.

Annotare per tutte le prove: comprensibilità dei messaggi, testi tagliati, difficoltà di navigazione e passaggi inutili. Ridurre la finestra aiuta a valutare la disposizione mobile, ma non verifica installazione e push su un telefono reale.

<!-- page -->

## 6. Console amministratore - facoltativa

Questa prova riguarda chi gestisce i locali clienti per BigAnt. L'account titolare non entra nella console. Su un clone autonomo è possibile creare un amministratore demo senza ricevere password dal team.

### Preparare l'accesso

Lasciare `pnpm local` attivo. In un **secondo terminale**, entrare nella stessa cartella BigAnt, selezionare Node 22 ed eseguire:

```sh
pnpm admin:demo
```

Aprire localmente il file **.local/admin-access.txt**, che contiene email e password generate per questa copia. Accedere a [http://localhost:3000/admin](http://localhost:3000/admin). Non condividere il file. Ripetere il comando non cambia la password di un amministratore già presente.

### T10 - Creare e preparare TEST Sala

1. Nella console aprire la gestione dei locali e creare **TEST Sala**, con slug `test-sala` e titolare fittizio `owner@testsala.test`. Annotare il link di attivazione restituito.
2. Aprire il link in una finestra separata e scegliere la password del titolare. Il link si usa una volta e scade dopo 24 ore; può essere rigenerato dalla console.
3. Entrare nel pannello di TEST Sala dal collegamento del locale. Impostare orari, coperti e tavoli prima di prenotare; un locale appena creato non è già prenotabile.
4. Eseguire il caso T05 usando l'ingresso ospiti `http://localhost:3000/r/test-sala`.

**Atteso:** locale e titolare vengono creati insieme; l'attivazione permette l'accesso solo a quel locale. I dati dei due demo precedenti restano presenti. La console mostra dati commerciali e consumi aggregati, non il contenuto delle prenotazioni o dei feedback degli ospiti.

### T11 - Servizi, stato e audit

Su TEST Sala provare piano, canone, scadenze e configurazione servizi. Sospendere il locale con una motivazione e lasciare completare l'azione; verificare il blocco dell'accesso del titolare. Riattivare il locale, rifare l'accesso e controllare l'audit.

**Atteso:** modifiche registrate e stato coerente. La riattivazione non ripristina vecchie sessioni revocate. Canoni e scadenze sono annotazioni commerciali: non producono addebiti, fatture o rinnovi automatici. Non sospendere i locali usati da un'altra persona durante la prova.

<!-- page -->

## 7. Se qualcosa non funziona

| Situazione | Cosa controllare |
| --- | --- |
| localhost non risponde | Il terminale di pnpm local deve restare aperto. Attendere fine avvio e leggere l'ultimo errore. |
| Porta occupata | Le porte 3000, 3001 e 55432 non devono appartenere a un'altra copia o a un altro servizio. Identificare il processo prima di chiuderlo. |
| Login non riuscito | Usare localhost in Chrome, locale corretto e credenziali demo. Dopo troppi tentativi falliti attendere il limite indicato. |
| Nessun orario libero | Verificare giorno, servizio, chiusure, anticipo, turno, capienza, arrivi per fascia e tavoli compatibili. Non è necessariamente un errore. |
| Form lasciato aperto a lungo | Dopo oltre due ore il token può scadere. Annotare le scelte, ricaricare la pagina e riprovare. È un limite noto. |
| Invio con errore di rete | Prima di inviare di nuovo verificare l'agenda: la prenotazione potrebbe essere già stata salvata. Il recupero senza duplicati dopo risposta persa è ancora da completare. |
| Modifica non visibile | Selezionare stesso locale/giorno, usare Aggiorna oppure attendere circa 30 secondi nella scheda visibile. |
| Nessuna email/SMS | È il comportamento atteso della modalità demo. Controllare il registro Notifiche. |

### Confini di questo collaudo

Si possono valutare flussi, regole di sala e usabilità. Restano da completare prima dell'uso reale: ambiente ospitato con HTTPS, fornitori e recapito messaggi, backup e prova di ripristino, monitoraggio, configurazione definitiva degli accessi e testi del locale. Installazione PWA e push su Android/iPhone richiedono una prova dedicata.

Non sono presenti sincronizzazione con gestionali esterni, pagamenti o assegnazione automatica di combinazioni di tavoli. Non interpretarli come comandi mancanti nel pannello.

### Preparare una segnalazione utile

Indicare codice della prova, locale, giorno/ora, passaggi, risultato atteso e osservato. Aggiungere sistema operativo, versione browser e versione del progetto, ottenibile con `git rev-parse --short HEAD`. Uno screenshot con dati inventati aiuta.

Non allegare `.env`, password, l'intera cartella `.local`, link riservati di gestione o dati di persone reali. Non ripristinare il database per nascondere un problema: conservare il caso e descriverlo.

<!-- page -->

## 8. Scheda risultati da restituire

Tester: ____________________________________  Data: _______________

Sistema / browser: _______________________________________________

Versione progetto: ____________________  Locale: _____________________

Segnare **OK**, **PROBLEMA** o **NON ESEGUITO**. Una prova non eseguita non equivale a una prova superata.

| Caso | Prova | Esito / nota breve |
| --- | --- | --- |
| Avvio | Clone, installazione e accesso | |
| T01 | Prenotazione automatica | |
| T02 | Conferma manuale | |
| T03 | Telefonata e visita | |
| T04 | Disdetta e annullamento | |
| T05 | Tavoli 2 / 4 / 4, facoltativa | |
| T06 | Combinazioni e attesa | |
| T07 | Menu IT/EN, esaurito e nascosto | |
| T08 | Feedback e card | |
| T09 | Notifiche simulate | |
| T10 | Onboarding locale, facoltativa | |
| T11 | Stato e audit, facoltativa | |

### Per ogni problema

Caso e passaggi: __________________________________________________

__________________________________________________________________

Risultato atteso / osservato: _________________________________________

__________________________________________________________________

Impatto: blocca la prova / rallenta il lavoro / solo presentazione.

### Tre domande finali

1. Dove hai esitato o avuto bisogno di aiuto?
2. Quale attività richiede troppi passaggi?
3. Riusciresti a usare il pannello durante un servizio? Cosa manca?

Al termine ripristinare menu e impostazioni modificate e annotare le prenotazioni TEST lasciate in agenda. Inviare questa scheda e le segnalazioni al referente BigAnt attraverso il canale già concordato.
