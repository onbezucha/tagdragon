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
    chrome.declarativeNetRequest
      .getDynamicRules()
      .then((rules) => {
        const rule = rules.find((r) => r.id === ADOBE_REDIRECT_RULE_ID);
        sendResponse({ rule: rule ?? null });
      })
      .catch(() => sendResponse({ rule: null }));
    return true;
  }

  // ─── DATALAYER RELAY ───────────────────────────────────────────────────────
  // Helper: relay a message to the DevTools panel for the sender's tab
  function relayToDevTools(
    msg: { type: string; [key: string]: unknown },
    sender: chrome.runtime.MessageSender
  ) {
    const tabId = sender.tab?.id;
    if (tabId == null) return;
    const port = devToolsPorts.get(tabId);
    if (!port) return;
    try {
      port.postMessage({ tabId, ...msg });
    } catch {
      /* port may be closed */
    }
  }

  // Relay PUSH, SOURCES, and SNAPSHOT_RESPONSE to the DevTools panel
  if (
    message.type === 'DATALAYER_PUSH' ||
    message.type === 'DATALAYER_SOURCES' ||
    message.type === 'DATALAYER_SNAPSHOT_RESPONSE'
  ) {
    relayToDevTools(message, _sender);
    return;
  }

  // DATALAYER_SNAPSHOT_REQUEST comes from DevTools (tabId is in message body)
  if (message.type === 'DATALAYER_SNAPSHOT_REQUEST') {
    const tabId: number = message.tabId;
    if (typeof tabId !== 'number' || !Number.isInteger(tabId) || tabId <= 0) return;
    chrome.tabs.sendMessage(tabId, { type: 'DATALAYER_SNAPSHOT_REQUEST' }).catch(() => {
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
    // Return the Promise so the service worker stays alive until all injections complete.
    return (async () => {
      // 1+2. Clear both guards in parallel (ISOLATED + MAIN world)
      await Promise.all([
        chrome.scripting
          .executeScript({
            target: { tabId },
            func: () => {
              delete (window as unknown as Record<string, unknown>)['__tagdragon_bridge__'];
            },
          })
          .catch(() => {
            /* ignore — tab may not be scriptable */
          }),
        chrome.scripting
          .executeScript({
            target: { tabId },
            func: () => {
              delete (window as unknown as Record<string, unknown>)['__tagdragon_main__'];
            },
            world: 'MAIN' as chrome.scripting.ExecutionWorld,
          })
          .catch(() => {
            /* ignore — tab may not be scriptable */
          }),
      ]);

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
  }

  if (message.type === 'CLEAR_COOKIES') {
    const { url } = message;
    let urlObj: URL | undefined;

    // Validate that the URL's origin matches the sender's tab origin
    if (_sender.tab?.url) {
      try {
        const senderOrigin = new URL(_sender.tab.url).origin;
        urlObj = new URL(url);
        if (senderOrigin !== urlObj.origin) {
          sendResponse({ deleted: 0 });
          return;
        }
      } catch {
        sendResponse({ deleted: 0 });
        return;
      }
    }

    (async () => {
      try {
        // Ensure urlObj is defined (if tab URL validation passed, this is guaranteed)
        if (!urlObj) {
          urlObj = new URL(url);
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

        const results = await Promise.allSettled(
          all.map((cookie) => {
            const domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
            const cookieUrl = `${cookie.secure ? 'https' : 'http'}://${domain}${cookie.path}`;
            return chrome.cookies.remove({
              url: cookieUrl,
              name: cookie.name,
              storeId: cookie.storeId,
            });
          })
        );

        const deleted = results.filter((r) => r.status === 'fulfilled').length;
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
    return undefined;
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders']
);
