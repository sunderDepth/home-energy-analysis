import { describe, it, expect } from 'vitest';
import { sum, mean, dotProduct, solve2x2, solve3x3, rSquared } from './stats.ts';

describe('sum', () => {
  it('sums an array of numbers', () => {
    expect(sum([1, 2, 3, 4])).toBe(10);
  });

  it('returns 0 for empty array', () => {
    expect(sum([])).toBe(0);
  });

  it('handles single element', () => {
    expect(sum([42])).toBe(42);
  });

  it('handles negative numbers', () => {
    expect(sum([-1, 1, -2, 2])).toBe(0);
  });
});

describe('mean', () => {
  it('returns the average', () => {
    expect(mean([2, 4, 6])).toBe(4);
  });

  it('returns 0 for empty array', () => {
    expect(mean([])).toBe(0);
  });

  it('handles single element', () => {
    expect(mean([7])).toBe(7);
  });
});

describe('dotProduct', () => {
  it('computes dot product of two vectors', () => {
    expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32); // 4+10+18
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(dotProduct([1, 0], [0, 1])).toBe(0);
  });

  it('handles single-element vectors', () => {
    expect(dotProduct([3], [5])).toBe(15);
  });
});

describe('solve2x2', () => {
  it('solves a 2x2 system', () => {
    // 2x + 3y = 8, 1x + 2y = 5 → x=1, y=2
    const result = solve2x2(2, 3, 1, 2, 8, 5);
    expect(result).not.toBeNull();
    expect(result![0]).toBeCloseTo(1);
    expect(result![1]).toBeCloseTo(2);
  });

  it('returns null for singular matrix', () => {
    // 2x + 4y = 6, 1x + 2y = 3 (rows are proportional)
    expect(solve2x2(2, 4, 1, 2, 6, 3)).toBeNull();
  });

  it('handles identity-like system', () => {
    // x = 3, y = 7
    const result = solve2x2(1, 0, 0, 1, 3, 7);
    expect(result![0]).toBeCloseTo(3);
    expect(result![1]).toBeCloseTo(7);
  });
});

describe('solve3x3', () => {
  it('solves a 3x3 system', () => {
    // x + y + z = 6, 2x + y = 5, x + 3z = 10 → x=1, y=3, z=3 ... let me use a simpler one
    // x = 1, y = 2, z = 3 via identity
    const a = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const b = [1, 2, 3];
    const result = solve3x3(a, b);
    expect(result).not.toBeNull();
    expect(result![0]).toBeCloseTo(1);
    expect(result![1]).toBeCloseTo(2);
    expect(result![2]).toBeCloseTo(3);
  });

  it('solves a non-trivial system', () => {
    // 2x + y - z = 1, x + 3y + 2z = 13, x - y + z = 2
    // Solution: x=1, y=2, z=3
    const a = [[2, 1, -1], [1, 3, 2], [1, -1, 1]];
    const b = [1, 13, 2];
    const result = solve3x3(a, b);
    expect(result).not.toBeNull();
    expect(result![0]).toBeCloseTo(1);
    expect(result![1]).toBeCloseTo(2);
    expect(result![2]).toBeCloseTo(3);
  });

  it('returns null for singular matrix', () => {
    const a = [[1, 2, 3], [2, 4, 6], [1, 1, 1]]; // row 2 = 2 × row 1
    const b = [6, 12, 3];
    expect(solve3x3(a, b)).toBeNull();
  });
});

describe('rSquared', () => {
  it('returns 1 for perfect fit', () => {
    expect(rSquared([1, 2, 3, 4], [1, 2, 3, 4])).toBeCloseTo(1);
  });

  it('returns 0 when fitted is the mean (no explanatory power)', () => {
    const observed = [1, 2, 3, 4, 5];
    const fitted = [3, 3, 3, 3, 3]; // all mean
    expect(rSquared(observed, fitted)).toBeCloseTo(0);
  });

  it('returns value between 0 and 1 for partial fit', () => {
    const observed = [1, 2, 3, 4, 5];
    const fitted = [1.1, 2.2, 2.8, 4.1, 4.8];
    const r2 = rSquared(observed, fitted);
    expect(r2).toBeGreaterThan(0);
    expect(r2).toBeLessThanOrEqual(1);
  });

  it('returns 0 when all observations are the same', () => {
    expect(rSquared([5, 5, 5], [5, 5, 5])).toBe(0);
  });

  it('clamps to 0 for terrible fit', () => {
    // Fitted values are worse than mean
    const observed = [1, 2, 3];
    const fitted = [100, -100, 50];
    expect(rSquared(observed, fitted)).toBe(0);
  });
});
