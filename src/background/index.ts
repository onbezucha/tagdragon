// ─── BACKGROUND SERVICE WORKER ──────────────────────────────────────────────
// Captures requests initiated by other Chrome Extensions
// (these are not visible via chrome.devtools.network)

import { initPopupBridge } from './popup-bridge';
import { initBadge } from './badge';
import { generateId } from '@/shared/id-gen';
import { headersToObj } from '@/shared/http-utils';

initPopupBridge();
initBadge();

// ─── ADOBE ENV REDIRECT ───────────────────────────────────────────────────────
// Uses declarativeNetRequest to redirect Adobe Launch library URLs at network level.
// This persists across page reloads (unlike DOM injection).

const ADOBE_REDIRECT_RULE_ID = 1001;

// ─── DEVTOOLS PORT REGISTRY ───────────────────────────────────────────────────
// DevTools connects with a named port so background can relay DataLayer messages.
// port.name format: "devtools_<tabId>"

export const devToolsPorts = new Map<number, chrome.runtime.Port>();

chrome.runtime.onConnect.addListener((port) => {
  const match = port.name.match(/^devtools_(\d+)$/);
  if (!match) return;
  const tabId = Number(match[1]);
  devToolsPorts.set(tabId, port);
  port.onDisconnect.addListener(() => devToolsPorts.delete(tabId));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SET_ADOBE_REDIRECT') {
    const { fromUrl, toUrl } = message;

    // Validate redirect target: only allow Adobe CDN domains over HTTPS
    const allowedHostnames = ['assets.adobedtm.com', 'assets.adobedtm.com.ostrk.org'];
    try {
      const parsedTo = new URL(toUrl);
      if (parsedTo.protocol !== 'https:') {
        sendResponse({ ok: false, error: 'Only HTTPS redirect targets are allowed' });
        return true;
      }
      if (!allowedHostnames.includes(parsedTo.hostname)) {
        sendResponse({ ok: false, error: 'Invalid redirect target hostname' });
        return true;
      }
    } catch {
      sendResponse({ ok: false, error: 'Invalid redirect URL' });
      return true;
    }
    // Also validate fromUrl is parseable and uses HTTPS
    try {
      const parsedFrom = new URL(fromUrl);
      if (parsedFrom.protocol !== 'https:') {
        sendResponse({ ok: false, error: 'Only HTTPS source URLs are allowed' });
        return true;
      }
    } catch {
      sendResponse({ ok: false, error: 'Invalid source URL' });
      return true;
    }

    chrome.declarativeNetRequest
      .updateDynamicRules({
        removeRuleIds: [ADOBE_REDIRECT_RULE_ID],
        addRules: [
          {
            id: ADOBE_REDIRECT_RULE_ID,
            priority: 1,
            action: {
              type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
              redirect: { url: toUrl },
            },
            condition: {
              urlFilter: fromUrl,
              resourceTypes: [chrome.declarativeNetRequest.ResourceType.SCRIPT],
            },
          },
        ],
      })
      .then(() => sendResponse({ ok: true }))
      .catch((e: Error) => sendResponse({ ok: false, error: e.message }));
    return true; // async
  }

  if (message.type === 'CLEAR_ADOBE_REDIRECT') {
    chrome.declarativeNetRequest
      .updateDynamicRules({
        removeRuleIds: [ADOBE_REDIRECT_RULE_ID],
      })
      .then(() => sendResponse({ ok: true }))
      .catch((e: Error) => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (message.type === 'GET_ADOBE_REDIRECT') {
    chrome.declarativeNetRequest.getDynamicRules().then((rules) => {
      const rule = rules.find((r) => r.id === ADOBE_REDIRECT_RULE_ID);
      sendResponse({ rule: rule ?? null });
    });
    return true;
  }

  // ─── DATALAYER RELAY ───────────────────────────────────────────────────────
  // tabId comes from sender.tab.id, NOT from message body
  if (message.type === 'DATALAYER_PUSH') {
    const tabId = _sender.tab?.id;
    if (tabId != null) {
      const port = devToolsPorts.get(tabId);
      if (port) {
        try {
          port.postMessage({ type: 'DATALAYER_PUSH', tabId, ...message });
        } catch {
          /* port may be closed */
        }
      }
    }
    return;
  }

  if (message.type === 'DATALAYER_SOURCES') {
    const tabId = _sender.tab?.id;
    if (tabId != null) {
      const port = devToolsPorts.get(tabId);
      if (port) {
        try {
          port.postMessage({ type: 'DATALAYER_SOURCES', tabId, ...message });
        } catch {
          /* port may be closed */
        }
      }
    }
    return;
  }

  if (message.type === 'DATALAYER_SNAPSHOT_RESPONSE') {
    const tabId = _sender.tab?.id;
    if (tabId != null) {
      const port = devToolsPorts.get(tabId);
      if (port) {
        try {
          port.postMessage({ type: 'DATALAYER_SNAPSHOT_RESPONSE', tabId, ...message });
        } catch {
          /* port may be closed */
        }
      }
    }
    return;
  }

  // DATALAYER_SNAPSHOT_REQUEST comes from DevTools (tabId is in message body)
  if (message.type === 'DATALAYER_SNAPSHOT_REQUEST') {
    chrome.tabs.sendMessage(message.tabId, { type: 'DATALAYER_SNAPSHOT_REQUEST' }).catch(() => {
      /* tab may not have content script */
    });
    return;
  }

  // INJECT_DATALAYER: inject both scripts into the inspected tab.
  // The MAIN world script is injected via scripting.executeScript({ world: 'MAIN' })
  // which bypasses the page's Content Security Policy — unlike a <script> tag
  // injection from the content script, which CSP can block.
  if (message.type === 'INJECT_DATALAYER') {
    const tabId: number = message.tabId;
    if (typeof tabId !== 'number' || !Number.isInteger(tabId) || tabId <= 0) return;
    // Guards must be cleared BEFORE scripts are injected — run sequentially so the
    // scripts cannot land before their guard flag has been deleted (a race that would
    // cause data-layer-main.js to see __tagdragon_main__ still set and exit early).
    (async () => {
      // 1. Clear the bridge guard (ISOLATED world).
      await chrome.scripting
        .executeScript({
          target: { tabId },
          func: () => {
            delete (window as unknown as Record<string, unknown>)['__tagdragon_bridge__'];
          },
        })
        .catch(() => {
          /* ignore — tab may not be scriptable */
        });

      // 2. Clear the MAIN world guard.
      await chrome.scripting
        .executeScript({
          target: { tabId },
          func: () => {
            delete (window as unknown as Record<string, unknown>)['__tagdragon_main__'];
          },
          world: 'MAIN' as chrome.scripting.ExecutionWorld,
        })
        .catch(() => {
          /* ignore — tab may not be scriptable */
        });

      // 3. ISOLATED world bridge (relays postMessage → runtime.sendMessage)
      //    AWAIT so the bridge's message listener is registered before MAIN world runs.
      await chrome.scripting
        .executeScript({
          target: { tabId },
          files: ['dist/data-layer-bridge.js'],
        })
        .catch((e: Error) => console.warn('[TagDragon] Failed to inject bridge:', e.message));

      // 4. MAIN world interceptor — world: 'MAIN' bypasses page CSP
      //    AWAIT so injection is fully complete before we return.
      await chrome.scripting
        .executeScript({
          target: { tabId },
          files: ['dist/data-layer-main.js'],
          world: 'MAIN' as chrome.scripting.ExecutionWorld,
        })
        .catch((e: Error) => console.warn('[TagDragon] Failed to inject main:', e.message));
    })();
    return;
  }

  if (message.type === 'CLEAR_COOKIES') {
    const { url } = message;
    (async () => {
      try {
        let urlObj: URL;
        try {
          urlObj = new URL(url);
        } catch {
          sendResponse({ deleted: 0 });
          return;
        }

        const [byCookies, byDomain] = await Promise.all([
          chrome.cookies.getAll({ url }),
          chrome.cookies.getAll({ domain: urlObj.hostname }),
        ]);

        const seen = new Set<string>();
        const all = [...byCookies, ...byDomain].filter((c) => {
          const key = `${c.name}|${c.domain}|${c.path}|${c.storeId}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        let deleted = 0;
        for (const cookie of all) {
          const domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
          const cookieUrl = `${cookie.secure ? 'https' : 'http'}://${domain}${cookie.path}`;
          try {
            await chrome.cookies.remove({
              url: cookieUrl,
              name: cookie.name,
              storeId: cookie.storeId,
            });
            deleted++;
          } catch {
            /* continue */
          }
        }
        sendResponse({ deleted });
      } catch (e) {
        sendResponse({ deleted: 0, error: String(e) });
      }
    })();
    return true; // async
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
      chrome.runtime
        .sendMessage({
          type: 'EXT_REQUEST',
          data: {
            id: generateId(),
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
        })
        .catch(() => {
          // Message delivery failed, ignore (devtools panel may not be open)
        });
    }
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders']
);
