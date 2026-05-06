import { describe, it, expect } from 'vitest';
import { doubleclick } from '../../src/providers/doubleclick';

// ═══ Pattern matching ═══

describe('pattern matching', () => {
  it('matches doubleclick.net/activity', () => {
    expect(doubleclick.pattern.test('https://doubleclick.net/activity;src=123')).toBe(true);
  });

  it('matches doubleclick.net/activity with path segments', () => {
    expect(doubleclick.pattern.test('https://doubleclick.net/activity;cat=video')).toBe(true);
  });

  it('does not match doubleclick.net without /activity', () => {
    expect(doubleclick.pattern.test('https://doubleclick.net/page')).toBe(false);
  });

  it('does not match doubleclick.com (different TLD)', () => {
    expect(doubleclick.pattern.test('https://doubleclick.com/activity')).toBe(false);
  });
});

// ═══ parseParams ═══

describe('parseParams', () => {
  it('extracts src as Advertiser ID from URL params', () => {
    const url = 'https://doubleclick.net/activity;src=ADV123';
    const postBody = undefined;

    const result = doubleclick.parseParams(url, postBody);

    expect(result['Advertiser ID']).toBe('ADV123');
  });

  it('extracts type, cat, and _eventName from cat', () => {
    const url = 'https://doubleclick.net/activity;src=ACCT1;type=conv;cat=purchase';
    const postBody = undefined;

    const result = doubleclick.parseParams(url, postBody);

    expect(result['Activity Type']).toBe('conv');
    expect(result['Activity']).toBe('purchase');
    expect(result._eventName).toBe('purchase');
  });

  it('extracts dc_rdid as Click ID', () => {
    const url = 'https://doubleclick.net/activity;dc_rdid=RDID456';
    const postBody = undefined;

    const result = doubleclick.parseParams(url, postBody);

    expect(result['Click ID']).toBe('RDID456');
  });

  it('extracts gclid as Click ID', () => {
    const url = 'https://doubleclick.net/activity;gclid=GCLID789';
    const postBody = undefined;

    const result = doubleclick.parseParams(url, postBody);

    expect(result['Click ID']).toBe('GCLID789');
  });

  it('extracts ord as Order ID only when NOT 8+ digits', () => {
    const url = 'https://doubleclick.net/activity;ord=ABC123';
    const postBody = undefined;

    const result = doubleclick.parseParams(url, postBody);

    expect(result['Order ID']).toBe('ABC123');
  });

  it('does NOT extract ord when it IS 8+ digit number', () => {
    const url = 'https://doubleclick.net/activity;ord=12345678';
    const postBody = undefined;

    const result = doubleclick.parseParams(url, postBody);

    expect(result['Order ID']).toBeUndefined();
  });

  it('extracts qty', () => {
    const url = 'https://doubleclick.net/activity;qty=5';
    const postBody = undefined;

    const result = doubleclick.parseParams(url, postBody);

    expect(result['qty']).toBe('5');
  });

  it('extracts cost as Revenue', () => {
    const url = 'https://doubleclick.net/activity;cost=29.99';
    const postBody = undefined;

    const result = doubleclick.parseParams(url, postBody);

    expect(result['Revenue']).toBe('29.99');
  });

  it('extracts tran', () => {
    const url = 'https://doubleclick.net/activity;tran=sale';
    const postBody = undefined;

    const result = doubleclick.parseParams(url, postBody);

    expect(result['tran']).toBe('sale');
  });

  it('extracts tag', () => {
    const url = 'https://doubleclick.net/activity;tag=promo';
    const postBody = undefined;

    const result = doubleclick.parseParams(url, postBody);

    expect(result['tag']).toBe('promo');
  });

  it('extracts plus u* custom vars as Custom: u1, u2, etc.', () => {
    const url = 'https://doubleclick.net/activity;u1=custom1;u2=custom2;u3=custom3';
    const postBody = undefined;

    const result = doubleclick.parseParams(url, postBody);

    expect(result['Custom: u1']).toBe('custom1');
    expect(result['Custom: u2']).toBe('custom2');
    expect(result['Custom: u3']).toBe('custom3');
  });

  it('extracts multiple params at once', () => {
    const url = 'https://doubleclick.net/activity;src=ACCT1;cat=view;qty=2;cost=19.99';
    const postBody = undefined;

    const result = doubleclick.parseParams(url, postBody);

    expect(result['Advertiser ID']).toBe('ACCT1');
    expect(result['Activity']).toBe('view');
    expect(result['qty']).toBe('2');
    expect(result['Revenue']).toBe('19.99');
    expect(result._eventName).toBe('view');
  });
});