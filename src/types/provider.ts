/**
 * Provider definition for tracking services
 */
export interface Provider {
  /** Display name (e.g. "GA4", "Adobe AA") */
  readonly name: string;
  
  /** Brand color as hex (e.g. "#E8710A") */
  readonly color: `#${string}`;
  
  /** URL pattern for matching requests */
  readonly pattern: RegExp;
  
  /** Parse request into decoded parameters */
  parseParams(url: string, postBody: unknown): Record<string, string | undefined>;
}

/**
 * Provider registry type
 */
export type ProviderRegistry = readonly Provider[];
