import { describe, it, expect } from 'vitest';
import { escCsv } from '@/panel/utils/export';

// ─── ESC CSV ────────────

describe('escCsv', () => {
  it('returns unchanged simple string', () => {
    expect(escCsv('hello')).toBe('hello');
  });

  it('quotes string containing comma', () => {
    expect(escCsv('a,b')).toBe('"a,b"');
  });

  it('quotes and escapes string containing double quote', () => {
    expect(escCsv('say "hi"')).toBe('"say ""hi"""');
  });

  it('quotes string containing newline', () => {
    expect(escCsv('line1\nline2')).toBe('"line1\nline2"');
  });

  it('returns empty string for null', () => {
    expect(escCsv(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(escCsv(undefined)).toBe('');
  });

  it('converts number to string', () => {
    expect(escCsv(42)).toBe('42');
  });

  it('handles string with comma and quote', () => {
    expect(escCsv('a, "b"')).toBe('"a, ""b"""');
  });

  it('does NOT escape CSV injection vectors (documenting current behavior)', () => {
    // NOTE: escCsv does not escape leading = + - @ characters.
    // This is a known limitation — it only quotes cells with comma, double-quote, or newline.
    expect(escCsv('=cmd')).toBe('=cmd');
    expect(escCsv('+formula')).toBe('+formula');
    expect(escCsv('-formula')).toBe('-formula');
    expect(escCsv('@formula')).toBe('@formula');
  });
});