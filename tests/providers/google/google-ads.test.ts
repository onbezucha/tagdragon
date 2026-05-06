import { describe, it, expect } from 'vitest';
import { googleAds } from '../../../src/providers/google/google-ads';

describe('Google Ads Provider', () => {
  // ═══ Pattern matching ═══

  describe('pattern matching', () => {
    it('should match doubleclick.net conversion URL', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/viewthroughconversion/123456789/?value=1.0&label=ABC123&currency=USD';
      expect(googleAds.pattern.test(url)).toBe(true);
    });

    it('should match doubleclick.net viewthroughconversion URL', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/viewthroughconversion/987654321/?value=2.5';
      expect(googleAds.pattern.test(url)).toBe(true);
    });

    it('should match googleadservices.com conversion URL', () => {
      const url = 'https://www.googleadservices.com/pagead/conversion/654321789/?value=1.5&label=XYZ789';
      expect(googleAds.pattern.test(url)).toBe(true);
    });

    it('should match googleadservices.com viewthroughconversion URL', () => {
      const url = 'https://www.googleadservices.com/pagead/viewthroughconversion/111222333/';
      expect(googleAds.pattern.test(url)).toBe(true);
    });

    it('should NOT match doubleclick.net activity URL', () => {
      const url = 'https://doubleclick.net/activity;cat=bookings;u5=homepage;ord=123456';
      expect(googleAds.pattern.test(url)).toBe(false);
    });

    it('should NOT match generic google.com URLs', () => {
      const url = 'https://www.google.com/search?q=advertising';
      expect(googleAds.pattern.test(url)).toBe(false);
    });

    it('should NOT match google.com/maps URLs', () => {
      const url = 'https://www.google.com/maps/dir/';
      expect(googleAds.pattern.test(url)).toBe(false);
    });
  });

  // ═══ parseParams ═══

  describe('parseParams', () => {
    it('should extract conversion ID from URL', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?value=1.0&label=conversion_label';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Conversion ID']).toBe('123456789');
    });

    it('should extract conversion label', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?value=1.0&label=my_label';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Conversion Label']).toBe('my_label');
    });

    it('should identify click-through conversion type', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Conversion Type']).toBe('Click-through');
    });

    it('should identify view-through conversion type', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/viewthroughconversion/123456789';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Conversion Type']).toBe('View-through');
    });

    it('should extract event name from en parameter', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?en=purchase_complete';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Event']).toBe('purchase_complete');
      expect(result['_eventName']).toBe('purchase_complete');
    });

    it('should extract value from URL parameter', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?value=99.99';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Conversion Value']).toBe('99.99');
    });

    it('should extract currency from currency_code parameter', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?currency_code=EUR';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Currency']).toBe('EUR');
    });

    it('should extract currency from currency parameter', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?currency=USD';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Currency']).toBe('USD');
    });

    it('should extract order_id as transaction ID', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?order_id=ORD-12345';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Transaction ID']).toBe('ORD-12345');
    });

    it('should extract transaction_id as transaction ID', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?transaction_id=TXN-999';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Transaction ID']).toBe('TXN-999');
    });

    it('should extract and decode tiba (page title)', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?tiba=Product%20Page';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Page Title']).toBe('Product Page');
    });

    it('should extract and decode url parameter', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?url=https%3A%2F%2Fexample.com%2Fproduct';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Page URL']).toBe('https://example.com/product');
    });

    it('should extract and decode ref (referrer)', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?ref=partner%20site';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Referrer']).toBe('partner site');
    });

    it('should extract gclid (Google Click ID)', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?gclid=abc123xyz';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Google Click ID']).toBe('abc123xyz');
    });

    it('should extract wbraid parameter', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?wbraid=wbraid123';
      const result = googleAds.parseParams(url, undefined);
      expect(result['wbraid']).toBe('wbraid123');
    });

    it('should extract gbraid parameter', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?gbraid=gbraid456';
      const result = googleAds.parseParams(url, undefined);
      expect(result['gbraid']).toBe('gbraid456');
    });

    it('should extract GTM container ID', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?gtm=GTM-ABC123';
      const result = googleAds.parseParams(url, undefined);
      expect(result['GTM Container']).toBe('GTM-ABC123');
    });

    it('should extract advertiser user ID', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?auid=user_789';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Advertiser User ID']).toBe('user_789');
    });

    it('should extract consent state', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?gcs=G100';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Consent State']).toBe('G100');
    });

    it('should extract consent details', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?gcd=~1';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Consent Details']).toBe('~1');
    });

    it('should extract non-personalized ad flag', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?npa=1';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Non-Personalized']).toBe('1');
    });

    it('should extract DMA compliance', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?dma=1';
      const result = googleAds.parseParams(url, undefined);
      expect(result['DMA Compliance']).toBe('1');
    });

    it('should extract DMA consent', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?dma_cps=granted';
      const result = googleAds.parseParams(url, undefined);
      expect(result['DMA Consent']).toBe('granted');
    });

    it('should extract cookie present flag', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?ct_cookie_present=1';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Cookie Present']).toBe('1');
    });

    it('should parse e-commerce data parameter with all fields', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?data=event%3Dpurchase%3Becomm_totalvalue%3D149.99%3Becomm_prodid%3DSKU123%3Becomm_pagetype%3Dproduct';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Event']).toBe('purchase');
      expect(result['E-Commerce Value']).toBe('149.99');
      expect(result['Product IDs']).toBe('SKU123');
      expect(result['E-Commerce Type']).toBe('product');
    });

    it('should parse e-commerce data event field', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?data=event%3Dadd_to_cart';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Event']).toBe('add_to_cart');
    });

    it('should parse e-commerce data total value', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?data=ecomm_totalvalue%3D49.95';
      const result = googleAds.parseParams(url, undefined);
      expect(result['E-Commerce Value']).toBe('49.95');
    });

    it('should use ecomm_totalvalue as conversion value when value param not provided', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?data=ecomm_totalvalue%3D75.00';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Conversion Value']).toBe('75.00');
    });

    it('should prefer value param over ecomm_totalvalue for conversion value', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?value=100&data=ecomm_totalvalue%3D75.00';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Conversion Value']).toBe('100');
    });

    it('should parse e-commerce data product ID', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?data=ecomm_prodid%3DPROD-456';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Product IDs']).toBe('PROD-456');
    });

    it('should parse e-commerce data page type', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?data=ecomm_pagetype%3Dcart';
      const result = googleAds.parseParams(url, undefined);
      expect(result['E-Commerce Type']).toBe('cart');
    });

    it('should return undefined for missing optional parameters', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Conversion Label']).toBeUndefined();
      expect(result['Conversion Value']).toBeUndefined();
      expect(result['Currency']).toBeUndefined();
      expect(result['Transaction ID']).toBeUndefined();
      expect(result['Page Title']).toBeUndefined();
      expect(result['Page URL']).toBeUndefined();
      expect(result['Referrer']).toBeUndefined();
      expect(result['Google Click ID']).toBeUndefined();
      expect(result['Event']).toBeUndefined();
      expect(result['_eventName']).toBeUndefined();
    });

    it('should handle POST body with URL params encoded as text', () => {
      const postBody = { text: 'value=50&label=post_label&currency_code=USD', mimeType: 'application/x-www-form-urlencoded' };
      const result = googleAds.parseParams('', postBody);
      expect(result['Conversion Value']).toBe('50');
      expect(result['Conversion Label']).toBe('post_label');
      expect(result['Currency']).toBe('USD');
    });

    it('should handle POST body with e-commerce data as text', () => {
      const postBody = { text: 'data=event%3Dcheckout%3Becomm_totalvalue%3D200', mimeType: 'application/x-www-form-urlencoded' };
      const result = googleAds.parseParams('', postBody);
      expect(result['Event']).toBe('checkout');
      expect(result['E-Commerce Value']).toBe('200');
    });

    it('should handle raw string postBody', () => {
      const postBody = 'value=75.50&label=raw_label';
      const result = googleAds.parseParams('', postBody);
      expect(result['Conversion Value']).toBe('75.50');
      expect(result['Conversion Label']).toBe('raw_label');
    });

    it('should handle undefined postBody gracefully', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?value=100&label=test';
      const result = googleAds.parseParams(url, undefined);
      expect(result['Conversion Value']).toBe('100');
      expect(result['Conversion Label']).toBe('test');
    });

    it('should set _eventName from data event parameter', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?data=event%3Dpage_view';
      const result = googleAds.parseParams(url, undefined);
      expect(result['_eventName']).toBe('page_view');
    });

    it('should prefer data.event over en parameter for _eventName', () => {
      const url = 'https://googleads.g.doubleclick.net/pagead/conversion/123456789/?en=custom_event&data=event%3Ddata_event';
      const result = googleAds.parseParams(url, undefined);
      expect(result['_eventName']).toBe('data_event');
    });
  });
});