import assert from 'node:assert/strict';
import test from 'node:test';
import { pinMatchesPrefixes } from '../src/modules/partners/territories';

test('territory PIN prefixes match only valid six-digit pins', () => {
  assert.equal(pinMatchesPrefixes('110001', ['11']), true);
  assert.equal(pinMatchesPrefixes('400001', ['400']), true);
  assert.equal(pinMatchesPrefixes('120001', ['11', '400']), false);
  assert.equal(pinMatchesPrefixes('11001', ['11']), false);
  assert.equal(pinMatchesPrefixes(' 110001 ', ['11']), true);
});
