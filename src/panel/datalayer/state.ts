// ─── DATALAYER PANEL STATE ────────────────────────────────────────────────────
// Parallel to src/panel/state.ts — manages DataLayer push state independently.

import type {
  DataLayerPush,
  DataLayerState,
  DataLayerSource,
} from '@/types/datalayer';

// ─── STATE CONTAINERS ────────────────────────────────────────────────────────

const dlState: DataLayerState = {
  all: [],
  map: new Map(),
  filteredIds: new Set(),
  selectedId: null,
  isPaused: false,
  sources: new Set(),
  sourceLabels: new Map(),
};

// ─── FILTER STATE ────────────────────────────────────────────────────────────

interface DlFilterState {
  text: string;
  source: DataLayerSource | '';
  eventName: string;    // TODO: No UI control yet — reserved for future filter dropdown
  hasKey: string;       // TODO: No UI control yet — reserved for future "has key" filter
  ecommerceOnly: boolean;
}

const dlFilterState: DlFilterState = {
  text: '',
  source: '',
  eventName: '',
  hasKey: '',
  ecommerceOnly: false,
};

// ─── PUSH OPERATIONS ─────────────────────────────────────────────────────────

export function addDlPush(push: DataLayerPush): void {
  dlState.all.push(push);
  dlState.map.set(push.id, push);
}

export function clearDlPushes(): void {
  dlState.all = [];
  dlState.map.clear();
  dlState.filteredIds.clear();
  dlState.selectedId = null;
}

export function getAllDlPushes(): DataLayerPush[] {
  return dlState.all;
}

export function getDlPushById(id: number): DataLayerPush | undefined {
  return dlState.map.get(id);
}

export function hasDlPush(id: number): boolean {
  return dlState.map.has(id);
}

// ─── FILTERED IDS ────────────────────────────────────────────────────────────

export function getDlFilteredIds(): Set<number> {
  return dlState.filteredIds;
}

export function addDlFilteredId(id: number): void {
  dlState.filteredIds.add(id);
}

export function removeDlFilteredId(id: number): void {
  dlState.filteredIds.delete(id);
}

export function clearDlFilteredIds(): void {
  dlState.filteredIds.clear();
}

export function isDlFiltered(id: number): boolean {
  return dlState.filteredIds.has(id);
}

// ─── SELECTED ID ─────────────────────────────────────────────────────────────

export function getDlSelectedId(): number | null {
  return dlState.selectedId;
}

export function setDlSelectedId(id: number | null): void {
  dlState.selectedId = id;
}

// ─── PAUSE STATE ─────────────────────────────────────────────────────────────

export function getDlIsPaused(): boolean {
  return dlState.isPaused;
}

export function setDlIsPaused(paused: boolean): void {
  dlState.isPaused = paused;
}

// ─── SOURCES ─────────────────────────────────────────────────────────────────

export function getDlSources(): Set<DataLayerSource> {
  return dlState.sources;
}

export function addDlSource(source: DataLayerSource): void {
  dlState.sources.add(source);
}

export function getDlSourceLabel(source: DataLayerSource): string {
  return dlState.sourceLabels.get(source) ?? source;
}

// ─── FILTER STATE ────────────────────────────────────────────────────────────

export function getDlFilterState(): Readonly<DlFilterState> {
  return { ...dlFilterState };
}

export function setDlFilterText(text: string): void {
  dlFilterState.text = text;
}

export function getDlFilterText(): string {
  return dlFilterState.text;
}

export function setDlFilterSource(source: DataLayerSource | ''): void {
  dlFilterState.source = source;
}

export function getDlFilterSource(): DataLayerSource | '' {
  return dlFilterState.source;
}

export function setDlFilterEventName(name: string): void {
  dlFilterState.eventName = name;
}

export function getDlFilterEventName(): string {
  return dlFilterState.eventName;
}

export function setDlFilterHasKey(key: string): void {
  dlFilterState.hasKey = key;
}

export function getDlFilterHasKey(): string {
  return dlFilterState.hasKey;
}

export function setDlEcommerceOnly(only: boolean): void {
  dlFilterState.ecommerceOnly = only;
}

export function getDlEcommerceOnly(): boolean {
  return dlFilterState.ecommerceOnly;
}

export function resetDlFilters(): void {
  dlFilterState.text = '';
  dlFilterState.source = '';
  dlFilterState.eventName = '';
  dlFilterState.hasKey = '';
  dlFilterState.ecommerceOnly = false;
}

// ─── STATS ───────────────────────────────────────────────────────────────────

export function getDlVisibleCount(): number {
  return dlState.filteredIds.size;
}

export function getDlTotalCount(): number {
  return dlState.all.length;
}

// ─── CUMULATIVE STATE TRACKING ───────────────────────────────────────────────
// Maintains a rolling cumulative state snapshot for each push

export function computeCumulativeState(upToIndex: number): Record<string, unknown> {
  const all = dlState.all;
  const result: Record<string, unknown> = {};
  for (let i = 0; i <= upToIndex && i < all.length; i++) {
    const data = all[i].data;
    for (const key of Object.keys(data)) {
      result[key] = data[key];
    }
  }
  return result;
}
