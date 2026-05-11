import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { esc, getHostname, formatTimestamp, getEventName } from '@/panel/utils/format';

describe('Panel Format Utils', () => {
  // ─── ESC ───────────────────────────────────────────────────────────────────

  describe('esc()', () => {
    it('should return plain text unchanged', () => {
      expect(esc('hello world')).toBe('hello world');
      expect(esc('No special chars')).toBe('No special chars');
    });

    it('should escape HTML special characters', () => {
      expect(esc('&')).toBe('&amp;');
      expect(esc('<')).toBe('&lt;');
      expect(esc('>')).toBe('&gt;');
      expect(esc('"')).toBe('&quot;');
      expect(esc("'")).toBe('&#39;');
      expect(esc('`')).toBe('&#96;');
      expect(esc('$')).toBe('&#36;');
    });

    it('should handle null and undefined as empty string', () => {
      expect(esc(null)).toBe('');
      expect(esc(undefined)).toBe('');
    });

    it('should convert numbers to string with escaping', () => {
      expect(esc(0)).toBe('0');
      expect(esc(123)).toBe('123');
      expect(esc(3.14)).toBe('3.14');
      expect(esc(-1)).toBe('-1');
      expect(esc(0)).toBe('0');
    });

    it('should fully escape combined XSS payload', () => {
      const input = '<script>alert("xss")</script>';
      const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
      expect(esc(input)).toBe(expected);
    });

    it('should escape multiple special chars in sequence', () => {
      expect(esc('a & b < c > d "e"')).toBe('a &amp; b &lt; c &gt; d &quot;e&quot;');
    });
  });

  // ─── GET HOSTNAME ──────────────────────────────────────────────────────────

  describe('getHostname()', () => {
    it('should extract hostname from valid URL', () => {
      expect(getHostname('https://www.google.com/page')).toBe('www.google.com');
      expect(getHostname('http://analytics.example.com/path?query=1')).toBe(
        'analytics.example.com',
      );
    });

    it('should extract hostname from URL with port', () => {
      // URL.hostname excludes port by design
      expect(getHostname('https://api.example.com:8080/endpoint')).toBe(
        'api.example.com',
      );
    });

    it('should return first 40 chars for invalid URL', () => {
      expect(getHostname('not-a-valid-url')).toBe('not-a-valid-url');
      expect(getHostname('just some text')).toBe('just some text');
    });

    it('should truncate very long invalid URL to 40 chars', () => {
      const longInvalid = 'x'.repeat(100);
      expect(getHostname(longInvalid)).toBe('x'.repeat(40));
    });

    it('should return empty string for empty input', () => {
      expect(getHostname('')).toBe('');
    });

    it('should handle URLs with protocol variations', () => {
      expect(getHostname('https://sub.domain.co.uk/')).toBe('sub.domain.co.uk');
      expect(getHostname('ftp://files.server.net/data')).toBe('files.server.net');
    });
  });

  // ─── FORMAT TIMESTAMP ──────────────────────────────────────────────────────

  describe('formatTimestamp()', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should format as absolute time (HH:MM:SS)', () => {
      const ts = '2025-01-15T14:30:45.000Z';
      const result = formatTimestamp(ts, 'absolute');
      // Result is locale-dependent, just verify it contains time parts
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it('should format as absolute with full date and time', () => {
      const ts = '2025-01-15T14:30:45.000Z';
      const result = formatTimestamp(ts, 'absolute', undefined, true);
      // Full format includes date — use regex to avoid timezone-dependent time
      expect(result).toContain('2025');
      expect(result).toMatch(/\d{1,2}\/15\/2025/);
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it('should format as relative for recent timestamps (< 60s)', () => {
      const pastTs = new Date(Date.now() - 15000).toISOString(); // 15 seconds ago
      const result = formatTimestamp(pastTs, 'relative');
      expect(result).toBe('15s');
    });

    it('should format as relative with minutes and seconds', () => {
      const pastTs = new Date(Date.now() - 125000).toISOString(); // 2m 5s ago
      const result = formatTimestamp(pastTs, 'relative');
      expect(result).toBe('2m 5s');
    });

    it('should fall back to absolute for old timestamps (> 1h)', () => {
      const oldTs = new Date(Date.now() - 7200000).toISOString(); // 2 hours ago
      const result = formatTimestamp(oldTs, 'relative');
      // Should not contain 'm' pattern from relative, should be absolute time
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it('should format as elapsed time (MM:SS.mmm)', () => {
      vi.setSystemTime(new Date('2025-01-15T14:00:00.000Z').getTime());
      const ts = new Date(Date.now() + 65000).toISOString(); // Future timestamp
      const result = formatTimestamp(ts, 'elapsed');
      expect(result).toMatch(/^\d{2}:\d{2}\.\d{3}$/);
    });

    it('should calculate elapsed time from session start', () => {
      const sessionStart = '2025-01-15T14:00:00.000Z';
      // Use Z suffix for both to ensure UTC parsing consistency
      vi.setSystemTime(new Date('2025-01-15T14:01:30.500Z').getTime());
      const ts = new Date(Date.now()).toISOString();
      const result = formatTimestamp(ts, 'elapsed', sessionStart);
      expect(result).toBe('01:30.500');
    });

    it('should return 00:00.000 for same timestamp as session start', () => {
      const sessionStart = '2025-01-15T14:00:00.000Z';
      vi.setSystemTime(new Date('2025-01-15T14:00:00.000Z').getTime());
      const result = formatTimestamp(sessionStart, 'elapsed', sessionStart);
      expect(result).toBe('00:00.000');
    });

    it('should cap elapsed to minimum of 00:00.000', () => {
      vi.setSystemTime(new Date('2025-01-15T13:00:00.000Z').getTime());
      const ts = '2025-01-15T14:00:00.000Z'; // Timestamp is in the future relative to "now"
      const result = formatTimestamp(ts, 'elapsed');
      expect(result).toBe('00:00.000');
    });
  });

  // ─── GET EVENT NAME ────────────────────────────────────────────────────────

  describe('getEventName()', () => {
    const baseRequest = {
      id: 1,
      provider: 'TestProvider',
      color: '#ff0000',
      url: 'https://example.com/track',
      method: 'POST' as const,
      status: 200,
      timestamp: '2025-01-15T14:00:00.000Z',
      duration: 100,
      size: 500,
      allParams: {},
      decoded: {},
    };

    it('should return hostname when no decoded data', () => {
      const request = { ...baseRequest, decoded: {} };
      expect(getEventName(request)).toBe('example.com');
    });

    it('should return hostname when decoded is undefined', () => {
      const request = { ...baseRequest, decoded: undefined };
      expect(getEventName(request)).toBe('example.com');
    });

    it('should prefer Conversion Label for Google Ads provider', () => {
      const request = {
        ...baseRequest,
        provider: 'Google Ads',
        decoded: {
          'Conversion Label': 'abc123',
          'Conversion Type': 'purchase',
        },
      };
      expect(getEventName(request)).toBe('abc123');
    });

    it('should fall back to Conversion Type for Google Ads when no label', () => {
      const request = {
        ...baseRequest,
        provider: 'Google Ads',
        decoded: {
          'Conversion Type': 'lead',
        },
      };
      expect(getEventName(request)).toBe('lead');
    });

    it('should use Event type as first priority for generic provider', () => {
      const request = {
        ...baseRequest,
        decoded: {
          'Event type': 'page_view',
          Event: 'event',
          'Hit type': 'page',
        },
      };
      expect(getEventName(request)).toBe('page_view');
    });

    it('should fall back to Event when no Event type', () => {
      const request = {
        ...baseRequest,
        decoded: {
          Event: 'button_click',
          'Hit type': 'event',
        },
      };
      expect(getEventName(request)).toBe('button_click');
    });

    it('should fall back to Hit type when no Event type or Event', () => {
      const request = {
        ...baseRequest,
        decoded: {
          'Hit type': 'transaction',
        },
      };
      expect(getEventName(request)).toBe('transaction');
    });

    it('should fall back to lowercase event when no uppercase variants', () => {
      const request = {
        ...baseRequest,
        decoded: {
          event: 'add_to_cart',
        },
      };
      expect(getEventName(request)).toBe('add_to_cart');
    });

    it('should fall back to event_name as final string fallback', () => {
      const request = {
        ...baseRequest,
        decoded: {
          event_name: 'purchase_complete',
        },
      };
      expect(getEventName(request)).toBe('purchase_complete');
    });

    it('should fall back to hostname when all decoded fields are undefined', () => {
      const request = {
        ...baseRequest,
        decoded: {
          'Event type': undefined,
          Event: undefined,
          'Hit type': undefined,
          event: undefined,
          event_name: undefined,
        },
      };
      expect(getEventName(request)).toBe('example.com');
    });

    it('should prioritize field order correctly', () => {
      const request = {
        ...baseRequest,
        decoded: {
          'Event type': 'first_priority',
          Event: 'second_priority',
          'Hit type': 'third_priority',
          event: 'fourth_priority',
          event_name: 'fifth_priority',
        },
      };
      expect(getEventName(request)).toBe('first_priority');
    });
  });
});