# Decisioni approvate

Registro al 17 settembre 2026. Fonte: richieste dell’utente e risoluzioni tecniche riportate in PROGRESS. Le scelte già risolte non richiedono una nuova conferma; i fornitori restano candidati fino alla verifica/attivazione.

| ID | Decisione | Implicazione |
| --- | --- | --- |
| D01 | Una piattaforma, esperienza dedicata a ogni locale | URL cliente/staff per slug; dati isolati nel data layer. Il selettore dei due demo non è la pagina del ristorante |
| D02 | Tema esclusivamente scuro, arancione iniziale | Nessun tema chiaro; personalizzazione del colore menu nei controlli approvati |
| D03 | Prenotazione su pagina unica progressiva | Contatti dopo la fascia; numero persone con pulsanti; richieste facoltative collassate |
| D04 | Email e telefono entrambi obbligatori | Nullabili nel database soltanto per esigenze di anonimizzazione, non nel form |
| D05 | Oggi pieno/chiuso → primo giorno utile | Alternative con tono invitante, senza schermata vuota |
| D06 | Quattro template menu, un colore e una copertina | Essenziale, Pop, Elegante e Pub; stessi contenuti e funzioni |
| D07 | Occhio separato da esaurito | Nascosto escluso dal pubblico; esaurito pubblico in grigio |
| D08 | Test frontend leggeri | Pochi scenari principali estesi; backend per isolamento, concorrenza e regole di dominio |
| D09 | Prova iniziale sul Mac; GitHub alla fine | Nessun deploy, invito o pubblicazione implicito nella prova locale |
| D10 | Report dedicato ai servizi esterni | Email/SMS/push e infrastruttura da collegare in M5–M6; account e budget prima dell’attivazione |
| D11 | Consolidare la demo prima di M4 | Ingressi dedicati, navigazione persistente, menu senza reload e documenti coerenti |

## Interpretazioni tecniche già risolte

- SPEC elenca 14 modelli; M0 li implementa tutti più StaffSession. Tenant è la radice, gli altri modelli hanno tenant_id.
- Contesto tenant obbligatorio; al suo interno il data layer impone il filtro anche se il chiamante lo omette. Nessuna RLS dichiarata per accessi diretti privilegiati al DB.
- Se assegnazione automatica attiva e nessun tavolo compatibile libero, la fascia non è prenotabile. Senza automatismo valgono capienza e ritmo.
- Gli avvii conservano le prove. Il consolidamento può aggiornare solo placeholder seed originali mai modificati, con confronti atomici; nessun reset del database di sviluppo.
- La pagina feedback presenta a tutti Google e privato prima del voto. Nessuna soglia per scegliere il canale o escludere alert sui nuovi feedback privati.
- M4 usa segnalazioni interne nel pannello per tutti i privati non letti; email e push reali restano M5. Card modificabili dal titolare, consultabili dallo staff. Place ID seed dimostrativi: esito locale, niente apertura Google.
- Gli spunti sala/attesa del 17 settembre richiedono verifica delle funzioni già presenti, come precisato dall’utente. Analisi e preferenze aperte in [SALA_E_ATTESA](SALA_E_ATTESA.md); nessuna duplicazione del motore e nessuna estensione implementata in M4.

## Scelte ancora aperte

Dominio, intestatario account, budget e volumi; fornitore SMS e verifica della filiera push/EU; infrastruttura e gestione degli incidenti; obiettivi backup/recupero; dati e testi del locale reale. Prima di M5 va aggiornata la deduplicazione NotificationLog con nuova migrazione. Dettagli in [BACKLOG](BACKLOG.md) e [servizi esterni](SERVIZI_ESTERNI.md).
