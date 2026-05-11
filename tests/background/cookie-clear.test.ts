import { describe, it, expect } from 'vitest';
import { deduplicateCookies, buildCookieUrl } from '@/background/redirect-utils';

// ══════════════════════════════════════════════════════════════════════════════
// Helper
// ══════════════════════════════════════════════════════════════════════════════

function mockCookie(overrides: Partial<chrome.cookies.Cookie> = {}): chrome.cookies.Cookie {
  return {
    name: 'test_cookie',
    value: 'abc123',
    domain: '.example.com',
    path: '/',
    secure: true,
    httpOnly: false,
    sameSite: 'lax' as chrome.cookies.SameSiteStatus,
    expires: Date.now() / 1000 + 3600,
    hostOnly: false,
    session: false,
    storeId: '0',
    ...overrides,
  } as chrome.cookies.Cookie;
}

// ══════════════════════════════════════════════════════════════════════════════
// deduplicateCookies
// ══════════════════════════════════════════════════════════════════════════════

describe('deduplicateCookies', () => {
  it('returns all cookies when no duplicates', () => {
    const byCookies = [mockCookie({ name: 'a', domain: '.example.com', path: '/', storeId: '0' })];
    const byDomain = [mockCookie({ name: 'b', domain: '.example.com', path: '/', storeId: '0' })];
    const result = deduplicateCookies(byCookies, byDomain);
    expect(result).toHaveLength(2);
  });

  it('deduplicates cookies by name+domain+path+storeId', () => {
    const cookie = mockCookie({ name: 'session', domain: '.example.com', path: '/', storeId: '0' });
    const byCookies = [cookie];
    const byDomain = [cookie]; // same key
    const result = deduplicateCookies(byCookies, byDomain);
    expect(result).toHaveLength(1);
  });

  it('keeps first occurrence when duplicates exist', () => {
    const first = mockCookie({ name: 'session', value: 'first', domain: '.example.com', path: '/', storeId: '0' });
    const second = mockCookie({ name: 'session', value: 'second', domain: '.example.com', path: '/', storeId: '0' });
    const result = deduplicateCookies([first], [second]);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('first');
  });

  it('handles empty arrays', () => {
    expect(deduplicateCookies([], [])).toHaveLength(0);
    expect(deduplicateCookies([], [mockCookie()])).toHaveLength(1);
    expect(deduplicateCookies([mockCookie()], [])).toHaveLength(1);
  });

  it('treats cookies with same name but different domain as distinct', () => {
    const byCookies = [mockCookie({ name: 'session', domain: '.example.com', path: '/', storeId: '0' })];
    const byDomain = [mockCookie({ name: 'session', domain: '.other.com', path: '/', storeId: '0' })];
    const result = deduplicateCookies(byCookies, byDomain);
    expect(result).toHaveLength(2);
  });

  it('treats cookies with same name but different path as distinct', () => {
    const byCookies = [mockCookie({ name: 'session', domain: '.example.com', path: '/' })];
    const byDomain = [mockCookie({ name: 'session', domain: '.example.com', path: '/api' })];
    const result = deduplicateCookies(byCookies, byDomain);
    expect(result).toHaveLength(2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// buildCookieUrl
// ══════════════════════════════════════════════════════════════════════════════

describe('buildCookieUrl', () => {
  it('constructs https URL for secure cookie', () => {
    const cookie = mockCookie({ secure: true, domain: '.example.com', path: '/' });
    expect(buildCookieUrl(cookie)).toBe('https://example.com/');
  });

  it('constructs http URL for non-secure cookie', () => {
    const cookie = mockCookie({ secure: false, domain: '.example.com', path: '/' });
    expect(buildCookieUrl(cookie)).toBe('http://example.com/');
  });

  it('strips leading dot from domain', () => {
    const cookie = mockCookie({ secure: true, domain: '.example.com', path: '/' });
    expect(buildCookieUrl(cookie)).toBe('https://example.com/');
  });

  it('handles domain without leading dot', () => {
    const cookie = mockCookie({ secure: true, domain: 'example.com', path: '/' });
    expect(buildCookieUrl(cookie)).toBe('https://example.com/');
  });

  it('includes path in URL', () => {
    const cookie = mockCookie({ secure: true, domain: '.example.com', path: '/api/v1' });
    expect(buildCookieUrl(cookie)).toBe('https://example.com/api/v1');
  });
});
