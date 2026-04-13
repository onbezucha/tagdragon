// ─── POPUP TYPES ─────────────────────────────────────────────────────────────

export interface ProviderStats {
  name: string;
  color: string;
  count: number;
}

export interface TabPopupStats {
  tabId: number;
  totalRequests: number;
  totalSize: number;
  totalDuration: number;
  successCount: number;
  providers: ProviderStats[];
  firstRequest: string | null;
  lastRequest: string | null;
  isPaused: boolean;
}

export interface PopupStatsResponse extends TabPopupStats {
  isDevToolsOpen: boolean;
  avgDuration: number;
  successRate: number;
  topProviders: ProviderStats[];
  otherProvidersCount: number;
  otherProvidersTotal: number;
}

export interface UpdatePopupStatsMessage {
  type: 'UPDATE_POPUP_STATS';
  tabId: number;
  provider: string;
  color: string;
  size: number;
  status: number;
  duration: number;
}
