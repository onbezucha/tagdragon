export interface ParsedRequest {
  readonly id: number;
  readonly provider: string;
  readonly color: string;
  readonly url: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
  readonly status: number;
  readonly timestamp: string;
  readonly duration: number;
  readonly size: number;
  readonly allParams: Record<string, string>;
  readonly decoded: Record<string, string | undefined>;
  readonly postBody: unknown;
  
  // Lazy-loaded fields
  responseBody?: string | null;
  requestHeaders?: Record<string, string> | null;
  responseHeaders?: Record<string, string> | null;
  
  // Internal flags
  readonly _hasResponseBody?: boolean;
  readonly _hasRequestHeaders?: boolean;
  readonly _hasResponseHeaders?: boolean;
  _eventName?: string;
  
  // Computed/indexed fields (populated by categorize.indexRequest)
  _searchIndex?: string;
  _hasUserId?: boolean;
  _statusPrefix?: string | null;
  
  // Optional metadata
  readonly source?: 'extension';
}

export type HttpMethod = ParsedRequest['method'];

export type TabName = 'decoded' | 'query' | 'post' | 'headers' | 'response';

export interface UIState {
  selectedId: string | null;
  isPaused: boolean;
  activeTab: TabName;
}

export interface FilterState {
  text: string;
  eventType: string;
  userId: string;
  status: string;
  method: '' | 'GET' | 'POST';
  hasParam: string;
}

export interface RequestState {
  all: ParsedRequest[];
  map: Map<string, ParsedRequest>;
  filteredIds: Set<string>;
}

export interface StatsState {
  visibleCount: number;
  totalSize: number;
  totalDuration: number;
}

export interface AppConfig {
  maxRequests: number;
  autoPrune: boolean;
  pruneRatio: number;
}

export interface PendingRequest {
  data: ParsedRequest;
  isVisible: boolean;
}

export interface AdobeEnvState {
  detected: {
    url: string;
    hostname: string;
    environment: string;
    libraryId: string;
    type: string;
  } | null;
  config: {
    active: string;
    urls: Record<string, string>;
    originalUrl: string;
    updatedAt?: string;
  } | null;
  selectedEnv: string | null;
}
