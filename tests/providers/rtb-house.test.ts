import { describe, it, expect } from 'vitest';
import { rtbHouse } from '../../src/providers/rtb-house';

// ═══ Pattern matching ═══

describe('pattern matching', () => {
  it('matches creative.rtbhouse.com', () => {
    expect(rtbHouse.pattern.test('https://creative.rtbhouse.com/track')).toBe(true);
  });

  it('matches creative.rtbhouse.com with path', () => {
    expect(rtbHouse.pattern.test('https://creative.rtbhouse.com/delivery/conv')).toBe(true);
  });

  it('does not match rtbhouse.com homepage', () => {
    expect(rtbHouse.pattern.test('https://www.rtbhouse.com/')).toBe(false);
  });

  it('does not match ads.rtbhouse.com (different subdomain)', () => {
    expect(rtbHouse.pattern.test('https://ads.rtbhouse.com/')).toBe(false);
  });
});

// ═══ parseParams ═══

describe('parseParams', () => {
  it('extracts event and sets _eventName', () => {
    const url = 'https://creative.rtbhouse.com/track?event=purchase';
    const postBody = undefined;

    const result = rtbHouse.parseParams(url, postBody);

    expect(result.Event).toBe('purchase');
    expect(result._eventName).toBe('purchase');
  });

  it('extracts user_id', () => {
    const url = 'https://creative.rtbhouse.com/track?user_id=USER123';
    const postBody = undefined;

    const result = rtbHouse.parseParams(url, postBody);

    expect(result['User ID']).toBe('USER123');
  });

  it('extracts ct (Category)', () => {
    const url = 'https://creative.rtbhouse.com/track?ct=automotive';
    const postBody = undefined;

    const result = rtbHouse.parseParams(url, postBody);

    expect(result.Category).toBe('automotive');
  });

  it('extracts multiple params together', () => {
    const url = 'https://creative.rtbhouse.com/track?event=view&user_id=USR456&ct=finance';
    const postBody = undefined;

    const result = rtbHouse.parseParams(url, postBody);

    expect(result.Event).toBe('view');
    expect(result['User ID']).toBe('USR456');
    expect(result.Category).toBe('finance');
    expect(result._eventName).toBe('view');
  });

  it('returns undefined for missing fields', () => {
    const url = 'https://creative.rtbhouse.com/track';

    const result = rtbHouse.parseParams(url, undefined);

    expect(result.Event).toBeUndefined();
    expect(result['User ID']).toBeUndefined();
    expect(result.Category).toBeUndefined();
    expect(result._eventName).toBeUndefined();
  });
});