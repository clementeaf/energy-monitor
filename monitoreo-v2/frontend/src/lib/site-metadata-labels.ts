import type { LoadCategory, SiteKind } from '../types/site-metadata';

export const SITE_KIND_LABELS: Record<SiteKind, string> = {
  mall: 'Centro comercial',
  outlet: 'Outlet',
  strip: 'Strip center',
  office: 'Oficinas',
  other: 'Otro',
};

export const LOAD_CATEGORY_LABELS: Record<LoadCategory, string> = {
  hvac: 'HVAC',
  lighting: 'Iluminacion',
  tenant: 'Locatario',
  main: 'Principal / Acometida',
  other: 'Otro',
};

export const SITE_KIND_OPTIONS = (Object.entries(SITE_KIND_LABELS) as [SiteKind, string][]).map(
  ([value, label]) => ({ value, label }),
);

export const LOAD_CATEGORY_OPTIONS = (Object.entries(LOAD_CATEGORY_LABELS) as [LoadCategory, string][]).map(
  ([value, label]) => ({ value, label }),
);
