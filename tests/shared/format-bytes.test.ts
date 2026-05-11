import { describe, it, expect } from 'vitest';
import { formatBytes } from '@/shared/format-bytes';

// ─── FORMAT BYTES ────────────

describe('formatBytes', () => {
  it('returns 0B for zero', () => {
    expect(formatBytes(0)).toBe('0B');
  });

  it('returns 0B for negative values', () => {
    expect(formatBytes(-100)).toBe('0B');
  });

  it('returns bytes without unit suffix when less than 1KB', () => {
    expect(formatBytes(500)).toBe('500B');
  });

  it('formats exactly 1KB', () => {
    expect(formatBytes(1024)).toBe('1KB');
  });

  it('formats fractional KB values', () => {
    expect(formatBytes(1536)).toBe('1.5KB');
  });

  it('formats exactly 1MB', () => {
    expect(formatBytes(1048576)).toBe('1MB');
  });

  it('caps at MB for values beyond MB', () => {
    // 1073741824 = 1GB but should be capped at "1024MB"
    expect(formatBytes(1073741824)).toBe('1024MB');
  });

  it('returns 0B for NaN', () => {
    expect(formatBytes(NaN)).toBe('0B');
  });
});
