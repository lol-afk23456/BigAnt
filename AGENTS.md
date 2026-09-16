# AGENTS.md — BigAnt Book

Questo è il file di contesto del progetto. Leggilo per intero, insieme a `docs/SPEC.md` e `docs/MISSIONS.md`, prima di ogni azione, all'inizio di ogni sessione. Se questo file e SPEC divergono, vince questo file. Non chiedere all'utente informazioni che sono già in questi tre documenti.

---

## Cos'è

Piattaforma SaaS multi-tenant per locali italiani (ristoranti, bar, lidi). Tre moduli: prenotazioni, menu digitale, raccolta recensioni. Un'unica base di codice serve tutti i clienti.

**Lingua del prodotto:** italiano (default) e inglese. **Lingua dei commenti nel codice e dei commit:** italiano.

---

## Regole non negoziabili

1. **Perimetro chiuso.** Implementa solo ciò che è elencato in `docs/MISSIONS.md` per la missione corrente. Tutto il resto — fidelity, pagamenti, sincronizzazione TheFork, assistente vocale, ordinazione al tavolo, multi-sede, turni, agenti AI, integrazione cassa — **non va scritto**, nemmeno parzialmente, nemmeno se sembra veloce. Se emerge la necessità, scrivi una riga in `docs/BACKLOG.md` e vai avanti.

2. **Nessuna query senza `tenant_id`.** Il filtro è imposto nel data layer (Prisma client extension o middleware), non lasciato al chiamante. Il test `tenant-isolation.test.ts` deve restare verde per sempre.

3. **Mai review gating.** La pagina recensioni offre a tutti le stesse due opzioni senza chiedere prima il voto. Vedi SPEC §5. Questo vincolo è legale, non estetico.

4. **Residenza dati EU.** Database, storage, code, log: tutto in regione europea. Nessuna eccezione.

5. **Nessuna stringa visibile all'utente scritta nel codice.** Tutto in `packages/i18n`, chiavi `it` ed `en`.

6. **Denaro sempre in centesimi interi.** Mai float.

7. **Date sempre in UTC nel database**, convertite col fuso del tenant solo al bordo (API e UI).

8. **Ogni notifica registrata prima dell'invio**, con unique constraint che garantisce idempotenza.

9. **Endpoint pubblici sempre rate-limited.** Sono esposti a internet senza autenticazione.

10. **Non toccare migrazioni già applicate.** Nuova migrazione, sempre.

---

## Metodo di lavoro

L'utente lavora in **poche sessioni lunghe e autonome**, non in cicli brevi. Quindi:

- **Lavora in autonomia fino al cancello.** Non fermarti a chiedere conferma su decisioni già coperte da SPEC o da questo file. Chiedi solo se una decisione è irreversibile e non documentata.
- **Ogni missione ha criteri di accettazione verificabili da comando.** Il tuo obiettivo è farli passare, non "finire il codice".
- **Aggiorna `docs/PROGRESS.md` alla fine di ogni blocco di lavoro**: cosa è fatto, cosa manca, quali decisioni hai preso e perché, dove ti sei fermato. Una sessione futura deve poter riprendere leggendo solo quel file.
- **Se una missione è troppo grande per una sessione**, fermati a un punto di coerenza (test verdi, commit pulito) e scrivilo in PROGRESS.md. Mai lasciare il repo rotto.
- **Non chiedere permesso per scrivere test.** Sono parte del lavoro, sempre.

### Cancello di fine missione

Una missione è chiusa solo se **tutti** questi comandi passano:

```bash
pnpm typecheck     # nessun errore TypeScript
pnpm lint          # nessun warning
pnpm test          # unit + isolamento tenant
pnpm test:e2e      # flussi pubblici (dalla missione 3 in poi)
pnpm build         # build produzione
```

Se non passano, la missione non è finita. Non dichiararla conclusa.

---

## Convenzioni di codice

- TypeScript `strict`. Nessun `any`, nessun `@ts-ignore` senza commento che spieghi.
- Validazione input con Zod, schemi in `packages/types`, condivisi fra API e web.
- Logica di dominio in `packages/core` come **funzioni pure**: nessun accesso a database, nessuna chiamata di rete. Testabili in isolamento.
- API: errori sempre nel formato
  ```json
  { "error": { "code": "SLOT_UNAVAILABLE", "message": "Questa fascia non è più disponibile.", "details": {} } }
  ```
  `message` è già in lingua e mostrabile all'utente. Mai stack trace, mai messaggi del database.
- Nomi tabelle: `RestaurantTable`, non `Table` (parola riservata SQL).
- Commit: `feat(prenotazioni): calcolo disponibilità con controllo ritmo`. Un commit per unità logica, non uno per sessione.

---

## Struttura

```
bigant-book/
├── apps/
│   ├── web/          Next.js — pannello locale + pagine pubbliche + PWA
│   └── api/          Fastify — API REST
├── packages/
│   ├── database/     schema.prisma, migrazioni, seed
│   ├── types/        tipi + schemi Zod condivisi
│   ├── core/         dominio puro (disponibilità, normalizzazione telefono)
│   ├── i18n/         stringhe it/en
│   └── ui/           componenti condivisi
└── docs/
    ├── SPEC.md       specifica completa
    ├── MISSIONS.md   le missioni e i loro criteri di accettazione
    ├── PROGRESS.md   stato di avanzamento (tu lo aggiorni)
    └── BACKLOG.md    tutto ciò che è stato rimandato (tu ci scrivi)
```

**Niente app nativa.** Il titolare usa la PWA installabile. Non creare `apps/mobile`.

---

## Cosa NON fare mai

- Non inventare funzioni non richieste, nemmeno "utili".
- Non aggiungere dipendenze senza necessità reale. Prima verifica se si risolve con quello che c'è.
- Non creare astrazioni per casi che non esistono ancora.
- Non scrivere `console.log` nel codice consegnato.
- Non lasciare `TODO` senza una riga corrispondente in `BACKLOG.md`.
- Non mettere dati personali nei log applicativi né nelle query string.
- Non usare `localStorage` per dati sensibili o token di lunga durata.
- Non implementare CAPTCHA nell'MVP: honeypot e rate limit bastano.

---

## Dati di prova

Il seed crea **due tenant completi e diversi**, mai uno solo: serve a rendere evidente ogni errore di isolamento.

- **Trattoria Santa Lucia** — 40 coperti, turno 90 min, ritmo 12, conferma automatica
- **Lido Miseno** — 120 coperti, turno 120 min, ritmo 25, conferma manuale

Accessi: `owner@santalucia.test` e `owner@lidomiseno.test`, password `bigant2026`.
