import { describe, it, expect } from 'vitest';
import { invoca } from '../../src/providers/invoca';

// ═══ Pattern matching ═══

describe('pattern matching', () => {
  it('matches solutions.invoca.com/pixel', () => {
    expect(invoca.pattern.test('https://solutions.invoca.com/pixel')).toBe(true);
  });

  it('matches solutions.invoca.com/pixel with path', () => {
    expect(invoca.pattern.test('https://solutions.invoca.com/pixel/track')).toBe(true);
  });

  it('does not match invoca.com homepage', () => {
    expect(invoca.pattern.test('https://www.invoca.com/')).toBe(false);
  });

  it('does not match api.invoca.com', () => {
    expect(invoca.pattern.test('https://api.invoca.com/')).toBe(false);
  });
});

// ═══ parseParams ═══

describe('parseParams', () => {
  it('extracts event and sets _eventName', () => {
    const url = 'https://solutions.invoca.com/pixel?event=call';
    const postBody = undefined;

    const result = invoca.parseParams(url, postBody);

    expect(result['Event']).toBe('call');
    expect(result._eventName).toBe('call');
  });

  it('extracts transaction_id', () => {
    const url = 'https://solutions.invoca.com/pixel?transaction_id=TXN123';
    const postBody = undefined;

    const result = invoca.parseParams(url, postBody);

    expect(result['Transaction ID']).toBe('TXN123');
  });

  it('extracts campaign_id', () => {
    const url = 'https://solutions.invoca.com/pixel?campaign_id=CAMP456';
    const postBody = undefined;

    const result = invoca.parseParams(url, postBody);

    expect(result['Campaign ID']).toBe('CAMP456');
  });

  it('extracts multiple params together', () => {
    const url = 'https://solutions.invoca.com/pixel/track?event=conversion&transaction_id=TXN789&campaign_id=CAMP001';
    const postBody = undefined;

    const result = invoca.parseParams(url, postBody);

    expect(result['Event']).toBe('conversion');
    expect(result['Transaction ID']).toBe('TXN789');
    expect(result['Campaign ID']).toBe('CAMP001');
    expect(result._eventName).toBe('conversion');
  });

  it('returns undefined for missing fields', () => {
    const url = 'https://solutions.invoca.com/pixel';

    const result = invoca.parseParams(url, undefined);

    expect(result['Event']).toBeUndefined();
    expect(result['Transaction ID']).toBeUndefined();
    expect(result['Campaign ID']).toBeUndefined();
    expect(result._eventName).toBeUndefined();
  });
});
