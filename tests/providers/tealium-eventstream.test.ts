import { describe, it, expect } from 'vitest';
import { tealiumEventstream } from '../../src/providers/tealium-eventstream';

describe('Tealium EventStream Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches collect.tealiumiq.com/event', () => {
      expect(
        tealiumEventstream.pattern.test(
          'https://collect.tealiumiq.com/event/main'
        )
      ).toBe(true);
    });

    it('matches data.cloud.tealium.com', () => {
      expect(
        tealiumEventstream.pattern.test(
          'https://data.cloud.tealium.com/v3/fire/event'
        )
      ).toBe(true);
    });

    it('does NOT match tags.tiqcdn.com', () => {
      expect(
        tealiumEventstream.pattern.test(
          'https://tags.tiqcdn.com/utag/main/prod/utag.js'
        )
      ).toBe(false);
    });

    it('does NOT match datacloud.tealiumiq.com without event path', () => {
      expect(
        tealiumEventstream.pattern.test(
          'https://datacloud.tealiumiq.com/some/other/path'
        )
      ).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts tealium_event, visitor_id, account, profile', () => {
      const result = tealiumEventstream.parseParams(
        'https://collect.tealiumiq.com/event/main?tealium_event=page_view&tealium_visitor_id=V12345&tealium_account=demo&tealium_profile=mobile',
        {}
      );
      expect(result.Event).toBe('page_view');
      expect(result['Visitor ID']).toBe('V12345');
      expect(result.Account).toBe('demo');
      expect(result.Profile).toBe('mobile');
      expect(result._eventName).toBe('page_view');
    });

    it('passes through unknown params as-is', () => {
      const result = tealiumEventstream.parseParams(
        'https://collect.tealiumiq.com/event/main?tealium_event=test&custom_field=extra&page_category=home',
        {}
      );
      expect(result.Event).toBe('test');
      expect(result.custom_field).toBe('extra');
      expect(result.page_category).toBe('home');
      expect(result._eventName).toBe('test');
    });

    it('returns empty string for missing params (not filtered)', () => {
      const result = tealiumEventstream.parseParams(
        'https://collect.tealiumiq.com/event/main?tealium_event=test&tealium_visitor_id=',
        {}
      );
      expect(result.Event).toBe('test');
      expect(result['Visitor ID']).toBe('');
    });

    it('extracts _eventName from tealium_event', () => {
      const result = tealiumEventstream.parseParams(
        'https://data.cloud.tealium.com/v3/fire/event?tealium_event=purchase_complete',
        {}
      );
      expect(result._eventName).toBe('purchase_complete');
    });
  });
});