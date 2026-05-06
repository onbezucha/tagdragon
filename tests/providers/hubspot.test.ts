import { describe, it, expect } from 'vitest';
import { hubspot } from '../../src/providers/hubspot';

// ═══ Pattern matching ═══

describe('pattern matching', () => {
  it('matches track.hubspot.com/__ptq', () => {
    expect(hubspot.pattern.test('https://track.hubspot.com/__ptq')).toBe(true);
  });

  it('matches track.hubspot.com/__ptq with parameters', () => {
    expect(hubspot.pattern.test('https://track.hubspot.com/__ptq?a=123&e=view')).toBe(true);
  });

  it('matches forms.hubspot.com/submissions/', () => {
    expect(hubspot.pattern.test('https://forms.hubspot.com/submissions/')).toBe(true);
  });

  it('does not match hubspot.com homepage', () => {
    expect(hubspot.pattern.test('https://www.hubspot.com/')).toBe(false);
  });

  it('does not match hubapi.hubspot.com (different subdomain)', () => {
    expect(hubspot.pattern.test('https://api.hubspot.com/')).toBe(false);
  });
});

// ═══ parseParams ═══

describe('parseParams', () => {
  it('extracts a (Hub ID)', () => {
    const url = 'https://track.hubspot.com/__ptq?a=12345';
    const postBody = undefined;

    const result = hubspot.parseParams(url, postBody);

    expect(result['Hub ID']).toBe('12345');
  });

  it('extracts e (Event) and sets _eventName', () => {
    const url = 'https://track.hubspot.com/__ptq?e=pageview';
    const postBody = undefined;

    const result = hubspot.parseParams(url, postBody);

    expect(result['Event']).toBe('pageview');
    expect(result._eventName).toBe('pageview');
  });

  it('extracts pageUrl', () => {
    const url = 'https://track.hubspot.com/__ptq?pageUrl=https%3A%2F%2Fexample.com';
    const postBody = undefined;

    const result = hubspot.parseParams(url, postBody);

    expect(result['Page URL']).toBe('https://example.com');
  });

  it('extracts pageTitle', () => {
    const url = 'https://track.hubspot.com/__ptq?pageTitle=Home';
    const postBody = undefined;

    const result = hubspot.parseParams(url, postBody);

    expect(result['Page Title']).toBe('Home');
  });

  it('extracts hsa_cam (Campaign)', () => {
    const url = 'https://track.hubspot.com/__ptq?hsa_cam=paid_search';
    const postBody = undefined;

    const result = hubspot.parseParams(url, postBody);

    expect(result['Campaign']).toBe('paid_search');
  });

  it('extracts hsa_src (Source)', () => {
    const url = 'https://track.hubspot.com/__ptq?hsa_src=google';
    const postBody = undefined;

    const result = hubspot.parseParams(url, postBody);

    expect(result['Source']).toBe('google');
  });

  it('extracts hutk (User Token)', () => {
    const url = 'https://track.hubspot.com/__ptq?hutk=TOKEN123';
    const postBody = undefined;

    const result = hubspot.parseParams(url, postBody);

    expect(result['User Token']).toBe('TOKEN123');
  });

  it('extracts hssc (Session Count)', () => {
    const url = 'https://track.hubspot.com/__ptq?hssc=3';
    const postBody = undefined;

    const result = hubspot.parseParams(url, postBody);

    expect(result['Session Count']).toBe('3');
  });

  it('extracts hstc (Long-term Cookie)', () => {
    const url = 'https://track.hubspot.com/__ptq?hstc=LTC456';
    const postBody = undefined;

    const result = hubspot.parseParams(url, postBody);

    expect(result['Long-term Cookie']).toBe('LTC456');
  });

  it('extracts multiple params together', () => {
    const url = 'https://track.hubspot.com/__ptq?a=123&e=conversion&hsa_cam=campaign1&hsa_src=email';
    const postBody = undefined;

    const result = hubspot.parseParams(url, postBody);

    expect(result['Hub ID']).toBe('123');
    expect(result['Event']).toBe('conversion');
    expect(result['Campaign']).toBe('campaign1');
    expect(result['Source']).toBe('email');
    expect(result._eventName).toBe('conversion');
  });

  it('returns undefined for missing fields', () => {
    const url = 'https://track.hubspot.com/__ptq';

    const result = hubspot.parseParams(url, undefined);

    expect(result['Hub ID']).toBeUndefined();
    expect(result['Event']).toBeUndefined();
    expect(result['Page URL']).toBeUndefined();
    expect(result['Page Title']).toBeUndefined();
    expect(result['Campaign']).toBeUndefined();
    expect(result['Source']).toBeUndefined();
    expect(result['User Token']).toBeUndefined();
    expect(result['Session Count']).toBeUndefined();
    expect(result['Long-term Cookie']).toBeUndefined();
    expect(result._eventName).toBeUndefined();
  });
});
