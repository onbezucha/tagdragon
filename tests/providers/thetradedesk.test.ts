import { describe, it, expect } from 'vitest';
import { theTradeDesk } from '../../src/providers/thetradedesk';

// ═══ Pattern matching ═══

describe('pattern matching', () => {
  it('matches insight.adsrvr.org/track/', () => {
    expect(theTradeDesk.pattern.test('https://insight.adsrvr.org/track/123')).toBe(true);
  });

  it('matches insight.adsrvr.org/track with path', () => {
    expect(theTradeDesk.pattern.test('https://insight.adsrvr.org/track/conv/abc')).toBe(true);
  });

  it('does not match adsrvr.org without /track/', () => {
    expect(theTradeDesk.pattern.test('https://insight.adsrvr.org/')).toBe(false);
  });

  it('does not match insight.adsrvr.com (different TLD)', () => {
    expect(theTradeDesk.pattern.test('https://insight.adsrvr.com/track/')).toBe(false);
  });
});

// ═══ parseParams ═══

describe('parseParams', () => {
  it('extracts adv (Advertiser ID) from URL params', () => {
    const url = 'https://insight.adsrvr.org/track/123?adv=ADV123';
    const postBody = undefined;

    const result = theTradeDesk.parseParams(url, postBody);

    expect(result['Advertiser ID']).toBe('ADV123');
  });

  it('extracts upid (Universal Pixel ID)', () => {
    const url = 'https://insight.adsrvr.org/track/123?upid=PIX456';
    const postBody = undefined;

    const result = theTradeDesk.parseParams(url, postBody);

    expect(result['Universal Pixel ID']).toBe('PIX456');
  });

  it('extracts v (Value)', () => {
    const url = 'https://insight.adsrvr.org/track/123?v=29.99';
    const postBody = undefined;

    const result = theTradeDesk.parseParams(url, postBody);

    expect(result.Value).toBe('29.99');
  });

  it('extracts orderid', () => {
    const url = 'https://insight.adsrvr.org/track/123?orderid=ORD789';
    const postBody = undefined;

    const result = theTradeDesk.parseParams(url, postBody);

    expect(result['Order ID']).toBe('ORD789');
  });

  it('extracts tda (Transaction ID)', () => {
    const url = 'https://insight.adsrvr.org/track/123?tda=TXN123';
    const postBody = undefined;

    const result = theTradeDesk.parseParams(url, postBody);

    expect(result['Transaction ID']).toBe('TXN123');
  });

  it('extracts tm (Match ID)', () => {
    const url = 'https://insight.adsrvr.org/track/123?tm=MATCH456';
    const postBody = undefined;

    const result = theTradeDesk.parseParams(url, postBody);

    expect(result['Match ID']).toBe('MATCH456');
  });

  it('extracts tdu (Conversion Type) and sets _eventName', () => {
    const url = 'https://insight.adsrvr.org/track/123?tdu=purchase';
    const postBody = undefined;

    const result = theTradeDesk.parseParams(url, postBody);

    expect(result['Conversion Type']).toBe('purchase');
    expect(result._eventName).toBe('purchase');
  });

  it('extracts tx and ty (Custom)', () => {
    const url = 'https://insight.adsrvr.org/track/123?tx=custom1&ty=custom2';
    const postBody = undefined;

    const result = theTradeDesk.parseParams(url, postBody);

    expect(result['Custom X']).toBe('custom1');
    expect(result['Custom Y']).toBe('custom2');
  });

  it('extracts multiple params together', () => {
    const url = 'https://insight.adsrvr.org/track/123?adv=ADV1&upid=PX1&v=49.99&tdu=conv';
    const postBody = undefined;

    const result = theTradeDesk.parseParams(url, postBody);

    expect(result['Advertiser ID']).toBe('ADV1');
    expect(result['Universal Pixel ID']).toBe('PX1');
    expect(result.Value).toBe('49.99');
    expect(result['Conversion Type']).toBe('conv');
    expect(result._eventName).toBe('conv');
  });

  it('returns undefined for missing fields', () => {
    const url = 'https://insight.adsrvr.org/track/123';

    const result = theTradeDesk.parseParams(url, undefined);

    expect(result['Advertiser ID']).toBeUndefined();
    expect(result['Universal Pixel ID']).toBeUndefined();
    expect(result.Value).toBeUndefined();
    expect(result['Order ID']).toBeUndefined();
    expect(result['Transaction ID']).toBeUndefined();
    expect(result['Match ID']).toBeUndefined();
    expect(result['Conversion Type']).toBeUndefined();
    expect(result['Custom X']).toBeUndefined();
    expect(result['Custom Y']).toBeUndefined();
    expect(result._eventName).toBeUndefined();
  });
});