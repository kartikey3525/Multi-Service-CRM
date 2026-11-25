import { expect, test } from '@playwright/test';

test('public site renders the franchise landing page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('local service business');
});

test('partner application checks availability and submits for email verification', async ({
  page,
}) => {
  await page.route('**/api/v1/public/territories/availability**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ available: true }),
    }),
  );
  await page.route('**/api/v1/auth/csrf', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: 'csrf-test-token' }),
    }),
  );
  await page.route('**/api/v1/public/applications', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ accepted: true, verificationRequired: true }),
    }),
  );
  await page.goto('/apply');
  await page.getByLabel('Your full name').fill('Applicant Test');
  await page.getByLabel('Email address').fill('applicant@example.test');
  await page.getByLabel('Mobile number').fill('+919876543210');
  await page.getByLabel('Business name').fill('Test Services');
  await page.getByLabel('Business legal type').fill('Sole proprietorship');
  await page.getByLabel('City').fill('New Delhi');
  await page.getByLabel('State').fill('Delhi');
  await page.getByLabel('Six-digit PIN code').fill('110001');
  await page.getByRole('button', { name: 'Check territory availability' }).click();
  await expect(page.getByRole('status')).toContainText('Applications are available');
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.getByRole('status')).toContainText('Check your email');
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

test('admin navigation only shows links allowed by the signed-in role', async ({ page }) => {
  await page.route('**/api/v1/auth/me', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          email: 'finance@example.test',
          name: 'Finance user',
          kind: 'admin',
          roleNames: ['Finance'],
          roleKeys: ['finance'],
          permissions: ['identity.me', 'wallet.read', 'plans.read'],
          totpEnabled: true,
        },
      }),
    }),
  );

  await page.goto('/admin');
  await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Audit log' })).toHaveCount(0);
});

test('partner profile exposes authenticator enrollment and recovery codes', async ({ page }) => {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          email: 'partner@example.test',
          name: 'Partner',
          kind: 'partner',
          roleNames: ['Retailer'],
          permissions: ['identity.me'],
          totpEnabled: false,
        },
      }),
    }),
  );
  await page.route('**/api/v1/auth/2fa/setup', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUrl: 'otpauth://totp/CRM:partner?secret=JBSWY3DPEHPK3PXP',
      }),
    }),
  );
  await page.route('**/api/v1/auth/2fa/verify', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ recoveryCodes: ['recovery-one', 'recovery-two'] }),
    }),
  );

  await page.goto('/partner');
  await page.getByRole('button', { name: 'Set up authenticator' }).click();
  await expect(page.getByText(/otpauth:\/\/totp/)).toBeVisible();
  await page.getByLabel('Authenticator code').fill('123456');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await expect(page.getByText('recovery-one')).toBeVisible();
});
