import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import mongoose from 'mongoose';
import { NestFactory } from '@nestjs/core';
import { authenticator } from 'otplib';
import request from 'supertest';
import type { NextFunction, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { scopeToActor } from '../src/common/actor';
import { requestIdMiddleware } from '../src/common/request-id.middleware';
import { decryptField, hashPassword } from '../src/modules/identity/security';
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
    const databaseName = `crm_test_${randomUUID().replaceAll('-', '')}`;
    const immutableDatabaseName = `${databaseName}_immutable`;
    process.env.MONGODB_IMMUTABLE_DATABASE = immutableDatabaseName;
    const [
      { AppModule },
      { AuditModel, EmailOutboxModel, PasswordResetModel, RoleModel, UserModel },
      { ApplicationModel, KycDocumentModel, PartnerModel, PartnerUserModel, TerritoryModel },
    ] = await Promise.all([
      import('../src/app.module'),
      import('../src/modules/identity/models'),
      import('../src/modules/partners/models'),
    ]);
    parsedUri.pathname = `/${databaseName}`;

    assert.match(databaseName, /^crm_test_/);
    const fixture = makePartnerFixture();
    assert.equal(fixture.path[0], fixture._id);
    assert.match(fixture.email, /@example\.test$/);

    let app: Awaited<ReturnType<typeof NestFactory.create>> | undefined;
    try {
      await mongoose.connect(parsedUri.toString());
      app = await NestFactory.create(AppModule, { logger: false });
      const integrationIp = `198.51.100.${Math.floor(Math.random() * 254) + 1}`;
      app.use((request: ExpressRequest, _response: ExpressResponse, next: NextFunction) => {
        Object.defineProperty(request, 'ip', { value: integrationIp, configurable: true });
        next();
      });
      app.use(requestIdMiddleware);
      app.setGlobalPrefix('api');
      app.useGlobalFilters(new HttpExceptionFilter());
      await app.init();
      const healthy = await request(app.getHttpServer()).get('/api/health').expect(200);
      assert.deepEqual(healthy.body, { status: 'ok' });
      assert.match(String(healthy.headers['x-request-id']), /^[0-9a-f-]{36}$/i);

      await TerritoryModel.create({
        key: `test-${randomUUID()}`,
        name: 'Integration territory',
        state: 'Delhi',
        pinPrefixes: ['11'],
        exclusive: false,
        active: true,
      });
      const available = await request(app.getHttpServer())
        .get('/api/v1/public/territories/availability?state=Delhi&pin=110001')
        .expect(200);
      assert.equal(available.body.available, true);

      const applicationEmail = `application-${randomUUID()}@example.test`;
      const applicationCsrf = await request(app.getHttpServer())
        .get('/api/v1/auth/csrf')
        .expect(200);
      const applicationCookies = cookiePair(applicationCsrf.headers['set-cookie'], 'csrf_token');
      const submittedApplication = await request(app.getHttpServer())
        .post('/api/v1/public/applications')
        .set('Cookie', applicationCookies)
        .set('X-CSRF-Token', applicationCsrf.body.csrfToken as string)
        .send({
          applicantName: 'Integration Applicant',
          email: applicationEmail,
          mobile: '+919876543210',
          businessName: 'Integration Services',
          legalType: 'Sole proprietorship',
          city: 'New Delhi',
          state: 'Delhi',
          pin: '110001',
          requestedTier: 'master_distributor',
        })
        .expect(201);
      assert.equal(submittedApplication.body.verificationRequired, true);
      const applicantPdf = Buffer.from('%PDF-1.7\napplicant private kyc\n%%EOF');
      const applicationUploadCsrf = await request(app.getHttpServer())
        .get('/api/v1/auth/csrf')
        .expect(200);
      const uploadedApplicationKyc = await request(app.getHttpServer())
        .post(`/api/v1/files/kyc/applications/${submittedApplication.body.applicationId as string}`)
        .set('Cookie', cookiePair(applicationUploadCsrf.headers['set-cookie'], 'csrf_token'))
        .set('X-CSRF-Token', applicationUploadCsrf.body.csrfToken as string)
        .field('uploadToken', submittedApplication.body.uploadToken as string)
        .field('docType', 'identity_proof')
        .attach('file', applicantPdf, {
          filename: 'applicant.pdf',
          contentType: 'application/pdf',
        });
      assert.equal(uploadedApplicationKyc.status, 201, JSON.stringify(uploadedApplicationKyc.body));
      assert.equal(uploadedApplicationKyc.body.ownerType, 'application');
      const verificationEmail = await EmailOutboxModel.findOne({
        to: applicationEmail,
        template: 'application_verify',
      }).lean();
      assert.ok(verificationEmail);
      const emailVariables =
        verificationEmail.variables instanceof Map
          ? Object.fromEntries(verificationEmail.variables)
          : verificationEmail.variables;
      const verificationToken = new URL(emailVariables.verificationUrl).searchParams.get('token');
      assert.ok(verificationToken);
      await request(app.getHttpServer())
        .get(
          `/api/v1/public/applications/verify-email?token=${encodeURIComponent(verificationToken)}`,
        )
        .expect(200, { verified: true });
      assert.equal(
        (await ApplicationModel.findOne({ email: applicationEmail }).lean())?.status,
        'submitted',
      );

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

      const applicationQueue = await request(app.getHttpServer())
        .get('/api/v1/admin/applications?status=submitted')
        .set('Cookie', adminCookies)
        .expect(200);
      const queuedApplication = applicationQueue.body.items.find(
        (item: { email: string }) => item.email === applicationEmail,
      );
      assert.ok(queuedApplication);
      const applicationApproval = await request(app.getHttpServer())
        .post(`/api/v1/admin/applications/${queuedApplication._id}/approve`)
        .set('Cookie', adminCookies)
        .set('X-CSRF-Token', adminCsrf)
        .send({})
        .expect(201);
      assert.equal(applicationApproval.body.status, 'pending_payment');
      const createdPartner = await PartnerModel.findOne({ email: applicationEmail }).lean();
      assert.ok(createdPartner);
      assert.equal(createdPartner.tier, 'master_distributor');
      assert.deepEqual(createdPartner.path.map(String), [String(createdPartner._id)]);
      assert.ok(await PartnerUserModel.exists({ partnerId: createdPartner._id, role: 'owner' }));
      const inviteEmail = await EmailOutboxModel.findOne({
        to: applicationEmail,
        template: 'password_reset',
      }).lean();
      assert.ok(inviteEmail);
      const inviteVariables =
        inviteEmail.variables instanceof Map
          ? Object.fromEntries(inviteEmail.variables)
          : inviteEmail.variables;
      const inviteToken = new URL(inviteVariables.resetUrl).searchParams.get('token');
      assert.ok(inviteToken);
      assert.ok(
        await PasswordResetModel.exists({
          userId: createdPartner.ownerUserId,
          usedAt: { $exists: false },
        }),
      );
      const partnerResetCsrf = await request(app.getHttpServer())
        .get('/api/v1/auth/csrf')
        .expect(200);
      await request(app.getHttpServer())
        .post('/api/v1/auth/password/reset')
        .set('Cookie', cookiePair(partnerResetCsrf.headers['set-cookie'], 'csrf_token'))
        .set('X-CSRF-Token', partnerResetCsrf.body.csrfToken as string)
        .send({ token: inviteToken, password: 'M2-integration-invited-partner-password' })
        .expect(201, { status: 'password_updated' });
      const invitedPartnerCsrf = await request(app.getHttpServer())
        .get('/api/v1/auth/csrf')
        .expect(200);
      const invitedPartnerLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Cookie', cookiePair(invitedPartnerCsrf.headers['set-cookie'], 'csrf_token'))
        .set('X-CSRF-Token', invitedPartnerCsrf.body.csrfToken as string)
        .send({ email: applicationEmail, password: 'M2-integration-invited-partner-password' })
        .expect(201);
      const invitedPartnerCookies = combineCookies(invitedPartnerLogin.headers['set-cookie'], [
        'partner_session',
        'csrf_token',
      ]);
      const invitedPartnerProfile = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', invitedPartnerCookies)
        .expect(200);
      assert.equal(invitedPartnerProfile.body.user.partner.status, 'pending_payment');
      const encryptionKey = process.env.FIELD_ENCRYPTION_KEY ?? 'integration-test-field-key';
      const sensitiveFields = {
        pan: 'ABCDE1234F',
        gstin: '07ABCDE1234F1Z5',
        address: '42 Example Road, New Delhi',
        bankAccount: '123456789012',
        bankIfsc: 'HDFC0001234',
      };
      const encryptedResponse = await request(app.getHttpServer())
        .patch(`/api/v1/admin/partners/${String(createdPartner._id)}/kyc-fields`)
        .set('Cookie', adminCookies)
        .set('X-CSRF-Token', adminCsrf)
        .send(sensitiveFields)
        .expect(200);
      assert.equal(encryptedResponse.body.masked.pan.endsWith('234F'), true);
      const encryptedPartner = await PartnerModel.findById(createdPartner._id).lean();
      assert.ok(encryptedPartner?.panEnc && !encryptedPartner.panEnc.includes(sensitiveFields.pan));
      assert.equal(decryptField(encryptedPartner.panEnc, encryptionKey), sensitiveFields.pan);
      assert.equal(decryptField(encryptedPartner.gstinEnc!, encryptionKey), sensitiveFields.gstin);
      assert.equal(
        decryptField(encryptedPartner.addressEnc!, encryptionKey),
        sensitiveFields.address,
      );
      assert.equal(
        decryptField(encryptedPartner.bankAccountEnc!, encryptionKey),
        sensitiveFields.bankAccount,
      );
      assert.equal(
        decryptField(encryptedPartner.bankIfscEnc!, encryptionKey),
        sensitiveFields.bankIfsc,
      );
      await PartnerModel.updateOne({ _id: createdPartner._id }, { $set: { status: 'active' } });
      const childEmail = `child-${randomUUID()}@example.test`;
      const childApplication = await ApplicationModel.create({
        applicantName: 'Integration Distributor',
        email: childEmail,
        mobile: '+919876543211',
        businessName: 'Integration Distributor Business',
        legalType: 'Sole proprietorship',
        city: 'New Delhi',
        state: 'Delhi',
        pin: '110001',
        requestedTier: 'distributor',
        emailVerificationTokenHash: randomUUID(),
        emailVerificationExpiresAt: new Date(Date.now() + 60_000),
        emailVerifiedAt: new Date(),
        status: 'submitted',
      });
      await request(app.getHttpServer())
        .post(`/api/v1/admin/applications/${String(childApplication._id)}/approve`)
        .set('Cookie', adminCookies)
        .set('X-CSRF-Token', adminCsrf)
        .send({})
        .expect(400);
      const childApproval = await request(app.getHttpServer())
        .post(`/api/v1/admin/applications/${String(childApplication._id)}/approve`)
        .set('Cookie', adminCookies)
        .set('X-CSRF-Token', adminCsrf)
        .send({ parentId: String(createdPartner._id) });
      assert.equal(childApproval.status, 201, JSON.stringify(childApproval.body));
      assert.equal(childApproval.body.status, 'pending_payment');
      const childPartner = await PartnerModel.findOne({ email: childEmail }).lean();
      assert.ok(childPartner);
      assert.equal(String(childPartner.parentId), String(createdPartner._id));
      assert.deepEqual(childPartner.path.map(String), [
        String(createdPartner._id),
        String(childPartner._id),
      ]);
      const partnerNetwork = await request(app.getHttpServer())
        .get('/api/v1/partner/network')
        .set('Cookie', invitedPartnerCookies)
        .expect(200);
      assert.equal(partnerNetwork.body.total, 1);
      assert.equal(partnerNetwork.body.items[0].id, String(childPartner._id));
      await request(app.getHttpServer())
        .put(`/api/v1/admin/partners/${String(createdPartner._id)}/status`)
        .set('Cookie', adminCookies)
        .set('X-CSRF-Token', adminCsrf)
        .send({ status: 'suspended' })
        .expect(200);
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', invitedPartnerCookies)
        .expect(401);
      await request(app.getHttpServer())
        .put(`/api/v1/admin/partners/${String(createdPartner._id)}/status`)
        .set('Cookie', adminCookies)
        .set('X-CSRF-Token', adminCsrf)
        .send({ status: 'active' })
        .expect(200);

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
      const partnerRecordId = new mongoose.Types.ObjectId();
      await PartnerModel.create({
        _id: partnerRecordId,
        code: `PAR-${partnerRecordId.toHexString().slice(-10).toUpperCase()}`,
        path: [partnerRecordId],
        tier: 'retailer',
        status: 'active',
        applicationId: new mongoose.Types.ObjectId(),
        ownerUserId: partner._id,
        businessName: 'Test Partner Business',
        legalType: 'Sole proprietorship',
        mobile: '+919876543212',
        email: partner.email,
        city: 'New Delhi',
        state: 'Delhi',
        pin: '110001',
      });
      await PartnerUserModel.create({
        partnerId: partnerRecordId,
        userId: partner._id,
        role: 'owner',
        staffPermissions: [],
        status: 'active',
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
      const downlineRecordId = new mongoose.Types.ObjectId();
      await PartnerModel.create({
        _id: downlineRecordId,
        code: `PAR-${downlineRecordId.toHexString().slice(-10).toUpperCase()}`,
        parentId: partnerRecordId,
        path: [partnerRecordId, downlineRecordId],
        tier: 'retailer',
        status: 'active',
        applicationId: new mongoose.Types.ObjectId(),
        ownerUserId: new mongoose.Types.ObjectId(),
        businessName: 'Partner Downline Business',
        legalType: 'Sole proprietorship',
        mobile: '+919876543213',
        email: `downline-${randomUUID()}@example.test`,
        city: 'New Delhi',
        state: 'Delhi',
        pin: '110001',
      });
      const actorPartnerIds = (
        await PartnerModel.distinct('_id', { path: partnerRecordId, status: { $ne: 'closed' } })
      ).map(String);
      const scopedPartners = await PartnerModel.find(
        scopeToActor(
          {
            userId: String(partner._id),
            kind: 'partner',
            roleKeys: [],
            permissions: new Set(),
            partnerPath: actorPartnerIds,
          },
          {},
          '_id',
        ),
      )
        .select('_id')
        .lean();
      assert.deepEqual(
        new Set(scopedPartners.map((row) => String(row._id))),
        new Set([String(partnerRecordId), String(downlineRecordId)]),
      );
      const pdf = Buffer.from('%PDF-1.7\nprivate kyc fixture\n%%EOF');
      const uploadedKyc = await request(app.getHttpServer())
        .post('/api/v1/files/kyc')
        .set('Cookie', partnerCookies)
        .set('X-CSRF-Token', partnerLogin.body.csrfToken as string)
        .field('ownerType', 'partner')
        .field('ownerId', String(partnerRecordId))
        .field('docType', 'pan_card')
        .attach('file', pdf, { filename: 'fixture.pdf', contentType: 'application/pdf' })
        .expect(201);
      assert.equal(uploadedKyc.body.contentType, 'application/pdf');
      assert.equal(uploadedKyc.body.sizeBytes, pdf.byteLength);
      await request(app.getHttpServer())
        .post('/api/v1/files/kyc')
        .set('Cookie', partnerCookies)
        .set('X-CSRF-Token', partnerLogin.body.csrfToken as string)
        .field('ownerType', 'partner')
        .field('ownerId', String(partnerRecordId))
        .field('docType', 'pan_card')
        .attach('file', Buffer.from('not a PDF'), {
          filename: 'spoof.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);
      await request(app.getHttpServer())
        .post('/api/v1/files/kyc')
        .set('Cookie', partnerCookies)
        .set('X-CSRF-Token', partnerLogin.body.csrfToken as string)
        .field('ownerType', 'partner')
        .field('ownerId', String(partnerRecordId))
        .field('docType', 'pan_card')
        .attach('file', Buffer.alloc(10 * 1024 * 1024 + 1, 65), {
          filename: 'oversize.pdf',
          contentType: 'application/pdf',
        })
        .expect(413);
      const viewedKyc = await request(app.getHttpServer())
        .get(`/api/v1/files/kyc/${uploadedKyc.body.id as string}`)
        .set('Cookie', partnerCookies)
        .buffer(true)
        .parse((response, callback) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () => callback(null, Buffer.concat(chunks)));
        })
        .expect(200);
      assert.deepEqual(viewedKyc.body, pdf);
      assert.equal(
        await AuditModel.countDocuments({
          action: 'kyc.document_viewed',
          entityId: uploadedKyc.body.id,
        }),
        1,
      );
      await PartnerModel.updateOne({ _id: partnerRecordId }, { $set: { status: 'suspended' } });
      await request(app.getHttpServer())
        .post('/api/v1/files/kyc')
        .set('Cookie', partnerCookies)
        .set('X-CSRF-Token', partnerLogin.body.csrfToken as string)
        .field('ownerType', 'partner')
        .field('ownerId', String(partnerRecordId))
        .field('docType', 'pan_card')
        .attach('file', pdf, { filename: 'suspended.pdf', contentType: 'application/pdf' })
        .expect(403);
      await PartnerModel.updateOne({ _id: partnerRecordId }, { $set: { status: 'active' } });
      const outsideDocument = await KycDocumentModel.create({
        ownerType: 'partner',
        ownerId: new mongoose.Types.ObjectId(),
        docType: 'pan_card',
        fileKey: 'kyc/private/outside-network.pdf',
        contentType: 'application/pdf',
        sizeBytes: pdf.byteLength,
        status: 'pending',
      });
      await request(app.getHttpServer())
        .get(`/api/v1/files/kyc/${String(outsideDocument._id)}`)
        .set('Cookie', partnerCookies)
        .expect(403);
      await request(app.getHttpServer())
        .post('/api/v1/files/kyc')
        .set('Cookie', partnerCookies)
        .set('X-CSRF-Token', partnerLogin.body.csrfToken as string)
        .field('ownerType', 'partner')
        .field('ownerId', String(createdPartner._id))
        .field('docType', 'pan_card')
        .attach('file', pdf, { filename: 'other.pdf', contentType: 'application/pdf' })
        .expect(403);
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
      const factorSetup = await request(app.getHttpServer())
        .post('/api/v1/auth/2fa/setup')
        .set('Cookie', changedPasswordCookies)
        .set('X-CSRF-Token', changedPasswordLogin.body.csrfToken as string)
        .send({})
        .expect(201);
      const partnerCode = authenticator.generate(factorSetup.body.secret as string);
      const factorEnabled = await request(app.getHttpServer())
        .post('/api/v1/auth/2fa/verify')
        .set('Cookie', changedPasswordCookies)
        .set('X-CSRF-Token', changedPasswordLogin.body.csrfToken as string)
        .send({ code: partnerCode })
        .expect(201);
      assert.equal((factorEnabled.body.recoveryCodes as string[]).length, 10);
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', changedPasswordCookies)
        .expect(401);
      const factorSessionCookies = combineCookies(factorEnabled.headers['set-cookie'], [
        'partner_session',
        'csrf_token',
      ]);
      const partnerProfile = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', factorSessionCookies)
        .expect(200);
      assert.equal(partnerProfile.body.user.totpEnabled, true);
      assert.ok(Array.isArray(partnerProfile.body.user.permissions));
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', factorSessionCookies)
        .set('X-CSRF-Token', factorEnabled.body.csrfToken as string)
        .send({})
        .expect(201);

      const totpLoginCsrf = await request(app.getHttpServer()).get('/api/v1/auth/csrf').expect(200);
      const totpLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Cookie', cookiePair(totpLoginCsrf.headers['set-cookie'], 'csrf_token'))
        .set('X-CSRF-Token', totpLoginCsrf.body.csrfToken as string)
        .send({ email: partner.email, password: 'M1-integration-changed-password' })
        .expect(201);
      assert.equal(totpLogin.body.requiresTotp, true);
      const totpPreAuthCookies = combineCookies(totpLogin.headers['set-cookie'], [
        'partner_pre_auth',
        'csrf_token',
      ]);
      const totpVerified = await request(app.getHttpServer())
        .post('/api/v1/auth/2fa/verify')
        .set('Cookie', totpPreAuthCookies)
        .set('X-CSRF-Token', totpLogin.body.csrfToken as string)
        .send({ code: authenticator.generate(factorSetup.body.secret as string) })
        .expect(201);
      const totpSessionCookies = combineCookies(totpVerified.headers['set-cookie'], [
        'partner_session',
        'csrf_token',
      ]);
      const recoveryCode = (factorEnabled.body.recoveryCodes as string[])[0];
      await request(app.getHttpServer())
        .post('/api/v1/auth/2fa/disable')
        .set('Cookie', totpSessionCookies)
        .set('X-CSRF-Token', totpVerified.body.csrfToken as string)
        .send({ currentPassword: 'M1-integration-changed-password', code: recoveryCode })
        .expect(201, { status: 'two_factor_disabled' });
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', totpSessionCookies)
        .expect(401);
      const noFactorLoginCsrf = await request(app.getHttpServer())
        .get('/api/v1/auth/csrf')
        .expect(200);
      const noFactorLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Cookie', cookiePair(noFactorLoginCsrf.headers['set-cookie'], 'csrf_token'))
        .set('X-CSRF-Token', noFactorLoginCsrf.body.csrfToken as string)
        .send({ email: partner.email, password: 'M1-integration-changed-password' })
        .expect(201);
      assert.equal(noFactorLogin.body.status, 'authenticated');
      const noFactorCookies = combineCookies(noFactorLogin.headers['set-cookie'], [
        'partner_session',
        'csrf_token',
      ]);
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', noFactorCookies)
        .set('X-CSRF-Token', noFactorLogin.body.csrfToken as string)
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

      const scopedRecords = mongoose.connection.collection('partner_scope_test_records');
      const parentId = `parent-${randomUUID()}`;
      const partnerId = `partner-${randomUUID()}`;
      const downlineId = `partner-${randomUUID()}`;
      const otherPartnerId = `partner-${randomUUID()}`;
      await scopedRecords.insertMany([
        { partnerId: parentId, label: 'parent' },
        { partnerId, label: 'self' },
        { partnerId: downlineId, label: 'downline' },
        { partnerId: otherPartnerId, label: 'other-partner' },
      ]);
      const scopedActor = {
        userId: String(partner._id),
        kind: 'partner' as const,
        roleKeys: ['retailer'],
        permissions: new Set<string>(),
        partnerPath: [parentId, partnerId, downlineId],
      };
      const visibleRecords = await scopedRecords
        .find(scopeToActor(scopedActor, {}, 'partnerId'))
        .sort({ label: 1 })
        .toArray();
      assert.deepEqual(
        visibleRecords.map((record) => record.label),
        ['downline', 'parent', 'self'],
      );

      const previousLoginLimit = process.env.LOGIN_RATE_LIMIT_ACCOUNT_MAX_REQUESTS;
      process.env.LOGIN_RATE_LIMIT_ACCOUNT_MAX_REQUESTS = '2';
      try {
        const limitedEmail = `limited-${randomUUID()}@example.test`;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const limitedCsrf = await request(app.getHttpServer())
            .get('/api/v1/auth/csrf')
            .expect(200);
          await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .set('Cookie', cookiePair(limitedCsrf.headers['set-cookie'], 'csrf_token'))
            .set('X-CSRF-Token', limitedCsrf.body.csrfToken as string)
            .send({ email: limitedEmail, password: 'invalid-password' })
            .expect(401);
        }
        const blockedCsrf = await request(app.getHttpServer()).get('/api/v1/auth/csrf').expect(200);
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .set('Cookie', cookiePair(blockedCsrf.headers['set-cookie'], 'csrf_token'))
          .set('X-CSRF-Token', blockedCsrf.body.csrfToken as string)
          .send({ email: limitedEmail, password: 'invalid-password' })
          .expect(429);
      } finally {
        if (previousLoginLimit === undefined)
          delete process.env.LOGIN_RATE_LIMIT_ACCOUNT_MAX_REQUESTS;
        else process.env.LOGIN_RATE_LIMIT_ACCOUNT_MAX_REQUESTS = previousLoginLimit;
      }

      const previousResetLimit = process.env.PASSWORD_RESET_RATE_LIMIT_ACCOUNT_MAX_REQUESTS;
      process.env.PASSWORD_RESET_RATE_LIMIT_ACCOUNT_MAX_REQUESTS = '2';
      try {
        const resetThrottleEmail = `reset-limit-${randomUUID()}@example.test`;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const limitedResetCsrf = await request(app.getHttpServer())
            .get('/api/v1/auth/csrf')
            .expect(200);
          await request(app.getHttpServer())
            .post('/api/v1/auth/password/forgot')
            .set('Cookie', cookiePair(limitedResetCsrf.headers['set-cookie'], 'csrf_token'))
            .set('X-CSRF-Token', limitedResetCsrf.body.csrfToken as string)
            .send({ email: resetThrottleEmail })
            .expect(201, { accepted: true });
        }
        const blockedResetCsrf = await request(app.getHttpServer())
          .get('/api/v1/auth/csrf')
          .expect(200);
        await request(app.getHttpServer())
          .post('/api/v1/auth/password/forgot')
          .set('Cookie', cookiePair(blockedResetCsrf.headers['set-cookie'], 'csrf_token'))
          .set('X-CSRF-Token', blockedResetCsrf.body.csrfToken as string)
          .send({ email: resetThrottleEmail })
          .expect(429);
      } finally {
        if (previousResetLimit === undefined)
          delete process.env.PASSWORD_RESET_RATE_LIMIT_ACCOUNT_MAX_REQUESTS;
        else process.env.PASSWORD_RESET_RATE_LIMIT_ACCOUNT_MAX_REQUESTS = previousResetLimit;
      }

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
      await mongoose.connection
        .useDb(immutableDatabaseName)
        .dropDatabase()
        .catch(() => undefined);
      delete process.env.MONGODB_IMMUTABLE_DATABASE;
      await mongoose.disconnect();
    }
  },
);

function cookiePair(cookies: string[] | string | undefined, name: string): string {
  const header = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
  const cookie = [...header]
    .reverse()
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split(';', 1)[0];
  assert.ok(cookie, `expected ${name} cookie`);
  return cookie;
}

function combineCookies(cookies: string[] | string | undefined, names: string[]): string {
  return names.map((name) => cookiePair(cookies, name)).join('; ');
}
