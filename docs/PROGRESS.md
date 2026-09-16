# Avanzamento BigAnt Book

## Stato al 16 settembre 2026

**M0 completata: cancello verificato da comando.** Arresto alle fondamenta. M1 e M2 non iniziate. Non proseguire senza una nuova richiesta dell'utente.

## Realizzato

- Repository Git e monorepo pnpm 10.32.1 + Turborepo; Node 22.23.2, TypeScript strict.
- API Fastify con healthcheck e autenticazione staff; Next.js App Router + Tailwind con pagina vuota. Nessuna schermata o logica di prodotto.
- Tutti i modelli di SPEC §3, indici, FK composte e vincoli SQL; migrazione `202609160001_m0` applicata a PostgreSQL 16.14 locale, database `bigant` e `bigant_test`.
- Prisma extension con contesto tenant obbligatorio, filtro imposto su letture/scritture/aggregati e transazioni. Query senza contesto, raw SQL, cambio tenant e scritture relazionali annidate rifiutati.
- Argon2id, JWT access 15 minuti, refresh in cookie HttpOnly/Secure/SameSite=Lax; sessioni persistenti con hash, rotazione atomica, scadenza massima 30 giorni e revoca al logout. Utenti disabilitati e tenant sospesi non possono usare la sessione.
- Login limitato a 5 tentativi per email normalizzata ogni 15 minuti. Sesto tentativo: HTTP 429 con errore tradotto. Header di sicurezza; log applicativi disabilitati per evitare dati personali.
- Seed ripetibile per Trattoria Santa Lucia e Lido Miseno: rispettivamente 40/60 clienti, 80/150 prenotazioni, 12/30 tavoli, 5/3 categorie, 28/14 piatti, 25/40 recensioni; impostazioni, orari, chiusura demo, card NFC, log e staff distinti.
- Vitest con PostgreSQL reale, Playwright minimale, ESLint senza warning e workflow GitHub Actions. Workflow predisposto, non eseguito su GitHub perché non è stato pubblicato alcun repository remoto.
- README, `.env.example`, PROGRESS e BACKLOG.

## Decisioni tecniche

1. La dicitura «12 entità» nei documenti non corrisponde alla lista: SPEC §3 enumera 14 modelli contando separatamente MenuCategory/MenuItem e includendo AuditLog. Implementati tutti, più StaffSession, necessaria a revoca e rotazione dei refresh.
2. Tenant è l'entità radice: il suo `id` è il confine; ogni altra tabella ha `tenant_id`. Non introdotta una colonna tenant_id autoreferenziale.
3. Un chiamante senza contesto tenant fallisce. All'interno di `withTenant`, l'extension inietta il filtro anche se la query lo omette. Il callback viene atteso all'interno del contesto perché PrismaPromise è lazy: questo comportamento è coperto dai test.
4. Le scritture annidate Prisma sono rifiutate perché non attraversano tutti gli hook dell'extension. Le FK scalari composte consentono operazioni esplicite e impediscono collegamenti tra tenant anche a livello SQL. Nessuna RLS dichiarata: credenziali DB, migrazioni e seed restano privilegiati.
5. Il solo lookup pre-login risolve uno slug in id/stato; non restituisce dati di dominio. Login con slug + email + password, essendo l'email unica per tenant.
6. UUID v7 generati da Prisma per gli id, date timestamptz, centesimi interi, citext per email, indice parziale NotificationLog dove status != failed, slug immutabile con trigger SQL.
7. Telefono Customer nullable per consentire l'anonimizzazione di SPEC §8. Email e telefono saranno entrambi obbligatori nell'input pubblico, secondo la decisione utente; nessun form o endpoint prenotazione è stato anticipato.
8. Credenziali demo secondo AGENTS.md (prevale su SPEC): `owner@santalucia.test`, `owner@lidomiseno.test`, password `bigant2026`. Seed transazionale per tenant; una seconda esecuzione conserva i dati esistenti senza duplicarli; proibito in NODE_ENV=production.
9. PostgreSQL locale incluso come strumento di sviluppo, senza modificare PostgreSQL/Node di sistema. `.local`, `.env`, store e artefatti esclusi da Git. Nessun servizio remoto o invio reale configurato; residenza EU da verificare al deploy M6.
10. Pacchetti condivisi consumati come TypeScript e controllati con tsc; API compilata in JavaScript con esbuild e dipendenze runtime esterne, web con build Next.js. Typegen precede il typecheck web anche su checkout pulito.
11. Rate limit M0 in memoria per una sola istanza. Store condiviso e configurazione proxy/TLS prima della distribuzione sono annotati nel backlog.

## Verifiche eseguite

Tutti con esito 0 su Node 22.23.2 e PostgreSQL 16.14:

| Comando | Risultato |
| --- | --- |
| `pnpm db:migrate` | Prima migrazione applicata |
| `pnpm seed` | Due tenant completi; seconda esecuzione senza duplicati |
| `pnpm typecheck` | Sette pacchetti/app e test TypeScript verificati |
| `pnpm lint` | Zero errori, zero warning |
| `pnpm test` | 30 test passati, 3 file |
| `pnpm build` | API JavaScript e Next.js di produzione compilati |
| `pnpm test:e2e` | 1 verifica HTTP della pagina vuota, nessun flusso di prodotto |
| `pnpm --filter @bigant/web typecheck` | Typegen e controllo tipi verificati |
| Smoke HTTP API compilata | Healthcheck e login di entrambi i tenant passati; processo chiuso |

`tenant-isolation.test.ts` verifica ogni modello con token A e B su route registrate **solo nei test**. Include query senza contesto, findUnique, aggregati, OR, update/delete, createMany, upsert, raw SQL, include, FK e transazioni parallele.

Auth: scadenza access, refresh, replay e concorrenza, logout, scadenza 30 giorni, sesto tentativo con IP diversi e maiuscole, JWT manomessi/tipo errato, utente disabilitato, errori localizzati e header. Verificati inoltre conteggi seed, UUID v7, Argon2id e vincoli SQL.

Nel terminale di questa sessione il Node di sistema era 12 e mancava pnpm: verifiche eseguite aggiungendo al PATH `/tmp/node-v22.23.2-darwin-x64/bin` e `/tmp/bigant-tooling/node_modules/.bin`. Per sessioni future usare `.nvmrc` e le istruzioni README. Test e migrazioni richiedono accesso al database locale; la sandbox del runner richiede escalation per connessioni/socket. Playwright emette soltanto il warning del runner per NO_COLOR/FORCE_COLOR, senza errori di test.

## Decisioni utente per M2 (approvate)

- Pagina unica: rivelare i campi progressivamente, non mostrarli tutti insieme; riepilogo vicino al pulsante finale.
- Partire da oggi; se pieno o chiuso, selezionare automaticamente il primo giorno utile, senza schermate vuote.
- Numero di persone tramite pulsanti toccabili, mai menu a tendina.
- Email e telefono entrambi obbligatori nel flusso di prenotazione.
- Richieste facoltative dietro «Aggiungi una richiesta».
- Nessuna disponibilità: proporre le due date alternative con tono invitante e possibilità di continuare.
- Test frontend leggeri, concentrati sui flussi essenziali.

Queste scelte sono registrate, non implementate. La prossima missione resta M1, solo quando richiesta.
