import { expect, test } from '@playwright/test';
// Smoke HTTP della home, distinto dai due percorsi browser essenziali.
test('Next.js serve la home in italiano', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('<html lang="it">');
});
