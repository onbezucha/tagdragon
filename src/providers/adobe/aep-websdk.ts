import type { Provider } from '../../types/provider';
import { getParams } from '../url-parser';
import { parsePostBodyJson, titleCase, formatJsonValue } from '../parse-helpers';

export const aepWebSDK: Provider = {
  name: 'Adobe Server-Side',
  color: '#C70000',
  // Modern implementations use Web SDK (Alloy)
  // POST JSON to *.adobedc.net/ee/v2/interact or /collect
  // eVars and props are nested in: events[0].data.__adobe.analytics.eVarN / propN
  pattern:
    /\/ee\/[^/]+\/v\d+\/interact|\/ee\/[^/]+\/v\d+\/collect|\/ee\/v\d+\/interact|\/ee\/v\d+\/collect|\/ee\/collect|\.adobedc\.net/,

  parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
    const urlParams = getParams(url, null);

    // Parse POST JSON payload
    const payload = parsePostBodyJson(postRaw);

    const event0 =
      (((payload.events as unknown[]) || [])[0] as Record<string, unknown> | undefined) || {};
    const xdm = (event0.xdm as Record<string, unknown>) || {};
    const data = (event0.data as Record<string, unknown>) || {};
    const adobe = (data.__adobe as Record<string, unknown>) || {};
    const aa = (adobe.analytics as Record<string, unknown>) || {}; // <-- eVars and props are here
    const device = (xdm.device as Record<string, unknown>) || {};
    const web = (xdm.web as Record<string, unknown>) || {};
    const identity = (xdm.identityMap as Record<string, unknown>) || {};

    // All eVars: eVar1-eVar250 (key is "eVarN" or "evarN")
    const eVars: Record<string, string> = {};
    for (let i = 1; i <= 250; i++) {
      const v = aa[`eVar${i}`] || aa[`evar${i}`];
      if (v !== undefined && v !== null && v !== '') {
        eVars[`eVar${i}`] = String(v);
      }
    }

    // All props: prop1-prop75
    const props: Record<string, string> = {};
    for (let i = 1; i <= 75; i++) {
      const v = aa[`prop${i}`] || aa[`Prop${i}`];
      if (v !== undefined && v !== null && v !== '') {
        props[`prop${i}`] = String(v);
      }
    }

    // List variables: list1-list3
    const lists: Record<string, string> = {};
    for (let i = 1; i <= 3; i++) {
      const v = aa[`list${i}`];
      if (v) {
        lists[`list${i}`] = String(v);
      }
    }

    // Extract page details from web.webPageDetails
    const pageDetails = (web.webPageDetails as Record<string, unknown>) || {};

    // Extract referrer from web.webReferrer
    const referrer = (web.webReferrer as Record<string, unknown>) || {};

    // Extract ECID from identity map
    const ecidArray = (identity.ECID as unknown[]) || [];
    const ecidObj = (ecidArray[0] as Record<string, unknown>) || {};

    // Extract screen dimensions
    const screenDimensions =
      device.screenWidth && device.screenHeight
        ? `${device.screenWidth}x${device.screenHeight}`
        : undefined;

    // Get datastream ID from configId or from meta config overrides
    let datastreamId = urlParams.configId as string | undefined;
    if (!datastreamId && payload.meta && typeof payload.meta === 'object') {
      const meta = payload.meta as Record<string, unknown>;
      const overrides = meta.configOverrides as Record<string, unknown> | undefined;
      if (overrides) {
        const analytics = overrides.com_adobe_analytics as Record<string, unknown> | undefined;
        const suites = analytics?.reportSuites as unknown[];
        datastreamId = suites?.[0] as string | undefined;
      }
    }

    // Determine request type from URL path (more reliable than POST body)
    const requestType = url.includes('/interact')
      ? 'interact'
      : url.includes('/collect')
        ? 'collect'
        : undefined;

    const str = (v: unknown): string | undefined => {
      if (v === undefined || v === null || v === '') return undefined;
      return String(v);
    };

    const result: Record<string, string | undefined> = {
      // Basic info
      'Datastream ID': datastreamId,
      'Request type': requestType,
      'Event type': str(xdm.eventType),

      // Adobe Analytics specifics (from __adobe.analytics)
      'Page name': str(aa.pageName),
      'Page URL': str(aa.pageURL || pageDetails?.URL),
      Channel: str(aa.channel),
      Server: str(aa.server),
      Events: str(aa.events),
      'Link name': str(aa.linkName),
      'Link type': str(aa.linkType),
      Campaign: str(aa.campaign),
      Referrer: str(aa.referrer || referrer?.URL),

      // eVars and props
      ...eVars,
      ...props,
      ...lists,

      // XDM identity
      ECID: str(ecidObj.id),

      // Device
      Screen: screenDimensions,
      'Screen orient': str(device.screenOrientation),
    };

    // XDM Commerce
    const commerce = (xdm.commerce as Record<string, unknown>) ?? {};
    if (commerce.order) {
      const order = commerce.order as Record<string, unknown>;
      if (order.purchaseID) result['Purchase ID'] = str(order.purchaseID);
      if (order.priceTotal) result['Price Total'] = str(order.priceTotal);
      if (order.currencyCode) result['Order Currency'] = str(order.currencyCode);
    }

    // Product List Items
    const productListItems = xdm.productListItems as Array<Record<string, unknown>> | undefined;
    if (productListItems && productListItems.length > 0) {
      result['Products'] = JSON.stringify(productListItems, null, 2);
    }

    // Commerce actions
    const commerceActions = [
      'productListAdds',
      'productListOpens',
      'productListRemovals',
      'productListReopens',
      'productListViews',
      'purchases',
      'saveForLaters',
    ];
    for (const action of commerceActions) {
      const val = commerce[action];
      if (val && typeof val === 'object') {
        result[titleCase(action)] = formatJsonValue(val);
      }
    }

    // Browser details
    const browser =
      ((xdm.environment as Record<string, unknown>)?.browserDetails as Record<string, unknown>) ??
      {};
    if (browser.browserName) result['Browser'] = str(browser.browserName);
    if (browser.browserVersion) result['Browser Version'] = str(browser.browserVersion);

    // Remove Screen orient (noise)
    delete result['Screen orient'];

    result._eventName = result['Event type'];

    return result;
  },
};
