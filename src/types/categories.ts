export type SpecialRenderer = 'adobeEvents' | 'adobeProducts';

export interface CategoryConfig {
  label: string;
  icon: string;
  order: number;
  defaultExpanded: boolean;
  patterns: RegExp[];
  prefixMatch?: string[];
  requiredParams?: string[];
  specialRenderer?: SpecialRenderer;
}

export type ProviderCategories = Record<string, CategoryConfig>;

export type AllProviderCategories = Record<string, ProviderCategories>;
