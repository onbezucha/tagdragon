import { describe, it, expect } from 'vitest';
import { linkedin } from '../../src/providers/linkedin';

// ═══ Pattern matching ═══

describe('pattern matching', () => {
  it('matches linkedin.com/li/track', () => {
    expect(linkedin.pattern.test('https://linkedin.com/li/track?pid=abc&conversionId=xyz')).toBe(true);
  });

  it('matches px.ads.linkedin.com', () => {
    expect(linkedin.pattern.test('https://px.ads.linkedin.com/')).toBe(true);
  });

  it('does not match www.linkedin.com/feed', () => {
    expect(linkedin.pattern.test('https://www.linkedin.com/feed')).toBe(false);
  });

  it('does not match www.linkedin.com/company/acme', () => {
    expect(linkedin.pattern.test('https://www.linkedin.com/company/acme')).toBe(false);
  });
});

// ═══ parseParams ═══

describe('parseParams', () => {
  it('extracts pid, conversionId, ch, time, _litr, v from URL params', () => {
    const url =
      'https://px.ads.linkedin.com/?pid=PARTNER123&conversionId=CONV456&ch=abc123&time=1704067200&_litr=LITR789&v=2';

    const result = linkedin.parseParams(url, undefined);

    expect(result['Partner ID']).toBe('PARTNER123');
    expect(result['Conversion']).toBe('CONV456');
    expect(result['Conversion Hash']).toBe('abc123');
    expect(result['Time']).toBe('1704067200');
    expect(result['Conversion ID']).toBe('LITR789');
    expect(result['Version']).toBe('2');
  });

  it('sets _eventName from conversionId', () => {
    const url = 'https://linkedin.com/li/track?conversionId=MY_CONVERSION';

    const result = linkedin.parseParams(url, undefined);

    expect(result._eventName).toBe('MY_CONVERSION');
  });

  it('returns undefined for missing fields', () => {
    const url = 'https://linkedin.com/li/track';

    const result = linkedin.parseParams(url, undefined);

    expect(result['Partner ID']).toBeUndefined();
    expect(result['Conversion']).toBeUndefined();
    expect(result['Conversion Hash']).toBeUndefined();
    expect(result['Time']).toBeUndefined();
    expect(result['Conversion ID']).toBeUndefined();
    expect(result['Version']).toBeUndefined();
    expect(result._eventName).toBeUndefined();
  });

  it('handles partial URL params', () => {
    const url = 'https://px.ads.linkedin.com/?pid=ONLY_PID&v=1';

    const result = linkedin.parseParams(url, undefined);

    expect(result['Partner ID']).toBe('ONLY_PID');
    expect(result['Version']).toBe('1');
    expect(result['Conversion']).toBeUndefined();
    expect(result._eventName).toBeUndefined();
  });
});