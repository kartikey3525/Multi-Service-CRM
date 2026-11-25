import { expect, test } from '@playwright/test';

test('partner can enter the mock workspace from the public shell', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Preview demo data' }).click();
  await expect(page.getByRole('button', { name: 'Demo data on · exit' })).toBeVisible();
  await page.goto('/login');
  await page.getByLabel('Email address').fill('partner@servicenetwork.demo');
  await page.getByLabel('Password').fill('demo-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/partner$/);
  await expect(page.getByRole('heading', { name: 'Riya Kapoor' })).toBeVisible();
});

test('admin mock sign-in keeps the second-factor step', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Preview demo data' }).click();
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill('admin@servicenetwork.demo');
  await page.getByLabel('Password').fill('demo-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/2fa\/verify$/);
  await page.getByLabel('Authenticator code').fill('123456');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await expect(page.getByRole('heading', { name: 'Save your recovery codes' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Avery Mehta' })).toBeVisible();
});
