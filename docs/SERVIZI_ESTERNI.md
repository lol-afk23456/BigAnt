# Servizi esterni — dalla prova locale all'attivazione

Verifica documentale: 16 settembre 2026. Nessun account acquistato, nessun servizio attivato, nessun deploy o invito GitHub eseguito. M1–M2 funzionano sul Mac con PostgreSQL locale; email, SMS, push, menu e recensioni non sono ancora funzionalità attive.

## 1. Per provare adesso sul Mac

Nessun servizio cloud necessario. Il launcher avvia web, API e PostgreSQL locale. Gli accessi demo sono nella guida di prova. Usare dati inventati: questo è il prototipo M2, non il completamento privacy/notifiche/produzione di M5–M6.

## 2. Per condividere una demo via link con i soci

GitHub conserva e condivide il **codice**. Un socio può clonarlo e avviarlo sul proprio computer; per un link da aprire senza installare nulla serve anche un ambiente ospitato. Il repository non contiene database, `.env`, password reali o installazioni locali.

| Componente | A cosa serve | Cosa occorre | Quando |
| --- | --- | --- | --- |
| Repository GitHub privato | Versionamento, collaborazione e controlli automatici | Account/organizzazione, nome repo, accessi dei soci. Nessuna chiave applicativa nel codice | Solo dopo la prova locale, su richiesta |
| Hosting web + API in EU | Eseguire Next.js e Fastify continuativamente | Account progetto, regione EU, due processi, dominio/origine API, configurazione HTTPS | Demo remota e produzione |
| PostgreSQL 16 in EU | Prenotazioni, staff, clienti, sessioni, impostazioni | URL DB, credenziali limitate, TLS/rete privata, migrazioni, storage persistente | Demo remota e produzione |
| Dominio/DNS + HTTPS | Link pubblico e cookie staff Secure | Accesso DNS, dominio scelto, certificato TLS, reverse proxy | Al deploy |
| Backup in EU | Recupero dei dati | Retention, copie separate, credenziali dedicate e ripristino provato | Prima di raccogliere dati reali |
| Monitoraggio e alert | Sapere quando API/DB non rispondono | Contatto tecnico, controlli health, log filtrati con retention e sede EU | Prima dell'uso operativo |

**Scelta da valutare per un primo deploy:** un ambiente interamente EU, con Next.js, Fastify e PostgreSQL nella stessa regione. Come alternativa operativa alle piattaforme gestite della SPEC, Hetzner documenta sedi Germania/Finlandia e trattamento EU per server scelti in EU. Richiede però gestione esplicita di aggiornamenti, processi e database: non è un servizio PostgreSQL gestito. Nessuna variazione della SPEC è stata implementata. [Sedi Hetzner](https://docs.hetzner.com/cloud/general/locations/), [protezione dati](https://docs.hetzner.com/general/company-and-policy/data-protection-at-hetzner/).

La SPEC propone Vercel + Railway/Fly. Vercel permette di fissare la regione delle funzioni, ma usa CDN globale; Railway offre Amsterdam. Queste scelte **non costituiscono da sole una verifica EU completa**: bisogna confermare anche log, proxy, backup, metadati, subprocessori e percorsi dei cookie. Se il vincolo assoluto di AGENTS.md non è soddisfatto, quel fornitore non va attivato. [Regioni Vercel](https://vercel.com/docs/functions/configuring-functions/region), [regione Railway](https://docs.railway.com/deployments/regions).

Per PostgreSQL, una copia del disco non sostituisce un backup coerente e un test di ripristino. Hetzner documenta collocazione dei backup nella stessa location e snapshot nella stessa zona di rete; resta necessario progettare e provare il recupero del DB. [Backup e snapshot](https://docs.hetzner.com/cloud/servers/backups-snapshots/faq/).

Configurazione applicativa già usata: `DATABASE_URL`, `JWT_SECRET` casuale, `HOST`, `PORT`, `API_INTERNAL_URL` (usato dalle rewrite Next alla build). Produzione: il proxy espone soltanto HTTPS; API/DB restano su rete privata; token di accesso in memoria e refresh HttpOnly/Secure. Servono inoltre gestione segreti, rate limit condiviso se più istanze, politica proxy attendibili e controllo dei log. Non usare le credenziali demo in un ambiente reale.

## 3. Servizi dei moduli successivi

| Servizio | Modulo/scopo | Credenziali e configurazione da predisporre | Stato della scelta EU |
| --- | --- | --- | --- |
| Email transazionali | M5: conferma, attesa, disdetta; indispensabili per il flusso operativo completo | Dominio mittente, indirizzo From/reply-to, API key, SPF/DKIM/DMARC, webhook con firma, retention | Valutare Scaleway TEM con regione e contratto EU; nessuna integrazione scritta |
| SMS | M5: promemoria con tetto per tenant e fallback email | Account, mittente/numerazione, credenziali regionali, webhook, budget e limite mensile | Twilio IE1 ha supporto SMS EU, con limiti su operatori e supporto esterno: richiede verifica contrattuale |
| Coda e worker | M5: promemoria affidabili e tentativi idempotenti | Worker persistente, connessione DB oppure Redis EU, pianificazione e retention | Può usare PostgreSQL; Redis è una scelta tecnica da fare in M5, non un requisito attuale |
| Storage immagini | M3: foto menu e asset dei locali | Bucket, endpoint, chiavi limitate, CORS, dominio asset, policy upload | R2 con **jurisdiction `eu`**, non semplice location hint; controllare anche distribuzione/log |
| Google Place ID | M4: link alla scheda recensioni | Place ID verificato per ogni locale | Il visitatore viene inviato a Google; non è archiviazione BigAnt. Valutazione dei dati condivisi prima di M4 |
| Web Push | M5: nuove prenotazioni sul dispositivo staff | Chiavi VAPID, contatto tecnico, HTTPS e permesso notifiche | Provider del browser e trattamento endpoint da verificare; niente PII nel payload |
| Error tracking | M6: diagnosi errori | DSN/progetto, regione, filtri PII, nessun replay con dati ospiti | Sentry EU conserva eventi/backups in EU ma alcuni metadati account in US. Non dichiararlo compatibile con “tutto EU” senza risolvere il vincolo; valutare hosting proprio EU |

Scaleway TEM offre invio tramite SMTP/REST, autenticazione del dominio e infrastruttura cloud europea. Verificare contratto, regione e retention prima della scelta; il recapito alla casella scelta dal destinatario è un confine distinto dall'hosting applicativo. [TEM](https://www.scaleway.com/en/transactional-email-tem/), [contratti](https://www.scaleway.com/en/contracts/).

**Resend richiede una scelta diversa rispetto all'indicazione iniziale della SPEC:** la documentazione dichiara che scegliere Irlanda cambia la regione di invio, mentre metadati, log e dati account restano negli USA. Non attivarlo con l'attuale vincolo EU. [Residenza dati Resend](https://resend.com/docs/dashboard/domains/regions).

Twilio documenta che SMS e numeri dei destinatari sono processati in IE1 fino alla connessione con gli operatori; operatori e assistenza possono coinvolgere paesi extra-EU. Quindi non basta un endpoint `ie1` per promettere residenza esclusivamente EU lungo l'intera filiera. [SMS EU](https://www.twilio.com/docs/global-infrastructure/sms-eu-data-residency).

Cloudflare distingue chiaramente i suggerimenti di localizzazione dalla giurisdizione vincolante `eu` per gli oggetti R2. La selezione è fatta alla creazione del bucket. [R2 data location](https://developers.cloudflare.com/r2/reference/data-location/).

Sentry richiede la selezione EU alla creazione dell'organizzazione; regione degli eventi e sede di alcuni metadati account non coincidono. [Sentry EU FAQ](https://www.sentry.help/en/articles/13964378-sentry-s-eu-region-faq).

## 4. Costi e informazioni ancora da decidere

Nessun totale mensile affidabile prima di scegliere hosting, ridondanza, backup e volumi. Non sono stati verificati preventivi o listini per una configurazione precisa, quindi qui **non vengono presentati importi stimati come prezzi certi**.

Per un preventivo serviranno: numero iniziale di locali, prenotazioni mensili, percentuale di SMS, volume foto, retention, disponibilità richiesta e budget massimo. Separare canone infrastruttura/dominio/backup da consumo email/SMS/storage e dal lavoro di manutenzione.

Per continuare dopo il test: scegliere nome dominio e intestatario account, definire chi gestisce backup/alert, approvare un budget, raccogliere dati reali dei locali e documenti privacy. Le credenziali andranno inserite nei secret manager dei servizi, mai in chat o nel repository. Nessuna di queste informazioni è necessaria per iniziare oggi la prova locale.

## 5. Punto di attivazione

Prima della demo ai soci: ambiente di prova EU, accessi separati e dati inventati. Prima di clienti reali: completare almeno i requisiti pertinenti M5–M6, notifiche idempotenti, privacy/retention, HTTPS, account reali e backup con ripristino verificato. M2 consegna una prova funzionale completa del flusso prenotazioni, non una dichiarazione di produzione pronta.
