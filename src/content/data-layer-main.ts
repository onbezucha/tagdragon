// ─── DATA LAYER MAIN WORLD SCRIPT ────────────────────────────────────────────
// Runs in MAIN world (page context). Intercepts data layer pushes and sends
// them to the ISOLATED world bridge via window.postMessage.

import { SOURCE_DESCRIPTIONS } from '@/shared/datalayer-constants';

(function () {
  // ─── GUARD: prevent double execution when injected more than once ─────────
  const win = window as Record<string, unknown>;
  if (win['__tagdragon_main__']) return;
  win['__tagdragon_main__'] = true;

  // ─── HELPERS ─────────────────────────────────────────────────────────────

  // Strip non-cloneable values (functions, DOM nodes, symbols, circular refs)
  // before passing to postMessage's structured clone algorithm.
  function sanitize(val: unknown, depth = 0, seen?: WeakSet<object>): unknown {
    if (depth > 15) return '[max depth]';
    if (val === null || val === undefined) return val;
    if (typeof val === 'function') return '[function]';
    if (typeof val === 'symbol') return String(val);
    if (typeof val === 'bigint') return String(val);
    if (typeof val !== 'object') return val;

    const refs = seen ?? new WeakSet<object>();
    if (refs.has(val as object)) return '[circular]';
    refs.add(val as object);

    if (Array.isArray(val)) {
      return val.map((v) => sanitize(v, depth + 1, refs));
    }

    // Skip DOM nodes
    if (typeof Element !== 'undefined' && val instanceof Element) return '[Element]';
    if (typeof Node !== 'undefined' && val instanceof Node) return '[Node]';

    const result: Record<string, unknown> = {};
    for (const key of Object.keys(val as object)) {
      try {
        result[key] = sanitize((val as Record<string, unknown>)[key], depth + 1, refs);
      } catch {
        result[key] = '[error]';
      }
    }
    return result;
  }

  function sendPush(
    source: string,
    pushIndex: number,
    timestamp: string,
    data: unknown,
    isReplay?: boolean,
  ): void {
    try {
      window.postMessage({
        type: 'TAGDRAGON_DL_PUSH',
        source,
        pushIndex,
        timestamp,
        data: sanitize(data),
        isReplay: isReplay === true,
      }, '*');
    } catch {
      // Fallback: send with empty data so the push is still visible
      window.postMessage({
        type: 'TAGDRAGON_DL_PUSH',
        source,
        pushIndex,
        timestamp,
        data: { _error: 'Data could not be serialized' },
        isReplay: isReplay === true,
      }, '*');
    }
  }

  // ─── GTM / window.dataLayer ──────────────────────────────────────────────

  function replayDataLayer(dataLayer: unknown[]): void {
    const navStart = window.performance?.timing?.navigationStart ?? Date.now();
    for (let i = 0; i < dataLayer.length; i++) {
      const item = dataLayer[i] as Record<string, unknown>;
      const ts = item?.['gtm.start']
        ? new Date(navStart + (item['gtm.start'] as number)).toISOString()
        : new Date(navStart).toISOString();
      sendPush('gtm', i, ts, item, true);
    }
  }

  function interceptDataLayer(dataLayer: unknown[]): void {
    // Replay all existing items
    replayDataLayer(dataLayer);

    // Monkey-patch .push on the specific instance (NOT Array.prototype)
    const originalPush = dataLayer.push.bind(dataLayer);
    dataLayer.push = function (...args: unknown[]) {
      args.forEach((arg) => {
        sendPush('gtm', dataLayer.length, new Date().toISOString(), arg, false);
      });
      return originalPush(...args);
    };
  }

  // ─── SOURCE REPORTING ────────────────────────────────────────────────────
  // Post detected sources to bridge via postMessage.
  // ISOLATED world cannot see MAIN world variables (e.g. window.digitalData),
  // so source detection must happen here and be forwarded via postMessage.

  function postDetectedSources(): void {
    const sources: string[] = [];
    if (detected.gtm) sources.push('gtm');
    if (detected.tealium) sources.push('tealium');
    if (detected.adobe) sources.push('adobe');
    if (detected.segment) sources.push('segment');
    if (detected.digitalData) sources.push('digitalData');
    if (!sources.length) return;
    window.postMessage({
      type: 'TAGDRAGON_DL_SOURCES',
      sources,
      labels: SOURCE_DESCRIPTIONS,
    }, '*');
  }

  // Listen for replay requests from the ISOLATED world bridge
  // (sent when DevTools panel opens after the page already loaded)
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window) return;
    if (!event.data) return;

    if (event.data.type === 'TAGDRAGON_BRIDGE_READY') {
      // Fresh bridge is ready — re-detect and replay everything.
      // This handles the extension reload race: bridge posts READY after its listeners
      // are set up, so by the time MAIN world responds, the bridge is guaranteed ready.
      detectAndIntercept();
      // GTM: replay the entire dataLayer array (detectAndIntercept only replays
      // via interceptDataLayer, which also patches .push — we replay here to
      // ensure all items are sent even if the array was already intercepted).
      const dl = win['dataLayer'];
      if (Array.isArray(dl)) replayDataLayer(dl);
      postDetectedSources();
      return;
    }

    if (event.data.type === 'TAGDRAGON_DL_REPLAY_REQUEST') {
      const dl = win['dataLayer'];
      if (Array.isArray(dl)) replayDataLayer(dl);
      // digitalData: send snapshot if detected
      if (detected.digitalData || (win['digitalData'] && typeof win['digitalData'] === 'object')) {
        sendDigitalDataSnapshot(true);
      }
    }
  });

  // ─── TEALIUM / window.utag.data ──────────────────────────────────────────

  function interceptTealium(): void {
    const utag = (window as Record<string, unknown>)['utag'] as Record<string, unknown> | undefined;
    if (!utag || typeof utag !== 'object') return;

    const utagData = utag['data'];
    if (!utagData || typeof utagData !== 'object') return;

    // Initial snapshot
    sendPush('tealium', 0, new Date().toISOString(), utagData as Record<string, unknown>, true);

    // Wrap utag.link / utag.view if they exist
    let tealiumIdx = 1;
    for (const fn of ['link', 'view'] as const) {
      const orig = utag[fn];
      if (typeof orig === 'function') {
        utag[fn] = function (...args: unknown[]) {
          sendPush('tealium', tealiumIdx++, new Date().toISOString(), args[0] ?? {}, false);
          return (orig as (...a: unknown[]) => unknown)(...args);
        };
      }
    }
  }

  // ─── ADOBE (_satellite / adobeDataLayer) ─────────────────────────────────

  function interceptAdobe(): void {
    const win = window as Record<string, unknown>;
    let adobeIdx = 0;

    // Adobe Client Data Layer (ACDL)
    const acdl = win['adobeDataLayer'] as unknown[] | undefined;
    if (Array.isArray(acdl)) {
      for (let i = 0; i < acdl.length; i++) {
        sendPush('adobe', adobeIdx++, new Date().toISOString(), acdl[i], true);
      }
      const origPush = acdl.push.bind(acdl);
      acdl.push = function (...args: unknown[]) {
        args.forEach((arg) => {
          sendPush('adobe', adobeIdx++, new Date().toISOString(), arg, false);
        });
        return origPush(...args);
      };
    }

    // Adobe Launch _satellite.track
    const satellite = win['_satellite'] as Record<string, unknown> | undefined;
    if (satellite && typeof satellite === 'object') {
      const origTrack = satellite['track'];
      if (typeof origTrack === 'function') {
        satellite['track'] = function (...args: unknown[]) {
          sendPush('adobe', adobeIdx++, new Date().toISOString(), { _type: 'track', rule: args[0], info: args[1] }, false);
          return (origTrack as (...a: unknown[]) => unknown)(...args);
        };
      }
    }
  }

  // ─── SEGMENT / window.analytics ──────────────────────────────────────────

  function interceptSegment(): void {
    const analytics = (window as Record<string, unknown>)['analytics'] as Record<string, unknown> | undefined;
    if (!analytics || typeof analytics !== 'object') return;

    let segIdx = 0;
    for (const method of ['track', 'page', 'identify', 'group'] as const) {
      const orig = analytics[method];
      if (typeof orig === 'function') {
        analytics[method] = function (...args: unknown[]) {
          sendPush('segment', segIdx++, new Date().toISOString(), { _method: method, name: args[0], properties: args[1] }, false);
          return (orig as (...a: unknown[]) => unknown)(...args);
        };
      }
    }
  }

  // ─── W3C DIGITAL DATA ────────────────────────────────────────────────────
  // digitalData is a plain mutable object — no native push mechanism.
  // Strategy:
  //   1. Send a snapshot of the current state as push #0 (isReplay: true)
  //   2. Wrap window.digitalData with a Proxy that fires on every property set
  //   3. Debounce rapid mutations (e.g. SPA route changes) into single pushes

  let ddPushIndex = 0;
  let ddDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let ddProxy: object | null = null;

  function sendDigitalDataSnapshot(isReplay = false): void {
    const raw = win['digitalData'];
    if (!raw || typeof raw !== 'object') return;
    sendPush('digitalData', ddPushIndex++, new Date().toISOString(), raw as Record<string, unknown>, isReplay);
  }

  function makeDigitalDataProxy(target: Record<string, unknown>): object {
    return new Proxy(target, {
      set(obj, prop, value) {
        obj[prop as string] = value;
        // Debounce — SPA frameworks may set many keys in one tick
        if (ddDebounceTimer !== null) clearTimeout(ddDebounceTimer);
        ddDebounceTimer = setTimeout(() => {
          ddDebounceTimer = null;
          sendDigitalDataSnapshot(false);
        }, 50);
        return true;
      },
    });
  }

  function interceptDigitalData(): void {
    const raw = win['digitalData'];
    if (!raw || typeof raw !== 'object') return;

    // Send initial snapshot
    sendDigitalDataSnapshot(true);

    // Install Proxy to catch future mutations
    try {
      ddProxy = makeDigitalDataProxy(raw as Record<string, unknown>);
      Object.defineProperty(window, 'digitalData', {
        get() { return ddProxy; },
        set(newVal) {
          // Page replaced the whole object (SPA hard navigation)
          ddProxy = makeDigitalDataProxy(newVal as Record<string, unknown>);
          sendDigitalDataSnapshot(false);
        },
        configurable: true,
      });
    } catch {
      // Object.defineProperty failed (non-configurable) — snapshot only
    }
  }

  // ─── DETECTION WITH RETRY ────────────────────────────────────────────────

  const detected = {
    gtm: false,
    tealium: false,
    adobe: false,
    segment: false,
    digitalData: false,
  };

  function detectAndIntercept(): void {
    try {
      if (!detected.gtm) {
        const dl = win['dataLayer'];
        if (Array.isArray(dl)) {
          detected.gtm = true;
          interceptDataLayer(dl as unknown[]);
        }
      }
    } catch { /* skip */ }

    try {
      if (!detected.tealium) {
        const utag = win['utag'];
        if (utag && typeof utag === 'object' && (utag as Record<string, unknown>)['data']) {
          detected.tealium = true;
          interceptTealium();
        }
      }
    } catch { /* skip */ }

    try {
      if (!detected.adobe) {
        if (win['_satellite'] || win['adobeDataLayer']) {
          detected.adobe = true;
          interceptAdobe();
        }
      }
    } catch { /* skip */ }

    try {
      if (!detected.segment) {
        const analytics = win['analytics'];
        if (analytics && typeof analytics === 'object' && typeof (analytics as Record<string, unknown>)['track'] === 'function') {
          detected.segment = true;
          interceptSegment();
        }
      }
    } catch { /* skip */ }

    try {
      if (!detected.digitalData) {
        if (win['digitalData'] && typeof win['digitalData'] === 'object') {
          detected.digitalData = true;
          interceptDigitalData();
        }
      }
    } catch { /* skip */ }
  }

  // Initial detection
  detectAndIntercept();
  postDetectedSources();

  // Retry for late-initialized globals
  let retries = 0;
  const retryInterval = setInterval(() => {
    detectAndIntercept();
    retries++;
    if (retries >= 20) clearInterval(retryInterval); // Stop after 10s (20 × 500ms)
  }, 500);

  // Also detect on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => detectAndIntercept(), { once: true });
  }
})();
