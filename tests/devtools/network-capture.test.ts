import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock Chrome API before importing the module using vi.hoisted
const { chromeMock } = vi.hoisted(() => ({
  chromeMock: {
    devtools: { inspectedWindow: { tabId: 1 } },
    storage: { session: { get: vi.fn().mockResolvedValue({}) } },
    runtime: { onMessage: { addListener: vi.fn() } },
  },
}));

vi.stubGlobal('chrome', chromeMock);

// Import AFTER mocking
const { parsePostBody } = await import('@/devtools/network-capture');

describe('parsePostBody', () => {
  it('returns null for null/undefined input', () => {
    expect(parsePostBody(null)).toBeNull();
    expect(parsePostBody(undefined)).toBeNull();
  });

  it('returns null for empty postData', () => {
    expect(parsePostBody({})).toBeNull();
  });

  it('parses JSON text', () => {
    const result = parsePostBody({ text: '{"event":"purchase"}' });
    expect(result).toEqual({ event: 'purchase' });
  });

  it('returns plain string for non-JSON text', () => {
    const result = parsePostBody({ text: 'en=purchase&tid=G-ABC' });
    expect(result).toBe('en=purchase&tid=G-ABC');
  });

  it('decodes base64 raw bytes', () => {
    const result = parsePostBody({ raw: [{ bytes: btoa('hello') }] });
    expect(result).toBe('hello');
  });

  it('prefers text over raw when both present', () => {
    const result = parsePostBody({
      text: 'from-text',
      raw: [{ bytes: btoa('from-raw') }],
    });
    expect(result).toBe('from-text');
  });

  it('returns null when text is empty string', () => {
    expect(parsePostBody({ text: '' })).toBeNull();
  });

  it('returns null when raw has no bytes', () => {
    expect(parsePostBody({ raw: [{}] })).toBeNull();
  });

  it('handles malformed base64 gracefully', () => {
    expect(parsePostBody({ raw: [{ bytes: '!!!invalid!!!' }] })).toBeNull();
  });
});
