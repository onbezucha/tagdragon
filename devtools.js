// ─── PROVIDERS ──────────────────────────────────────────────────────────────
// Each provider defines: name, color, pattern (RegExp), and parseParams()
const PROVIDERS = [
  {
    name: "GA4",
    color: "#E8710A",
    pattern: /google-analytics\.com\/g\/collect|analytics\.google\.com\/g\/collect/,
    parseParams(url, postBody) {
      const p = getParams(url, postBody);
      return {
        "Event":        p.en,
        "Client ID":    p.cid,
        "Measurement ID": p.tid,
        "Page":         p["dl"] || p["dp"],
        "Page title":   p["dt"],
        "Session ID":   p["sid"],
        "Engagement":   p["_et"] ? `${p["_et"]}ms` : undefined,
      };
    }
  },
  {
    name: "GA (UA)",
    color: "#F9AB00",
    pattern: /google-analytics\.com\/collect|google-analytics\.com\/r\/collect|google-analytics\.com\/j\/collect/,
    parseParams(url, postBody) {
      const p = getParams(url, postBody);
      return {
        "Hit type":       p.t,
        "Tracking ID":    p.tid,
        "Client ID":      p.cid,
        "Page":           p.dp || p.dl,
        "Page title":     p.dt,
        "Event category": p.ec,
        "Event action":   p.ea,
        "Event label":    p.el,
      };
    }
  },
  {
    name: "GTM",
    color: "#4285F4",
    pattern: /googletagmanager\.com\/gtm\.js|googletagmanager\.com\/gtag\/js|googletagmanager\.com\/a\?/,
    parseParams(url) {
      const p = getParams(url);
      return {
        "Container ID": p.id,
        "URL":          url,
      };
    }
  },
  {
    name: "Meta Pixel",
    color: "#1877F2",
    pattern: /facebook\.com\/tr[/?]/,
    parseParams(url, postBody) {
      const p = getParams(url, postBody);
      return {
        "Event":       p.ev,
        "Pixel ID":    p.id,
        "FBP Cookie":  p.fbp,
        "Page URL":    p.dl ? decodeURIComponent(p.dl) : undefined,
        "Referrer":    p.rl ? decodeURIComponent(p.rl) : undefined,
        "Timestamp":   p.ts,
        "Screen":      p.sw && p.sh ? `${p.sw}x${p.sh}` : undefined,
        "Version":     p.v,
        "Event Count": p.ec,
        "Request Method": p.rqm,
      };
    }
  },
  {
    name: "Hotjar",
    color: "#FF3C00",
    pattern: /hotjar\.com\/(h\.js|hjboot|hj\.|api\/v)/,
    parseParams(url) {
      const p = getParams(url);
      return {
        "Site ID": p.hjid || p.siteId,
        "URL":     url,
      };
    }
  },
  {
    name: "Tealium",
    color: "#00B5AD",
    pattern: /tags\.tiqcdn\.com|collect\.tealiumiq\.com|datacloud\.tealiumiq\.com/,
    parseParams(url, postBody) {
      const p = getParams(url, postBody);
      return {
        "Account":  p.account,
        "Profile":  p.profile,
        "Event":    p.event,
        "URL":      url,
      };
    }
  },
  {
    name: "Adobe AA",
    color: "#FF0000",
    // Patterns:
    //   [company].sc.omtrdc.net/b/ss/[rsid]/...  — standard 3rd-party collection
    //   [company].2o7.net/b/ss/[rsid]/...         — legacy domain
    //   /b/ss/ anywhere                            — CNAME first-party (custom domain)
    //   demdex.net                                 — Audience Manager / ECID sync
    pattern: /\.sc\.omtrdc\.net|\.2o7\.net|\/b\/ss\/|\.demdex\.net/,
    parseParams(url, postBody) {
      const p = getParams(url, postBody);

       // Report suite is in path: /b/ss/{rsid}/{version}
       const rsid = extractPath(url, /\/b\/ss\/([^/?]+)/);

       // Hit type: pe=lnk_o (custom link), pe=lnk_d (download), pe=lnk_e (exit), otherwise pageview
       const hitType = p.pe
        ? ({ lnk_o: "Custom link", lnk_d: "Download link", lnk_e: "Exit link" }[p.pe] || p.pe)
        : "Page view";

       // Context data: keys starting with "c." in query string
       const contextData = {};
      Object.entries(p).forEach(([k, v]) => {
        if (k.startsWith("c.") && k !== "c.") contextData[k.slice(2)] = v;
      });

       // eVars: v1-v250, Props: c1-c75
       // Display only non-empty values
       const eVars = {};
      const props = {};
      for (let i = 1; i <= 250; i++) {
        if (p["v" + i]) eVars["eVar" + i] = p["v" + i];
      }
      for (let i = 1; i <= 75; i++) {
        if (p["c" + i] && !String(p["c" + i]).startsWith(".")) props["prop" + i] = p["c" + i];
      }

      return {
        "Hit type":       hitType,
        "Report suite":   rsid,
        "Page name":      p.pageName || p.gn,
        "Page URL":       p.g,
        "Referrer":       p.r,
        "Visitor ID":     p.mid || p.aid || p.fid,
        "Events":         p.events || p.ev,
        "Products":       p.products || p.pl,
        "Campaign":       p.v0,           // campaign variable = eVar0 internally
        "Channel":        p.ch,
        "Server":         p.server,
        "Link name":      p.pev2,
        "Link URL":       p.pev1,
        "Resolution":     p.s,
        "Color depth":    p.c,
        "JavaScript ver": p.j,
        "AppMeasurement": p.ndh === "1" ? "Yes" : undefined,
        ...eVars,
        ...props,
        ...(Object.keys(contextData).length ? { "Context data": JSON.stringify(contextData) } : {}),
      };
    }
   },
   {
     name: "AEP Web SDK",
     color: "#C70000",
     // Modern implementations use Web SDK (Alloy)
     // POST JSON to *.adobedc.net/ee/v2/interact or /collect
     // eVars and props are nested in: events[0].data.__adobe.analytics.eVarN / propN
     pattern: /\/ee\/[^/]+\/v\d+\/interact|\/ee\/[^/]+\/v\d+\/collect|\/ee\/v\d+\/interact|\/ee\/v\d+\/collect|\/ee\/collect|\.adobedc\.net/,
     parseParams(url, postRaw) {
       const urlParams = getParams(url, null);

       // Parse POST JSON payload
       let payload = {};
      try {
        const bodyStr = postRaw?.text ||
          (postRaw?.raw?.[0]?.bytes ? atob(postRaw.raw[0].bytes) : "");
        if (bodyStr) payload = JSON.parse(bodyStr);
      } catch {}

       const event0   = (payload.events || [])[0] || {};
       const xdm      = event0.xdm || {};
       const data     = event0.data || {};
       const aa       = data.__adobe?.analytics || {};  // <-- eVars and props are here
       const device   = xdm.device || {};
       const web      = xdm.web || {};
       const identity = xdm.identityMap || {};

       // All eVars: eVar1-eVar250 (key is "eVarN" or "evarN")
       const eVars = {};
      for (let i = 1; i <= 250; i++) {
        const v = aa["eVar" + i] || aa["evar" + i];
        if (v !== undefined && v !== null && v !== "") eVars["eVar" + i] = v;
      }

       // All props: prop1-prop75
       const props = {};
      for (let i = 1; i <= 75; i++) {
        const v = aa["prop" + i] || aa["Prop" + i];
        if (v !== undefined && v !== null && v !== "") props["prop" + i] = v;
      }

      // List variables: list1-list3
      const lists = {};
      for (let i = 1; i <= 3; i++) {
        const v = aa["list" + i];
        if (v) lists["list" + i] = v;
      }

       return {
         // Basic info
         "Datastream ID":  urlParams.configId || payload.meta?.configOverrides?.com_adobe_analytics?.reportSuites?.[0],
         "Request type":   payload.requestId ? "interact" : "collect",
         "Event type":     xdm.eventType,

         // Adobe Analytics specifics (from __adobe.analytics)
         "Page name":      aa.pageName,
         "Page URL":       aa.pageURL || web.webPageDetails?.URL,
         "Channel":        aa.channel,
         "Server":         aa.server,
         "Events":         aa.events,
         "Link name":      aa.linkName,
         "Link type":      aa.linkType,
         "Campaign":       aa.campaign,
         "Referrer":       aa.referrer || xdm.web?.webReferrer?.URL,

         // eVars and props
         ...eVars,
         ...props,
         ...lists,

         // XDM identity
         "ECID":           identity.ECID?.[0]?.id,

         // Device
         "Screen":         device.screenWidth && device.screenHeight
                             ? device.screenWidth + "x" + device.screenHeight : undefined,
         "Screen orient":  device.screenOrientation,
       };
    }
  },
  {
    name: "LinkedIn",
    color: "#0A66C2",
    pattern: /linkedin\.com\/li\/track|snap\.licdn\.com/,
    parseParams(url, postBody) {
      const p = getParams(url, postBody);
      return {
        "Partner ID": p.pid,
        "Conversion": p.conversionId,
        "URL":        url,
      };
    }
  },
  {
    name: "Sklik",
    color: "#CC0000",
    pattern: /c\.seznam\.cz\/retargeting/,
    parseParams(url, postBody) {
      const p = getParams(url, postBody);
      
      // Determine request type based on URL path
      const isRetargeting = url.includes('/retargeting');
      
      // Parse ids JSON parameter if present
      let idsData = {};
      if (p.ids) {
        try {
          idsData = JSON.parse(p.ids);
        } catch {}
      }
      
      return {
        "Type":       isRetargeting ? "Retargeting" : "Hit",
        "ID":         p.id,
        "Consent":    p.consent === "1" ? "Yes" : p.consent === "0" ? "No" : p.consent,
        "UDID":       idsData.udid,
        "SID":        idsData.sid,
        "IDs Version": idsData._version,
        "Page URL":   p.url ? decodeURIComponent(p.url) : undefined,
        "Value":      p.value,
        "URL":        url,
      };
    }
  },
  {
    name: "Bing Ads",
    color: "#008373",
    pattern: /bat\.bing\.com\/action\/0/,
    parseParams(url, postBody) {
      const p = getParams(url, postBody);
      return {
        "Tag ID": p.ti,
        "Event":  p.evt,
        "URL":    p.p,
      };
    }
  },
  {
    name: "Google Ads",
    color: "#4285F4",
    // Google Ads conversion tracking via doubleclick
    pattern: /googleads\.g\.doubleclick\.net\/pagead\/(viewthroughconversion|conversion)/,
    parseParams(url, postBody) {
      const p = getParams(url, postBody);
      
      // Extract conversion ID from URL path
      const conversionIdMatch = url.match(/\/(viewthroughconversion|conversion)\/(\d+)/);
      const conversionId = conversionIdMatch?.[2];
      const conversionType = conversionIdMatch?.[1] === 'viewthroughconversion' ? 'View-through' : 'Click-through';
      
      // Decode event from data parameter
      let eventName = p.en;
      if (p.data) {
        const dataMatch = p.data.match(/event=([^&]+)/);
        if (dataMatch) eventName = dataMatch[1];
      }
      
      return {
        "Conversion ID":    conversionId,
        "Conversion Label": p.label,
        "Conversion Type":  conversionType,
        "Event":            eventName,
        "Page Title":       p.tiba ? decodeURIComponent(p.tiba) : undefined,
        "Page URL":         p.url ? decodeURIComponent(p.url) : undefined,
        "Referrer":         p.ref ? decodeURIComponent(p.ref) : undefined,
        "GTM Container":    p.gtm,
        "Random":           p.random,
        "URL":              url,
      };
    }
  },
  {
    name: "DV360",
    color: "#7B2D8B",
    // Display & Video 360 (excludes Google Ads conversion URLs)
    pattern: /doubleclick\.net(?!.*\/pagead\/(viewthroughconversion|conversion))|ad\.doubleclick\.net/,
    parseParams(url) {
      return { "URL": url };
    }
  },
  {
    name: "AdForm",
    color: "#6D4C9F",
    pattern: /track\.adform\.net\/Serving\/TrackPoint|adform\.net\/Banners/,
    parseParams(url, postBody) {
      const p = getParams(url, postBody);
      
      // Parse ADFPageName
      let pageName = p.ADFPageName;
      if (pageName) {
        pageName = decodeURIComponent(pageName);
      }
      
      // Parse Set1 parameter (format: lang|locale|resolution|unknown)
      let set1Data = {};
      if (p.Set1) {
        const parts = decodeURIComponent(p.Set1).split('|');
        set1Data = {
          language: parts[0],
          locale: parts[1],
          resolution: parts[2],
        };
      }
      
      return {
        "Page Name":   pageName,
        "Tracking ID": p.pm,
        "Page URL":    p.loc ? decodeURIComponent(p.loc) : undefined,
        "Referrer":    p.CPref ? decodeURIComponent(p.CPref) : undefined,
        "Language":    set1Data.language,
        "Resolution":  set1Data.resolution,
        "Order ID":    p.ord,
        "Mode":        p.ADFtpmode,
      };
    }
  },
  {
    name: "Criteo",
    color: "#F5821F",
    pattern: /dis\.criteo\.com|sslwidget\.criteo\.com|static\.criteo\.net/,
    parseParams(url, postBody) {
      const p = getParams(url, postBody);
      return {
        "Account": p.a,
        "Event":   p.e,
        "URL":     url,
      };
    }
  },
  {
    name: "Scorecard",
    color: "#009B77",
    pattern: /scorecardresearch\.com\/p\?/,
    parseParams(url) {
      const p = getParams(url);
      return {
        "Publisher":  p.c1,
        "Site":       p.c2,
        "Segment":    p.c4,
        "URL":        p["rn"],
      };
    }
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

// Convert any postBody format to plain string for further parsing
function postBodyToString(postBody) {
  if (!postBody) return "";
  if (typeof postBody === "string") return postBody;
  // Came as an object from parsePostBody — convert back to URLencoded string
  // so getParams can read parameters correctly
  if (typeof postBody === "object" && !(postBody.text || postBody.raw)) {
    return Object.entries(postBody)
      .map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v))
      .join("&");
  }
  // HAR format: {text: "...", mimeType: "..."}
  if (postBody.text) return postBody.text;
  // HAR raw bytes
  if (postBody.raw && postBody.raw[0]?.bytes) {
    try { return atob(postBody.raw[0].bytes); } catch {}
  }
  return "";
}

// Parse URL query string + POST body into one merged object
// Adobe Analytics sends parameters either in URL (GET) or as urlencoded POST body
// Both variants must be merged — POST body takes precedence over URL
function getParams(url, postBody) {
  const params = {};

  // 1. First URL query string
  try {
    new URL(url).searchParams.forEach((v, k) => { params[k] = v; });
  } catch {}

  // 2. POST body — overwrites any duplicates from URL
  const bodyStr = postBodyToString(postBody);
  if (bodyStr) {
    // Try JSON (Web SDK, some modern implementations)
    try {
      const json = JSON.parse(bodyStr);
      if (json && typeof json === "object") {
        Object.assign(params, json);
        return params;
      }
    } catch {}
    // URLencoded (AppMeasurement, classic AA implementations)
    // v1=value&v2=other&pageName=Home&events=purchase
    try {
      new URLSearchParams(bodyStr).forEach((v, k) => { params[k] = v; });
    } catch {}
  }

  return params;
}

function extractPath(url, regex) {
  const m = url.match(regex);
  return m ? m[1] : undefined;
}

function matchProvider(url) {
  return PROVIDERS.find(p => p.pattern.test(url)) || null;
}

// Parse raw HAR postData object — returns string, object or null
function parsePostBody(postData) {
  if (!postData) return null;
  const text = postData.text ||
    (postData.raw && postData.raw[0]?.bytes ? (() => {
      try { return atob(postData.raw[0].bytes); } catch { return null; }
    })() : null);
  if (!text) return null;
  // JSON
  try { return JSON.parse(text); } catch {}
  // URLencoded — return as plain string, getParams parses it via URLSearchParams
  return text;
}

// ─── PANEL COMMUNICATION ─────────────────────────────────────────────────────
let panelWindow = null;
let buffer = [];
let heavyDataStore = new Map(); // id → { responseBody, requestHeaders, responseHeaders }

function sendToPanel(data) {
  if (panelWindow && !panelWindow.closed) {
    try { panelWindow.receiveRequest(data); return; } catch {}
  }
  buffer.push(data);
}

// Heavy data retrieval function - called by panel when user opens a tab
function getHeavyData(requestId) {
  return heavyDataStore.get(requestId) || null;
}

// ─── DEVTOOLS PANEL ──────────────────────────────────────────────────────────
chrome.devtools.panels.create(
  "Request Tracker",
  null,
  "public/panel.html",
  (panel) => {
    panel.onShown.addListener((win) => {
      panelWindow = win;
      win._getHeavyData = getHeavyData;
      win._clearHeavyData = () => heavyDataStore.clear();
      buffer.forEach(d => { try { win.receiveRequest(d); } catch {} });
      buffer = [];
    });
    panel.onHidden.addListener(() => { /* keep ref */ });
  }
);

// ─── NETWORK CAPTURE ─────────────────────────────────────────────────────────
chrome.devtools.network.onRequestFinished.addListener((req) => {
  const url = req.request.url;
  const provider = matchProvider(url);
  if (!provider) return;

  const postRaw = req.request.postData;
  const postBody = parsePostBody(postRaw);
  const allParams = getParams(url, postRaw);
  const decoded = provider.parseParams(url, postRaw);

  req.getContent((responseBody) => {
    const id = Date.now() + Math.random();
    
    // Store heavy data locally (not sent to panel immediately)
    heavyDataStore.set(id, {
      responseBody: (responseBody || "").slice(0, 4000),
      requestHeaders: headersToObj(req.request.headers),
      responseHeaders: headersToObj(req.response.headers),
    });
    
    sendToPanel({
      id,
      provider:     provider.name,
      color:        provider.color,
      url,
      method:       req.request.method,
      status:       req.response.status,
      timestamp:    new Date().toISOString(),
      duration:     Math.round(req.time),
      size:         req.response.bodySize > 0 ? req.response.bodySize : 
                    (req.response.content?.size || 0),
      allParams,
      decoded,
      postBody,
      // Send flags instead of full data
      responseBody: null,
      requestHeaders: null,
      responseHeaders: null,
      _hasResponseBody: !!(responseBody),
      _hasRequestHeaders: req.request.headers?.length > 0,
      _hasResponseHeaders: req.response.headers?.length > 0,
    });
  });
});

function headersToObj(headers = []) {
  return headers.reduce((acc, { name, value }) => {
    acc[name.toLowerCase()] = value;
    return acc;
  }, {});
}

// ─── EXTENSION REQUEST CAPTURE (via background) ──────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "EXT_REQUEST") {
    const provider = matchProvider(msg.data.url);
    if (!provider) return;
    const allParams = getParams(msg.data.url, null);
    const decoded = provider.parseParams(msg.data.url, null);
    sendToPanel({ ...msg.data, provider: provider.name, color: provider.color, decoded, allParams, source: "extension" });
  }
  if (msg.type === "CLEAR_HEAVY_DATA") {
    heavyDataStore.clear();
  }
});
