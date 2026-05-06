import { describe, it, expect } from 'vitest';
import { generateId } from '@/shared/id-gen';

describe('generateId', () => {
  it('generates unique IDs on sequential calls', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('IDs are positive numbers', () => {
    const id = generateId();
    expect(id).toBeGreaterThan(0);
  });

  it('IDs are monotonically increasing', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id2).toBeGreaterThan(id1);
  });

  it('IDs incorporate timestamp component', () => {
    const id = generateId();
    const now = Date.now();
    const extractedTimestamp = Math.floor(id / 1000);
    expect(extractedTimestamp).toBeGreaterThanOrEqual(now - 1000);
    expect(extractedTimestamp).toBeLessThanOrEqual(now + 1000);
  });
});