import { describe, it, expect } from 'vitest';
import { aepWebSDK } from '../../../src/providers/adobe/aep-websdk';

describe('AEP WebSDK Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches /ee/v1/interact path', () => {
      expect(
        aepWebSDK.pattern.test(
          'https://company.adobedc.net/ee/v1/interact?configId=datastream123'
        )
      ).toBe(true);
    });

    it('matches /ee/v2/interact path', () => {
      expect(
        aepWebSDK.pattern.test(
          'https://company.adobedc.net/ee/v2/interact'
        )
      ).toBe(true);
    });

    it('matches /ee/v1/collect path', () => {
      expect(
        aepWebSDK.pattern.test(
          'https://company.adobedc.net/ee/v1/collect?data=abc'
        )
      ).toBe(true);
    });

    it('matches /ee/v2/collect path', () => {
      expect(
        aepWebSDK.pattern.test(
          'https://company.adobedc.net/ee/v2/collect'
        )
      ).toBe(true);
    });

    it('matches /ee/collect path (legacy)', () => {
      expect(
        aepWebSDK.pattern.test(
          'https://company.adobedc.net/ee/collect'
        )
      ).toBe(true);
    });

    it('matches /ee/orgId/v1/interact with org ID', () => {
      expect(
        aepWebSDK.pattern.test(
          'https://company.adobedc.net/ee/org123ABC/v1/interact'
        )
      ).toBe(true);
    });

    it('matches .adobedc.net domain', () => {
      expect(
        aepWebSDK.pattern.test(
          'https://server.adobedc.net/ee/v1/interact'
        )
      ).toBe(true);
    });

    it('does NOT match adobe.com URLs', () => {
      expect(
        aepWebSDK.pattern.test('https://www.adobe.com/products/analytics.html')
      ).toBe(false);
    });

    it('does NOT match arbitrary unrelated URLs', () => {
      expect(
        aepWebSDK.pattern.test('https://example.com/page?param=value')
      ).toBe(false);
    });

    it('matches Adobe URLs on various domains that contain /ee/ paths', () => {
      // Pattern matches based on /ee/ path patterns, not domain
      expect(
        aepWebSDK.pattern.test('https://adobe.com/ee/v1/interact')
      ).toBe(true);
      expect(
        aepWebSDK.pattern.test('https://company.adobe.com/ee/v2/collect')
      ).toBe(true);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts datastream ID from URL configId parameter', () => {
      const postBody = JSON.stringify({
        events: [{
          xdm: { eventType: 'web.webpagedetails.pageViews' },
          data: {}
        }]
      });
      const result = aepWebSDK.parseParams(
        'https://company.adobedc.net/ee/v1/interact?configId=DS-12345',
        postBody
      );
      expect(result['Datastream ID']).toBe('DS-12345');
    });

    it('extracts datastream ID from meta.configOverrides when URL configId missing', () => {
      const postBody = JSON.stringify({
        meta: {
          configOverrides: {
            com_adobe_analytics: {
              reportSuites: ['rsid_from_meta']
            }
          }
        },
        events: [{
          xdm: { eventType: 'web.webpagedetails.pageViews' },
          data: {}
        }]
      });
      const result = aepWebSDK.parseParams(
        'https://company.adobedc.net/ee/v1/interact',
        postBody
      );
      expect(result['Datastream ID']).toBe('rsid_from_meta');
    });

    it('extracts request type "interact" from URL path', () => {
      const postBody = JSON.stringify({
        events: [{
          xdm: { eventType: 'web.webpagedetails.pageViews' },
          data: {}
        }]
      });
      const result = aepWebSDK.parseParams(
        'https://company.adobedc.net/ee/v1/interact',
        postBody
      );
      expect(result['Request type']).toBe('interact');
    });

    it('extracts request type "collect" from URL path', () => {
      const postBody = JSON.stringify({
        events: [{
          xdm: { eventType: 'web.webpagedetails.pageViews' },
          data: {}
        }]
      });
      const result = aepWebSDK.parseParams(
        'https://company.adobedc.net/ee/v1/collect',
        postBody
      );
      expect(result['Request type']).toBe('collect');
    });

    it('extracts eVars and props from events[0].data.__adobe.analytics', () => {
      const postBody = JSON.stringify({
        events: [{
          xdm: { eventType: 'web.webpagedetails.pageViews' },
          data: {
            __adobe: {
              analytics: {
                eVar1: 'CampaignValue',
                eVar25: 'InternalSearch',
                eVar100: 'CategoryPage',
                prop1: 'NavBar',
                prop10: 'ButtonClick',
                list1: 'A,B,C',
                list2: 'X|Y|Z'
              }
            }
          }
        }]
      });
      const result = aepWebSDK.parseParams(
        'https://company.adobedc.net/ee/v1/interact',
        postBody
      );
      expect(result.eVar1).toBe('CampaignValue');
      expect(result.eVar25).toBe('InternalSearch');
      expect(result.eVar100).toBe('CategoryPage');
      expect(result.prop1).toBe('NavBar');
      expect(result.prop10).toBe('ButtonClick');
      expect(result.list1).toBe('A,B,C');
      expect(result.list2).toBe('X|Y|Z');
    });

    it('extracts ECID from xdm.identityMap.ECID[0].id', () => {
      const postBody = JSON.stringify({
        events: [{
          xdm: {
            eventType: 'web.webpagedetails.pageViews',
            identityMap: {
              ECID: [{
                id: 'ecid_1234567890',
                primary: true
              }]
            }
          },
          data: {}
        }]
      });
      const result = aepWebSDK.parseParams(
        'https://company.adobedc.net/ee/v1/interact',
        postBody
      );
      expect(result.ECID).toBe('ecid_1234567890');
    });

    it('extracts commerce order details (purchaseID, priceTotal, currencyCode)', () => {
      const postBody = JSON.stringify({
        events: [{
          xdm: {
            eventType: 'commerce.purchases',
            commerce: {
              order: {
                purchaseID: 'ORDER-12345',
                priceTotal: 99.99,
                currencyCode: 'USD'
              }
            }
          },
          data: {}
        }]
      });
      const result = aepWebSDK.parseParams(
        'https://company.adobedc.net/ee/v1/interact',
        postBody
      );
      expect(result['Purchase ID']).toBe('ORDER-12345');
      expect(result['Price Total']).toBe('99.99');
      expect(result['Order Currency']).toBe('USD');
    });

    it('extracts productListItems as JSON string', () => {
      const postBody = JSON.stringify({
        events: [{
          xdm: {
            eventType: 'commerce.productListViews',
            productListItems: [
              { SKU: 'SKU001', name: 'Product One', price: 29.99, quantity: 1 },
              { SKU: 'SKU002', name: 'Product Two', price: 49.99, quantity: 2 }
            ]
          },
          data: {}
        }]
      });
      const result = aepWebSDK.parseParams(
        'https://company.adobedc.net/ee/v1/interact',
        postBody
      );
      expect(result['Products']).toBeDefined();
      const products = JSON.parse(result['Products'] as string);
      expect(products).toHaveLength(2);
      expect(products[0].SKU).toBe('SKU001');
      expect(products[1].name).toBe('Product Two');
    });

    it('extracts screen dimensions from xdm.device', () => {
      const postBody = JSON.stringify({
        events: [{
          xdm: {
            eventType: 'web.webpagedetails.pageViews',
            device: {
              screenWidth: 1920,
              screenHeight: 1080,
              screenOrientation: 'landscape'
            }
          },
          data: {}
        }]
      });
      const result = aepWebSDK.parseParams(
        'https://company.adobedc.net/ee/v1/interact',
        postBody
      );
      expect(result.Screen).toBe('1920x1080');
    });

    it('sets _eventName from Event type', () => {
      const postBody = JSON.stringify({
        events: [{
          xdm: {
            eventType: 'web.webpagedetails.pageViews'
          },
          data: {}
        }]
      });
      const result = aepWebSDK.parseParams(
        'https://company.adobedc.net/ee/v1/interact',
        postBody
      );
      expect(result['Event type']).toBe('web.webpagedetails.pageViews');
      expect(result._eventName).toBe('web.webpagedetails.pageViews');
    });

    it('extracts browser details from xdm.environment.browserDetails', () => {
      const postBody = JSON.stringify({
        events: [{
          xdm: {
            eventType: 'web.webpagedetails.pageViews',
            environment: {
              browserDetails: {
                browserName: 'Chrome',
                browserVersion: '120.0.6099.109'
              }
            }
          },
          data: {}
        }]
      });
      const result = aepWebSDK.parseParams(
        'https://company.adobedc.net/ee/v1/interact',
        postBody
      );
      expect(result.Browser).toBe('Chrome');
      expect(result['Browser Version']).toBe('120.0.6099.109');
    });

    it('extracts page name from __adobe.analytics.pageName', () => {
      const postBody = JSON.stringify({
        events: [{
          xdm: { eventType: 'web.webpagedetails.pageViews' },
          data: {
            __adobe: {
              analytics: {
                pageName: 'Home Page',
                pageURL: 'https://example.com/home'
              }
            }
          }
        }]
      });
      const result = aepWebSDK.parseParams(
        'https://company.adobedc.net/ee/v1/interact',
        postBody
      );
      expect(result['Page name']).toBe('Home Page');
      expect(result['Page URL']).toBe('https://example.com/home');
    });

    it('extracts commerce actions as formatted JSON', () => {
      const postBody = JSON.stringify({
        events: [{
          xdm: {
            eventType: 'web.webpagedetails.pageViews',
            commerce: {
              productListAdds: { value: 1 },
              productListRemovals: { value: 0 },
              purchases: { value: 1, currencyCode: 'USD' }
            }
          },
          data: {}
        }]
      });
      const result = aepWebSDK.parseParams(
        'https://company.adobedc.net/ee/v1/interact',
        postBody
      );
      expect(result['Product List Adds']).toBeDefined();
      expect(result['Product List Removals']).toBeDefined();
      expect(result['Purchases']).toBeDefined();
    });

    it('handles postBody as JSON string', () => {
      const postBody = JSON.stringify({
        events: [{
          xdm: { eventType: 'web.webpagedetails.pageViews' },
          data: {}
        }]
      });
      const result = aepWebSDK.parseParams(
        'https://company.adobedc.net/ee/v1/collect',
        postBody
      );
      expect(result['Request type']).toBe('collect');
      expect(result['Event type']).toBe('web.webpagedetails.pageViews');
    });

    it('handles undefined postBody gracefully', () => {
      const result = aepWebSDK.parseParams(
        'https://company.adobedc.net/ee/v1/interact?configId=DS-TEST',
        undefined
      );
      expect(result['Datastream ID']).toBe('DS-TEST');
      expect(result['Request type']).toBe('interact');
    });

    it('handles empty payload gracefully', () => {
      const result = aepWebSDK.parseParams(
        'https://company.adobedc.net/ee/v1/interact',
        ''
      );
      expect(result['Request type']).toBe('interact');
    });

    it('extracts standard analytics fields from __adobe.analytics', () => {
      const postBody = JSON.stringify({
        events: [{
          xdm: { eventType: 'web.webpagedetails.pageViews' },
          data: {
            __adobe: {
              analytics: {
                channel: 'specials',
                server: 'web1',
                events: 'purchase,scAdd',
                linkName: 'Buy Now',
                linkType: 'o',
                campaign: 'promo123',
                referrer: 'https://google.com'
              }
            }
          }
        }]
      });
      const result = aepWebSDK.parseParams(
        'https://company.adobedc.net/ee/v1/interact',
        postBody
      );
      expect(result.Channel).toBe('specials');
      expect(result.Server).toBe('web1');
      expect(result.Events).toBe('purchase,scAdd');
      expect(result['Link name']).toBe('Buy Now');
      expect(result['Link type']).toBe('o');
      expect(result.Campaign).toBe('promo123');
      expect(result.Referrer).toBe('https://google.com');
    });

    it('handles missing events array gracefully', () => {
      const postBody = JSON.stringify({
        events: []
      });
      const result = aepWebSDK.parseParams(
        'https://company.adobedc.net/ee/v1/interact?configId=DS-TEST',
        postBody
      );
      expect(result['Datastream ID']).toBe('DS-TEST');
      expect(result['Request type']).toBe('interact');
    });

    it('handles missing xdm in event gracefully', () => {
      const postBody = JSON.stringify({
        events: [{
          data: {}
        }]
      });
      const result = aepWebSDK.parseParams(
        'https://company.adobedc.net/ee/v1/collect',
        postBody
      );
      expect(result['Request type']).toBe('collect');
    });
  });
});
