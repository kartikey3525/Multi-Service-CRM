import assert from 'node:assert/strict';
import test from 'node:test';
import { financialYearFor } from '../src/modules/billing/invoice-number.service';

test('invoice financial year runs from April through March', () => {
  assert.equal(financialYearFor(new Date('2026-03-31T18:29:59.999Z')), '2025-26');
  assert.equal(financialYearFor(new Date('2026-03-31T18:30:00.000Z')), '2026-27');
  assert.equal(financialYearFor(new Date('2027-03-31T18:29:59.999Z')), '2026-27');
  assert.equal(financialYearFor(new Date('2027-03-31T18:30:00.000Z')), '2027-28');
});
