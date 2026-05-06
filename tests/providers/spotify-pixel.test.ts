import { describe, it, expect } from 'vitest';
import { spotifyPixel } from '../../src/providers/spotify-pixel';

describe('Spotify Pixel', () => {
  describe('pattern', () => {
    const { pattern } = spotifyPixel;

    it('should match ads.spotify.com/pixel endpoint', () => {
      expect(pattern.test('https://ads.spotify.com/pixel/track')).toBe(true);
    });

    it('should match ads.spotify.com/pixel with params', () => {
      expect(pattern.test('https://ads.spotify.com/pixel?id=123')).toBe(true);
    });

    it('should match pixel.spotify.com domain', () => {
      expect(pattern.test('https://pixel.spotify.com/collect')).toBe(true);
    });

    it('should match pixel.spotify.com with endpoint', () => {
      expect(pattern.test('https://pixel.spotify.com/event')).toBe(true);
    });

    it('should NOT match unrelated domains', () => {
      expect(pattern.test('https://spotify.com/home')).toBe(false);
      expect(pattern.test('https://ads.spotify.com/campaigns')).toBe(false);
      expect(pattern.test('https://spotify-ads.com/pixel')).toBe(false);
      expect(pattern.test('https://pixel.ads.spotify.com')).toBe(false);
    });
  });

  describe('parseParams', () => {
    it('should extract event from URL params', () => {
      const url = 'https://ads.spotify.com/pixel/track?event=conversion';
      const result = spotifyPixel.parseParams(url, null);

      expect(result).toMatchObject({
        Event: 'conversion',
        _eventName: 'conversion',
      });
    });

    it('should extract pixel_id from URL params', () => {
      const url = 'https://pixel.spotify.com/collect?pixel_id=spot_abc123';
      const result = spotifyPixel.parseParams(url, null);

      expect(result).toMatchObject({
        'Pixel ID': 'spot_abc123',
      });
    });

    it('should extract gdpr from URL params', () => {
      const url = 'https://ads.spotify.com/pixel?event=page_view&gdpr=1';
      const result = spotifyPixel.parseParams(url, null);

      expect(result).toMatchObject({
        GDPR: '1',
      });
    });

    it('should extract gdpr_consent from URL params', () => {
      const url = 'https://pixel.spotify.com/track?event=signup&gdpr=true&gdpr_consent=abc';
      const result = spotifyPixel.parseParams(url, null);

      expect(result).toMatchObject({
        GDPR: 'true',
      });
    });

    it('should set _eventName to event value', () => {
      const url = 'https://ads.spotify.com/pixel/track?event=Purchase';
      const result = spotifyPixel.parseParams(url, null);

      expect(result._eventName).toBe('Purchase');
    });

    it('should extract multiple params together', () => {
      const url = 'https://pixel.spotify.com/event?event=ViewContent&pixel_id=xyz_999&gdpr=0';
      const result = spotifyPixel.parseParams(url, null);

      expect(result).toMatchObject({
        Event: 'ViewContent',
        'Pixel ID': 'xyz_999',
        GDPR: '0',
        _eventName: 'ViewContent',
      });
    });

    it('should handle minimal params', () => {
      const url = 'https://ads.spotify.com/pixel?event=pageview';
      const result = spotifyPixel.parseParams(url, null);

      expect(result).toMatchObject({
        Event: 'pageview',
        _eventName: 'pageview',
      });
    });

    it('should return empty object when no params present', () => {
      const url = 'https://pixel.spotify.com/collect';
      const result = spotifyPixel.parseParams(url, null);

      expect(result).toEqual({});
    });
  });
});
