// ─── BACKGROUND SERVICE WORKER ──────────────────────────────────────────────
// Captures requests initiated by other Chrome Extensions
// (these are not visible via chrome.devtools.network)

import { initPopupBridge } from './popup-bridge';
import { initBadge } from './badge';

initPopupBridge();
initBadge();

/**
 * Convert headers array to object with lowercase keys.
 */
function headersToObj(
  headers: chrome.webRequest.HttpHeader[] = []
): Record<string, string> {
  return headers.reduce((acc, { name, value }) => {
    acc[name.toLowerCase()] = value ?? '';
    return acc;
  }, {} as Record<string, string>);
}

// ─── ADOBE ENV REDIRECT ───────────────────────────────────────────────────────
// Uses declarativeNetRequest to redirect Adobe Launch library URLs at network level.
// This persists across page reloads (unlike DOM injection).

const ADOBE_REDIRECT_RULE_ID = 1001;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SET_ADOBE_REDIRECT') {
    const { fromUrl, toUrl } = message;
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ADOBE_REDIRECT_RULE_ID],
      addRules: [{
        id: ADOBE_REDIRECT_RULE_ID,
        priority: 1,
        action: { type: chrome.declarativeNetRequest.RuleActionType.REDIRECT, redirect: { url: toUrl } },
        condition: { urlFilter: fromUrl, resourceTypes: [chrome.declarativeNetRequest.ResourceType.SCRIPT] },
      }],
    }).then(() => sendResponse({ ok: true })).catch((e: Error) => sendResponse({ ok: false, error: e.message }));
    return true; // async
  }

  if (message.type === 'CLEAR_ADOBE_REDIRECT') {
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ADOBE_REDIRECT_RULE_ID],
    }).then(() => sendResponse({ ok: true })).catch((e: Error) => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (message.type === 'GET_ADOBE_REDIRECT') {
    chrome.declarativeNetRequest.getDynamicRules().then((rules) => {
      const rule = rules.find(r => r.id === ADOBE_REDIRECT_RULE_ID);
      sendResponse({ rule: rule ?? null });
    });
    return true;
  }
});

// ─── EXTENSION REQUEST RELAY ──────────────────────────────────────────────────
// Listen for requests from other extensions and relay them to the devtools script
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    // Only capture requests from other extensions, not from ourselves
    if (
      details.initiator &&
      details.initiator.startsWith('chrome-extension://') &&
      details.initiator !== `chrome-extension://${chrome.runtime.id}`
    ) {
      // Send message to devtools script (if active)
      chrome.runtime.sendMessage({
        type: 'EXT_REQUEST',
        data: {
          id: Date.now() + Math.random(),
          url: details.url,
          method: details.method,
          timestamp: new Date().toISOString(),
          duration: 0,
          status: 0,
          source: 'extension',
          initiator: details.initiator,
          allParams: {},
          decoded: {},
          postBody: null,
          responseBody: '',
          requestHeaders: headersToObj(details.requestHeaders),
          responseHeaders: {},
        },
      }).catch(() => {
        // Message delivery failed, ignore (devtools panel may not be open)
      });
    }
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders']
);
