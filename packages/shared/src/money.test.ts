import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateLineGst, Money, splitGst } from './money';

test('Money accepts safe integer paise and rejects fractions or overflow', () => {
  assert.equal(Money.fromPaise(Number.MAX_SAFE_INTEGER).paise, Number.MAX_SAFE_INTEGER);
  assert.throws(() => Money.fromPaise(1.5), RangeError);
  assert.throws(() => Money.fromPaise(Number.MAX_SAFE_INTEGER + 1), RangeError);
});

test('Money arithmetic stays in integer paise and checks overflow', () => {
  assert.equal(Money.fromPaise(125).add(Money.fromPaise(25)).paise, 150);
  assert.equal(Money.fromPaise(125).subtract(Money.fromPaise(200)).paise, -75);
  assert.equal(Money.fromPaise(-75).negate().paise, 75);
  assert.equal(Money.fromPaise(-1).isNegative(), true);
  assert.equal(Money.fromPaise(0).equals(Money.zero()), true);
  assert.throws(() => Money.fromPaise(Number.MAX_SAFE_INTEGER).add(Money.fromPaise(1)), RangeError);
});

test('percentage calculation uses half-up rounding for both signs', () => {
  assert.equal(Money.fromPaise(1).percent(5_000).paise, 1);
  assert.equal(Money.fromPaise(3).percent(5_000).paise, 2);
  assert.equal(Money.fromPaise(-3).percent(5_000).paise, -2);
  assert.equal(Money.fromPaise(101).percent(1_800).paise, 18);
  assert.equal(Money.fromPaise(0).percent(10_000).paise, 0);
});

test('percentage rate must be a non-negative safe integer', () => {
  for (const invalid of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => Money.fromPaise(100).percent(invalid), RangeError);
  }
  assert.throws(() => Money.fromPaise(Number.MAX_SAFE_INTEGER).percent(20_000), RangeError);
});

test('intra-state GST splits rounded odd paise to SGST and reconciles', () => {
  const result = splitGst(Money.fromPaise(1), 10_000, true);
  assert.deepEqual(
    {
      cgst: result.cgst.paise,
      sgst: result.sgst.paise,
      igst: result.igst.paise,
      total: result.total.paise,
    },
    { cgst: 0, sgst: 1, igst: 0, total: 2 },
  );
});

test('inter-state GST uses IGST and reconciles', () => {
  const result = splitGst(Money.fromPaise(10_000), 1_800, false);
  assert.deepEqual(
    {
      cgst: result.cgst.paise,
      sgst: result.sgst.paise,
      igst: result.igst.paise,
      total: result.total.paise,
    },
    { cgst: 0, sgst: 0, igst: 1_800, total: 11_800 },
  );
});

test('GST handles zero tax and rejects negative subtotal', () => {
  assert.equal(splitGst(Money.zero(), 1_800, true).total.paise, 0);
  assert.throws(() => splitGst(Money.fromPaise(-1), 1_800, false), RangeError);
});

test('GST rounds half-up on each line before adding, with odd paisa assigned to SGST', () => {
  const result = calculateLineGst(
    [
      { subtotal: Money.fromPaise(3), rateBasisPoints: 1800 },
      { subtotal: Money.fromPaise(3), rateBasisPoints: 1800 },
    ],
    true,
  );
  assert.equal(result.cgst.paise, 0);
  assert.equal(result.sgst.paise, 2);
  assert.equal(result.total.paise, 8);
});
