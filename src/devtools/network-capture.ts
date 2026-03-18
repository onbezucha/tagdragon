// ─── NETWORK CAPTURE ─────────────────────────────────────────────────────────
// Listens to network requests and processes matching tracking calls.

import { matchProvider } from '@/providers/index';
import { getParams } from '@/providers/url-parser';
import { sendToPanel, heavyDataStore } from './panel-bridge';
import type { ParsedRequest } from '@/types/request';

interface HARPostData {
  text?: string;
  raw?: Array<{ bytes?: string }>;
  mimeType?: string;
}

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
    // Not JSON, return as plain string for URLSearchParams parsing
  }

  // URLencoded — return as plain string, getParams parses it via URLSearchParams
  return text;
}

/**
 * Convert headers array to object with lowercase keys.
 */
function headersToObj(
  headers: Array<{ name: string; value: string }> = []
): Record<string, string> {
  return headers.reduce((acc, { name, value }) => {
    acc[name.toLowerCase()] = value ?? '';
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Process a captured network request.
 */
function processRequest(req: chrome.devtools.network.Request): void {
  const url = req.request.url;
  const provider = matchProvider(url);
  if (!provider) return;

  const postRaw = req.request.postData;
  const postBody = parsePostBody(postRaw);
  const allParams = getParams(url, postRaw);
  const decoded = provider.parseParams(url, postRaw);

  req.getContent((responseBody: string | null) => {
    const id = Date.now() + Math.random();

    // Store heavy data locally (not sent to panel immediately)
    heavyDataStore.set(id, {
      responseBody: (responseBody || '').slice(0, 4000),
      requestHeaders: headersToObj(req.request.headers),
      responseHeaders: headersToObj(req.response.headers),
    });

    const parsedRequest: ParsedRequest = {
      id,
      provider: provider.name,
      color: provider.color,
      url,
      method: req.request.method as ParsedRequest['method'],
      status: req.response.status,
      timestamp: new Date().toISOString(),
      duration: Math.round(req.time),
      size:
        req.response.bodySize > 0
          ? req.response.bodySize
          : req.response.content?.size || 0,
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
  });
}

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

type RuntimeMessage = ExtensionRequestMessage | ClearHeavyDataMessage;

/**
 * Handle messages from the background script (extension requests).
 */
function handleRuntimeMessage(msg: RuntimeMessage): void {
  if (msg.type === 'EXT_REQUEST') {
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
}

/**
 * Initialize network capture listeners.
 */
export function initNetworkCapture(): void {
  chrome.devtools.network.onRequestFinished.addListener(processRequest);
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
}
