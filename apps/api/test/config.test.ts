import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/config';

function productionEnvironment(mongoUri: string): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    MONGODB_URI: mongoUri,
    SESSION_SECRET: 'production-session-secret-with-sufficient-entropy-123456789',
    FIELD_ENCRYPTION_KEY: 'a'.repeat(64),
    ADMIN_BOOTSTRAP_PASSWORD: 'production-bootstrap-password',
  };
}

test('production requires an authenticated MongoDB runtime URI only', () => {
  const config = loadConfig(
    productionEnvironment('mongodb://runtime-user:runtime-password@mongo.example/franchise_crm'),
  );
  assert.equal(
    config.MONGODB_URI,
    'mongodb://runtime-user:runtime-password@mongo.example/franchise_crm',
  );
  assert.equal('MONGODB_MIGRATE_URI' in config, false);
});

test('production rejects an unauthenticated MongoDB runtime URI', () => {
  assert.throws(
    () => loadConfig(productionEnvironment('mongodb://mongo.example/franchise_crm')),
    /MONGODB_URI/,
  );
});
