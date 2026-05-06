import { describe, it, expect } from 'vitest';
import { rudderstack } from '../../src/providers/rudderstack';

describe('RudderStack Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches subdomain.rudderstack.com/v1/', () => {
      expect(
        rudderstack.pattern.test('https://subdomain.rudderstack.com/v1/t/key123')
      ).toBe(true);
    });

    it('matches app.rudderstack.com/v1/', () => {
      expect(
        rudderstack.pattern.test('https://app.rudderstack.com/v1/p/key123')
      ).toBe(true);
    });

    it('matches hosted.rudderlabs.com/v1/', () => {
      expect(
        rudderstack.pattern.test('https://hosted.rudderlabs.com/v1/t/key123')
      ).toBe(true);
    });

    it('does NOT match staging.rudderlabs.com/v1/', () => {
      expect(
        rudderstack.pattern.test('https://staging.rudderlabs.com/v1/i/key123')
      ).toBe(false);
    });

    it('does NOT match rudderstack.com (no subdomain)', () => {
      expect(
        rudderstack.pattern.test('https://rudderstack.com')
      ).toBe(false);
    });

    it('does NOT match rudderstack.com homepage', () => {
      expect(
        rudderstack.pattern.test('https://www.rudderstack.com')
      ).toBe(false);
    });

    it('does NOT match rudderlabs.com without /v1/', () => {
      expect(
        rudderstack.pattern.test('https://www.rudderlabs.com/pricing')
      ).toBe(false);
    });

    it('does NOT match unrelated domains', () => {
      expect(
        rudderstack.pattern.test('https://api.segment.io/v1/t/key')
      ).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts basic event parameters', () => {
      const postBody = JSON.stringify({
        type: 'track',
        event: 'Purchase Completed',
        userId: 'user_abc',
        anonymousId: 'anon_xyz',
        messageId: 'msg_id_123',
        timestamp: '2024-06-15T10:30:00.000Z',
      });

      const result = rudderstack.parseParams(
        'https://hosted.rudderlabs.com/v1/t/writekey123',
        postBody
      );

      expect(result.Type).toBe('track');
      expect(result.Event).toBe('Purchase Completed');
      expect(result['User ID']).toBe('user_abc');
      expect(result['Anonymous ID']).toBe('anon_xyz');
      expect(result['Message ID']).toBe('msg_id_123');
      expect(result.Timestamp).toBe('2024-06-15T10:30:00.000Z');
    });

    it('extracts context.page.url and context.page.title', () => {
      const postBody = JSON.stringify({
        type: 'page',
        event: 'Home Page Viewed',
        context: {
          page: {
            url: 'https://acme.com/home',
            title: 'ACME Corp - Home',
          },
        },
      });

      const result = rudderstack.parseParams(
        'https://app.rudderstack.com/v1/p/writekey123',
        postBody
      );

      expect(result['Page URL']).toBe('https://acme.com/home');
      expect(result['Page Title']).toBe('ACME Corp - Home');
    });

    it('extracts context.page.referrer', () => {
      const postBody = JSON.stringify({
        type: 'page',
        context: {
          page: {
            referrer: 'https://twitter.com',
          },
        },
      });

      const result = rudderstack.parseParams(
        'https://app.rudderstack.com/v1/p/writekey123',
        postBody
      );

      expect(result.Referrer).toBe('https://twitter.com');
    });

    it('extracts context.campaign fields', () => {
      const postBody = JSON.stringify({
        type: 'track',
        context: {
          campaign: {
            source: 'newsletter',
            medium: 'email',
            name: 'summer_promo',
          },
        },
      });

      const result = rudderstack.parseParams(
        'https://hosted.rudderlabs.com/v1/t/writekey123',
        postBody
      );

      expect(result['Campaign Source']).toBe('newsletter');
      expect(result['Campaign Medium']).toBe('email');
      expect(result['Campaign Name']).toBe('summer_promo');
    });

    it('extracts context.userAgent and context.ip', () => {
      const postBody = JSON.stringify({
        type: 'track',
        context: {
          userAgent: 'Chrome/120.0',
          ip: '10.0.0.1',
        },
      });

      const result = rudderstack.parseParams(
        'https://hosted.rudderlabs.com/v1/t/writekey123',
        postBody
      );

      expect(result['User Agent']).toBe('Chrome/120.0');
      expect(result.IP).toBe('10.0.0.1');
    });

    it('passes through properties with titleCase', () => {
      const postBody = JSON.stringify({
        type: 'track',
        event: 'Form Submitted',
        properties: {
          form_name: 'contact_us',
          submitted_at: '2024-01-15',
          field_count: 5,
        },
      });

      const result = rudderstack.parseParams(
        'https://app.rudderstack.com/v1/t/writekey123',
        postBody
      );

      expect(result['Form Name']).toBe('contact_us');
      expect(result['Submitted At']).toBe('2024-01-15');
      expect(result['Field Count']).toBe('5');
    });

    it('passes through traits with " (trait)" suffix', () => {
      const postBody = JSON.stringify({
        type: 'identify',
        traits: {
          email: 'jane@example.com',
          last_name: 'Doe',
          subscription_status: 'active',
        },
      });

      const result = rudderstack.parseParams(
        'https://app.rudderstack.com/v1/i/writekey123',
        postBody
      );

      expect(result['Email (trait)']).toBe('jane@example.com');
      expect(result['Last Name (trait)']).toBe('Doe');
      expect(result['Subscription Status (trait)']).toBe('active');
    });

    it('formats nested property values as JSON', () => {
      const postBody = JSON.stringify({
        type: 'track',
        properties: {
          checkout_options: {
            shipping: 'express',
            gift_wrapping: true,
          },
        },
      });

      const result = rudderstack.parseParams(
        'https://app.rudderstack.com/v1/t/writekey123',
        postBody
      );

      expect(result['Checkout Options']).toContain('express');
      expect(result['Checkout Options']).toContain('gift_wrapping');
    });

    it('masks write key when longer than 12 characters', () => {
      const postBody = JSON.stringify({ type: 'track' });

      const result = rudderstack.parseParams(
        'https://hosted.rudderlabs.com/v1/t/verylongwritekeyhere',
        postBody
      );

      expect(result['Write Key']).toBe('verylong...');
    });

    it('shows full write key when 12 characters or less', () => {
      const postBody = JSON.stringify({ type: 'track' });

      const result = rudderstack.parseParams(
        'https://hosted.rudderlabs.com/v1/t/mediumkey12',
        postBody
      );

      expect(result['Write Key']).toBe('mediumkey12');
    });

    it('shows full write key at exactly 12 characters', () => {
      const postBody = JSON.stringify({ type: 'track' });

      const result = rudderstack.parseParams(
        'https://hosted.rudderlabs.com/v1/t/exactly12ch',
        postBody
      );

      expect(result['Write Key']).toBe('exactly12ch');
    });

    it('extracts disabled destinations from integrations where value is false', () => {
      const postBody = JSON.stringify({
        type: 'track',
        integrations: {
          'Google Analytics': true,
          'Salesforce': false,
          'HubSpot': false,
          'Intercom': true,
        },
      });

      const result = rudderstack.parseParams(
        'https://hosted.rudderlabs.com/v1/t/writekey123',
        postBody
      );

      expect(result['Disabled Destinations']).toBe('Salesforce, HubSpot');
    });

    it('does not include Disabled Destinations when none are disabled', () => {
      const postBody = JSON.stringify({
        type: 'track',
        integrations: {
          'Google Analytics': false,
          'Amplitude': false,
        },
      });

      const result = rudderstack.parseParams(
        'https://hosted.rudderlabs.com/v1/t/writekey123',
        postBody
      );

      expect(result['Disabled Destinations']).toBe('Google Analytics, Amplitude');
    });

    it('sets _eventName from body.event', () => {
      const postBody = JSON.stringify({
        type: 'track',
        event: 'Signed Up',
      });

      const result = rudderstack.parseParams(
        'https://hosted.rudderlabs.com/v1/t/writekey123',
        postBody
      );

      expect(result._eventName).toBe('Signed Up');
    });

    it('handles object postBody (not JSON string)', () => {
      const postBody = {
        type: 'identify',
        userId: 'user_001',
        traits: {
          company: 'Acme Corp',
        },
      };

      const result = rudderstack.parseParams(
        'https://app.rudderstack.com/v1/i/writekey123',
        postBody
      );

      expect(result.Type).toBe('identify');
      expect(result['User ID']).toBe('user_001');
      expect(result['Company (trait)']).toBe('Acme Corp');
    });

    it('handles undefined postBody gracefully', () => {
      const result = rudderstack.parseParams(
        'https://hosted.rudderlabs.com/v1/t/writekey123',
        undefined
      );

      expect(result.Type).toBeUndefined();
      expect(result.Event).toBeUndefined();
      // writekey123 is 11 chars, so it's NOT masked (threshold is >12 chars)
      expect(result['Write Key']).toBe('writekey123');
    });

    it('handles empty string postBody gracefully', () => {
      const result = rudderstack.parseParams(
        'https://hosted.rudderlabs.com/v1/t/writekey123',
        ''
      );

      expect(result.Type).toBeUndefined();
      expect(result.Event).toBeUndefined();
    });
  });
});