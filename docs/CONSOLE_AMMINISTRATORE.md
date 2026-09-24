# Console amministratore BigAnt

La console agenzia si trova in `/admin`. Gestisce i **clienti commerciali, cioè i locali**. Gli ospiti che prenotano restano nel pannello operativo del rispettivo locale.

## Accessi e responsabilità

| Persona | Accesso | Cosa può fare |
| --- | --- | --- |
| Amministratore BigAnt | `/admin`, account separato | Creare locali, gestire piano e configurazione, operatori, scadenze e registro amministrativo |
| Titolare del locale | `/r/<slug>/staff`, ruolo `owner` | Gestire prenotazioni, sala, menu, recensioni, ospiti e impostazioni del proprio locale |
| Operatore del locale | `/r/<slug>/staff`, ruolo `staff` | Usare le funzioni operative previste per il proprio ruolo |
| Ospite | Link pubblico del locale | Prenotare, consultare il menu, inviare feedback e gestire la disdetta tramite link |

L'account del gestore non entra nella console. Il link **Accesso gestore** apre il normale login del locale: non effettua impersonazione. La console mostra conteggi di ospiti e prenotazioni, mai nomi, recapiti o note degli ospiti.

## Primo amministratore

Applicare le migrazioni con `pnpm db:migrate`. Per la demo su questo computer:

```sh
pnpm admin:demo
```

Il comando funziona soltanto su database locale e fuori da `NODE_ENV=production`. Crea `admin@bigant.test` con password casuale, salvata nel file privato `.local/admin-access.txt`. Non stampa la password, non modifica gli account dei locali e non sovrascrive un amministratore già esistente. Il file è escluso da Git.

Per un ambiente diverso usare `pnpm admin:create`, fornendo al processo `BIGANT_ADMIN_EMAIL`, `BIGANT_ADMIN_NAME` e `BIGANT_ADMIN_PASSWORD` (12–128 caratteri) mediante il sistema di gestione dei segreti. Non aggiungere la password al repository o alla cronologia della shell. Ogni amministratore ha un account nominativo. Il comando crea account nuovi e non reimposta quelli esistenti.

Le sessioni durano al massimo otto ore. **Sicurezza account** cambia la propria password e chiude tutte le sessioni, compresa quella corrente. Il cookie è HttpOnly, Secure e SameSite Strict: fuori da localhost serve HTTPS. Le credenziali e i link non vengono salvati nel browser in localStorage.

## Inserire un nuovo cliente

1. Premere **Nuovo cliente** e inserire nome, tipo di attività, indirizzo pubblico e dati del titolare.
2. Scegliere il piano. La creazione in prova registra una scadenza di 14 giorni.
3. Copiare il link di attivazione e condividerlo personalmente con il titolare. La console non invia messaggi automaticamente.
4. Il titolare apre il link, sceglie una password ed entra nel pannello del locale.
5. Configurare orari, tavoli, contatti, menu e pagina Google con il gestore, verificando la checklist in **Riepilogo**.

Il link è utilizzabile una sola volta entro 24 ore. **Operatori → Genera link di accesso** permette di sostituirlo; un nuovo link invalida quelli precedenti ancora inutilizzati. Il link usa il frammento dell'URL, che viene tolto dalla barra quando la pagina lo acquisisce. Se la pagina viene ricaricata prima dell'attivazione, riaprire il link originale.

Il nuovo locale non ha orari né tavoli precompilati: finché non vengono configurati, non presenta disponibilità prenotabili. L'indirizzo pubblico (`slug`) è definitivo dopo la creazione.

## Attivare la conferma istantanea con assegnazione del tavolo

Aprire **Clienti → locale → Servizi**, attivare **Conferma automatica** e **Assegnazione automatica del tavolo**, quindi salvare. Nei nuovi locali entrambe sono già attive; i locali esistenti mantengono la configurazione precedente.

Il gestore deve configurare tavoli con capienza, orari, durata e ritmo degli arrivi. Le prenotazioni telefoniche vanno inserite nello stesso calendario. Il motore assegna un tavolo disponibile compatibile e lo occupa per la durata della prenotazione; il semplice totale dei posti liberi non sostituisce la disponibilità dei tavoli. I gruppi di tavoli richiedono l'assegnazione manuale già prevista dal pannello sala. Non è inclusa la sincronizzazione con gestionali esterni.

## Gestione quotidiana

- **Panoramica:** locali attivi, prove, somma dei canoni concordati, notifiche fallite o incerte, scadenze entro 30 giorni e scadenze già superate, ultimi clienti.
- **Clienti:** ricerca per nome/indirizzo pubblico, filtri per stato e piano, paginazione.
- **Anagrafica:** contatti del locale, tipo, lingua predefinita e Google Place ID.
- **Piano e scadenze:** piano, referente, canone mensile, fine prova, rinnovo e note riservate all'agenzia. Il canone è memorizzato in centesimi interi. Le scadenze sono promemoria amministrativi e non eseguono addebiti, fatture, rinnovi o sospensioni automatiche.
- **Servizi:** prenotazioni, conferma e tavoli automatici, SMS e limite mensile, promemoria, contatto privacy e conservazione dati. Gli SMS sono disponibili su Pro/Full; passando a Base/Prova vengono disabilitati. L'invio reale richiede anche la configurazione dei fornitori. La panoramica indica se gli invii sono simulati.
- **Operatori:** aggiunta, ruolo, abilitazione/disabilitazione, ultimo accesso, link per impostare la password e revoca delle sessioni. Il sistema conserva almeno un titolare attivo. Una modifica del ruolo chiude le sessioni esistenti.
- **Registro attività:** autore, data, locale e tipo di intervento, motivazione dei cambi di stato e modifiche commerciali. Le operazioni sono registrate nella stessa transazione delle modifiche; non sono modificabili dalla console.

Il consumo SMS considera i tentativi rilevanti nel mese del fuso del locale; gli esiti delle notifiche considerano le notifiche create nel mese. I canoni rappresentano accordi commerciali, non incassi. Le verifiche di configurazione sono indicatori, non una certificazione che ogni tavolo, orario o contatto sia corretto.

## Sospendere e riattivare

**Cambia stato** richiede una motivazione. Prima dell'applicazione ci sono cinque secondi per annullare. Sospeso e Cessato bloccano i servizi pubblici e l'accesso degli operatori e revocano sessioni/link ancora validi. Non cancellano prenotazioni, ospiti, menu o altri dati. Dopo la riattivazione gli operatori devono accedere nuovamente; i link invalidati vanno rigenerati.

**Revoca sessioni** chiude le sessioni e i link di attivazione dell'operatore, con la stessa finestra di annullamento. La password resta valida: per impedirne l'accesso futuro, disabilitare l'operatore.

## Collaudo rapido

Su un ambiente di prova creare un locale, attivare il titolare tramite link e controllare il rifiuto del secondo uso del link. Registrare piano/canone, attivare le opzioni di prenotazione, aggiungere un operatore e provare la protezione dell'ultimo titolare. Sospendere, verificare il blocco pubblico e staff, riattivare e controllare il registro. Ripetere da telefono e in inglese. Le prove automatiche della console usano soltanto il database `_test`; non azzerano la demo locale.
