import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const routeScreens = [
  { path: '/', image: 'public-home' },
  { path: '/services', image: 'public-services' },
  { path: '/plans', image: 'public-plans' },
  { path: '/apply', image: 'public-application' },
  { path: '/apply/verify?token=demo-token' },
  { path: '/apply/status?token=64a200000000000000000001' },
  { path: '/order-status?token=demo-order-650000000000000000000001' },
  { path: '/change-password?forced=1' },
  { path: '/login', image: 'partner-login' },
  { path: '/forgot-password' },
  { path: '/reset-password?token=demo-token' },
  { path: '/2fa/verify' },
  { path: '/admin/login', image: 'admin-login' },
  { path: '/admin/forgot-password' },
  { path: '/admin/2fa/setup' },
  { path: '/admin/2fa/verify' },
  { path: '/admin' },
  { path: '/admin/applications' },
  { path: '/admin/partners' },
  { path: '/admin/users' },
  { path: '/admin/audit' },
  { path: '/partner' },
  { path: '/partner/profile' },
  { path: '/partner/network' },
];

test('public and authentication screens fit desktop, tablet, and mobile viewports', async ({
  browser,
}) => {
  test.setTimeout(90_000);
  mkdirSync(join(process.cwd(), 'docs/screenshots'), { recursive: true });
  const errors: string[] = [];
  for (const width of [375, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.addInitScript(() => {
      localStorage.setItem('franchise-crm-api-mode', 'mock');
      localStorage.setItem('franchise-crm-mock-error-rate', '0');
      if (location.pathname.startsWith('/admin'))
        localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000001');
      if (location.pathname.startsWith('/partner'))
        localStorage.setItem('franchise-crm-demo-user', '64a100000000000000000002');
    });
    page.on('pageerror', (error) => errors.push(`${width}px page error: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`${width}px console error: ${message.text()}`);
    });
    for (const screen of routeScreens) {
      const response = await page.goto(screen.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${width}px ${screen.path} response`).toBe(200);
      await expect(page.locator('h1').first(), `${width}px ${screen.path} heading`).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);
      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(hasHorizontalOverflow, `${width}px ${screen.path} horizontal overflow`).toBe(false);
      if (width === 1280 && screen.image) {
        await page.waitForTimeout(550);
        await page.screenshot({
          path: join('docs/screenshots', `${screen.image}-1280.png`),
          fullPage: true,
        });
      }
    }
    await page.close();
  }
  expect(errors).toEqual([]);
});

test('public service and application actions lead through the demo application flow', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('franchise-crm-api-mode', 'mock');
    localStorage.setItem('franchise-crm-mock-error-rate', '0');
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Browse services' }).click();
  await expect(page).toHaveURL(/\/services$/);
  await page.goto('/plans');
  await page
    .getByRole('link', { name: /Apply for this path/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/apply\?tier=retailer$/);
  await expect(page.getByLabel('Partner tier requested')).toHaveValue('retailer');
  await page.getByLabel('Your full name').fill('Mira Kulkarni');
  await page.getByLabel('Email address').fill('mira@example.demo');
  await page.getByLabel('Mobile number').fill('+919876543210');
  await page.getByLabel('Business name').fill('Kulkarni Digital Desk');
  await page.getByLabel('Business legal type').fill('Sole proprietorship');
  await page.getByLabel('City').fill('Pune');
  await page.getByLabel('State').fill('Maharashtra');
  await page.getByLabel('Six-digit PIN code').fill('411001');
  await page.getByRole('button', { name: 'Check territory availability' }).click();
  await expect(page.getByRole('status')).toContainText('Applications are available');
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.getByRole('status')).toContainText('Application received');
  await page.getByRole('link', { name: 'Check an application' }).click();
  await expect(page.getByRole('heading', { name: 'Check an application' })).toBeVisible();
  await expect(page.locator('.status-badge')).toContainText('submitted');
});

test('customer can use a tokenized demo order link and retailer is required to change the first password', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('franchise-crm-api-mode', 'mock');
    localStorage.setItem('franchise-crm-mock-error-rate', '0');
  });
  await page.goto('/order-status?token=demo-order-650000000000000000000001');
  await expect(page.locator('.status-badge')).toContainText('submitted');
  await page.goto('/login');
  await page.getByRole('button', { name: /Retailer · retailer@servicenetwork.demo/ }).click();
  await expect(page).toHaveURL(/\/change-password\?forced=1$/);
  await page.getByLabel('Temporary password').fill('demo-password');
  await page.getByLabel('New password', { exact: true }).fill('AshaDemoPassword2026!');
  await page.getByLabel('Confirm new password', { exact: true }).fill('AshaDemoPassword2026!');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('status')).toContainText('Password updated');
  await page.getByRole('button', { name: 'Partner workspace' }).click();
  await expect(page).toHaveURL(/\/partner$/);
});
