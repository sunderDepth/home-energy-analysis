import { describe, it, expect } from 'vitest';
import { simpleHash } from './hash.ts';

describe('simpleHash', () => {
  it('produces a string', () => {
    expect(typeof simpleHash('hello')).toBe('string');
  });

  it('is deterministic', () => {
    expect(simpleHash('test data')).toBe(simpleHash('test data'));
  });

  it('produces different hashes for different inputs', () => {
    expect(simpleHash('hello')).not.toBe(simpleHash('world'));
  });

  it('handles empty string', () => {
    expect(simpleHash('')).toBe('0');
  });
});
