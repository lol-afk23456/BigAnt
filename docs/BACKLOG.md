# Backlog

- M1 completata: motore, concorrenza, stati, telefono E.164 e API.
- M2 completata: interfaccia e cancello finale verdi. Email e telefono obbligatori in input; colonne nullable per anonimizzazione M5.
- M3 completata: menu, quattro template e visibilità separata dall’esaurimento, approvati dall’utente. M4–M6 restano successive.
- M5: notifiche reali, privacy, cancellazione/retention e consenso; dati sanitari esclusi dagli export non necessari.
- M6: store condiviso per rate limit se si avviano più repliche API; proxy fidati e TLS; infrastruttura e log esclusivamente EU. In M0 una sola istanza, rate limit in memoria.
- M6: credenziali DB con privilegi minimi e verifica residenza EU; nessun servizio remoto è provisionato da M0.
- Fase 2 esclusa: fidelity, pagamenti/acconti, sincronizzazione canali, voce, multi-sede, turni, agenti AI e cassa.

- M5–M6: la scelta Resend della SPEC va rivista per il vincolo EU: i metadati/log restano USA anche scegliendo Irlanda. Verificare anche metadati Sentry, filiera SMS, CDN/log e backup; dettagli in SERVIZI_ESTERNI.md.
- M6: onboarding di tenant reali e scelta locale al login oltre i due demo; recovery password e processo di gestione account da definire. Attualmente il pannello di prova propone i soli due tenant seed.
- M6: dimensionare query disponibilità sullo storico reale e infrastruttura in base ai volumi prima del lancio; ora i dati attivi del tenant vengono letti per rivalidare sotto lock.

- M6: immagini menu locali da trasferire a storage persistente EU; includere foto nei backup, pulizia file orfani e controllo limite disco. Aggiornamento pubblico periodico: dimensionare rate limit/proxy per richieste SSR aggregate prima del deploy.

- M6: CSP del menu deve autorizzare lo script di aggiornamento tramite nonce/hash oppure servirlo come asset esterno; verificare prestazioni e cache su immagini reali e infrastruttura remota.
