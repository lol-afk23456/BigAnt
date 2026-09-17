# BigAnt Book — servizi esterni e piano di attivazione

**Aggiornamento:** 16 settembre 2026 · **Destinatari:** Riccardo e soci · **Stato:** piano da attuare, nessun acquisto o servizio attivato.

Questo documento raccoglie soltanto ciò che serve per collegare BigAnt a email, SMS, hosting e servizi operativi. Le indicazioni sui fornitori sono proposte tecniche: la verifica documentale non sostituisce la verifica dell’account, della configurazione e del contratto prima dell’attivazione.

## 1. Cosa è già chiaro e cosa manca

Il lavoro tecnico può proseguire con le informazioni disponibili: esperienza dedicata al locale, prenotazioni, menu, recensioni, preparazione delle notifiche e test mirati. Restano valide le scelte approvate: tema scuro e arancione, prenotazione progressiva, email e telefono obbligatori, quattro template menu e comando occhio.

M0–M4 sono concluse. Prenotazioni, menu e feedback usano PostgreSQL e foto sul Mac. Adattatori email/SMS/push e coda persistente M5 sono implementati localmente, con cancello automatico verde e trasporti simulati. Collegamento ai fornitori, prove su dispositivi e M6 restano da completare. Avere i recapiti dei clienti nel database non significa che i messaggi vengano già inviati.

Per attivare servizi a pagamento o un locale reale serviranno dominio, intestatario degli account, budget, volumi e recapiti reali. Questi dati non sono necessari per continuare la prova locale. Per i test su dispositivi serviranno inoltre un iPhone e un Android: il solo Mac non copre il cancello PWA.

## 2. Tre livelli di utilizzo

| Livello | Cosa serve | Cosa si può provare |
| --- | --- | --- |
| **Sul Mac, adesso** | Launcher, database e foto locali; nessun servizio cloud | Prenotazioni, gestione staff, menu e isolamento dei due demo |
| **Demo ai soci via link** | Hosting EU, database e foto persistenti, HTTPS, account di prova; database separato dalla produzione | Flussi con dati inventati; eventuali notifiche solo verso destinatari di test autorizzati |
| **Locale operativo** | Demo consolidata, M5–M6, email e altri canali previsti, backup, alert, account reali e documenti privacy | Prenotazione vera, conferma dal telefono e feedback da card |

GitHub conserva il codice. I soci possono clonarlo e avviarlo; un link utilizzabile senza installazione richiede anche hosting. Database, foto caricate e segreti non vengono trasferiti con il repository. La pubblicazione GitHub resta alla fine della prova locale, come concordato.

## 3. Servizi da collegare

| Componente | Perché serve | Proposta iniziale | Quando | Stato |
| --- | --- | --- | --- | --- |
| **Dominio, DNS e HTTPS** | Link del locale, autenticazione staff e dominio mittente email | Usare un dominio intestato a BigAnt e un solo ingresso HTTPS | Demo remota | Dominio e titolare da indicare |
| **Hosting web + API** | Tenere Next.js e Fastify disponibili anche a Mac spento | Ambiente EU; confrontare Hetzner con una configurazione Scaleway | Demo remota / M6 | Configurazione e budget da scegliere |
| **PostgreSQL** | Prenotazioni, clienti, staff, sessioni e impostazioni | Stessa regione EU dell’API; gestito se il budget lo consente | Demo remota / M6 | Locale oggi; remoto da configurare |
| **Foto e copertine** | Conservare i caricamenti dopo riavvii e deploy | Volume persistente per un pilot singolo; Object Storage EU per maggiore autonomia | Demo remota | Filesystem locale già disponibile |
| **Backup** | Recuperare database e foto | Copie cifrate separate dal server e ripristino provato | Prima dei dati reali | Da configurare |
| **Email transazionali** | Attesa, conferma, disdetta e promemoria via email | **Scaleway TEM Essential**, candidato da validare | M5 | Adattatore TEM implementato in M5, invii demo |
| **Casella per le risposte** | Ricevere domande dei clienti e comunicazioni di supporto | Casella esistente del locale per Reply-To; casella BigAnt per assistenza | M5 / attivazione | Recapiti da indicare |
| **SMS** | Promemoria e comunicazioni previste dalla SPEC | Fornitore sostituibile; Twilio IE1 da verificare prima di scegliere | M5 | Scelta non chiusa |
| **Worker e coda** | Eseguire promemoria e tentativi anche dopo un riavvio | Partire valutando una coda su PostgreSQL; Redis se necessario | M5 | Coda PostgreSQL/worker M5 implementati, nessun account aggiuntivo oggi |
| **Web Push** | Avvisare il titolare sul telefono | Web Push standard con chiavi VAPID | M5 | Codice M5 implementato, recapito/dispositivi reali da verificare |
| **Google e card QR/NFC** | Aprire il flusso feedback del locale | Place ID reale per locale e card contenenti il link BigAnt | M4 | Dati demo; nessuna sincronizzazione Google prevista |
| **Monitoraggio e alert** | Avvisare quando il servizio non risponde e diagnosticare errori | Controlli da un punto EU distinto dal server; errori e log filtrati in EU | M6 | Responsabile e soluzione da scegliere |

Non occorre acquistare tutti i servizi per continuare lo sviluppo. Le credenziali diventano necessarie durante l’integrazione reale e le prove di recapito.

## 4. Email: invio automatico e ricezione delle risposte

Per le prenotazioni serve un servizio di invio transazionale. La casella consultata dal titolare è una funzione distinta.

**Proposta:** un dominio mittente BigAnt verificato, nome del locale nel mittente e Reply-To indirizzato alla casella del locale. Così il primo pilot può usare un solo dominio di invio; non serve configurare il DNS di ogni ristorante. Esempio illustrativo: “Trattoria Santa Lucia via BigAnt” come nome mittente, un indirizzo BigAnt per l’invio e la casella reale della trattoria per le risposte.

Scaleway TEM invia tramite API o SMTP, è dedicato alle email transazionali e non riceve posta. Non è il servizio per newsletter o campagne marketing. [Prodotto e caratteristiche TEM](https://www.scaleway.com/en/transactional-email-tem/).

Per collegarlo occorrono:

- Account/progetto intestato al soggetto che gestisce BigAnt e chiave con permessi limitati.
- Dominio o sottodominio mittente, nome From e casella Reply-To realmente consultata.
- Accesso DNS per verificare il dominio: SPF, DKIM, DMARC e configurazione MX appropriata, senza sovrascrivere i record della posta esistente.
- Endpoint di ritorno per esiti di consegna e rimbalzi, con autenticazione/verifica dell’origine secondo il meccanismo del fornitore.
- Verifica di log, retention, dati account e subprocessori nel contratto.

La guida Scaleway descrive la verifica DNS e indica che la verifica del dominio può richiedere fino a 48 ore. [Quickstart TEM](https://www.scaleway.com/en/docs/transactional-email/quickstart).

**Prova prima dell’attivazione:** destinatari di test autorizzati su Gmail e Outlook, lingua IT/EN, stato “in attesa” distinto da “confermata”, link di disdetta HTTPS corretto e un rimbalzo gestito. Un messaggio accettato dall’API non va presentato come certamente arrivato nella casella.

## 5. SMS: controllo dei consumi e scelta del fornitore

Il collegamento deve rispettare abilitazione per tenant, tetto mensile, fallback email e separazione dei dati fra locali. La matrice degli eventi M5 distingue gli stati e i canali: la SPEC prevede anche un SMS dopo la conferma dello staff, non soltanto il promemoria.

Serviranno account, mittente/numerazione validi per le destinazioni, credenziali regionali, esiti di consegna, paesi abilitati e limite di spesa. Il costo va calcolato sui segmenti effettivamente fatturati: lunghezza e codifica del testo possono trasformare un messaggio in più segmenti. [Segmentazione e fatturazione SMS, documentazione Twilio](https://www.twilio.com/docs/glossary/what-sms-character-limit).

**Twilio IE1 è un candidato, non una scelta già approvata per il vincolo EU.** Twilio dichiara trattamento dei dati SMS in Irlanda fino alle connessioni con gli operatori; segnala che operatori e personale di supporto possono coinvolgere paesi extra-EU. Questo punto richiede verifica prima di attivarlo. [Residenza EU degli SMS Twilio](https://www.twilio.com/docs/global-infrastructure/sms-eu-data-residency).

**Prova:** numero di test autorizzato, mittente corretto, esito ricevuto, doppio job senza doppio messaggio, raggiungimento del tetto e fallback email. Invii reali e relativi costi restano separati dai test automatici ordinari.

## 6. Hosting, database, foto e recupero

Per un primo pilot propongo pochi componenti: Next.js, Fastify e worker in un ambiente EU, database vicino all’API, ingresso HTTPS unico e copie di sicurezza separate. È una proposta, non una modifica della scelta di hosting nella SPEC.

| Opzione | Vantaggio | Impegno operativo |
| --- | --- | --- |
| **Hetzner, server scelto in Germania o Finlandia** | Sede dei dati, dati account e backup EU documentati | Server e database da amministrare: aggiornamenti, sicurezza, backup e recupero restano a carico nostro |
| **Scaleway, compute e PostgreSQL gestito in regione EU** | Riduce il lavoro di amministrazione del database; possibili servizi immagini/email nello stesso ecosistema | Canone e componenti da dimensionare; verificare anche contratto, log, rete e backup |

Hetzner documenta il trattamento EU per le sedi EU e specifica che cloud e server dedicati sono prodotti non gestiti. [Protezione dati e responsabilità operative Hetzner](https://docs.hetzner.com/general/company-and-policy/data-protection-at-hetzner/).

Scaleway offre PostgreSQL gestito in Paris, Amsterdam e Warsaw; pubblica disponibilità regionale e listini. Prima del collegamento vanno provate compatibilità con migrazioni/estensioni attuali e connessioni del worker. [PostgreSQL gestito](https://www.scaleway.com/en/managed-postgresql-mysql/), [disponibilità](https://www.scaleway.com/en/product-availability-by-region/), [listino database](https://www.scaleway.com/en/pricing/managed-databases/).

Le foto oggi sono in **.local/menu-images**, con percorso alternativo tramite **MENU_IMAGE_DIR**. Per un pilot con una sola istanza può bastare un volume persistente con backup; un filesystem temporaneo di deploy perderebbe i caricamenti. Uno storage oggetti richiede ancora integrazione, permessi limitati, controllo accesso alle foto nascoste e pulizia degli orfani.

Una copia del disco non sostituisce una strategia di backup coerente del database. Occorre coprire **database e immagini**, mantenere copie separate e provare il ripristino con accesso staff e prenotazioni di controllo. Prima dell’attivazione vanno concordati perdita dati massima accettabile e tempo di recupero; questi obiettivi influenzano il budget.

## 7. Push, Google e NFC

**Push:** la proposta usa Web Push standard e chiavi VAPID, senza un servizio aggiuntivo di orchestrazione notifiche. Su iPhone il flusso previsto richiede app aggiunta alla schermata Home e consenso dopo un gesto dell’utente; il supporto parte da iOS 16.4. Non serve un’iscrizione Apple Developer per questa funzione. [Web Push su iOS, documentazione WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

Le push usano comunque l’infrastruttura del browser/dispositivo: le chiavi VAPID non la rendono interna a BigAnt. Regione e trattamento di endpoint e metadati vanno valutati prima dell’attivazione. Proposta di payload: “Hai una nuova prenotazione”, senza nome, telefono, note o allergie; i dettagli si leggono dopo l’accesso. Email e pannello devono continuare a funzionare se le notifiche sono negate o l’abbonamento scade.

**Google:** per attivare il flusso M4 basta configurare un Place ID reale e verificare la scheda di destinazione; non serve collegare un’API per importare o pubblicare recensioni. I Place ID seed sono dimostrativi: la demo registra il clic e mostra un esito locale, senza aprire Google. La SPEC non include quella sincronizzazione. Google permette di condividere link/QR per chiedere recensioni; il cliente deve accedere al proprio account Google per pubblicarle. [Guida Google per i locali](https://support.google.com/business/answer/3474122?hl=it).

BigAnt registra l’apertura verso Google, non la prova che una recensione sia stata pubblicata. Il feedback privato resta nel database del locale. Le due opzioni vengono offerte senza chiedere prima il voto, come richiesto da M4.

**QR/NFC:** il QR e la card aprono il link BigAnt del locale con identificativo della card. Non serve un’API del produttore della card nel flusso previsto. Per il pilot bastano poche card di prova; quantità, formato e stampa si decidono dopo la verifica sui telefoni. Va provata anche l’usabilità del limite attuale di un invio ogni dieci minuti quando una card è condivisa fra più ospiti.

## 8. Vincolo EU: verifiche ancora aperte

AGENTS.md impone residenza EU per database, storage, code e log, senza eccezioni. Una regione europea del singolo componente non dimostra che anche metadati, assistenza e backup rispettino il requisito. Il vincolo resta quello attuale; questo documento non lo allenta.

| Fornitore / canale | Evidenza documentale | Conseguenza per BigAnt |
| --- | --- | --- |
| **Resend** | La regione di invio non cambia la sede USA di metadati, log e dati account | Non attivare con il vincolo attuale; valutare il candidato TEM |
| **Sentry SaaS EU** | Eventi e backup regionali EU, alcuni metadati account/organizzazione possono restare USA | Non considerarlo già conforme a “tutto EU”; valutare soluzione gestita verificata o hosting proprio |
| **Cloudflare R2** | La giurisdizione eu vincola gli oggetti; il location hint da solo non lo fa | Verificare anche distribuzione e log; alternativa a volume/storage EU, non requisito obbligatorio |
| **Twilio IE1** | Confine operatori e supporto extra-EU dichiarato | Scelta SMS sospesa fino alla verifica |
| **Push e consegna esterna** | La destinazione è scelta dal browser, dall’operatore o dalla casella del destinatario | Documentare il confine dei dati; non promettere che la scelta del nostro hosting controlli anche questi servizi |

Fonti: [regioni e dati Resend](https://resend.com/docs/dashboard/domains/regions), [FAQ Sentry EU](https://www.sentry.help/en/articles/13964378-sentry-s-eu-region-faq), [giurisdizione R2](https://developers.cloudflare.com/r2/reference/data-location/), [Twilio IE1](https://www.twilio.com/docs/global-infrastructure/sms-eu-data-residency).

Per TEM e per la configurazione cloud proposta resta necessaria la verifica del DPA aggiornato, dei subprocessori, della retention e della sede dei dati account/log. L’indicazione commerciale “cloud europeo” non è da sola un’approvazione del collegamento. [Contratti Scaleway](https://www.scaleway.com/en/contracts/).

## 9. Costi: cosa è verificato e cosa va preventivato

Il listino TEM Essential pubblica **300 email incluse al mese, poi 0,25 € per 1.000 email**. Il conteggio è per destinatario; il piano supporta fino a cinque domini di invio. Esempio indicativo: 10.000 destinatari/email al mese corrispondono a circa **2,43 € di eccedenza**, applicando linearmente quel prezzo, prima di eventuali imposte e regole di fatturazione. Non è il costo complessivo di BigAnt. [Listino TEM](https://www.scaleway.com/en/transactional-email-tem/), [gestione piani e quota mensile](https://www.scaleway.com/en/docs/transactional-email/how-to/manage-tem-plans).

| Voce | Come calcolare il costo | Dato mancante |
| --- | --- | --- |
| Hosting | Processi/istanze, RAM, rete, IP e ambienti separati | Configurazione, volumi e disponibilità richiesta |
| PostgreSQL | Piano gestito oppure server, disco e manutenzione | Dimensionamento e scelta operativa |
| Immagini e backup | GB conservati, richieste, traffico, retention | Numero foto e obiettivi di recupero |
| Email | Destinatari totali fra cliente e staff, per ciascun evento | Prenotazioni e messaggi mensili |
| SMS | Segmenti × tariffa per paese, più eventuale mittente/numerazione | Paesi, percentuale SMS e fornitore |
| Dominio e caselle | Registrazione/rinnovo e caselle necessarie | Dominio e posta già disponibili |
| Monitoraggio | Piano/risorse e retention | Soluzione e responsabile degli alert |
| Manutenzione | Aggiornamenti, incidenti e prove di recupero | Chi la gestisce e livello di servizio |

Non c’è ancora un totale mensile affidabile. Il preventivo deve separare canoni, consumi e manutenzione, senza contare solo il prezzo del server. Per stimarlo servono numero di locali iniziali, prenotazioni mensili, volume foto, quota SMS, paesi e budget massimo.

## 10. Informazioni da raccogliere prima dell’attivazione

| Informazione | A cosa serve | Chi la fornisce |
| --- | --- | --- |
| Dominio disponibile e accesso DNS | HTTPS e verifica mittente | Riccardo / intestatario dominio |
| Soggetto intestatario, fatturazione e amministratore account | Acquisti, proprietà e recupero degli account | Soci |
| Budget mensile e limiti di consumo | Scelta infrastruttura e SMS | Soci |
| Numero locali iniziali e volumi indicativi | Preventivo e dimensionamento | Soci / primo locale |
| Nome, indirizzo, telefono e email reali del locale | Link, assistenza, Reply-To e notifiche | Titolare |
| Scheda Google / Place ID | Destinazione recensioni | Titolare, con verifica tecnica |
| iPhone e Android disponibili | Prova installazione e recapito push | Riccardo / soci |
| Contatto tecnico e responsabile backup/alert | Gestione incidenti e recupero | Soci |
| Testi privacy e accordi di trattamento validati | Uso dei dati reali previsto da M5–M6 | BigAnt e locale, con supporto competente |

La scelta degli account e la spesa richiedono questi dati; le correzioni tecniche ordinarie e la preparazione locale possono procedere senza ulteriori conferme.

Le credenziali reali vanno inserite nel gestore dei segreti dell’ambiente o nella configurazione locale esclusa da Git, con accessi personali e permessi limitati. Non inviare password o chiavi in chat. Gli account devono restare recuperabili dai soci.

## 11. Lavoro di integrazione e ordine di attivazione

1. **Preparazione locale:** adattatori di notifica, template IT/EN e test con trasporto finto; completare i requisiti delle missioni pertinenti.
2. **Affidabilità:** correggere con una nuova migrazione la deduplicazione dei messaggi. La migrazione M5 sostituisce la chiave prenotazione/tipo con evento stabile e chiave di consegna per evento/canale/destinatario, registrata prima dell’invio.
3. **Worker:** coda persistente, pianificazione ogni cinque minuti, tentativi controllati, tetto SMS e gestione delle risposte incerte del provider. Un timeout dopo l’invio non deve causare un reinvio cieco.
4. **Ambiente remoto:** account verificati, HTTPS, database/foto persistenti, segreti, configurazione dei proxy e limiti di richieste adeguati. Verificare i log del proxy, inclusi token nei link di disdetta.
5. **Recapito di prova:** email prima, poi SMS e push con destinatari autorizzati; provare errori e fallback oltre al caso riuscito.
6. **Uso reale:** privacy, retention/export/anonimizzazione, accessi reali, backup ripristinato, alert e cancello M6 documentati.

La configurazione attuale comprende DATABASE_URL, JWT_SECRET, HOST, PORT e MENU_IMAGE_DIR; API_INTERNAL_URL è letto dalla configurazione web. Le variabili degli adattatori sono in .env.example. Le procedure di recapito/rimbalzo richiedono ancora i fornitori reali, senza inserirvi valori segreti.

Per questo MVP non occorrono un servizio esterno di autenticazione, Maps API a pagamento per il semplice redirect, ordinazioni, pagamenti, CRM o un’app nativa. Il piano di attivazione resta nei moduli già previsti.

## Aggiornamento sviluppo M5 — 17 settembre

Coda, template, adattatori e pannelli locali sono implementati: dettagli e stati effettivi in [NOTIFICHE_E_PRIVACY](NOTIFICHE_E_PRIVACY.md). Gli invii restano simulati; nessuna scelta contrattuale viene chiusa dall’esistenza dell’adattatore. Le variabili definitive sono in [.env.example](../.env.example). Servono ancora account/dominio, verifiche EU, prove di recapito e dispositivi fisici. In particolare il candidato SMS IE1 non è un servizio già approvato o attivo.
