import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decryptField,
  digestToken,
  encryptField,
  hashPassword,
  randomToken,
  verifyPassword,
} from '../src/modules/identity/security';

test('passwords use Argon2id and only verify the original value', async () => {
  const encoded = await hashPassword('correct horse battery staple');
  assert.match(encoded, /^\$argon2id\$/);
  assert.equal(await verifyPassword(encoded, 'correct horse battery staple'), true);
  assert.equal(await verifyPassword(encoded, 'incorrect password'), false);
});

test('encrypted authenticator secrets round-trip and reject tampering', () => {
  const encrypted = encryptField('JBSWY3DPEHPK3PXP', 'unit-test-key-material');
  assert.equal(decryptField(encrypted, 'unit-test-key-material'), 'JBSWY3DPEHPK3PXP');
  assert.throws(() => decryptField(encrypted, 'different-test-key-material'));
  assert.equal(digestToken('opaque-reset-token'), digestToken('opaque-reset-token'));
  assert.notEqual(randomToken(), randomToken());
});
