import { describe, it, expect } from 'vitest';
import { sojern } from '../../src/providers/sojern';

// ═══ Pattern matching ═══

describe('pattern matching', () => {
  it('matches beacon.sojern.com', () => {
    expect(sojern.pattern.test('https://beacon.sojern.com/track')).toBe(true);
  });

  it('matches beacon.sojern.com with path', () => {
    expect(sojern.pattern.test('https://beacon.sojern.com/v1/conv')).toBe(true);
  });

  it('does not match sojern.com homepage', () => {
    expect(sojern.pattern.test('https://www.sojern.com/')).toBe(false);
  });

  it('does not match api.sojern.com', () => {
    expect(sojern.pattern.test('https://api.sojern.com/')).toBe(false);
  });
});

// ═══ parseParams ═══

describe('parseParams', () => {
  it('extracts event and sets _eventName', () => {
    const url = 'https://beacon.sojern.com/track?event=view';
    const postBody = undefined;

    const result = sojern.parseParams(url, postBody);

    expect(result.Event).toBe('view');
    expect(result._eventName).toBe('view');
  });

  it('extracts hpid (Partner ID)', () => {
    const url = 'https://beacon.sojern.com/track?hpid=PART123';
    const postBody = undefined;

    const result = sojern.parseParams(url, postBody);

    expect(result['Partner ID']).toBe('PART123');
  });

  it('extracts t (Type)', () => {
    const url = 'https://beacon.sojern.com/track?t=display';
    const postBody = undefined;

    const result = sojern.parseParams(url, postBody);

    expect(result.Type).toBe('display');
  });

  it('extracts multiple params together', () => {
    const url = 'https://beacon.sojern.com/track?event=click&hpid=PART456&t=video';
    const postBody = undefined;

    const result = sojern.parseParams(url, postBody);

    expect(result.Event).toBe('click');
    expect(result['Partner ID']).toBe('PART456');
    expect(result.Type).toBe('video');
    expect(result._eventName).toBe('click');
  });

  it('returns undefined for missing fields', () => {
    const url = 'https://beacon.sojern.com/track';

    const result = sojern.parseParams(url, undefined);

    expect(result.Event).toBeUndefined();
    expect(result['Partner ID']).toBeUndefined();
    expect(result.Type).toBeUndefined();
    expect(result._eventName).toBeUndefined();
  });
});