export const messages = {
  it: {
    INVALID_INPUT: 'Controlla i dati inseriti e riprova.',
    UNAUTHORIZED: 'Accedi nuovamente per continuare.',
    INVALID_CREDENTIALS: 'Locale, email o password non corretti. Controlla e riprova.',
    RATE_LIMITED: 'Troppi tentativi. Attendi prima di riprovare.',
    NOT_FOUND: 'Risorsa non trovata.',
    INTERNAL_ERROR: 'Operazione non riuscita. Riprova più tardi.',
  },
  en: {
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
