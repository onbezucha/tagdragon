// ─── NETWORK CAPTURE ─────────────────────────────────────────────────────────
// Listens to network requests and processes matching tracking calls.

import { matchProvider } from '@/providers/index';
import { getParams } from '@/providers/url-parser';
import { headersToObj } from '@/shared/http-utils';
import { sendToPanel, heavyDataStore, getPanelWindow } from './panel-bridge';
import type { ParsedRequest } from '@/types/request';
import { generateId } from '@/shared/id-gen';

interface HARPostData {
  text?: string;
  raw?: Array<{ bytes?: string }>;
  mimeType?: string;
}

// ─── PAUSE STATE ──────────────────────────────────────────────────────────────
// Local pause flag, kept in sync with background via RECORDING_PAUSED/RESUMED messages.

const tabId = chrome.devtools.inspectedWindow.tabId;
let isPaused = false;

// Load initial pause state from session storage (in case popup was paused before DevTools opened)
chrome.storage.session.get('popup_stats').then((result) => {
  const allStats = result['popup_stats'] ?? {};
  if (allStats[tabId]?.isPaused === true) {
    isPaused = true;
  }
}).catch(() => {});

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Parse raw HAR postData object — returns string, object or null.
 */
function parsePostBody(postData: unknown): unknown {
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

  req.getContent((responseBody: string | null) => {
    const id = generateId();

    // Store heavy data locally (not sent to panel immediately)
    heavyDataStore.set(id, {
      responseBody: (responseBody || '').slice(0, 4000),
      requestHeaders: headersToObj(req.request.headers),
      responseHeaders: headersToObj(req.response.headers),
    });

    const size =
      req.response.bodySize > 0
        ? req.response.bodySize
        : req.response.content?.size || 0;

    const parsedRequest: ParsedRequest = {
      id,
      provider: provider.name,
      color: provider.color,
      url,
      method: req.request.method as ParsedRequest['method'],
      status: req.response.status,
      timestamp: new Date().toISOString(),
      duration: Math.round(req.time),
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
    };

    sendToPanel(parsedRequest);

    // Notify background to update popup stats and badge.
    // Fix: stats aggregation and badge update happen in background context
    // (only background can call chrome.action.setBadgeText).
    chrome.runtime.sendMessage({
      type: 'UPDATE_POPUP_STATS',
      tabId,
      provider: provider.name,
      color: provider.color,
      size,
      status: req.response.status,
      duration: Math.round(req.time),
    }).catch(() => {
      // Background may not be ready, ignore
    });
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
  tabId: number;
}

interface RecordingResumedMessage {
  type: 'RECORDING_RESUMED';
  tabId: number;
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

    sendToPanel({
      ...msg.data,
      provider: provider.name,
      color: provider.color,
      decoded,
      allParams,
      source: 'extension',
    } as ParsedRequest);
  }

  if (msg.type === 'CLEAR_HEAVY_DATA') {
    heavyDataStore.clear();
  }

  // Keep local pause flag in sync; also notify the panel window if visible
  if (msg.type === 'RECORDING_PAUSED' && msg.tabId === tabId) {
    isPaused = true;
    getPanelWindow()?._setPaused?.(true);
  }

  if (msg.type === 'RECORDING_RESUMED' && msg.tabId === tabId) {
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
