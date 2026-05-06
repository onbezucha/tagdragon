import { describe, it, expect } from 'vitest';
import { vibes } from '../../src/providers/vibes';

// ═══ Pattern matching ═══

describe('pattern matching', () => {
  it('matches vibes.com/pixel', () => {
    expect(vibes.pattern.test('https://vibes.com/pixel')).toBe(true);
  });

  it('matches vibes.com/pixel with path', () => {
    expect(vibes.pattern.test('https://vibes.com/pixel/track')).toBe(true);
  });

  it('does not match vibes.com homepage', () => {
    expect(vibes.pattern.test('https://www.vibes.com/')).toBe(false);
  });

  it('does not match api.vibes.com', () => {
    expect(vibes.pattern.test('https://api.vibes.com/')).toBe(false);
  });
});

// ═══ parseParams ═══

describe('parseParams', () => {
  it('extracts event and sets _eventName', () => {
    const url = 'https://vibes.com/pixel?event=subscribe';
    const postBody = undefined;

    const result = vibes.parseParams(url, postBody);

    expect(result.Event).toBe('subscribe');
    expect(result._eventName).toBe('subscribe');
  });

  it('extracts campaign_id', () => {
    const url = 'https://vibes.com/pixel?campaign_id=CAMP123';
    const postBody = undefined;

    const result = vibes.parseParams(url, postBody);

    expect(result['Campaign ID']).toBe('CAMP123');
  });

  it('extracts multiple params together', () => {
    const url = 'https://vibes.com/pixel/track?event=click&campaign_id=CAMP456';
    const postBody = undefined;

    const result = vibes.parseParams(url, postBody);

    expect(result.Event).toBe('click');
    expect(result['Campaign ID']).toBe('CAMP456');
    expect(result._eventName).toBe('click');
  });

  it('returns undefined for missing fields', () => {
    const url = 'https://vibes.com/pixel';

    const result = vibes.parseParams(url, undefined);

    expect(result.Event).toBeUndefined();
    expect(result['Campaign ID']).toBeUndefined();
    expect(result._eventName).toBeUndefined();
  });
});