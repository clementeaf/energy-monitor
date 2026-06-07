export const SITE_KINDS = ['mall', 'outlet', 'strip', 'office', 'other'] as const;
export type SiteKind = (typeof SITE_KINDS)[number];

export const LOAD_CATEGORIES = ['hvac', 'lighting', 'tenant', 'main', 'other'] as const;
export type LoadCategory = (typeof LOAD_CATEGORIES)[number];
