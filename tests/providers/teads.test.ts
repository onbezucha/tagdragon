import { describe, it, expect } from 'vitest';
import { teads } from '../../src/providers/teads';

// ═══ Pattern matching ═══

describe('pattern matching', () => {
  it('matches t.teads.tv/page', () => {
    expect(teads.pattern.test('https://t.teads.tv/page')).toBe(true);
  });

  it('matches p.teads.tv/', () => {
    expect(teads.pattern.test('https://p.teads.tv/tracking')).toBe(true);
  });

  it('does not match teads.com homepage', () => {
    expect(teads.pattern.test('https://www.teads.com/')).toBe(false);
  });

  it('does not match teads.tv without proper path', () => {
    expect(teads.pattern.test('https://teads.tv/')).toBe(false);
  });
});

// ═══ parseParams ═══

describe('parseParams', () => {
  it('extracts event and sets _eventName', () => {
    const url = 'https://t.teads.tv/page?event=view';
    const postBody = undefined;

    const result = teads.parseParams(url, postBody);

    expect(result.Event).toBe('view');
    expect(result._eventName).toBe('view');
  });

  it('extracts pid (Pixel ID)', () => {
    const url = 'https://t.teads.tv/page?pid=PX123456';
    const postBody = undefined;

    const result = teads.parseParams(url, postBody);

    expect(result['Pixel ID']).toBe('PX123456');
  });

  it('extracts tos (Time on Site)', () => {
    const url = 'https://t.teads.tv/page?tos=120';
    const postBody = undefined;

    const result = teads.parseParams(url, postBody);

    expect(result['Time on Site']).toBe('120');
  });

  it('extracts multiple params together', () => {
    const url = 'https://p.teads.tv/tracking?event=click&pid=PX789&tos=60';
    const postBody = undefined;

    const result = teads.parseParams(url, postBody);

    expect(result.Event).toBe('click');
    expect(result['Pixel ID']).toBe('PX789');
    expect(result['Time on Site']).toBe('60');
    expect(result._eventName).toBe('click');
  });

  it('returns undefined for missing fields', () => {
    const url = 'https://t.teads.tv/page';

    const result = teads.parseParams(url, undefined);

    expect(result.Event).toBeUndefined();
    expect(result['Pixel ID']).toBeUndefined();
    expect(result['Time on Site']).toBeUndefined();
    expect(result._eventName).toBeUndefined();
  });
});