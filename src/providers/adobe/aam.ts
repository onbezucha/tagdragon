import type { Provider } from '../../types/provider';
import { getParams } from '../url-parser';

/**
 * Human-readable labels for known d_* prefixed AAM parameters.
 * Displayed as "Label (d_xyz)" in the decoded tab.
 */
const D_PARAM_LABELS: Record<string, string> = {
  d_mid: 'Experience Cloud ID',
  d_rtbd: 'Return Method',
  d_orgid: 'Org ID',
  d_blob: 'Blob',
  d_ver: 'Version',
};

/**
 * Standard (non-prefixed) AAM parameter labels mapped to human-readable names.
 */
const STANDARD_PARAMS: Record<string, string> = {
  caller: 'Caller',
  cb: 'Callback Property',
  cid: 'Data Provider (User) IDs',
  ciic: 'Integration Code / User ID',
  coppa: 'COPPA Request',
  cts: 'Return Traits & Segments',
  dpid: 'Data Provider ID',
  dpuuid: 'Data Provider User ID',
  dst: 'Return URL Destination',
  dst_filter: 'Adobe Analytics Integration',
  jsonv: 'JSON Response Version',
  nsid: 'Name Space ID',
  ptfm: 'Platform',
  rs: 'Legacy AA Integration',
  sid: 'Score ID',
  tdpid: 'Trait Source',
  tdpiic: 'Trait Source (IC)',
  uuid: 'Unique User ID',
  dcs: 'DCS Region',
  redir: 'Redirect',
  gdpr: 'GDPR',
  gdpr_consent: 'Consent String',
};

/**
 * Parses Adobe AAM (Audience Manager) network request parameters.
 * Handles both standard query/POST params and path-based params for /ibs: URLs.
 */
export const adobeAAM: Provider = {
  name: 'Adobe AAM',
  color: '#FF0000',
  pattern: /demdex\.net\/(ibs|event)[?/#:]/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    let requestType: string;
    let accountId: string;
    const pathBasedParams: Record<string, string> = {};

    try {
      const parsed = new URL(url);

      // Extract request type from pathname
      const path = parsed.pathname;
      if (path.startsWith('/event')) {
        requestType = 'Event';
      } else if (path.startsWith('/ibs')) {
        requestType = 'ID Sync';
      } else {
        // Fallback: use the raw path segment
        const segments = path.split('/').filter(Boolean);
        requestType = segments[0] || '';
      }

      // Extract account ID from hostname
      accountId = parsed.hostname.replace(/^(dpm)?\.demdex\.net$/i, '');

      // Parse path-based params for /ibs: URLs
      if (path.startsWith('/ibs:')) {
        const pathParams = path.slice(5); // Remove '/ibs:' prefix
        const pairs = pathParams.split('&');
        for (const pair of pairs) {
          const [key, value] = pair.split('=');
          if (key && value !== undefined) {
            pathBasedParams[key] = decodeURIComponent(value);
          }
        }
      }
    } catch {
      // Fallback for invalid URLs
      requestType = '';
      accountId = '';
    }

    // Get standard query/POST params
    const params = getParams(url, postBody);

    // Merge path-based params ON TOP of query params
    const merged: Record<string, string | undefined> = {
      ...params,
      ...pathBasedParams,
    };

    // Build result object
    const result: Record<string, string | undefined> = {};

    // Hit Info - always present
    result['Request Type'] = requestType;
    if (accountId) {
      result['Account'] = accountId;
    }

    // Standard params with human-readable labels
    for (const [paramKey, label] of Object.entries(STANDARD_PARAMS)) {
      if (paramKey in merged && merged[paramKey] !== undefined) {
        result[label] = merged[paramKey];
      }
    }

    // Handle mid/d_mid duplication: prefer clean label for non-prefixed version
    if (merged.mid !== undefined) {
      result['Experience Cloud ID'] = merged.mid;
    } else if (merged.d_mid !== undefined) {
      result[D_PARAM_LABELS.d_mid + ' (d_mid)'] = merged.d_mid;
    }

    // Handle rtbd/d_rtbd duplication: prefer clean label for non-prefixed version
    if (merged.rtbd !== undefined) {
      result['Return Method'] = merged.rtbd;
    } else if (merged.d_rtbd !== undefined) {
      result[D_PARAM_LABELS.d_rtbd + ' (d_rtbd)'] = merged.d_rtbd;
    }

    // Remaining known d_* params with human-readable labels (Variant B style)
    const dParamKeys = ['d_orgid', 'd_blob', 'd_ver'] as const;
    for (const key of dParamKeys) {
      if (merged[key] !== undefined) {
        result[D_PARAM_LABELS[key] + ' (' + key + ')'] = merged[key];
      }
    }

    // c_* params - pass through AS-IS (categorization handled by prefixMatch)
    for (const [key, value] of Object.entries(merged)) {
      if (key.startsWith('c_') && value !== undefined) {
        result[key] = value;
      }
    }

    // p_* params - pass through AS-IS (categorization handled by prefixMatch)
    for (const [key, value] of Object.entries(merged)) {
      if (key.startsWith('p_') && value !== undefined) {
        result[key] = value;
      }
    }

    return result;
  },
} as const;
