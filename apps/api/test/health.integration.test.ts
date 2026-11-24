import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import mongoose from 'mongoose';
import { NestFactory } from '@nestjs/core';
import { authenticator } from 'otplib';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { requestIdMiddleware } from '../src/common/request-id.middleware';
import { AuditModel, EmailOutboxModel, RoleModel, UserModel } from '../src/modules/identity/models';
import { hashPassword } from '../src/modules/identity/security';
import { makePartnerFixture } from './factories/partner.factory';

const testUri = process.env.MONGODB_TEST_URI;

test(
  'API readiness and request IDs against a throwaway MongoDB database',
  {
    skip: testUri ? false : 'Set MONGODB_TEST_URI to a test-only MongoDB replica set.',
  },
  async () => {
    if (!testUri) throw new Error('MONGODB_TEST_URI is required for this integration test.');
    const parsedUri = new URL(testUri);
    assert.match(
      parsedUri.pathname,
      /(?:^|_)test(?:_|$)/i,
      'MONGODB_TEST_URI must select a test-only database',
    );
    const databaseName = `franchise_crm_test_${randomUUID().replaceAll('-', '')}`;
    parsedUri.pathname = `/${databaseName}`;

    assert.match(databaseName, /^franchise_crm_test_/);
    const fixture = makePartnerFixture();
    assert.equal(fixture.path[0], fixture._id);
    assert.match(fixture.email, /@example\.test$/);

    let app: Awaited<ReturnType<typeof NestFactory.create>> | undefined;
    try {
      await mongoose.connect(parsedUri.toString());
      app = await NestFactory.create(AppModule, { logger: false });
      app.use(requestIdMiddleware);
      app.setGlobalPrefix('api');
      app.useGlobalFilters(new HttpExceptionFilter());
      await app.init();
      const healthy = await request(app.getHttpServer()).get('/api/health').expect(200);
      assert.deepEqual(healthy.body, { status: 'ok' });
      assert.match(String(healthy.headers['x-request-id']), /^[0-9a-f-]{36}$/i);

      const retailer = await RoleModel.findOne({ key: 'retailer', kind: 'partner' });
      const superAdmin = await RoleModel.findOne({ key: 'super_admin', kind: 'admin' });
      assert.ok(retailer && superAdmin);
      const admin = await UserModel.create({
        email: `admin-${randomUUID()}@example.test`,
        name: 'Test Administrator',
        passwordHash: await hashPassword('M1-integration-admin-password'),
        kind: 'admin',
        roleIds: [superAdmin._id],
        status: 'active',
        totpEnabled: false,
        failedLogins: 0,
      });
      const csrf = await request(app.getHttpServer()).get('/api/v1/auth/csrf').expect(200);
      const csrfCookie = cookiePair(csrf.headers['set-cookie'], 'csrf_token');
      const adminLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/admin/login')
        .set('Cookie', csrfCookie)
        .set('X-CSRF-Token', csrf.body.csrfToken as string)
        .send({ email: admin.email, password: 'M1-integration-admin-password' })
        .expect(201);
      assert.equal(adminLogin.body.requiresTotpSetup, true);
      const preAuthCookies = combineCookies(adminLogin.headers['set-cookie'], [
        'admin_pre_auth',
        'csrf_token',
      ]);
      const pendingCsrf = adminLogin.body.csrfToken as string;
      const setup = await request(app.getHttpServer())
        .post('/api/v1/auth/2fa/setup')
        .set('Cookie', preAuthCookies)
        .set('X-CSRF-Token', pendingCsrf)
        .send({})
        .expect(201);
      const adminCode = authenticator.generate(setup.body.secret as string);
      const verified = await request(app.getHttpServer())
        .post('/api/v1/auth/2fa/verify')
        .set('Cookie', preAuthCookies)
        .set('X-CSRF-Token', pendingCsrf)
        .send({ code: adminCode })
        .expect(201);
      assert.equal((verified.body.recoveryCodes as string[]).length, 10);
      const adminCookies = combineCookies(verified.headers['set-cookie'], [
        'admin_session',
        'csrf_token',
      ]);
      const adminCsrf = verified.body.csrfToken as string;
      const me = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', adminCookies)
        .expect(200);
      assert.equal(me.body.user.email, admin.email);

      const created = await request(app.getHttpServer())
        .post('/api/v1/admin/users')
        .set('Cookie', adminCookies)
        .set('X-CSRF-Token', adminCsrf)
        .send({
          email: `new-${randomUUID()}@example.test`,
          name: 'New Partner',
          password: 'M1-integration-user-password',
          kind: 'partner',
          roleIds: [String(retailer._id)],
        })
        .expect(201);
      assert.equal(created.body.kind, 'partner');
      assert.equal('passwordHash' in created.body, false);
      const audit = await request(app.getHttpServer())
        .get(`/api/v1/admin/audit?actorUserId=${String(admin._id)}&entity=users&action=create`)
        .set('Cookie', adminCookies)
        .expect(200);
      assert.equal(audit.body.total, 1);

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', adminCookies)
        .set('X-CSRF-Token', adminCsrf)
        .send({})
        .expect(201);
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', adminCookies)
        .expect(401);

      const partner = await UserModel.create({
        email: `partner-${randomUUID()}@example.test`,
        name: 'Test Partner',
        passwordHash: await hashPassword('M1-integration-partner-password'),
        kind: 'partner',
        roleIds: [retailer._id],
        status: 'active',
        totpEnabled: false,
        failedLogins: 0,
      });
      const partnerCsrf = await request(app.getHttpServer()).get('/api/v1/auth/csrf').expect(200);
      const partnerLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Cookie', cookiePair(partnerCsrf.headers['set-cookie'], 'csrf_token'))
        .set('X-CSRF-Token', partnerCsrf.body.csrfToken as string)
        .send({ email: partner.email, password: 'M1-integration-partner-password' })
        .expect(201);
      const partnerCookies = combineCookies(partnerLogin.headers['set-cookie'], [
        'partner_session',
        'csrf_token',
      ]);
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', partnerCookies)
        .expect(200);
      await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Cookie', partnerCookies)
        .expect(403);

      const forgotCsrf = await request(app.getHttpServer()).get('/api/v1/auth/csrf').expect(200);
      await request(app.getHttpServer())
        .post('/api/v1/auth/password/forgot')
        .set('Cookie', cookiePair(forgotCsrf.headers['set-cookie'], 'csrf_token'))
        .set('X-CSRF-Token', forgotCsrf.body.csrfToken as string)
        .send({ email: partner.email })
        .expect(201, { accepted: true });
      const resetEmail = await EmailOutboxModel.findOne({
        to: partner.email,
        template: 'password_reset',
      });
      assert.ok(resetEmail);
      const variables: unknown = resetEmail.variables;
      const resetUrl =
        variables instanceof Map
          ? (variables.get('resetUrl') as string | undefined)
          : (variables as Record<string, string>).resetUrl;
      assert.ok(resetUrl);
      const resetToken = new URL(resetUrl).searchParams.get('token');
      assert.ok(resetToken);
      const resetCsrf = await request(app.getHttpServer()).get('/api/v1/auth/csrf').expect(200);
      await request(app.getHttpServer())
        .post('/api/v1/auth/password/reset')
        .set('Cookie', cookiePair(resetCsrf.headers['set-cookie'], 'csrf_token'))
        .set('X-CSRF-Token', resetCsrf.body.csrfToken as string)
        .send({ token: resetToken, password: 'M1-integration-reset-password' })
        .expect(201, { status: 'password_updated' });
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', partnerCookies)
        .expect(401);

      const reLoginCsrf = await request(app.getHttpServer()).get('/api/v1/auth/csrf').expect(200);
      const reLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Cookie', cookiePair(reLoginCsrf.headers['set-cookie'], 'csrf_token'))
        .set('X-CSRF-Token', reLoginCsrf.body.csrfToken as string)
        .send({ email: partner.email, password: 'M1-integration-reset-password' })
        .expect(201);
      const resetSessionCookies = combineCookies(reLogin.headers['set-cookie'], [
        'partner_session',
        'csrf_token',
      ]);
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', resetSessionCookies)
        .expect(200);
      await request(app.getHttpServer())
        .post('/api/v1/auth/password/change')
        .set('Cookie', resetSessionCookies)
        .set('X-CSRF-Token', reLogin.body.csrfToken as string)
        .send({
          currentPassword: 'M1-integration-reset-password',
          newPassword: 'M1-integration-changed-password',
        })
        .expect(201, { status: 'password_updated' });
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', resetSessionCookies)
        .expect(401);
      const changedPasswordCsrf = await request(app.getHttpServer())
        .get('/api/v1/auth/csrf')
        .expect(200);
      const changedPasswordLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Cookie', cookiePair(changedPasswordCsrf.headers['set-cookie'], 'csrf_token'))
        .set('X-CSRF-Token', changedPasswordCsrf.body.csrfToken as string)
        .send({ email: partner.email, password: 'M1-integration-changed-password' })
        .expect(201);
      const changedPasswordCookies = combineCookies(changedPasswordLogin.headers['set-cookie'], [
        'partner_session',
        'csrf_token',
      ]);
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', changedPasswordCookies)
        .set('X-CSRF-Token', changedPasswordLogin.body.csrfToken as string)
        .send({})
        .expect(201);

      const lockoutUser = await UserModel.create({
        email: `lockout-${randomUUID()}@example.test`,
        name: 'Lockout Test',
        passwordHash: await hashPassword('M1-integration-lockout-password'),
        kind: 'partner',
        roleIds: [retailer._id],
        status: 'active',
        totpEnabled: false,
        failedLogins: 0,
      });
      const maximumAttempts = Number(process.env.LOGIN_MAX_ATTEMPTS ?? 5);
      for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
        const attemptCsrf = await request(app.getHttpServer()).get('/api/v1/auth/csrf').expect(200);
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .set('Cookie', cookiePair(attemptCsrf.headers['set-cookie'], 'csrf_token'))
          .set('X-CSRF-Token', attemptCsrf.body.csrfToken as string)
          .send({ email: lockoutUser.email, password: 'incorrect-password' })
          .expect(401);
      }
      const lockedUser = await UserModel.findById(lockoutUser._id).select(
        'failedLogins lockedUntil',
      );
      assert.ok((lockedUser?.failedLogins ?? 0) >= maximumAttempts);
      assert.ok(lockedUser?.lockedUntil && lockedUser.lockedUntil > new Date());
      const lockedCsrf = await request(app.getHttpServer()).get('/api/v1/auth/csrf').expect(200);
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Cookie', cookiePair(lockedCsrf.headers['set-cookie'], 'csrf_token'))
        .set('X-CSRF-Token', lockedCsrf.body.csrfToken as string)
        .send({ email: lockoutUser.email, password: 'M1-integration-lockout-password' })
        .expect(401);

      await assert.rejects(() => AuditModel.updateOne({}, { $set: { action: 'changed' } }));
      await assert.rejects(() => AuditModel.deleteOne({}));

      await mongoose.disconnect();
      const unavailable = await request(app.getHttpServer()).get('/api/health').expect(503);
      assert.equal(unavailable.body.code, 'INTERNAL_ERROR');
      assert.equal(unavailable.body.message, 'An unexpected error occurred.');
      assert.equal(unavailable.body.requestId, unavailable.headers['x-request-id']);
    } finally {
      await app?.close();
      if (mongoose.connection.readyState === 0) await mongoose.connect(parsedUri.toString());
      await mongoose.connection.dropDatabase().catch(() => undefined);
      await mongoose.disconnect();
    }
  },
);

function cookiePair(cookies: string[] | string | undefined, name: string): string {
  const header = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
  const cookie = header.find((entry) => entry.startsWith(`${name}=`))?.split(';', 1)[0];
  assert.ok(cookie, `expected ${name} cookie`);
  return cookie;
}

function combineCookies(cookies: string[] | string | undefined, names: string[]): string {
  return names.map((name) => cookiePair(cookies, name)).join('; ');
}
