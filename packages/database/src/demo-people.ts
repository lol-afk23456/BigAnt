// Identità e messaggi interamente inventati, utilizzabili solo nella demo.
const names = ['Giulia', 'Marco', 'Elena', 'Luca', 'Sara', 'Paolo', 'Chiara', 'Andrea', 'Francesca', 'Davide'];
const surnames = ['Rossi', 'Bianchi', 'Esposito', 'Romano', 'Ferrari', 'Russo', 'Marino', 'Costa', 'Conti', 'Gallo'];
export function demoCustomerName(tenantIndex: number, index: number) {
  const number = tenantIndex * 40 + index;
  return `${names[number % names.length]} ${surnames[Math.floor(number / names.length) % surnames.length]}`;
}
export const demoComments = [
  'DEMO · Abbiamo aspettato molto prima di ordinare. Sarebbe utile avvisare dei tempi.',
  'DEMO · Il servizio era cortese, ma il tavolo era vicino al passaggio. Preferiremmo una zona tranquilla.',
  'DEMO · Piatti buoni; il menu digitale ci ha aiutato a controllare gli allergeni.',
  'DEMO · Bella serata, accoglienza gentile e prenotazione facile dal telefono.',
  'DEMO · Ottima esperienza: abbiamo trovato subito il tavolo e torneremo volentieri.',
];
