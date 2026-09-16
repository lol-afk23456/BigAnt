# MISSIONS.md — le sei missioni

Sei blocchi di lavoro autonomo. Ognuno è pensato per una sessione lunga, con criteri di accettazione verificabili da comando.

**Regola:** nessuna missione inizia prima che la precedente abbia il cancello verde. Se una missione non entra in una sessione, fermati a un punto coerente (test verdi, commit pulito), aggiorna `PROGRESS.md` e riprendi da lì.

---

## M0 — Fondamenta

**Obiettivo.** Repo funzionante, schema completo, isolamento tenant garantito dall'infrastruttura. Nessuna funzionalità di prodotto.

**Da fare**
- Monorepo pnpm + Turborepo con la struttura di AGENTS.md
- `apps/api` Fastify con healthcheck, `apps/web` Next.js con pagina vuota
- Schema Prisma completo: tutte e 12 le entità di SPEC §3, con indici e vincoli
- Prima migrazione applicata
- Prisma client extension che **inietta e impone `tenant_id`** su ogni operazione
- Autenticazione staff: login, refresh, logout, argon2id, rate limit sul login
- Seed con i due tenant di AGENTS.md
- Setup Vitest, Playwright, ESLint, GitHub Actions
- `docs/PROGRESS.md` e `docs/BACKLOG.md` inizializzati

**Criteri di accettazione**
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` tutti verdi
- [ ] `pnpm seed` crea due tenant con dati completi e distinti
- [ ] `tenant-isolation.test.ts`: per ogni modello, una query con token del tenant A non restituisce mai righe del tenant B
- [ ] Una query scritta di proposito senza `tenant_id` **fallisce**, non restituisce dati altrui
- [ ] Login funziona, token scade, refresh funziona, 6° tentativo di login bloccato

**Non fare.** Nessuna interfaccia, nessuna logica di prenotazione, nessun menu.

---

## M1 — Motore prenotazioni

**Obiettivo.** La logica corretta, senza interfaccia. È la missione più difficile: se sbagli qui, sbagli tutto.

**Da fare**
- `packages/core/availability.ts` — funzione **pura** come da SPEC §4, con i cinque controlli: apertura, finestra temporale, capienza, **ritmo di servizio**, tavolo disponibile
- Assegnazione automatica tavolo: il libero con `max_capacity` minima fra quelli compatibili
- Creazione prenotazione con rivalidazione **dentro transazione** e advisory lock: due richieste simultanee sull'ultima fascia non devono produrre overbooking
- Macchina a stati con transizioni ammesse (SPEC §3.8); transizione illegale → 409
- Normalizzazione telefono in E.164 e deduplica cliente
- Endpoint: `GET /public/:slug/availability`, `POST /public/:slug/reservations`, `GET|POST /public/reservations/:cancelToken`, più CRUD autenticato

**Criteri di accettazione**
- [ ] Test dei casi limite, tutti verdi: cambio ora legale (26 ottobre, 29 marzo), prenotazione a cavallo di due servizi, gruppo più grande di ogni tavolo, servizio oltre la mezzanotte, blackout parziale, locale chiuso
- [ ] Test di concorrenza: 20 richieste parallele sull'ultima fascia → esattamente una riesce
- [ ] Test del ritmo: con `max_covers_per_slot = 12`, la 13ª persona sulla stessa fascia riceve `PACING_LIMIT`
- [ ] Nessuna disponibilità → risposta con le 2 date alternative più vicine, non un errore
- [ ] `availability.ts` non importa Prisma né fa chiamate di rete

**Non fare.** Nessuna pagina, nessuna email. Solo motore e API.

---

## M2 — Interfaccia prenotazioni

**Obiettivo.** Il cliente prenota, lo staff gestisce.

**Da fare**
- Pagina pubblica `/r/:slug/prenota`: mobile-first, colonna singola, un CTA, nessuna registrazione
- Pagina di disdetta via `cancelToken`
- Pannello staff: dashboard "oggi" con in cima ciò che richiede decisione, lista/calendario, creazione manuale da telefonata, modifica stato, assegnazione tavolo
- Impostazioni locale: orari, chiusure, capienza, ritmo, turno, conferma automatica, termine disdetta
- Gestione tavoli
- Stati vuoto, caricamento ed errore su ogni schermata
- Stringhe in `it` ed `en`

**Criteri di accettazione**
- [ ] E2E Playwright: un visitatore prenota, riceve la conferma a schermo, apre il link di disdetta e annulla
- [ ] E2E: lo staff accede, vede la prenotazione appena creata, la conferma, assegna un tavolo
- [ ] Nessuna disponibilità → vengono proposte due date alternative
- [ ] Verificato a 375px di larghezza
- [ ] Nessuna stringa italiana hardcoded nei componenti

**Non fare.** Nessuna email o SMS reale: log del payload, invio arriva in M5.

---

## M3 — Menu digitale

**Obiettivo.** La missione più semplice. Usala per prendere ritmo.

**Da fare**
- Pagina pubblica `/r/:slug/menu`, generata lato server, immagini WebP con `srcset`
- Categorie e piatti dal pannello, con riordino
- Prezzo in centesimi, allergeni (i 14 UE), etichette dietetiche
- `is_available` = piatto mostrato in grigio, **mai nascosto**
- `is_featured` in cima
- Upload immagini: whitelist MIME, max 5 MB, ricompressione server, nome randomizzato
- Multilingua it/en con selettore

**Criteri di accettazione**
- [ ] E2E: lo staff crea categoria e piatto con foto, la pagina pubblica lo mostra
- [ ] Un piatto segnato esaurito appare in grigio con etichetta, non sparisce
- [ ] Lighthouse mobile sulla pagina menu: performance ≥ 90, LCP < 2s
- [ ] Il cambio lingua non ricarica dati sbagliati

---

## M4 — Raccolta recensioni

**Obiettivo.** Conforme alle policy Google. Leggi SPEC §5 prima di iniziare.

**Da fare**
- `GET /public/:slug/feedback?card=:cardUid` → pagina unica con **due opzioni affiancate di pari dignità visiva**, mostrate a tutti, senza chiedere prima il voto
- Opzione Google: redirect a `writereview`, registra `channel = google_redirect`, `rating = null`
- Opzione privata: form voto 1–5 + commento, registra `channel = private`, notifica al titolare
- Gestione card NFC dal pannello
- Dashboard recensioni con evidenza delle private non ancora viste
- Rate limit per `card_uid` e per IP

**Criteri di accettazione**
- [ ] Test che verifica che **nessun endpoint** chiede o riceve il voto prima di presentare le due opzioni
- [ ] I due pulsanti hanno le stesse dimensioni e lo stesso peso visivo (test di snapshot o assertion sui token di stile)
- [ ] Nessun testo suggerito per la recensione, nessun incentivo, nessuna parola tipo "positiva" o "5 stelle" nella pagina
- [ ] `google_place_id` nullo → viene mostrata solo l'opzione privata
- [ ] Secondo invio dalla stessa card entro 10 minuti → bloccato

**Non fare.** Non reintrodurre `review_positive_threshold` né `routed_public`. Se li trovi nel codice o nello schema, rimuovili.

---

## M5 — Notifiche e PWA

**Obiettivo.** Il sistema parla con le persone e sta sulla schermata home del titolare.

**Da fare**
- Astrazione `NotificationChannel` con implementazioni email, SMS, push — **il fornitore SMS deve essere sostituibile cambiando una sola classe**
- Email transazionali: conferma, attesa di conferma, disdetta
- SMS promemoria con job schedulato ogni 5 minuti (mai `setTimeout`)
- Idempotenza: insert in `NotificationLog` prima dell'invio, unique constraint `(reservation_id, type)`
- Tetto SMS mensile per tenant → oltre il tetto, degrada a email e segnala nel pannello
- PWA: manifest, service worker, installabile, Web Push per nuova prenotazione e nuova recensione privata
- Export CSV clienti e cancellazione cliente con anonimizzazione, entrambi con `AuditLog`
- Job mensile di retention/anonimizzazione
- Informativa privacy per tenant, consenso marketing **separato e non pre-spuntato**

**Criteri di accettazione**
- [ ] Doppio tentativo di invio dello stesso promemoria → un solo messaggio spedito
- [ ] Superato `sms_monthly_cap` → l'invio passa a email, il pannello lo mostra
- [ ] Cambiare fornitore SMS richiede di modificare un solo file
- [ ] La PWA si installa e riceve una push su Android e su iOS 16.4+
- [ ] Export produce un CSV valido e scrive in `AuditLog`
- [ ] Cancellazione cliente anonimizza senza rompere lo storico prenotazioni

---

## M6 — Messa in produzione

**Obiettivo.** Un locale vero, in EU, con i backup attivi.

**Da fare**
- Deploy: Vercel (web) e Railway o Fly (api, database, redis), **tutti in regione EU**
- Variabili d'ambiente documentate in `.env.example`
- Backup automatici del database, con un ripristino provato davvero almeno una volta
- Sentry con filtro che esclude i dati personali
- Dominio, HTTPS, header di sicurezza (CSP, HSTS, X-Content-Type-Options)
- Onboarding guidato del primo tenant reale
- Pagina di stato o almeno un alert quando l'API non risponde

**Criteri di accettazione**
- [ ] Nessun servizio con dati personali fuori dalla regione EU (verificato nelle console dei fornitori)
- [ ] Ripristino da backup eseguito su ambiente di prova, con esito documentato in `PROGRESS.md`
- [ ] Nessun dato personale visibile negli eventi Sentry
- [ ] Il criterio di completamento dell'MVP di SPEC §13 è soddisfatto

---

## Riepilogo

| Missione | Blocco | Rischio | Il punto critico |
|---|---|---|---|
| M0 | Fondamenta | Alto | L'isolamento tenant imposto dall'infrastruttura |
| M1 | Motore prenotazioni | **Il più alto** | Ritmo di servizio e concorrenza |
| M2 | Interfaccia prenotazioni | Medio | Che la sala lo usi davvero durante il servizio |
| M3 | Menu | Basso | Velocità di caricamento |
| M4 | Recensioni | Medio | Conformità Google, non funzionalità |
| M5 | Notifiche e PWA | Medio | Idempotenza e costo SMS |
| M6 | Produzione | Medio | Backup e residenza dei dati |

Se il tempo finisce prima di M6, il taglio si fa su M3 (il menu può essere un PDF per qualche settimana), mai su M1.
