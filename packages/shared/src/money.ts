/** Integer paise only; rupee values are never stored in this type. */
export class Money {
  private constructor(private readonly paiseValue: number) {}

  static fromPaise(paise: number): Money {
    if (!Number.isSafeInteger(paise)) {
      throw new RangeError('Money must be a safe integer number of paise.');
    }
    return new Money(paise);
  }

  static zero(): Money {
    return new Money(0);
  }

  get paise(): number {
    return this.paiseValue;
  }

  add(other: Money): Money {
    return Money.fromPaise(this.paiseValue + other.paiseValue);
  }

  subtract(other: Money): Money {
    return Money.fromPaise(this.paiseValue - other.paiseValue);
  }

  negate(): Money {
    return Money.fromPaise(-this.paiseValue);
  }

  isNegative(): boolean {
    return this.paiseValue < 0;
  }

  equals(other: Money): boolean {
    return this.paiseValue === other.paiseValue;
  }

  /** Apply basis points using paise precision and half-up rounding. */
  percent(rateBasisPoints: number): Money {
    if (!Number.isSafeInteger(rateBasisPoints) || rateBasisPoints < 0) {
      throw new RangeError('Rate must be a non-negative integer number of basis points.');
    }
    const numerator = BigInt(this.paiseValue) * BigInt(rateBasisPoints);
    const denominator = 10_000n;
    const magnitude = numerator < 0n ? -numerator : numerator;
    const rounded = (magnitude + denominator / 2n) / denominator;
    const signed = numerator < 0n ? -rounded : rounded;
    const result = Number(signed);
    if (!Number.isSafeInteger(result)) {
      throw new RangeError('Calculated money exceeds the safe paise range.');
    }
    return Money.fromPaise(result);
  }
}

export type GstBreakdown = {
  subtotal: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  total: Money;
};

/**
 * Calculate tax on a subtotal. For intra-state tax, split the rounded tax total;
 * any odd paise is assigned to SGST so the components always sum to the total.
 */
export function splitGst(
  subtotal: Money,
  rateBasisPoints: number,
  intraState: boolean,
): GstBreakdown {
  if (subtotal.isNegative()) {
    throw new RangeError('GST cannot be calculated on a negative subtotal.');
  }
  const tax = subtotal.percent(rateBasisPoints);
  const zero = Money.zero();

  if (!intraState) {
    return { subtotal, cgst: zero, sgst: zero, igst: tax, total: subtotal.add(tax) };
  }

  const cgstPaise = Math.floor(tax.paise / 2);
  const cgst = Money.fromPaise(cgstPaise);
  const sgst = tax.subtract(cgst);
  return { subtotal, cgst, sgst, igst: zero, total: subtotal.add(cgst).add(sgst) };
}
