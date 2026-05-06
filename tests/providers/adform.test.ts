import { describe, it, expect } from 'vitest';
import { adform } from '../../src/providers/adform';

// ═══ Pattern matching ═══

describe('pattern matching', () => {
  it('matches track.adform.net', () => {
    expect(adform.pattern.test('https://track.adform.net/serving/track')).toBe(true);
  });

  it('matches a1.adform.net', () => {
    expect(adform.pattern.test('https://a1.adform.net/serving/track')).toBe(true);
  });

  it('does not match adform.com', () => {
    expect(adform.pattern.test('https://www.adform.com/')).toBe(false);
  });

  it('does not match track.adform.com (different TLD)', () => {
    expect(adform.pattern.test('https://track.adform.com/')).toBe(false);
  });
});

// ═══ parseParams ═══

describe('parseParams', () => {
  it('extracts pm (Tracking ID) from URL params', () => {
    const url = 'https://track.adform.net/serving/track?pm=12345';
    const postBody = undefined;

    const result = adform.parseParams(url, postBody);

    expect(result['Tracking ID']).toBe('12345');
  });

  it('extracts ADFPageName and decodes it', () => {
    const url = 'https://track.adform.net/serving/track?ADFPageName=Home%20Page';
    const postBody = undefined;

    const result = adform.parseParams(url, postBody);

    expect(result['Page Name']).toBe('Home Page');
  });

  it('extracts ADFtpmode with mode labels', () => {
    const url1 = 'https://track.adform.net/serving/track?ADFtpmode=1';
    const url2 = 'https://track.adform.net/serving/track?ADFtpmode=2';
    const url4 = 'https://track.adform.net/serving/track?ADFtpmode=4';

    expect(adform.parseParams(url1, undefined)['Tracking Mode']).toBe('1 — Page view');
    expect(adform.parseParams(url2, undefined)['Tracking Mode']).toBe('2 — Conversion');
    expect(adform.parseParams(url4, undefined)['Tracking Mode']).toBe('4 — iFrame / consent');
  });

  it('extracts orderid', () => {
    const url = 'https://track.adform.net/serving/track?orderid=ORD789';
    const postBody = undefined;

    const result = adform.parseParams(url, postBody);

    expect(result['Order ID']).toBe('ORD789');
  });

  it('extracts cost/sales as order value', () => {
    const url = 'https://track.adform.net/serving/track?cost=49.99';
    const postBody = undefined;

    const result = adform.parseParams(url, postBody);

    expect(result['Conversion Value']).toBe('49.99');
  });

  it('extracts bn', () => {
    const url = 'https://track.adform.net/serving/track?bn=banner123';
    const postBody = undefined;

    const result = adform.parseParams(url, postBody);

    expect(result['Banner ID']).toBe('banner123');
  });

  it('extracts loc and decodes it', () => {
    const url = 'https://track.adform.net/serving/track?loc=US%2FCA';
    const postBody = undefined;

    const result = adform.parseParams(url, postBody);

    expect(result['Page URL']).toBe('US/CA');
  });

  it('extracts CPref and decodes it', () => {
    const url = 'https://track.adform.net/serving/track?CPref=ref%3Dcode';
    const postBody = undefined;

    const result = adform.parseParams(url, postBody);

    expect(result['Referrer']).toBe('ref=code');
  });

  it('extracts sv1-sv5 custom vars', () => {
    const url = 'https://track.adform.net/serving/track?sv1=custom1&sv2=custom2&sv5=custom5';
    const postBody = undefined;

    const result = adform.parseParams(url, postBody);

    expect(result['Custom Var 1']).toBe('custom1');
    expect(result['Custom Var 2']).toBe('custom2');
    expect(result['Custom Var 5']).toBe('custom5');
  });

  it('extracts gdpr and gdpr_consent', () => {
    const url = 'https://track.adform.net/serving/track?gdpr=1&gdpr_consent=ABC123';
    const postBody = undefined;

    const result = adform.parseParams(url, postBody);

    expect(result['GDPR']).toBe('1');
    expect(result['GDPR Consent']).toBe('ABC123');
  });

  it('extracts multiple params together', () => {
    const url = 'https://track.adform.net/serving/track?pm=123&orderid=ORD1&cost=29.99&loc=US';
    const postBody = undefined;

    const result = adform.parseParams(url, postBody);

    expect(result['Tracking ID']).toBe('123');
    expect(result['Order ID']).toBe('ORD1');
    expect(result['Conversion Value']).toBe('29.99');
    expect(result['Page URL']).toBe('US');
  });
});