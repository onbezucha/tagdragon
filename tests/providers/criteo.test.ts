import { describe, it, expect } from 'vitest';
import { criteo } from '../../src/providers/criteo';

// ═══ Pattern matching ═══

describe('pattern matching', () => {
  it('matches dis.criteo.com', () => {
    expect(criteo.pattern.test('https://dis.criteo.com/s_event?a=123&e=test')).toBe(true);
  });

  it('matches sslwidget.criteo.com', () => {
    expect(criteo.pattern.test('https://sslwidget.criteo.com/')).toBe(true);
  });

  it('matches static.criteo.net', () => {
    expect(criteo.pattern.test('https://static.criteo.net/js/lib/t.js')).toBe(true);
  });

  it('does not match criteo.com homepage', () => {
    expect(criteo.pattern.test('https://www.criteo.com/')).toBe(false);
  });

  it('does not match unrelated domains', () => {
    expect(criteo.pattern.test('https://www.google.com/')).toBe(false);
  });
});

// ═══ parseParams ═══

describe('parseParams', () => {
  it('extracts a (account), e (event), item, price, id, quantity, zip from URL params', () => {
    const url =
      'https://dis.criteo.com/s_event?a=ACCT123&e=viewItem&item=SKU456&price=29.99&id=TXN789&quantity=2&zip=94102';

    const result = criteo.parseParams(url, undefined);

    expect(result['Account']).toBe('ACCT123');
    expect(result['Event']).toBe('viewItem');
    expect(result['Product IDs']).toBe('SKU456');
    expect(result['Price']).toBe('29.99');
    expect(result['Transaction ID']).toBe('TXN789');
    expect(result['Quantity']).toBe('2');
    expect(result['Zip Code']).toBe('94102');
  });

  it('passes through dp.* params', () => {
    const url = 'https://dis.criteo.com/s_event?dp.r=123&dp.p=456&other=value';

    const result = criteo.parseParams(url, undefined);

    expect(result['dp.r']).toBe('123');
    expect(result['dp.p']).toBe('456');
    expect(result['other']).toBeUndefined();
  });

  it('extracts a, e, customer_email from POST body JSON', () => {
    const url = 'https://sslwidget.criteo.com/tag';
    const postBody = {
      a: 'BODY_ACCOUNT',
      e: 'purchase',
      customer_email: 'user@example.com',
    };

    const result = criteo.parseParams(url, postBody);

    expect(result['Account']).toBe('BODY_ACCOUNT');
    expect(result['Event']).toBe('purchase');
    expect(result['Email (hashed)']).toBe('user@example.com');
  });

  it('sets _eventName from p.e', () => {
    const url = 'https://dis.criteo.com/s_event?e=addToCart';

    const result = criteo.parseParams(url, undefined);

    expect(result._eventName).toBe('addToCart');
  });

  it('sets _eventName from body.e when URL has no event', () => {
    const url = 'https://dis.criteo.com/s_event';
    const postBody = { e: 'ViewContent' };

    const result = criteo.parseParams(url, postBody);

    expect(result._eventName).toBe('ViewContent');
  });

  it('returns undefined for missing fields', () => {
    const url = 'https://dis.criteo.com/s_event';

    const result = criteo.parseParams(url, undefined);

    expect(result['Account']).toBeUndefined();
    expect(result['Event']).toBeUndefined();
    expect(result['Product IDs']).toBeUndefined();
    expect(result['Price']).toBeUndefined();
    expect(result['Transaction ID']).toBeUndefined();
    expect(result['Quantity']).toBeUndefined();
    expect(result['Zip Code']).toBeUndefined();
    expect(result['Email (hashed)']).toBeUndefined();
    expect(result._eventName).toBeUndefined();
  });

  it('prefers body params over URL params', () => {
    const url = 'https://dis.criteo.com/s_event?a=URL_ACCOUNT&e=URL_EVENT';
    const postBody = { a: 'BODY_ACCOUNT', e: 'BODY_EVENT' };

    const result = criteo.parseParams(url, postBody);

    expect(result['Account']).toBe('BODY_ACCOUNT');
    expect(result['Event']).toBe('BODY_EVENT');
    expect(result._eventName).toBe('BODY_EVENT');
  });
});
