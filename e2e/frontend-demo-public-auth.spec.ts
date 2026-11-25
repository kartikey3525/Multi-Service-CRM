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
  { path: '/admin', image: 'admin-home' },
  { path: '/admin/applications', image: 'admin-applications' },
  { path: '/admin/partners', image: 'admin-partners' },
  { path: '/admin/orders', image: 'admin-orders' },
  { path: '/admin/services', image: 'admin-services' },
  { path: '/admin/commissions', image: 'admin-commissions' },
  { path: '/admin/wallet/topups', image: 'admin-topups' },
  { path: '/admin/ledger', image: 'admin-ledger' },
  { path: '/admin/payouts', image: 'admin-payouts' },
  { path: '/admin/tickets', image: 'admin-tickets' },
  { path: '/admin/reports', image: 'admin-reports' },
  { path: '/admin/content', image: 'admin-content' },
  { path: '/admin/users', image: 'admin-users' },
  { path: '/admin/roles', image: 'admin-roles' },
  { path: '/admin/audit', image: 'admin-audit' },
  { path: '/admin/settings', image: 'admin-settings' },
  { path: '/partner', image: 'partner-home' },
  { path: '/partner/services', image: 'partner-services' },
  { path: '/partner/orders', image: 'partner-orders' },
  { path: '/partner/wallet', image: 'partner-wallet' },
  { path: '/partner/commissions', image: 'partner-commissions' },
  { path: '/partner/payouts', image: 'partner-payouts' },
  { path: '/partner/customers', image: 'partner-customers' },
  { path: '/partner/tickets', image: 'partner-tickets' },
  { path: '/partner/notices', image: 'partner-notices' },
  { path: '/partner/team', image: 'partner-team' },
  { path: '/partner/profile', image: 'partner-profile' },
  { path: '/partner/network', image: 'partner-network' },
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
      const unlabeledButtons = await page
        .locator('button')
        .evaluateAll((buttons) =>
          buttons
            .map((button) => button.getAttribute('aria-label') ?? button.textContent?.trim() ?? '')
            .filter((label) => !label),
        );
      expect(unlabeledButtons, `${width}px ${screen.path} accessible button names`).toEqual([]);
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

test('partner places an order, requests funds, records customers and support, and manages their team', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('franchise-crm-api-mode', 'mock');
    localStorage.setItem('franchise-crm-mock-error-rate', '0');
  });
  await page.goto('/login');
  await page.getByRole('button', { name: /Master distributor/ }).click();
  await expect(page).toHaveURL(/\/partner$/);
  await expect(page.getByText('Available wallet')).toBeVisible();

  await page.goto('/partner/services');
  await page.getByLabel('Customer name').first().fill('Asha Kulkarni');
  await page.getByRole('button', { name: 'Place order' }).first().click();
  await expect(page.getByRole('status')).toContainText('Order SN-26-');

  await page.goto('/partner/wallet');
  await page.getByLabel('Amount (₹)').fill('1200.50');
  await page.getByLabel('Bank reference').fill('DEMO-BANK-8831');
  await page.getByRole('button', { name: 'Send for approval' }).click();
  await expect(page.getByRole('status')).toContainText('Top-up request sent');

  await page.goto('/partner/customers');
  await page.getByLabel('Full name').fill('Sana Merchant');
  await page.getByLabel('Mobile').fill('+919876543219');
  await page.getByLabel('Customer consent recorded').check();
  await page.getByRole('button', { name: 'Add customer' }).click();
  await expect(page.getByRole('status')).toContainText('Customer added');

  await page.goto('/partner/tickets');
  await page.getByLabel('Subject').fill('Need help with service documents');
  await page.getByLabel('Details').fill('Please confirm the required attachment format.');
  await page.getByRole('button', { name: 'Create ticket' }).click();
  await expect(page.getByRole('status')).toContainText('Support request created');

  await page.goto('/partner/team');
  await page.getByLabel('Team member name').fill('Nikhil Rao');
  await page.getByLabel('Email', { exact: true }).fill('nikhil.staff@example.demo');
  await page.getByLabel('View orders').check();
  await page.getByRole('button', { name: 'Create staff invitation' }).click();
  await expect(page.getByRole('status')).toContainText('Staff invitation is ready');
  await expect(page.getByText('nikhil.staff@example.demo')).toBeVisible();
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

test('admin can approve a top-up, save GST settings, export a report, and inspect its audit trail', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('franchise-crm-api-mode', 'mock');
    localStorage.setItem('franchise-crm-mock-error-rate', '0');
  });
  await page.goto('/admin/login');
  await page.getByRole('button', { name: /Super administrator/ }).click();
  await page.getByLabel('Authenticator code').fill('123456');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await expect(page.getByRole('heading', { name: 'Save your recovery codes' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/wallet/topups');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Approve' }).first().click();
  await expect(page.getByRole('status')).toContainText('Top-up approved');
  await page.goto('/admin/settings');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByRole('status')).toContainText('Portal settings saved');
  await page.goto('/admin/reports');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await download).suggestedFilename()).toBe('franchise-demo-report.csv');
  await page.goto('/admin/audit');
  await expect(page.getByText('settings.updated')).toBeVisible();
});
