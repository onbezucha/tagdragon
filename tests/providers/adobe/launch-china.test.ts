import { describe, it, expect } from 'vitest';
import { adobeLaunchChina } from '../../../src/providers/adobe/launch-china';

// ═══ Pattern matching ═══

describe('pattern matching', () => {
  it('matches assets.adobedc.cn domain', () => {
    expect(adobeLaunchChina.pattern.test('https://assets.adobedc.cn/launch-ENabc123.min.js')).toBe(true);
  });

  it('matches with production environment', () => {
    expect(adobeLaunchChina.pattern.test('https://assets.adobedc.cn/launch-ENf123456.min.js')).toBe(true);
  });

  it('does NOT match global Adobe DTM domain', () => {
    expect(adobeLaunchChina.pattern.test('https://assets.adobedtm.com/abc123/def456/satelliteLib.js')).toBe(false);
  });

  it('does NOT match generic adobe.com URLs', () => {
    expect(adobeLaunchChina.pattern.test('https://www.adobe.com/launch.js')).toBe(false);
  });
});

// ═══ parseParams ═══

describe('parseParams', () => {
  it('sets Type to Adobe Tags (CN)', () => {
    const url = 'https://assets.adobedc.cn/launch-ENabc123def.min.js';
    const result = adobeLaunchChina.parseParams(url, undefined);

    expect(result.Type).toBe('Adobe Tags (CN)');
  });

  it('extracts library ID from production URL', () => {
    const url = 'https://assets.adobedc.cn/launch-ENabc123def456.min.js';
    const result = adobeLaunchChina.parseParams(url, undefined);

    expect(result['Library ID']).toBe('abc123def456');
  });

  it('extracts library ID from development environment', () => {
    const url = 'https://assets.adobedc.cn/launch-ENabc123-development.min.js';
    const result = adobeLaunchChina.parseParams(url, undefined);

    expect(result['Library ID']).toBe('abc123');
    expect(result.Environment).toBe('Development');
  });

  it('extracts library ID from staging environment with capitalization', () => {
    const url = 'https://assets.adobedc.cn/launch-ENabc123-staging.min.js';
    const result = adobeLaunchChina.parseParams(url, undefined);

    expect(result['Library ID']).toBe('abc123');
    expect(result.Environment).toBe('Staging');
  });

  it('defaults Environment to Production when not specified', () => {
    const url = 'https://assets.adobedc.cn/launch-ENf123456789.min.js';
    const result = adobeLaunchChina.parseParams(url, undefined);

    expect(result.Environment).toBe('Production');
  });

  it('handles lowercase environment names and capitalizes them', () => {
    const url = 'https://assets.adobedc.cn/launch-ENabc123-development.min.js';
    const result = adobeLaunchChina.parseParams(url, undefined);

    expect(result.Environment).toBe('Development');
  });

  it('returns undefined for Library ID when pattern does not match', () => {
    const url = 'https://assets.adobedc.cn/other-script.js';
    const result = adobeLaunchChina.parseParams(url, undefined);

    expect(result['Library ID']).toBeUndefined();
  });

  it('handles long library IDs', () => {
    const url = 'https://assets.adobedc.cn/launch-ENabcdef1234567890abcdef1234567890.min.js';
    const result = adobeLaunchChina.parseParams(url, undefined);

    expect(result['Library ID']).toBe('abcdef1234567890abcdef1234567890');
  });
});
