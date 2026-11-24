import { expect, test } from '@playwright/test';

test('public site renders the franchise landing page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('local service business');
});

test('API health is reachable through the local proxy', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: 'ok' });
});

test('partner and admin routes redirect to login placeholders', async ({ page }) => {
  await page.goto('/partner');
  await expect(page).toHaveURL(/\/login$/);

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login$/);
});
