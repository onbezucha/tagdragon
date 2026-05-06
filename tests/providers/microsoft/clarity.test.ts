import { describe, it, expect } from 'vitest';
import { microsoftClarity } from '../../../src/providers/microsoft/clarity';

// ═══ Pattern matching ═══

describe('pattern matching', () => {
  it('matches clarity.ms/collect', () => {
    expect(microsoftClarity.pattern.test('https://www.clarity.ms/collect')).toBe(true);
  });

  it('matches clarity.ms/collect with query params', () => {
    expect(microsoftClarity.pattern.test('https://www.clarity.ms/collect?s=abc123')).toBe(true);
  });

  it('does not match clarity.ms/tag/', () => {
    expect(microsoftClarity.pattern.test('https://clarity.ms/tag/abc123')).toBe(false);
  });

  it('does not match clarity.com', () => {
    expect(microsoftClarity.pattern.test('https://clarity.com/collect')).toBe(false);
  });

  it('does not match clarity.ms/feedback', () => {
    expect(microsoftClarity.pattern.test('https://clarity.ms/feedback')).toBe(false);
  });
});

// ═══ parseParams ═══

describe('parseParams', () => {
  const baseUrl = 'https://www.clarity.ms/collect?s=abc123';

  it('returns Upload (compressed) fallback when payload is null', () => {
    const result = microsoftClarity.parseParams(baseUrl, null);

    expect(result._eventName).toBe('Upload (compressed)');
    expect(result.URL).toBe(baseUrl);
  });

  it('returns Upload (compressed) fallback when payload is undefined', () => {
    const result = microsoftClarity.parseParams(baseUrl, undefined);

    expect(result._eventName).toBe('Upload (compressed)');
  });

  it('returns Upload (compressed) fallback for empty string payload', () => {
    const result = microsoftClarity.parseParams(baseUrl, '');

    expect(result._eventName).toBe('Upload (compressed)');
  });

  it('decodes envelope fields (Project ID, User ID, Session ID, Upload Type, Platform)', () => {
    // Envelope: [version, sequence, start, duration, projectId, userId, sessionId, pageNum, upload, end, platform, url]
    const payload = {
      e: ['1.0', 5, 1000, 5000, 'proj123', 'user456', 'sess789', 2, 0, 0, 0, 'https://example.com/page'],
      a: [],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Project ID']).toBe('proj123');
    expect(result['User ID']).toBe('user456');
    expect(result['Session ID']).toBe('sess789');
    expect(result['Page Number']).toBe('2');
    expect(result['Sequence']).toBe('5');
    expect(result['Duration (ms)']).toBe('5000');
    expect(result['Upload Type']).toBe('Async (XHR)');
    expect(result['Is Last Payload']).toBe('No');
    expect(result['Platform']).toBe('WebApp');
    expect(result['Page URL']).toBe('https://example.com/page');
    expect(result['Version']).toBe('1.0');
  });

  it('decodes envelope with beacon upload type', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 1, 1, 0, 'https://end.com'],
      a: [],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Upload Type']).toBe('Beacon');
    expect(result['Is Last Payload']).toBe('Yes (Beacon)');
  });

  it('decodes Click event with target, x, y', () => {
    // Analytics event: [timestamp, eventTypeCode, ...params]
    // Click (9): [timestamp, 9, target, x, y]
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [[1000, 9, 'button#submit', 150, 200]],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Click [0]']).toBe('target=button#submit, x=150, y=200');
  });

  it('decodes multiple Click events with indexed keys', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [
        [1000, 9, 'div.cta', 100, 50],
        [1500, 9, 'input.email', 300, 400],
      ],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Click [0]']).toBe('target=div.cta, x=100, y=50');
    expect(result['Click [1]']).toBe('target=input.email, x=300, y=400');
  });

  it('decodes Custom event with key = value format', () => {
    // Custom (24): [timestamp, 24, key, value]
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [[1000, 24, 'checkout_step', '2']],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Custom Event [0]']).toBe('checkout_step = 2');
  });

  it('decodes multiple Custom events', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [
        [1000, 24, 'product_id', 'SKU-123'],
        [2000, 24, 'add_to_cart', 'true'],
      ],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Custom Event [0]']).toBe('product_id = SKU-123');
    expect(result['Custom Event [1]']).toBe('add_to_cart = true');
  });

  it('decodes Consent event with source, ad_storage, analytics_storage', () => {
    // Consent (47): [timestamp, 47, source, adStorage, analyticsStorage]
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [[1000, 47, 1, 1, 0]],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Consent [0]']).toBe('source=API, ad_storage=Granted, analytics_storage=Denied');
  });

  it('decodes Consent event with TCF source and all granted', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [[1000, 47, 3, 1, 1]],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Consent [0]']).toBe('source=TCF, ad_storage=Granted, analytics_storage=Granted');
  });

  it('decodes Consent event with Shopify Pixel source', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [[1000, 47, 100, 1, 1]],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Consent [0]']).toBe('source=Shopify Pixel, ad_storage=Granted, analytics_storage=Granted');
  });

  it('decodes Metric events with sub-key/value pairs', () => {
    // Metric (0): [timestamp, 0, key, value, key, value, ...]
    // Key 14: ScreenWidth, 15: ScreenHeight, 5: InvokeCount
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [[1000, 0, 14, 1920, 15, 1080, 5, 150]],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Metric: ScreenWidth']).toBe('1920');
    expect(result['Metric: ScreenHeight']).toBe('1080');
    expect(result['Metric: InvokeCount']).toBe('150');
  });

  it('decodes multiple Metric events', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [
        [1000, 0, 0, 1700000000, 1, 0],
        [2000, 0, 9, 0.05],
      ],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Metric: ClientTimestamp']).toBe('1700000000');
    expect(result['Metric: Playback']).toBe('0');
    expect(result['Metric: CumulativeLayoutShift']).toBe('0.05');
  });

  it('decodes Dimension events with sub-key/value pairs', () => {
    // Dimension (1): [timestamp, 1, key, value, key, value, ...]
    // Key 0: UserAgent, 1: Url, 2: Referrer, 3: PageTitle
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [[1000, 1, 0, 'Mozilla/5.0', 1, '/home', 2, 'https://google.com', 3, 'Home Page']],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Dim: UserAgent']).toBe('Mozilla/5.0');
    expect(result['Dim: Url']).toBe('/home');
    expect(result['Dim: Referrer']).toBe('https://google.com');
    expect(result['Dim: PageTitle']).toBe('Home Page');
  });

  it('decodes Dimension events with unknown keys ignored', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [[1000, 1, 0, 'Chrome', 99, 'unknown', 1, '/page']],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Dim: UserAgent']).toBe('Chrome');
    expect(result['Dim: Url']).toBe('/page');
    expect(result['Dim: 99']).toBeUndefined();
  });

  it('counts Pings and tracks gap', () => {
    // Ping (25): [timestamp, 25, gap]
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [
        [1000, 25, 5000],
        [6000, 25, 5000],
        [11000, 25, 5000],
      ],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Pings']).toBe('3× (gap: 5000ms)');
  });

  it('reports last ping gap', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [
        [1000, 25, 1000],
        [2000, 25, 3000],
      ],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Pings']).toBe('2× (gap: 3000ms)');
  });

  it('extracts _eventName from Custom event with highest priority', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [
        [1000, 25, 5000],
        [1100, 10, 0, 500],
        [1200, 9, 'button', 100, 200],
        [1300, 24, 'checkout_complete', 'true'],
        [1400, 39, 'form#contact'],
      ],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result._eventName).toBe('Custom: checkout_complete');
  });

  it('extracts _eventName from Submit when no Custom event', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [
        [1000, 25, 5000],
        [1100, 10, 0, 500],
        [1200, 39, 'form#contact'],
      ],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result._eventName).toBe('Submit');
  });

  it('extracts _eventName from Consent with source name', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [
        [1000, 47, 2, 1, 0],
        [1100, 25, 5000],
      ],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result._eventName).toBe('Consent (GCM)');
  });

  it('extracts _eventName from Navigation with truncated URL', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [
        [1000, 29, '/new-page?param1=value1&param2=value2&param3=value3'],
      ],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result._eventName).toBe('Nav: /new-page?param1=value1&param2=value2&pa');
  });

  it('extracts _eventName from Click with no higher priority events', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [
        [1000, 25, 5000],
        [1100, 10, 0, 500],
        [1200, 9, 'button', 100, 200],
      ],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result._eventName).toBe('Click');
  });

  it('extracts _eventName from Ping as last resort', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [[1000, 25, 5000]],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result._eventName).toBe('Ping');
  });

  it('reports Event Count and Event Types summary', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [
        [1000, 0, 14, 1920],
        [1100, 1, 0, 'Chrome'],
        [1200, 9, 'btn', 10, 20],
        [1300, 25, 5000],
      ],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Event Count']).toBe('4');
    expect(result['Event Types']).toBe('Click, Dimension, Metric, Ping');
  });

  it('reports Event Types in sorted order', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [
        [1000, 25, 5000],
        [1100, 24, 'key', 'val'],
        [1200, 9, 'btn', 10, 20],
      ],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Event Types']).toBe('Click, Custom, Ping');
  });

  it('decodes Scroll event', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [[1000, 10, 0, 800]],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Scroll [0]']).toBe('x=0, y=800');
  });

  it('decodes DoubleClick event', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [[1000, 16, 'div.hero', 500, 300]],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['DoubleClick [0]']).toBe('target=div.hero, x=500, y=300');
  });

  it('decodes Input event', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [[1000, 27, 'input#email']],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Input [0]']).toBe('target=input#email');
  });

  it('decodes Visibility event', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [
        [1000, 28, 1],
        [2000, 28, 0],
      ],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Visibility [0]']).toBe('visible');
    expect(result['Visibility [1]']).toBe('hidden');
  });

  it('decodes ScriptError event', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [[1000, 31, 'ReferenceError: x is not defined']],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['ScriptError [0]']).toBe('ReferenceError: x is not defined');
  });

  it('decodes Form Submit event', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [[1000, 39, 'form.contact-form']],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Form Submit [0]']).toBe('target=form.contact-form');
  });

  it('decodes Upload event', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [[1000, 2, 5, 3, 200]],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Upload [0]']).toBe('seq=5, attempts=3, status=200');
  });

  it('decodes Upgrade event', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [[1000, 3, 'upgrade_code']],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Upgrade [0]']).toBe('upgrade_code');
  });

  it('decodes Variable events with dynamic keys', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [[1000, 34, 'user_type', 'premium', 'plan', 'annual']],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Variable: user_type']).toBe('premium');
    expect(result['Variable: plan']).toBe('annual');
  });

  it('decodes Limit event with check name', () => {
    const payload = {
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [
        [1000, 35, 1],
        [2000, 35, 4],
      ],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    expect(result['Limit [0]']).toBe('Payload');
    expect(result['Limit [1]']).toBe('Bytes');
  });

  it('handles JSON string payload', () => {
    const jsonString = JSON.stringify({
      e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
      a: [[1000, 24, 'from_json', 'string']],
    });

    const result = microsoftClarity.parseParams(baseUrl, jsonString);

    expect(result['Custom Event [0]']).toBe('from_json = string');
  });

  it('handles HAR format payload', () => {
    const harPayload = {
      text: JSON.stringify({
        e: ['1.0', 1, 0, 0, 'proj', 'user', 'sess', 1, 0, 0, 0, 'https://example.com'],
        a: [[1000, 9, 'btn', 10, 20]],
      }),
      mimeType: 'application/json',
    };

    const result = microsoftClarity.parseParams(baseUrl, harPayload);

    expect(result['Click [0]']).toBe('target=btn, x=10, y=20');
  });

  it('combines envelope, metrics, dimensions, and events in output', () => {
    const payload = {
      e: ['1.0', 2, 0, 10000, 'projABC', 'userXYZ', 'sessDEF', 1, 1, 1, 0, 'https://shop.com/product'],
      a: [
        [1000, 0, 14, 2560, 15, 1440],
        [1100, 1, 0, 'Safari', 3, 'Product Page'],
        [1200, 24, 'purchase_complete', 'true'],
      ],
    };

    const result = microsoftClarity.parseParams(baseUrl, payload);

    // Envelope
    expect(result['Project ID']).toBe('projABC');
    expect(result['User ID']).toBe('userXYZ');
    expect(result['Session ID']).toBe('sessDEF');
    expect(result['Page URL']).toBe('https://shop.com/product');

    // Metrics
    expect(result['Metric: ScreenWidth']).toBe('2560');
    expect(result['Metric: ScreenHeight']).toBe('1440');

    // Dimensions
    expect(result['Dim: UserAgent']).toBe('Safari');
    expect(result['Dim: PageTitle']).toBe('Product Page');

    // Events
    expect(result['Custom Event [2]']).toBe('purchase_complete = true');

    // Summary
    expect(result['Event Count']).toBe('3');
    expect(result._eventName).toBe('Custom: purchase_complete');
  });
});