// ─── BACKGROUND SERVICE WORKER ──────────────────────────────────────────────
// Captures requests initiated by other Chrome Extensions
// (these are not visible via chrome.devtools.network)

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
