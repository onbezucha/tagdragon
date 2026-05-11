// ─── CATEGORIZED PARAMS TYPE ─────────────────────────────────────────────────

import type { SpecialRenderer } from '@/types/categories';

/**
 * Metadata attached to each categorized section
 */
export interface CategoryMeta {
  label: string;
  icon: string;
  order: number;
  defaultExpanded: boolean;
  specialRenderer: SpecialRenderer | null;
  requiredParams: string[] | null;
}

/**
 * Categorized parameters with metadata
 */
export interface CategorizedParams {
  [key: string]: Record<string, string | undefined> & {
    _meta?: CategoryMeta;
  };
}
