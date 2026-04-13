/**
 * HAR (HTTP Archive) POST data format.
 * Used by both devtools network capture and provider URL parser.
 */
export interface HARPostData {
  text?: string;
  raw?: Array<{ bytes?: string }>;
  mimeType?: string;
}

/** Alias used by provider decoders (subset of HARPostData without mimeType). */
export type HARPostBody = Pick<HARPostData, 'text' | 'raw'>;
