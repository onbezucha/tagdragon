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
