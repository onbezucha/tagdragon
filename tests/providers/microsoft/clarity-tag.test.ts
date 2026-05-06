import { describe, it, expect } from 'vitest';
import { microsoftClarityTag } from '../../../src/providers/microsoft/clarity-tag';

// ═══ Pattern matching ═══

describe('pattern matching', () => {
  it('matches clarity.ms/tag/ with project ID', () => {
    expect(microsoftClarityTag.pattern.test('https://www.clarity.ms/tag/project123')).toBe(true);
  });

  it('matches with long alphanumeric project ID', () => {
    expect(microsoftClarityTag.pattern.test('https://www.clarity.ms/tag/abcd1234efgh5678ijkl')).toBe(true);
  });

  it('does NOT match clarity.ms without /tag/', () => {
    expect(microsoftClarityTag.pattern.test('https://www.clarity.ms/script.js')).toBe(false);
  });

  it('does NOT match other clarity subdomains', () => {
    expect(microsoftClarityTag.pattern.test('https://help.clarity.ms/faq')).toBe(false);
  });
});

// ═══ parseParams ═══

describe('parseParams', () => {
  it('extracts project ID from URL', () => {
    const url = 'https://www.clarity.ms/tag/proj123abc';
    const result = microsoftClarityTag.parseParams(url, undefined);

    expect(result['Project ID']).toBe('proj123abc');
  });

  it('extracts project ID with query string', () => {
    const url = 'https://www.clarity.ms/tag/project456?ref=page';
    const result = microsoftClarityTag.parseParams(url, undefined);

    expect(result['Project ID']).toBe('project456');
  });

  it('extracts project ID from path with additional segments', () => {
    const url = 'https://www.clarity.ms/tag/abc123xyz/something';
    const result = microsoftClarityTag.parseParams(url, undefined);

    expect(result['Project ID']).toBe('abc123xyz');
  });

  it('sets Request Type to Library Load', () => {
    const url = 'https://www.clarity.ms/tag/myproject';
    const result = microsoftClarityTag.parseParams(url, undefined);

    expect(result['Request Type']).toBe('Library Load');
  });

  it('sets _eventName to Library Load', () => {
    const url = 'https://www.clarity.ms/tag/myproject';
    const result = microsoftClarityTag.parseParams(url, undefined);

    expect(result._eventName).toBe('Library Load');
  });

  it('returns undefined for project ID when URL has no ID', () => {
    const url = 'https://www.clarity.ms/tag/';
    const result = microsoftClarityTag.parseParams(url, undefined);

    expect(result['Project ID']).toBeUndefined();
  });

  it('handles numeric project IDs', () => {
    const url = 'https://www.clarity.ms/tag/12345678';
    const result = microsoftClarityTag.parseParams(url, undefined);

    expect(result['Project ID']).toBe('12345678');
  });

  it('handles project IDs with hyphens', () => {
    const url = 'https://www.clarity.ms/tag/prod-123-staging';
    const result = microsoftClarityTag.parseParams(url, undefined);

    expect(result['Project ID']).toBe('prod-123-staging');
  });

  it('stops at query string when extracting project ID', () => {
    const url = 'https://www.clarity.ms/tag/proj123?mode=tag';
    const result = microsoftClarityTag.parseParams(url, undefined);

    expect(result['Project ID']).toBe('proj123');
  });

  it('stops at path segment when extracting project ID', () => {
    const url = 'https://www.clarity.ms/tag/myproj/subpath';
    const result = microsoftClarityTag.parseParams(url, undefined);

    expect(result['Project ID']).toBe('myproj');
  });
});
