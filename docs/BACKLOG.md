# Backlog

- M1: motore di prenotazione, concorrenza, stati, telefono E.164, API. Non iniziato.
- M2: interfaccia; applicare tutte le decisioni utente registrate in PROGRESS.md. Email e telefono obbligatori in input; colonne nullable per consentire anonimizzazione M5.
- M3–M6: come MISSIONS.md, senza anticipazioni.
- M5: notifiche reali, privacy, cancellazione/retention e consenso; dati sanitari esclusi dagli export non necessari.
- M6: store condiviso per rate limit se si avviano più repliche API; proxy fidati e TLS; infrastruttura e log esclusivamente EU. In M0 una sola istanza, rate limit in memoria.
- M6: credenziali DB con privilegi minimi e verifica residenza EU; nessun servizio remoto è provisionato da M0.
- Fase 2 esclusa: fidelity, pagamenti/acconti, sincronizzazione canali, voce, multi-sede, turni, agenti AI e cassa.
