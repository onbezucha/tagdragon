import { describe, it, expect } from 'vitest';
import { outbrain } from '../../src/providers/outbrain';

// ═══ Pattern matching ═══

describe('pattern matching', () => {
  it('matches tr.outbrain.com/unifiedPixel', () => {
    expect(outbrain.pattern.test('https://tr.outbrain.com/unifiedPixel')).toBe(true);
  });

  it('matches amplify.outbrain.com/pixel', () => {
    expect(outbrain.pattern.test('https://amplify.outbrain.com/pixel')).toBe(true);
  });

  it('does not match outbrain.com homepage', () => {
    expect(outbrain.pattern.test('https://www.outbrain.com/')).toBe(false);
  });

  it('does not match tr.outbrain.com without unifiedPixel', () => {
    expect(outbrain.pattern.test('https://tr.outbrain.com/')).toBe(false);
  });
});

// ═══ parseParams ═══

describe('parseParams', () => {
  it('extracts name (Event) and sets _eventName', () => {
    const url = 'https://tr.outbrain.com/unifiedPixel?name=PageView';
    const postBody = undefined;

    const result = outbrain.parseParams(url, postBody);

    expect(result.Event).toBe('PageView');
    expect(result._eventName).toBe('PageView');
  });

  it('extracts ob_click_id', () => {
    const url = 'https://tr.outbrain.com/unifiedPixel?ob_click_id=CLICK123';
    const postBody = undefined;

    const result = outbrain.parseParams(url, postBody);

    expect(result['Click ID']).toBe('CLICK123');
  });

  it('extracts orderValue', () => {
    const url = 'https://tr.outbrain.com/unifiedPixel?orderValue=49.99';
    const postBody = undefined;

    const result = outbrain.parseParams(url, postBody);

    expect(result['Order Value']).toBe('49.99');
  });

  it('extracts currency', () => {
    const url = 'https://tr.outbrain.com/unifiedPixel?currency=USD';
    const postBody = undefined;

    const result = outbrain.parseParams(url, postBody);

    expect(result.Currency).toBe('USD');
  });

  it('extracts multiple params together', () => {
    const url = 'https://tr.outbrain.com/unifiedPixel?name=Conversion&ob_click_id=ABC&orderValue=29.99&currency=EUR';
    const postBody = undefined;

    const result = outbrain.parseParams(url, postBody);

    expect(result.Event).toBe('Conversion');
    expect(result['Click ID']).toBe('ABC');
    expect(result['Order Value']).toBe('29.99');
    expect(result.Currency).toBe('EUR');
    expect(result._eventName).toBe('Conversion');
  });

  it('returns undefined for missing fields', () => {
    const url = 'https://tr.outbrain.com/unifiedPixel';

    const result = outbrain.parseParams(url, undefined);

    expect(result.Event).toBeUndefined();
    expect(result['Click ID']).toBeUndefined();
    expect(result['Order Value']).toBeUndefined();
    expect(result.Currency).toBeUndefined();
    expect(result._eventName).toBeUndefined();
  });
});