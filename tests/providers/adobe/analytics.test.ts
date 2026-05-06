import { describe, it, expect } from 'vitest';
import { adobeAA } from '../../../src/providers/adobe/analytics';

describe('Adobe Analytics Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches .sc.omtrdc.net domain', () => {
      expect(
        adobeAA.pattern.test(
          'https://company.sc.omtrdc.net/b/ss/account/0/hit1.gif?pageName=Home'
        )
      ).toBe(true);
    });

    it('matches .2o7.net legacy domain', () => {
      expect(
        adobeAA.pattern.test(
          'https://company.2o7.net/b/ss/account/0/hit1.gif?pageName=Products'
        )
      ).toBe(true);
    });

    it('matches /b/ss/ path pattern', () => {
      expect(
        adobeAA.pattern.test(
          'https://analytics.example.com/b/ss/RSID123/0/hit1.gif?pe=lnk_o&pev2=Click'
        )
      ).toBe(true);
    });

    it('matches .demdex.net for Audience Manager', () => {
      expect(
        adobeAA.pattern.test(
          'https://dpm.demdex.net/ibs:dpid=1&dpuuid=user123'
        )
      ).toBe(true);
    });

    it('does NOT match omtrdc.net without .sc. prefix', () => {
      expect(
        adobeAA.pattern.test('https://company.omtrdc.net/something')
      ).toBe(false);
    });

    it('does NOT match unrelated adobe URLs', () => {
      expect(
        adobeAA.pattern.test('https://www.adobe.com/products/analytics.html')
      ).toBe(false);
    });

    it('does NOT match arbitrary URLs', () => {
      expect(
        adobeAA.pattern.test('https://example.com/page?param=value')
      ).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts report suite from URL path', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/myReportSuite/0/hit1.gif',
        undefined
      );
      expect(result['Report suite']).toBe('myReportSuite');
    });

    it('extracts report suite from CNAME first-party tracking', () => {
      const result = adobeAA.parseParams(
        'https://analytics.company.com/b/ss/TRACK123/0/hit1.gif?pageName=Test',
        undefined
      );
      expect(result['Report suite']).toBe('TRACK123');
    });

    it('detects page view hit type (default)', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?pageName=Home',
        undefined
      );
      expect(result['Hit type']).toBe('Page view');
    });

    it('detects custom link hit type (pe=lnk_o)', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?pe=lnk_o&pev2=MyLink',
        undefined
      );
      expect(result['Hit type']).toBe('Custom link');
    });

    it('detects download link hit type (pe=lnk_d)', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?pe=lnk_d&pev2=Download',
        undefined
      );
      expect(result['Hit type']).toBe('Download link');
    });

    it('detects exit link hit type (pe=lnk_e)', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?pe=lnk_e&pev2=ExitLink',
        undefined
      );
      expect(result['Hit type']).toBe('Exit link');
    });

    it('extracts eVars from v1-v250 parameters', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?v1=CampaignA&v25=InternalSearch&v100=Category',
        undefined
      );
      expect(result.eVar1).toBe('CampaignA');
      expect(result.eVar25).toBe('InternalSearch');
      expect(result.eVar100).toBe('Category');
    });

    it('extracts props from c1-c75 parameters', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?c1=NavBar&c10=ButtonClick',
        undefined
      );
      expect(result.prop1).toBe('NavBar');
      expect(result.prop10).toBe('ButtonClick');
    });

    it('excludes props starting with period', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?c1=ValidProp&c2=.exclude&c3=AlsoValid',
        undefined
      );
      expect(result.prop1).toBe('ValidProp');
      expect(result.prop2).toBeUndefined();
      expect(result.prop3).toBe('AlsoValid');
    });

    it('extracts context data from c. prefixed parameters', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?c.pageType=error&c.userType=member',
        undefined
      );
      expect(result['Context data']).toBe(JSON.stringify({ pageType: 'error', userType: 'member' }));
    });

    it('does not include empty context data key', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?c.=invalid',
        undefined
      );
      expect(result['Context data']).toBeUndefined();
    });

    it('extracts list variables l1-l3', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?l1=A,B,C&l2=X|Y|Z',
        undefined
      );
      expect(result.list1).toBe('A,B,C');
      expect(result.list2).toBe('X|Y|Z');
    });

    it('extracts hierarchy variables h1-h5', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?h1=Home&h2=Category&h3=Product',
        undefined
      );
      expect(result.hier1).toBe('Home');
      expect(result.hier2).toBe('Category');
      expect(result.hier3).toBe('Product');
    });

    it('extracts standard parameters', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?pageName=Home+Page&g=https://example.com/home&r=https://google.com&mid=visitor123&events=purchase,scAdd&products=SKU123;ProductName;1;9.99&v0=promo_code&ch=specials&server=web1&pev1=https://link.com&pev2=LinkName&s=1920x1080&c=24&j=1.6',
        undefined
      );
      expect(result['Page name']).toBe('Home Page');
      expect(result['Page URL']).toBe('https://example.com/home');
      expect(result.Referrer).toBe('https://google.com');
      expect(result['Visitor ID']).toBe('visitor123');
      expect(result.Events).toBe('purchase,scAdd');
      expect(result.Products).toBe('SKU123;ProductName;1;9.99');
      expect(result.Campaign).toBe('promo_code');
      expect(result.Channel).toBe('specials');
      expect(result.Server).toBe('web1');
      expect(result['Link URL']).toBe('https://link.com');
      expect(result['Link name']).toBe('LinkName');
      expect(result.Resolution).toBe('1920x1080');
      expect(result['Color depth']).toBe('24');
      expect(result['JavaScript ver']).toBe('1.6');
    });

    it('extracts Visitor ID from aid when mid is not present', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?aid=legacyVisitor',
        undefined
      );
      expect(result['Visitor ID']).toBe('legacyVisitor');
    });

    it('extracts Visitor ID from fid when mid and aid are not present', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?fid=fallbackVisitor',
        undefined
      );
      expect(result['Visitor ID']).toBe('fallbackVisitor');
    });

    it('sets AppMeasurement Yes when ndh=1', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?ndh=1',
        undefined
      );
      expect(result.AppMeasurement).toBe('Yes');
    });

    it('does not include AppMeasurement when ndh is not 1', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?ndh=0',
        undefined
      );
      expect(result.AppMeasurement).toBeUndefined();
    });

    it('supports pageName as fallback for page name', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?pageName=DirectPage',
        undefined
      );
      expect(result['Page name']).toBe('DirectPage');
    });

    it('supports gn as fallback for page name', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?gn=GenericName',
        undefined
      );
      expect(result['Page name']).toBe('GenericName');
    });

    it('supports events as primary for events', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?events=pageView,event1&ev=legacyEvent',
        undefined
      );
      expect(result.Events).toBe('pageView,event1');
    });

    it('supports ev as fallback for events', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?ev=legacyEvent',
        undefined
      );
      expect(result.Events).toBe('legacyEvent');
    });

    it('supports products as primary for products', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?products=SKU1;Name1&pl=legacyProduct',
        undefined
      );
      expect(result.Products).toBe('SKU1;Name1');
    });

    it('supports pl as fallback for products', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?pl=legacyProduct',
        undefined
      );
      expect(result.Products).toBe('legacyProduct');
    });

    it('parses POST body for parameters', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif',
        'pageName=FormSubmit&events=event10&v1=formType'
      );
      expect(result['Page name']).toBe('FormSubmit');
      expect(result.Events).toBe('event10');
      expect(result.eVar1).toBe('formType');
    });

    it('sets _eventName from hit type', () => {
      const result = adobeAA.parseParams(
        'https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif?pe=lnk_d&pev2=Download',
        undefined
      );
      expect(result._eventName).toBe('Download link');
    });
  });
});