export const messages = {
  it: {
    ADMIN_CREDENTIALS: 'Email o password amministratore non corrette.',
    ADMIN_CONFLICT: 'Questo indirizzo o identificativo è già utilizzato. Controlla i dati.',
    LAST_OWNER: 'Mantieni almeno un titolare attivo. Aggiungi prima un altro titolare.',
    ACCESS_EXPIRED: 'Il link è scaduto o è già stato utilizzato. Richiedine uno nuovo al tuo referente.',
    CARD_COOLDOWN: 'Questa card ha già ricevuto un invio negli ultimi dieci minuti. Puoi tornare con calma più tardi.',
    INVALID_IMAGE: 'Scegli una foto JPEG, PNG o WebP valida fino a 5 MB e riprova.',
    CATEGORY_NOT_EMPTY: 'Sposta o rimuovi i piatti prima di eliminare questa categoria.',
    INVALID_PHONE: 'Inserisci un numero di telefono valido, includendo il prefisso internazionale se non italiano.',
    INVALID_TRANSITION: 'Lo stato è cambiato o questa azione non è disponibile. Aggiorna la pagina.',
    SLOT_UNAVAILABLE: 'Questo orario non è più disponibile. Scegli uno degli altri orari proposti.',
    PACING_LIMIT: 'Per questo orario abbiamo raggiunto il numero di arrivi. Prova una fascia vicina.',
    TABLE_UNAVAILABLE: 'Il tavolo non è disponibile per questo gruppo o orario. Scegline un altro.',
    CANCELLATION_CLOSED: 'Per modificare questa prenotazione chiama direttamente il locale.',
    FORBIDDEN: 'Questa operazione richiede un accesso da titolare.',
    INVALID_INPUT: 'Controlla i dati inseriti e riprova.',
    UNAUTHORIZED: 'Accedi nuovamente per continuare.',
    INVALID_CREDENTIALS: 'Locale, email o password non corretti. Controlla e riprova.',
    RATE_LIMITED: 'Troppi tentativi. Attendi prima di riprovare.',
    NOT_FOUND: 'Risorsa non trovata.',
    INTERNAL_ERROR: 'Operazione non riuscita. Riprova più tardi.',
  },
  en: {
    ADMIN_CREDENTIALS: 'Incorrect administrator email or password.',
    ADMIN_CONFLICT: 'This email or identifier is already in use. Check the details.',
    LAST_OWNER: 'Keep at least one active owner. Add another owner first.',
    ACCESS_EXPIRED: 'This link has expired or has already been used. Ask your contact for a new one.',
    CARD_COOLDOWN: 'This card has already received a submission in the last ten minutes. You can come back later at your own pace.',
    INVALID_IMAGE: 'Choose a valid JPEG, PNG or WebP photo up to 5 MB and try again.',
    CATEGORY_NOT_EMPTY: 'Move or remove the dishes before deleting this category.',
    INVALID_PHONE: 'Enter a valid phone number, including the country code for numbers outside Italy.',
    INVALID_TRANSITION: 'The status has changed or this action is unavailable. Refresh the page.',
    SLOT_UNAVAILABLE: 'This time is no longer available. Choose another suggested time.',
    PACING_LIMIT: 'We have reached our arrival limit for this time. Try a nearby slot.',
    TABLE_UNAVAILABLE: 'This table is unavailable for this group or time. Choose another one.',
    CANCELLATION_CLOSED: 'Please call the venue directly to change this booking.',
    FORBIDDEN: 'This action requires an owner account.',
    INVALID_INPUT: 'Check your details and try again.',
    UNAUTHORIZED: 'Sign in again to continue.',
    INVALID_CREDENTIALS: 'Incorrect venue, email or password. Check and try again.',
    RATE_LIMITED: 'Too many attempts. Wait before trying again.',
    NOT_FOUND: 'Resource not found.',
    INTERNAL_ERROR: 'Something went wrong. Try again later.',
  },
} as const;
export type ErrorCode = keyof typeof messages.it;
export function errorBody(code: ErrorCode, language?: string) {
  return { error: { code, message: messages[language?.startsWith('en') ? 'en' : 'it'][code], details: {} } };
}

export * from './ui';

export * from './menu';
export * from './notifications';
export * from './console';
