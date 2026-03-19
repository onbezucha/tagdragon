// Captures requests initiated by other Chrome Extensions
// (these are not visible via chrome.devtools.network)

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (
      details.initiator &&
      details.initiator.startsWith("chrome-extension://") &&
      details.initiator !== `chrome-extension://${chrome.runtime.id}` // not our own extension
    ) {
      chrome.runtime.sendMessage({
        type: "EXT_REQUEST",
        data: {
          id:          Date.now() + Math.random(),
          url:         details.url,
          method:      details.method,
          timestamp:   new Date().toISOString(),
          duration:    0,
          status:      0,
          source:      "extension",
          initiator:   details.initiator,
          allParams:   {},
          decoded:     {},
          postBody:    null,
          responseBody: "",
          requestHeaders:  headersToObj(details.requestHeaders),
          responseHeaders: {},
        }
      }).catch(() => {});
    }
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);

function headersToObj(headers = []) {
  return headers.reduce((acc, { name, value }) => {
    acc[name.toLowerCase()] = value;
    return acc;
  }, {});
}

// ═══════════════════════════════════════════════════════════════════════════
// ADOBE ENV REDIRECT RULES (declarativeNetRequest)
// ═══════════════════════════════════════════════════════════════════════════

const ADOBE_REDIRECT_RULE_ID = 1000;

// Listen for messages from panel to manage redirect rules
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_ADOBE_REDIRECT') {
    setAdobeRedirectRule(message.fromUrl, message.toUrl)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }

  if (message.type === 'CLEAR_ADOBE_REDIRECT') {
    clearAdobeRedirectRule()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'GET_ADOBE_REDIRECT') {
    getAdobeRedirectRule()
      .then((rule) => sendResponse({ success: true, rule }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// Set redirect rule: fromUrl (prod) -> toUrl (staging/dev)
async function setAdobeRedirectRule(fromUrl, toUrl) {
  // First, clear any existing rule
  await clearAdobeRedirectRule();

  // Normalize target URL - ensure it has protocol
  const normalizedTo = toUrl.startsWith('//') ? 'https:' + toUrl :
                       toUrl.startsWith('http') ? toUrl : 'https://' + toUrl;

  // Use the full fromUrl as urlFilter (same approach as Universal Adobe Debugger)
  // This matches the exact URL pattern for redirect
  const rule = {
    id: ADOBE_REDIRECT_RULE_ID,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: { url: normalizedTo }
    },
    condition: {
      urlFilter: fromUrl,
      resourceTypes: ['script']
    }
  };

  await chrome.declarativeNetRequest.updateSessionRules({
    addRules: [rule]
  });

  // Note: Config is already stored in chrome.storage.local by panel.js
  // Session rules are sufficient since they're restored on service worker start
}

// Clear the redirect rule
async function clearAdobeRedirectRule() {
  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [ADOBE_REDIRECT_RULE_ID]
    });
  } catch {
    // Rule might not exist, ignore
  }

  // Config cleanup is handled by panel.js in chrome.storage.local
}

// Get current redirect rule status
async function getAdobeRedirectRule() {
  const rules = await chrome.declarativeNetRequest.getSessionRules();
  const adobeRule = rules.find(r => r.id >= ADOBE_REDIRECT_RULE_ID);
  return adobeRule || null;
}

// ─── RESTORE REDIRECTS ON SERVICE WORKER START ────────────────────────────
// Restore redirect rules from storage when service worker starts
// This ensures redirects persist across browser restarts and extension reloads
async function restoreAdobeRedirectRules() {
  try {
    const stored = await chrome.storage.local.get('rt_adobe_env');
    if (!stored.rt_adobe_env) return;

    // Iterate through all saved hostname configurations
    const rules = [];
    let ruleId = ADOBE_REDIRECT_RULE_ID;
    
    for (const [hostname, config] of Object.entries(stored.rt_adobe_env)) {
      if (config.active && config.active !== 'prod' && config.urls?.[config.active] && config.originalUrl) {
        const toUrl = config.urls[config.active];
        const normalizedTo = toUrl.startsWith('//') ? 'https:' + toUrl :
                             toUrl.startsWith('http') ? toUrl : 'https://' + toUrl;
        
        rules.push({
          id: ruleId++,
          priority: 1,
          action: {
            type: 'redirect',
            redirect: { url: normalizedTo }
          },
          condition: {
            urlFilter: config.originalUrl,
            resourceTypes: ['script']
          }
        });
      }
    }

    if (rules.length > 0) {
      // Clear existing rules first
      const existingRules = await chrome.declarativeNetRequest.getSessionRules();
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: existingRules.map(r => r.id),
        addRules: rules
      });
    }
  } catch (err) {
    console.warn('Request Tracker: Failed to restore redirect rules', err);
  }
}

// Restore rules on service worker startup
restoreAdobeRedirectRules();

// Also restore on extension install/update
chrome.runtime.onInstalled.addListener(() => {
  restoreAdobeRedirectRules();
});
