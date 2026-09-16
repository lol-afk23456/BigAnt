import { expect, test } from '@playwright/test';
// M0: solo verifica HTTP della pagina vuota, nessun flusso di prodotto.
test('Next.js serve la pagina vuota in italiano', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('<html lang="it">');
});
