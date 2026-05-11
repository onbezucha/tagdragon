// ─── NETWORK CAPTURE ─────────────────────────────────────────────────────────
// Listens to network requests and processes matching tracking calls.

import { matchProvider } from '@/providers/index';
import { getParams } from '@/providers/url-parser';
import { headersToObj } from '@/shared/http-utils';
import { sendToPanel, heavyDataStore, getPanelWindow, clearHeavyData } from './panel-bridge';
import type { ParsedRequest } from '@/types/request';
import type { TabPopupStats } from '@/types/popup';
import type { HARPostData } from '@/types/har';
import { generateId } from '@/shared/id-gen';

// ─── BATCHED POPUP STATS ──────────────────────────────────────────────────
// Batches popup stats updates to reduce IPC overhead. Instead of sending one
// message per request, collects updates and sends them in a batch every 200ms.

let _statsQueue: Array<{
  provider: string;
  color: string;
  size: number;
  status: number;
  duration: number;
}> = [];
let _statsTimer: ReturnType<typeof setTimeout> | null = null;
const STATS_BATCH_INTERVAL_MS = 200;

function flushStatsBatch(): void {
  if (_statsQueue.length === 0) return;
  const batch = _statsQueue;
  _statsQueue = [];
  _statsTimer = null;
  chrome.runtime
    .sendMessage({
      type: 'UPDATE_POPUP_STATS_BATCH',
      tabId,
      updates: batch,
    })
    .catch(() => {
      // Background may not be ready, ignore
    });
}

function queueStatsUpdate(
  provider: string,
  color: string,
  size: number,
  status: number,
  duration: number
): void {
  _statsQueue.push({ provider, color, size, status, duration });
  if (!_statsTimer) {
    _statsTimer = setTimeout(flushStatsBatch, STATS_BATCH_INTERVAL_MS);
  }
}

// ─── PAGE NAVIGATION TRACKING ──────────────────────────────────────────────────

let _currentPageUrl: string | null = null;
let _currentPageNavId: string | null = null;

// Initialize current page URL and navId on load
chrome.devtools.inspectedWindow.eval('document.URL', (result: unknown) => {
  if (typeof result === 'string') {
    _currentPageUrl = result;
    _currentPageNavId = String(generateId());
  }
});

/**
 * Update current page URL and generate a new navigation ID.
 * Called from index.ts on navigation. Returns the navId so the caller
 * can construct the PageNavigation object with the same ID.
 */
export function setCurrentPageUrl(url: string): string {
  _currentPageUrl = url;
  _currentPageNavId = String(generateId());
  return _currentPageNavId;
}

// ─── PAUSE STATE ──────────────────────────────────────────────────────────────
// Local pause flag, kept in sync with background via RECORDING_PAUSED/RESUMED messages.

const tabId = chrome.devtools.inspectedWindow.tabId;
let isPaused = false;

// Maximum length for stored response body content
const MAX_RESPONSE_BODY_LENGTH = 4000;

// Load initial pause state from session storage (in case popup was paused before DevTools opened)
chrome.storage.session
  .get('popup_stats')
  .then((result) => {
    const allStats = (result['popup_stats'] ?? {}) as Record<number, TabPopupStats>;
    if (allStats[tabId]?.isPaused === true) {
      isPaused = true;
    }
  })
  .catch(() => {});

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Parse raw HAR postData object — returns string, object or null.
 */
export function parsePostBody(postData: unknown): unknown {
  if (!postData) return null;

  const har = postData as HARPostData;
  const text =
    har.text ||
    (har.raw && har.raw[0]?.bytes
      ? (() => {
          try {
            return atob(har.raw[0].bytes);
          } catch {
            return null;
          }
        })()
      : null);

  if (!text) return null;

  // Try JSON first
  try {
    return JSON.parse(text);
  } catch {
    // Not JSON — return as plain string for URLSearchParams parsing
    return text;
  }
}

/**
 * Extract and remove provider-side _eventName from decoded params.
 * Returns the extracted event name (or undefined) and mutates decoded to remove the key.
 */
function extractAndRemoveProviderEventName(
  decoded: Record<string, string | undefined>
): string | undefined {
  const eventName = decoded._eventName;
  delete decoded._eventName;
  return eventName;
}

// ─── REQUEST PROCESSING ───────────────────────────────────────────────────────

/**
 * Process a captured network request.
 */
function processRequest(req: chrome.devtools.network.Request): void {
  if (isPaused) return;

  const url = req.request.url;
  const provider = matchProvider(url);
  if (!provider) return;

  const postRaw = req.request.postData;
  const postBody = parsePostBody(postRaw);
  const allParams = getParams(url, postRaw);
  const decoded = provider.parseParams(url, postRaw);
  // Extract provider-side _eventName before building parsedRequest
  const providerEventName = extractAndRemoveProviderEventName(
    decoded as Record<string, string | undefined>
  );

  req.getContent((responseBody: string | null) => {
    const id = generateId();
    const timestamp = new Date(Math.floor(id / 1000)).toISOString();

    // Store heavy data locally (not sent to panel immediately)
    heavyDataStore.set(id, {
      responseBody: (responseBody || '').slice(0, MAX_RESPONSE_BODY_LENGTH),
      requestHeaders: headersToObj(req.request.headers),
      responseHeaders: headersToObj(req.response.headers),
    });

    const size =
      req.response.bodySize > 0 ? req.response.bodySize : req.response.content?.size || 0;

    const parsedRequest: ParsedRequest = {
      id,
      provider: provider.name,
      color: provider.color,
      url,
      method: req.request.method as ParsedRequest['method'],
      status: req.response.status,
      timestamp,
      duration: Math.round(req.time * 1000),
      size,
      allParams,
      decoded,
      postBody,
      // Send flags instead of full data
      responseBody: null,
      requestHeaders: null,
      responseHeaders: null,
      _hasResponseBody: !!responseBody,
      _hasRequestHeaders: (req.request.headers?.length || 0) > 0,
      _hasResponseHeaders: (req.response.headers?.length || 0) > 0,
      _eventName: providerEventName,
      _ts: Math.floor(id / 1000),
      _pageUrl: _currentPageUrl ?? undefined,
      _pageNavId: _currentPageNavId ?? undefined,
    };

    sendToPanel(parsedRequest);

    // Batch popup stats update to reduce IPC overhead
    queueStatsUpdate(
      provider.name,
      provider.color,
      size,
      req.response.status,
      Math.round(req.time * 1000)
    );
  });
}

// ─── RUNTIME MESSAGES ────────────────────────────────────────────────────────

/**
 * Message from background script or panel.
 */
interface ExtensionRequestMessage {
  type: 'EXT_REQUEST';
  data: ParsedRequest;
}

interface ClearHeavyDataMessage {
  type: 'CLEAR_HEAVY_DATA';
}

interface RecordingPausedMessage {
  type: 'RECORDING_PAUSED';
  tabId?: number;
}

interface RecordingResumedMessage {
  type: 'RECORDING_RESUMED';
  tabId?: number;
}

type RuntimeMessage =
  | ExtensionRequestMessage
  | ClearHeavyDataMessage
  | RecordingPausedMessage
  | RecordingResumedMessage;

/**
 * Handle messages from the background script (extension requests, pause state).
 */
function handleRuntimeMessage(msg: RuntimeMessage): void {
  if (msg.type === 'EXT_REQUEST') {
    if (isPaused) return;
    const provider = matchProvider(msg.data.url);
    if (!provider) return;
    const allParams = getParams(msg.data.url, null);
    const decoded = provider.parseParams(msg.data.url, null);
    const providerEventName = extractAndRemoveProviderEventName(
      decoded as Record<string, string | undefined>
    );

    sendToPanel({
      ...msg.data,
      provider: provider.name,
      color: provider.color,
      decoded,
      allParams,
      _eventName: providerEventName,
      source: 'extension',
    } as ParsedRequest);
  }

  if (msg.type === 'CLEAR_HEAVY_DATA') {
    clearHeavyData();
  }

  // Keep local pause flag in sync; also notify the panel window if visible
  if (msg.type === 'RECORDING_PAUSED') {
    isPaused = true;
    getPanelWindow()?._setPaused?.(true);
  }

  if (msg.type === 'RECORDING_RESUMED') {
    isPaused = false;
    getPanelWindow()?._setPaused?.(false);
  }
}

/**
 * Initialize network capture listeners.
 */
export function initNetworkCapture(): void {
  chrome.devtools.network.onRequestFinished.addListener(processRequest);
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
}
