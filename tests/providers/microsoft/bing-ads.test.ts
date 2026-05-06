import { describe, it, expect } from 'vitest';
import { bingAds } from '../../../src/providers/microsoft/bing-ads';

// ═══ Pattern matching ═══

describe('pattern matching', () => {
  it('matches bat.bing.com/action/0', () => {
    expect(bingAds.pattern.test('https://bat.bing.com/action/0?evt=pageview&ti=123')).toBe(true);
  });

  it('matches bat.bing.com/action/0 with various params', () => {
    expect(bingAds.pattern.test('https://bat.bing.com/action/0?msclkid=N&p=https://example.com')).toBe(true);
  });

  it('does not match bing.com/search', () => {
    expect(bingAds.pattern.test('https://bing.com/search?q=test')).toBe(false);
  });

  it('does not match bat.bing.com/action/1', () => {
    expect(bingAds.pattern.test('https://bat.bing.com/action/1?evt=test')).toBe(false);
  });
});

// ═══ parseParams ═══

describe('parseParams', () => {
  it('extracts evt, ti, tm, Ver, p, tl, r, mid, sid, vid, msclkid from URL params', () => {
    const url =
      'https://bat.bing.com/action/0?evt=pageview&ti=TAG456&tm=GTM-123&Ver=2&p=https://shop.com&tl=Home%20Page&r=https://google.com&mid=MACHINE123&sid=SESSION456&vid=VISIT789&msclkid=CLICK123';

    const result = bingAds.parseParams(url, undefined);

    expect(result['Event']).toBe('pageview');
    expect(result['Tag ID']).toBe('TAG456');
    expect(result['Tag Manager']).toBe('GTM-123');
    expect(result['UET Version']).toBe('2');
    expect(result['Page URL']).toBe('https://shop.com');
    expect(result['Page Title']).toBe('Home Page');
    expect(result['Referrer']).toBe('https://google.com');
    expect(result['Machine ID']).toBe('MACHINE123');
    expect(result['Session ID']).toBe('SESSION456');
    expect(result['Visit ID']).toBe('VISIT789');
    expect(result['Click ID']).toBe('CLICK123');
  });

  it('formats screen resolution from sw+sh', () => {
    const url = 'https://bat.bing.com/action/0?sw=1920&sh=1080';

    const result = bingAds.parseParams(url, undefined);

    expect(result['Screen Resolution']).toBe('1920x1080');
  });

  it('returns undefined for screen resolution when sw is missing', () => {
    const url = 'https://bat.bing.com/action/0?sh=1080';

    const result = bingAds.parseParams(url, undefined);

    expect(result['Screen Resolution']).toBeUndefined();
  });

  it('returns undefined for screen resolution when sh is missing', () => {
    const url = 'https://bat.bing.com/action/0?sw=1920';

    const result = bingAds.parseParams(url, undefined);

    expect(result['Screen Resolution']).toBeUndefined();
  });

  it('filters msclkid when value is N', () => {
    const url = 'https://bat.bing.com/action/0?msclkid=N';

    const result = bingAds.parseParams(url, undefined);

    expect(result['Click ID']).toBeUndefined();
  });

  it('keeps msclkid when value is not N', () => {
    const url = 'https://bat.bing.com/action/0?msclkid=CLICK456';

    const result = bingAds.parseParams(url, undefined);

    expect(result['Click ID']).toBe('CLICK456');
  });

  it('formats load time with ms suffix', () => {
    const url = 'https://bat.bing.com/action/0?lt=150';

    const result = bingAds.parseParams(url, undefined);

    expect(result['Load Time']).toBe('150ms');
  });

  it('sets _eventName from evt', () => {
    const url = 'https://bat.bing.com/action/0?evt=conversion';

    const result = bingAds.parseParams(url, undefined);

    expect(result._eventName).toBe('conversion');
  });

  it('extracts ec, ea, el, ev, gv, gc, revenue', () => {
    const url =
      'https://bat.bing.com/action/0?ec=category&ea=action&el=label&ev=10&gv=50&gc=USD&revenue=99.99';

    const result = bingAds.parseParams(url, undefined);

    expect(result['Event Category']).toBe('category');
    expect(result['Event Action']).toBe('action');
    expect(result['Event Label']).toBe('label');
    expect(result['Event Value']).toBe('10');
    expect(result['Goal Value']).toBe('50');
    expect(result['Goal Currency']).toBe('USD');
    expect(result['Revenue']).toBe('99.99');
  });

  it('extracts consent cdb', () => {
    const url = 'https://bat.bing.com/action/0?cdb=consent_data';

    const result = bingAds.parseParams(url, undefined);

    expect(result['Consent']).toBe('consent_data');
  });

  it('returns undefined for missing fields', () => {
    const url = 'https://bat.bing.com/action/0';

    const result = bingAds.parseParams(url, undefined);

    expect(result['Event']).toBeUndefined();
    expect(result['Tag ID']).toBeUndefined();
    expect(result['Tag Manager']).toBeUndefined();
    expect(result['UET Version']).toBeUndefined();
    expect(result['Page URL']).toBeUndefined();
    expect(result['Page Title']).toBeUndefined();
    expect(result['Referrer']).toBeUndefined();
    expect(result['Machine ID']).toBeUndefined();
    expect(result['Session ID']).toBeUndefined();
    expect(result['Visit ID']).toBeUndefined();
    expect(result['Click ID']).toBeUndefined();
    expect(result['Event Category']).toBeUndefined();
    expect(result['Event Action']).toBeUndefined();
    expect(result['Event Label']).toBeUndefined();
    expect(result['Event Value']).toBeUndefined();
    expect(result['Goal Value']).toBeUndefined();
    expect(result['Goal Currency']).toBeUndefined();
    expect(result['Revenue']).toBeUndefined();
    expect(result['Load Time']).toBeUndefined();
    expect(result['Consent']).toBeUndefined();
    expect(result._eventName).toBeUndefined();
  });
});
