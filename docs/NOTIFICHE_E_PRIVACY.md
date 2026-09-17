# Notifiche, PWA e privacy — guida operativa M5

Implementazione locale del 17 settembre 2026. Gli invii predefiniti sono **simulati**, con stato `simulated` e `sent_at` nullo. Nessun account di consegna è collegato. I cancelli correnti sono in [PROGRESS](PROGRESS.md); recapito reale e prove sui telefoni non sono impliciti nei test locali.

## Eventi e consegne

La creazione della prenotazione o del feedback e l’inserimento della consegna avvengono nella stessa transazione del tenant. La chiave unica distingue evento stabile, canale e destinatario: attesa e conferma sono eventi distinti. Tutti i feedback privati avvisano il titolare, indipendentemente dal voto. I payload push sono generici; i dettagli richiedono login nel pannello.

Un worker può essere avviato con `pnpm worker:watch`; il launcher `pnpm local` lo include. Esegue una scansione iniziale e ogni cinque minuti. Gli eventi immediati svegliano anche il dispatcher API dopo la risposta; la coda PostgreSQL sopravvive a interruzioni e riavvii. Non occorre Redis per questa versione. `pnpm worker:once` esegue un solo ciclo e si chiude, utilizzabile da un scheduler dell’ambiente futuro.

Il promemoria è deduplicato per prenotazione e orario di arrivo. Una modifica dell’orario crea un nuovo evento; il precedente viene scartato al controllo finale. Disdetta, anonimizzazione e abbonamenti push scaduti impediscono consegne obsolete. Il tetto SMS viene riservato sotto lock, per mese nel fuso del locale; gli esiti incerti contano prudenzialmente. Il fallback riusa l’email dello stesso evento se esiste già.

| Stato | Significato | Comportamento |
| --- | --- | --- |
| queued | Consegna da tentare | Il worker la prende alla scadenza |
| processing | Tentativo in corso | Nessun secondo worker può prenderlo |
| sent | Accettata dal servizio esterno | Non prova il recapito alla persona |
| simulated | Trasporto demo eseguito | Nessun messaggio spedito |
| failed | Rifiutata o canale non configurato | Nessun reinvio automatico |
| uncertain | Timeout, risposta incomprensibile o worker interrotto | Verifica del fornitore prima di qualunque reinvio |
| skipped | Evento obsoleto, recapito rimosso o SMS passato a email | Storico conservato |

Solo un rifiuto 429 consente un nuovo tentativo: al massimo tre, riusando l’ID di consegna. Un processing fermo da venti minuti diventa uncertain. Nessun timeout genera un reinvio cieco. La coda è limitata a cento consegne per tenant per ciclo; dimensionare il worker prima del pilot. Le righe legacy non sono inviate automaticamente.

## Collegamenti da attivare

Le variabili definitive sono in [.env.example](../.env.example). `NOTIFICATION_MODE=live` richiede origine HTTPS e `DELIVERY_EU_VERIFIED=true`: il flag è un’attestazione operativa dopo la verifica dei contratti/console, non una verifica automatica della residenza. Configurazione incompleta o filiera non verificata lascia il canale reale indisponibile.

- Email: adattatore Scaleway TEM fr-par. Dominio verificato, progetto, chiave e From; Reply-To dalle impostazioni del locale. I test usano trasporti sostitutivi, nessun recapito reale provato. [API ufficiale TEM](https://www.scaleway.com/en/developers/api/transactional-email/emails).
- SMS: classe `sms-channel.ts`, candidata Twilio IE1, con hostname regionale fisso; account e chiavi regionali, mittente e `SMS_EU_VERIFIED=true`. Sostituire il fornitore modificando soltanto questa classe. La scelta commerciale/EU è ancora aperta. [API IE1](https://www.twilio.com/docs/global-infrastructure/messaging-api-with-twilio-regions), [confine operatori/supporto](https://www.twilio.com/docs/global-infrastructure/sms-eu-data-residency).
- Push: Web Push con libreria standard, VAPID e `PUSH_EU_VERIFIED=true`. Abbonamenti appartenenti allo staff e endpoint HTTPS su host browser ammessi, senza URL arbitrari verso la rete interna. Verificare trattamento dei metadati ed eventuali cambiamenti degli endpoint browser. [Libreria Web Push](https://github.com/web-push-libs/web-push), [supporto Apple](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers).

Un messaggio già accettato o in volo non può essere richiamato con l’anonimizzazione locale. Esiti di consegna, rimbalzi e cancellazione dei dati presso fornitori/backup richiedono procedure del pilot e degli account scelti; la schermata non promette recapito certo.

## PWA

Il pannello Notifiche presenta installazione e consenso push, richiesto soltanto dopo il gesto dell’operatore. Il manifest è dedicato al locale e avvia il suo pannello. Le API e le pagine con dati ospiti non vengono messe nella Cache Storage; offline viene mostrata una pagina generica bilingue. Nessun archivio offline di prenotazioni o token.

Prima di chiudere il requisito fisico M5: HTTPS reale, Android e iPhone iOS 16.4+; aggiunta Home, login, ricezione di una nuova prenotazione e feedback privato, consenso negato, revoca e abbonamento scaduto. Una simulazione o viewport Chrome non sostituisce questa prova.

## Dati degli ospiti

Il form pubblico richiede presa visione privacy; marketing è separato e non selezionato. La prenotazione registra la lingua e il timestamp della presa visione. Un nuovo consenso marketing registra il timestamp; lo staff può revocarlo, non inventarlo. Le richieste facoltative riportano l’avviso sui dati sanitari.

La sezione Clienti permette consultazione, note interne, revoca marketing; export e anonimizzazione sono riservati al titolare. La ricerca viaggia nel corpo di `POST /customers/search`, così nomi e telefoni non entrano negli URL. `GET /customers` accetta solo cursore; la vecchia proposta `?q=` è superata dalla regola AGENTS sui dati nelle query string.

Il CSV UTF-8 con BOM include identità, recapiti, consenso e conteggi; esclude allergie e note libere, protegge celle che potrebbero essere interpretate come formule. Export e modifiche scrivono AuditLog, senza il contenuto dei recapiti nei metadati.

L’anonimizzazione applicativa mantiene righe/stati/contatori di prenotazione, rimuove nome, recapiti, allergie, note ospite/prenotazione e testo dei feedback associati, ruota i link di disdetta e cancella recapiti dai log di consegna. Feedback anonimi senza associazione a un ospite non possono essere individuati per nome; non vengono attribuiti automaticamente.

La retention è configurabile 1–120 mesi, default 24. Una scansione mensile persistente tratta in piccoli lotti i clienti creati prima del limite, senza prenotazioni recenti/future o attive; audit di sistema con attore nullo. In caso di riavvio riprende i clienti rimanenti. Lo storico dei cancellati e i conteggi restano nel locale.

L’informativa generata è una **bozza per la prova**, da completare e validare con dati, destinatari, basi giuridiche e contratti del locale prima dell’uso reale. La retention default è una scelta di prodotto, non un termine imposto dalla legge. I dati sanitari e gli obblighi di cancellazione presso destinatari/backup richiedono valutazione del titolare. [GDPR, articoli 5, 9, 13, 17](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng/).
