# Changelog

## [2.6.0-alpha.0] - 2026-04-25 — CHART SKELETONS, PLATFORM DASHBOARD UX, BUILDINGS CROSS-TENANT

### Added (monitoreo-v2/frontend)
- **`ChartSkeleton` shared component** — Configurable height, SVG shimmer TradingView-style. Used across all chart loading states.
- **`Chart` loading prop** — Renders `ChartSkeleton` during data fetch instead of hiding chart area.
- **Buildings "Empresa" column** — Visible in cross-tenant mode (super_admin, no tenant selected).
- **Buildings form tenant selector** — `DropdownSelect` for choosing target tenant in cross-tenant creation. Globe Power excluded.
- **Meters "Edificio" column** — Visible when no building filter is active. Resolves building name from `buildingId`.

### Changed (monitoreo-v2/frontend)
- **Chart skeleton on 6 pages** — InvoicesPage, MyInvoicePage, AlertsHistoryPage, BenchmarkPage, QualityPage, DashboardPage.
- **PlatformDashboardPage** — Compact KPI cards, 7 in single row.
- **BuildingForm** — Modal → Drawer, address required, `<label>` → `<div>` (fixes DropdownSelect re-open bug).
- **MeterForm** — Modal → Drawer, building select → `DropdownSelect`, `<label>` → `<div>`.
- **Vite proxy** — Dev target → `https://power-monitor.cloud` (AWS backend, avoids CORS).

### Changed (monitoreo-v2/backend)
- **Platform Dashboard** — Globe Power excluded from KPI counts and tenant summary table.
- **Buildings create** — `CreateBuildingDto` accepts optional `tenantId` for super_admin cross-tenant assignment.

## [2.5.0-alpha.0] - 2026-04-25 — MULTI-TENANT SCOPING, ROLE HIERARCHY, PLATFORM DASHBOARD

### Added (monitoreo-v2/backend)
- **`crossTenant` flag** — `JwtPayload.crossTenant` set by `TenantOverrideInterceptor`. super_admin without `?tenantId=` gets cross-tenant mode; with override scopes to single tenant.
- **Cross-tenant queries** — `BuildingsService`, `MetersService`, `AlertsService`, `ReadingsService.findLatest` skip tenant filter when `crossTenant=true`, JOIN tenant for context.
- **Platform Dashboard module** — `GET /platform-dashboard/kpis` returns global KPIs: tenant/building/meter/reading counts, online/offline meters, per-tenant summary. Requires `crossTenant` mode.
- **Role hierarchy** — `hierarchy_level` column on `roles` table (0=super_admin, 10=corp_admin, 20=site_admin, 30=operator, 40=analyst/auditor, 50=tenant_user). `UsersService.enforceHierarchy` blocks creating/updating users with equal or higher role. `enforceDeleteHierarchy` blocks deleting users with higher role. super_admin bypasses all checks.
- **PASA roles** — Cloned 7 roles + 126 permissions from Globe Power to PASA tenant in prod.

### Changed (monitoreo-v2/backend)
- **`TenantOverrideInterceptor`** — Restructured: super_admin + override → single tenant; super_admin + no override → `crossTenant=true`; non-super_admin → `crossTenant=false`.
- **`TenantsService.cloneRoles`** — Now copies `hierarchy_level` when onboarding new tenants.
- **`UsersController`** — `create` and `update` pass `roleId` + `roleSlug` for hierarchy enforcement. `delete` calls `enforceDeleteHierarchy` before removal.

### Added (monitoreo-v2/frontend)
- **`PlatformDashboardPage`** — `/dashboard/platform` (superAdminOnly). Shows global KPIs and per-tenant summary table.
- **`RequireTenantLayout`** — Route-level wrapper that shows "Selecciona una empresa" for super_admin without tenant selected. Applied to Monitoring, Billing, Reports, Analytics, Integrations, and Admin (except Empresas).
- **Sidebar "Plataforma"** — Dashboard sub-item visible only for super_admin.
- **API layer** — `platformDashboardEndpoints.kpis()`, `usePlatformKpisQuery` hook, `PlatformKpis` type.

### Changed (monitoreo-v2/frontend)
- **`api.ts` interceptor** — `?tenantId=` now sent on all HTTP methods (was GET-only). Fixes super_admin mutations scoping to wrong tenant.
- **`queryClient.clear()`** — Called on tenant switch in Sidebar. All modules re-fetch with correct tenant.
- **Sidebar "Empresas"** — Marked `superAdminOnly`, hidden for non-super_admin users.
- **`MainContentOutlet`** — Removed blanket tenant-required block. Each route group handles its own requirement via `RequireTenantLayout`.
- **`usePermissions`** — Fixed: real users now use actual DB permissions instead of role-based override map. Role map only used during super_admin impersonation.
- **Router** — Restructured: tenant-required routes nested under `RequireTenantLayout`; cross-tenant routes (Dashboard, Buildings list, Meters list, Alerts) at top level.
- **Removed redundant `tenantId` param** from `buildingsEndpoints.list()`, `metersEndpoints.list()`, `useBuildingsQuery`, `useMetersQuery` — interceptor handles it.

### Fixed (globe-landing)
- **Footer phone number** — Updated from `566000061666` to `+56 22 215 8820`.
- **SEO & share preview** — Title "Globepower" → "Grupo Globe". Added Open Graph and Twitter Card meta tags with 1200x630 OG image. Favicon set to logo. Lang `en` → `es`.

### Infra
- **Route 53 cleanup** — Deleted redundant hosted zone `Z090060...` for `globepower.cl` (duplicate, only NS/SOA + stale ACM CNAME).

---

## [2.4.1-alpha.0] - 2026-04-24 — GLOBE LANDING: HERO MOBILE FIXES

### Fixed (globe-landing)
- **Hero arrows mobile** — Navigation arrows now visible on mobile (were hidden below `sm` breakpoint).
- **Hero text overflow mobile** — Increased mobile `min-h` from 480px to 560px so slide subtitles display fully without clipping.

---

## [2.4.0-alpha.0] - 2026-04-24 — MONITOREO V2: OPERATOR FILTER SYSTEM + DATA MIGRATION

### Added (monitoreo-v2/frontend)
- **useOperatorFilter hook** — Maps `viewAsRole` to v1 user modes: Holding (super_admin), Multi Operador (corp_admin), Operador (site_admin), Técnico (operator), Locatario (tenant_user). Returns `isFilteredMode`, `needsSelection`, `operatorMeterIds`, `operatorBuildingIds`, `isTecnico`.

### Changed (monitoreo-v2/frontend)
- **DashboardPage** — Filters buildings, meters, readings, and alerts by operator. Blocks Técnico mode with "Dashboard no disponible". Shows "Selecciona un operador" when no operator selected.
- **RealtimePage** — Filters buildings dropdown and readings table by operator meter IDs.
- **AlertsPage** — Filters alerts by operator meter IDs.
- **BuildingsPage** — Filters buildings by operator. CRUD restricted to Holding mode only.

### Infra
- **RDS readings migration** — 2.6M readings (Mar 25 – Apr 25) migrated from v1 `meter_readings` to v2 `readings` table with UUID mapping. Dashboard charts and KPIs now functional in production.

---

## [2.3.0-alpha.0] - 2026-04-24 — GLOBE LANDING: FIGMA PIXEL-PERFECT REDESIGN

### Changed (globe-landing)
- **Navbar** — Solid CTA pill (`#3c3c3c`), backdrop-blur 5px, py-32 px-60, logo 245x52, fixed positioning.
- **Hero** — 598px banner, dual gradient overlay, 3-slide crossfade (text + images), per-slide CTA buttons, grid-stack layout (no reflow), dots + arrow nav, logo bar h-117 with infinite scroll.
- **About** — Label 16px + title H2 36px/44px + body 22px/30px Plus Jakarta Sans Medium. Max-w 1200, py-128.
- **Valores (Ecosystem)** — Header 2-col grid, full-width image cards. 3 states: default (arrow icon), hover (rojizo gradient + "Ver más" pill), pressed (white bg + description + close). Mobile: 1-col, arrow always visible.
- **Industrias (SiemensBanner)** — Header 1fr/2fr grid, image cards with baked text. CTA pill per card. Hover rojizo gradient (desktop).
- **Diferenciacion (Differentiation)** — Centered header, 2x2 card grid, 68px icon with radial gradient, hover bg-grey-50.
- **Stats** — H1 48px/56px numbers, H4 22px/30px labels, flex row text-left, py-80.
- **Presencia (Presence)** — Flex row gap-128, map 463px, body 22px/30px.
- **Innovacion (Innovation)** — Centered header, 3 cards h-380, badge pills, dual gradient + hover rojizo.
- **Contacto (Contact)** — bg `#9a2d29`, 1fr/2fr grid, white inputs, labels 14px grey-100, submit pill outline.
- **Footer** — py-52, logo 276px, LinkedIn icon (no border), 3-col content with border-t/b, logo carousel gap-60.
- **App** — Removed `Results` component. Reordered sections to match Figma. Navbar spacer for fixed nav.
- **Responsividad** — All sections responsive: hero min-h adaptive, cards grid-cols-1 on mobile, font sizes scale down, logo bar shrinks, hover effects desktop-only.
- **Scroll** — `scroll-padding-top` compensates fixed navbar. Smooth scroll to section anchors.

---

## [2.2.0-alpha.0] - 2026-04-24 — PROD DEPLOY, SUPER ADMIN CROSS-TENANT, HEALTH ENDPOINT

### Added (monitoreo-v2/backend)
- **Health endpoint** — `GET /health` (public, no auth). Returns `{ status, timestamp }`.
- **RDS TLS in Docker** — `COPY certs ./certs` in Dockerfile so production image includes CA bundle.
- **DB_SYNC env var** — `synchronize` driven by `DB_SYNC=true` instead of hardcoded `false`.

### Changed (monitoreo-v2/backend)
- **super_admin cross-tenant** — `BuildingsService.findAll` and `MetersService.findAll` skip tenant filter for super_admin, allowing full visibility across tenants.
- **Refresh token cookie** — `AuthController.refresh` reads `__Host-refresh_token` cookie (production prefix) with `refresh_token` fallback.

### Added (monitoreo-v2/frontend)
- **Operator switcher** — Sidebar dropdown for corp_admin/site_admin impersonation: select store/brand name, filters meters by tenant.
- **Building switcher** — Sidebar dropdown for site_admin: select building within selected operator.
- **AppStore** — `selectedOperator`, `setSelectedOperator`. Role switch resets operator and building.
- **Building type** — Added `tenantId` field to `Building` interface.

### Changed (monitoreo-v2/frontend)
- **Realtime search** — Wider input (`w-48`), white background, `text-sm` for consistency.

### Changed (globe-landing)
- **UI refresh** — Hero, About, Contact, Differentiation, Ecosystem, Footer, Innovation, Navbar, Presence, SiemensBanner, Stats components updated with layout and styling improvements.

### Infra
- **CloudFront** — `plataforma.globepower.cl` added as alternate domain on distribution `E1SNFETXON2VSI` with multi-SAN ACM certificate.
- **Lambda iot-ingest** — Redeployed with corrected VARIABLE_MAP.
- **RDS monitoreo-v2** — Data fully synced: iot_readings (4,110 EAV rows), tenant_units, all core tables verified.

---

## [2.1.0-alpha.0] - 2026-04-24 — MONITOREO V2: METER DRILL-DOWN, BILLING, UX OVERHAUL

### Added (monitoreo-v2/frontend)
- **MeterDetailPage** — `/monitoring/meter/:meterId`. Monthly aggregated chart (5 metrics), table with per-month drill-down.
- **MeterReadingsPage** — `/monitoring/meter/:meterId/readings/:month`. Raw 15-min readings, daily/stock chart, 7-metric selector, day summary table.
- **BuildingDetailPage** — `/buildings/:buildingId`. Tabs: Facturación (chart, invoices, line items drawer) and Medidores (click-through to meter detail).
- **Dashboard billing KPIs** — 3 financial cards (Pagadas, Por cobrar, Vencidas). Overdue invoices widget.
- **Formatters** — `fmtNum`, `fmtClp`, `monthLabel` in `lib/formatters.ts`.

### Changed (monitoreo-v2/frontend)
- **DropdownSelect migration** — 52 native `<select>` → `DropdownSelect` across 24 pages. No blue focus ring.
- **Navigation** — BuildingsPage → building detail. MetersPage/RealtimePage → meter detail.
- **Sidebar** — Reportes as single entry (no sub-items). Facturación: removed Aprobar/Historial sub-items.
- **InvoicesPage** — Status tabs (Todas/Pendientes/Aprobadas/Pagadas/Anuladas) with counts, client-side filter, 15-row infinite scroll. Invoice preview in Drawer (iframe). Removed row-click detail drawer.
- **AlertsPage** — Status tabs (Todas/Activas/Reconocidas/Resueltas) with counts, client-side filter. Resolve via Drawer with notes form.
- **AlertsHistoryPage** — Compact KPI pills, merged charts into single card with Tendencia/SLA toggle. Wider severity selector.
- **ReportsPage** — Generate/Schedule forms in Drawer instead of Modal.
- **Charts** — `spacingTop: 16` on Chart, StockChart, MonthlyChart. MonthlyChart toggle above chart (not overlapping).
- **Global** — `cursor: pointer` on all buttons. PDF download URL includes `/api` prefix.
- **Auth** — `ProtectedRoute` passes `location.pathname` to login. `completeLogin` returns to saved path.

### Fixed (monitoreo-v2/frontend)
- **PDF download** — `invoicesEndpoints.pdfUrl()` now includes API base URL prefix, preventing React Router 404.
- **InvoicesPage perf** — `statusCounts` and `displayInvoices` memoized. 15-row pagination prevents rendering 5000+ rows.
- **Sidebar collapse** — Smooth `transition-[width] duration-300` animation instead of instant show/hide.
- **TenantSwitcher** — Company selector in sidebar (super_admin only). Search input, first 10 shown, selects tenant and applies its theme (colors, title, favicon). `selectedTenantId` in AppStore.
- **Multi-tenant themes** — `[data-theme="pasa"]` (blue `#3D3BF3`) and `[data-theme="siemens"]` (teal `#009999`) CSS blocks. `applyTenantTheme` sets `data-theme` attribute for slug-based overrides.
- **DB: PASA tenant** — Created tenant (slug `pasa`). Reassigned 5 mall buildings (MG, MM, OT, SC52, SC53) from Globe Power to PASA.

---

## [2.0.0-alpha.0] - 2026-04-24 — MONITOREO V2: ROLE IMPERSONATION, QUERY PERF, UX POLISH

### Added (monitoreo-v2/frontend)
- **Role impersonation** — super_admin can switch view to any role (Multi Operador, Operador, Técnico, Locatario, Analista, Auditor). Custom dropdown in sidebar with red border when impersonating. Sidebar/routes filter based on simulated role permissions.
- **Sidebar collapse** — Logo click collapses sidebar, hamburger in header reopens it.

### Changed (monitoreo-v2)
- **Readings latest query** — Replaced `DISTINCT ON` (seq scan 30M rows) with `LEFT JOIN LATERAL` using index `(meter_id, timestamp DESC)`. Orders of magnitude faster.
- **DevicesPage** — Compact KPIs, search filter, 15-row infinite scroll.
- **MetersByTypePage** — Search, compact KPIs, 15-group infinite scroll.
- **Sidebar** — Hidden Generación and Mapa Modbus sub-modules (no client data yet). Logo centered, no duplicate title.
- **Drawer** — Returns `null` when closed (fixes phantom drawer in Roles/Companies).

### Fixed (monitoreo-v2/backend)
- **PermissionsGuard** — super_admin bypasses all permission checks.

---

## [1.9.0-alpha.0] - 2026-04-23 — MONITOREO V2: REALTIME FILTERS + TOKEN REFRESH FIX

### Changed (monitoreo-v2/frontend)
- **RealtimePage** — Compact KPI pills replacing large cards. Added status filter, text search, and result counter. 15-row pages with infinite scroll.

### Fixed (monitoreo-v2/backend)
- **Token refresh** — `POST /auth/refresh` now reads refresh token from httpOnly cookie when body is empty. DTO field made optional. Fixes 401 errors when Axios interceptor retries without body.

---

## [1.8.0-alpha.0] - 2026-04-23 — MONITOREO V2: TABLE STATE PATTERN + SUPER ADMIN BYPASS

### Changed (monitoreo-v2/frontend)
- **TableStateBody** — Reusable component for consistent table states: skeleton rows, error with retry, empty message, all rendered inside `<tbody>` so headers always stay visible. Applied to ~20 tables across the app.
- **super_admin bypass** — `usePermissions` returns `true` for all checks when role is `super_admin`. No more permission gaps.
- **Sidebar sub-items** — Active sub-item styled with white bg + green ring for better visibility.
- **Drawer z-index** — Raised to `z-[9999]` with `shadow-2xl` to prevent overlap with sticky table headers.
- **Login fix** — `useSessionResolver` calls `setLoading(false)` when MSAL has accounts but no session flag, preventing infinite spinner.

### Fixed (monitoreo-v2/backend)
- **super_admin bypass** — `PermissionsGuard` returns `true` immediately for `super_admin` role, bypassing all permission checks.
- **Missing permissions** — Migration `11-add-admin-tenant-permissions.sql` adds `admin_tenants`, `admin_tenant_config`, `admin_tenants_units`, `admin_hierarchy` permissions and assigns all to `super_admin`.

### Added (monitoreo-v2/frontend)
- `TableStateBody` component in `components/ui/`.
- `.input-field` CSS class for form inputs.

---

## [1.7.0-alpha.0] - 2026-04-23 — MONITOREO V2: TENANT ONBOARDING (CREATE COMPANY)

### Added (monitoreo-v2)
- **CompaniesPage** — `/admin/companies` with table of tenants and "Nueva empresa" drawer. Form: name, slug, app title, admin email/name/auth provider, theme colors. Protected by `admin_tenants:create`.
- **Backend integration** — `tenantsEndpoints.create()` calls `POST /tenants` (onboarding: tenant + 7 roles + first admin, transactional). Success shows roles created and admin ID.
- **Types** — `CreateTenantPayload`, `OnboardingResult` in `types/tenant.ts`.
- **Hook** — `useCreateTenant()` mutation + `useTenantsAdminQuery()`.
- **CSS** — `.input-field` reusable class for form inputs.
- **Sidebar** — "Empresas" added as first sub-item under Administración.

---

## [1.6.0-alpha.0] - 2026-04-23 — MONITOREO V2: V1 DESIGN GRID + GLOBE POWER COLORS

### Changed (monitoreo-v2/frontend)
- **Color palette** — Migrated from PASA blue/navy to Globe Power palette: green `#3a5b1e`, navy `#1C1C1C`, coral `#ab2f2a`, bg `#F9F9F9`, border `#E4E4E4`.
- **Sidebar** — V1 numbered style (01–10) with expandable sub-items, pill active state, logo+title, Soporte y Contacto expandible, Cerrar Sesión footer.
- **Header** — Country selector (CL/CO/PE flags), WhatsApp and Email contact icons, user menu dropdown with "Configuración perfil".
- **AppLayout** — Header restored above main content area.
- **All tables (30 files)** — Sticky thead with `top-0 z-10`, internal scroll `max-h-[70vh] overflow-y-auto`.
- **AlertsPage** — Removed title, limited to 50 rows, highlight row via `?highlight=id` query param from dashboard click.
- **Dashboard alerts** — Badge replaced with `(N)` text, click navigates to `/alerts?highlight=id`.
- **Executive Dashboard** — Same alert click-to-highlight pattern.
- **RealtimePage** — Infinite scroll (15 initial, load more on scroll), internal table scroll.

### Added (monitoreo-v2/frontend)
- `useClickOutside` hook for Header user menu dropdown.
- `globe-logo.png` asset for sidebar branding.

---

## [1.5.0-alpha.0] - 2026-04-23 — GLOBE LANDING: HERO CAROUSEL, VALUES, INNOVATION & RESPONSIVE

### Added (globe-landing)
- **deploy-preview.sh** — One-command temporary S3+CloudFront deploy for preview. Isolated bucket, does not touch production. Supports `update` and `destroy`.

### Changed (globe-landing)
- **Hero carousel** — 3 background images (Santiago, Frame 122, Modular) with crossfade, auto-advance 6s, functional dots and arrows. Each slide has its own label, title, and subtitle.
- **Values cards** — Full image display (no crop), click "Ver más" reveals description overlay with close button. Text justified, title responsive with clamp. Mobile: 1 column, button always visible.
- **Innovation cards** — New images from hero assets, text overlay with tag pill, title, and description matching Figma reference.
- **Industries cards** — "Ver más" button hidden (commented out).
- **Differentiation cards** — SVG icons replaced with PNG assets (engine, hands, check, worker).
- **Stats section** — Mobile: 1 column, larger text for readability.
- **Footer logos** — Infinite scroll carousel replacing static row. Logo shrink-0 fix.
- **Contact form** — Custom ServiceSelect dropdown (Globe Power, Globe Services, Globe Modular) with white background, click-outside close, chevron rotation.

---

## [1.4.0-alpha.0] - 2026-04-23 — MONITOREO V2: SKELETON LOADING & DASHBOARD PERFORMANCE

### Changed (monitoreo-v2/frontend)
- **Dashboard chart performance** — Replaced 3-query waterfall (buildings → latest readings → time series) with 2-step fast path: buildings → meters (lightweight table) → time series. Global KPIs from `useLatestReadingsQuery` now run in parallel without blocking the chart.
- **Dashboard skeleton** — Chart area renders immediately with a TradingView-style skeleton (SVG area curve, volume bars, grid lines, axis labels, shimmer sweep) instead of waiting for data.
- **RealtimePage skeleton** — Table loading state replaced spinner with skeleton rows matching the 8-column table layout.

### Fixed (monitoreo-v2/backend)
- **Readings latest DTO** — Changed `@IsUUID()` to `@IsString()` for `buildingId` and `meterId` in `LatestQueryDto`. Seed UUIDs (`b0000001-...`) are not RFC 4122 compliant and were rejected by class-validator.

### Added (monitoreo-v2/frontend)
- **Shimmer keyframe** — `@keyframes shimmer` in `index.css` for skeleton sweep animation.

---

## [1.3.1-alpha.0] - 2026-04-23 — DOCS & DEPLOY

### Added
- **monitoreo-v2 documentation** — Backend README (architecture, modules, env vars, security), Frontend README (structure, patterns, testing), auth-rbac, db-schema (30 tables), api-overview (all endpoints), deploy guide.
- **globe-landing/deploy.sh** — One-command deploy to S3 + CloudFront. Supports `globepower`, `energymonitor`, or `both`. Immutable cache on assets, no-cache on index.html, auto-invalidation, HTTP verification.

### Changed
- **BACKLOG.md** — Cleaned up, all items marked as completed.

---

## [1.3.0-alpha.0] - 2026-04-23 — MONITOREO V2: SIDEBAR, ROLES, SECURITY & DESIGN SYSTEM

### Changed (monitoreo-v2/frontend)
- **Sidebar accordion** — 7 collapsible groups (Dashboard, Monitoreo, Alertas, Facturación, Reportes, Analítica, Integraciones) + standalone items + admin section with audit sub-accordion. Auto-expands active group.
- **Route protection** — `RequirePerms` guard on all 47 routes. Users without permission are redirected to dashboard.
- **RolesPage** — Drawer with module-based permission UI mapped to sidebar structure. Groups with select-all, capabilities per module (Ver, Crear, Editar, Eliminar).
- **UserForm** — Roles fetched from `useRolesQuery()` instead of extracting from existing users.
- **UI components** — Design system patterns applied to 8 atomic components: Button (active:scale, duration-150), Card (hover border transition), Toggle, Modal/Drawer (backdrop-blur), ConfirmDialog (uses Button), TablePrimitives (StatusBadge with dot+ring), DropdownSelect.
- **Layout** — Responsive padding (p-4/p-6/p-8), subtle borders (200/80), Header role badge with ring, consistent transition-all duration-150.
- **Reduced motion** — Global `prefers-reduced-motion` support in index.css.

### Added (monitoreo-v2)
- `role-modules.ts` — Sidebar-to-permissions mapping for role management UI.
- `RequirePerms.tsx` — Route-level permission guard component.
- `design-system/` — 10 reference docs (colors, typography, layout, borders, buttons, cards, animations, contrast, components, images).
- `brute-force.spec.ts` — 28 tests covering 10 attack vectors (rate limiting, MFA, token theft, API keys, JWT, SSRF, permission escalation).
- `10-add-missing-permissions.sql` — Migration adding 8 permissions (readings, admin_roles, api_keys, monitoring_faults).

### Fixed
- `03-rbac.sql` seed updated with missing permission entries.
- `role-modules.ts` corrected `admin_tenants` → `admin_tenant_config` to match DB.

---

## [1.2.0-alpha.0] - 2026-04-23 — GLOBE LANDING: FIGMA DESIGN SYSTEM

### Changed (globe-landing)
- **Design tokens** — Tailwind config aligned to Figma Design System: Plus Jakarta Sans (headings) + Inter (body), typography scale H1–H6 + body variants with desktop/mobile sizes, color palette green/grey/red/brand from Figma.
- **Navbar** — 6 links matching Figma (Quiénes somos, Valores, Industrias, Ecosistema Globe, Cultura e Innovación, Contáctanos). Inter 500 14px, CTA pill button, dehaze hamburger on mobile.
- **Buttons** — Refactored to 3 Figma types: Primary (`#3c3c3c`), Secondary (white), Tertiary/brand (`#ab2f2a`). Added `.btn-tertiary`, `.icon-btn`, `.icon-btn-lg`.
- **Footer** — Logo 58px, LinkedIn icon button (64px), contact info with Material Symbols icons (call, mail, location), section titles in `brand-dark` (`#772825`), copyright text.
- **Valores** — Real images from `assets/values/`, hover "Ver más" button slides in from right with transparent pill style.
- **Industrias** — Real images from `assets/industry/`, natural aspect ratio (no crop), hover "Ver más" button.
- **Innovación** — Real images from `assets/innovation/`, square aspect ratio.
- **Differentiation** — Material Symbols icons (engineering, handshake, dashboard, support_agent) replacing circle placeholders. Cards sized 600×260.
- **Hero** — Carousel resized to Figma spec (1043×117), `rounded-br-[5rem]` on desktop matching carousel corner.
- **Stats** — Migrated `bg-[#1C1C1C]` → `bg-grey-900`.
- **Color migration** — All active components migrated from `gray-*` → `grey-*` and hardcoded hex → Tailwind tokens.

### Added
- `@fontsource-variable/inter` — Inter variable font for body text.
- `brand` / `brand-dark` color tokens for Figma accent colors.

---

## [1.1.2-alpha.0] - 2026-04-22 — GLOBE LANDING: UI POLISH

### Changed (globe-landing)
- **Hero** — Dark overlay mask, CTA + arrows alongside subtitle, dots placeholder for future slides, arrows with extended tails and no borders.
- **Hero carousel** — Infinite scroll left (CSS animation), white bg over image (2/3 width), quarter-circle top-right corner, logos in #3C3C3C. Full-width on mobile, no rounding.
- **Navbar** — Nav links shifted right (`ml-auto`).
- **About** — "Conocer más sobre Grupo Globe" button with pill border, right-aligned.
- **Footer** — Client logos row (CLC, Google, Bosch, Anglo American, Rose) with grayscale hover effect, full-width justified.

---

## [1.1.1-alpha.0] - 2026-04-22 — GLOBE LANDING: REDESIGN FROM PDF

### Changed (globe-landing)
- **Full redesign** from "Inicio Globe Power.pdf" — all sections replaced with new content and layout.
- **Navbar** — Logo image, 3 nav links (Nosotros, Industrias, Innovación), pill CTA with arrow.
- **Hero** — Background image with overlay, ENERGÍA label, title, subtitle, CTA pill, carousel arrows, client logos bar.
- **About** — "Quiénes Somos" / "Un partner, toda la operación" with 3 paragraphs.
- **Ecosystem** — Valores section, 2-column header + 4 image placeholders.
- **SiemensBanner → Industries** — "Áreas de negocios", 3 image cards (Energía, Transporte Vertical, Infraestructura Modular).
- **Results → Ecosistema Globe** — Centered text block.
- **Differentiation** — 4 cards grid 2×2 edge-to-edge with icon placeholders.
- **Stats** — Dark background (#1C1C1C), "Grupo Globe en números", 4 metrics.
- **Presence** — New component: 2-column layout with map (continent.png).
- **Innovation** — New component: "Cómo innovamos", 3 square image placeholders.
- **Contact** — Background #9A2D29, 2-column form with 5 fields + textarea.
- **Footer** — White background, logo + LinkedIn, 3-column layout (contact, business areas, legal).

---

## [1.1.0-alpha.0] - 2026-04-21 — MONITOREO V2: XLSX SPEC VIEWS (BATCH 1-6)

### Added — MFA (Batch 7)
- **TOTP MFA backend** — `MfaService` con setup (QR + secret), verify, validate, disable. Columnas `mfa_secret` y `mfa_enabled` en `users`. Login retorna `{ mfaRequired, userId }` si MFA habilitado; `POST /auth/mfa/validate` emite tokens post-verificación.
- **MFA frontend** — `MfaSection` en TenantSettingsPage: QR code, input 6 dígitos, enable/disable con confirmación. `LoginPage`: flujo condicional con input MFA cuando el backend lo requiere.

### Added — Batch 5-6
- **Tendencias y proyección** — `TrendsPage` en `/analytics/trends`. Regresión lineal, forecast punteado + banda confianza 95%, variación mes a mes, tabla proyección.
- **Patrones y anomalías** — `PatternsPage` en `/analytics/patterns`. Heatmap consumo hora×día, detección anomalías por z-score, chart consumo diario con anomalías resaltadas, tabla anomalías con desviación % y z-score. Selector sensibilidad (alta/media/baja).

### Added — Batch 1
- **Dashboard ejecutivo por edificio** — `/dashboard/executive/:siteId`. KPIs, chart tendencias, tabla medidores.
- **Historial de facturación** — `/billing/history` con chart evolución mensual.
- **Aprobación de facturas** — `/billing/approve` pre-filtrada a pendientes.
- **Diagnóstico de concentrador** — `/monitoring/concentrator/:concentratorId`. Info equipo, status MQTT, tabla medidores.
- **Reportes programados** — `/reports/scheduled` como ruta dedicada.

### Added — Batch 2
- **Historial alertas + SLA** — `AlertsHistoryPage` en `/alerts/history`. KPIs globales (total, resueltas, activas, % SLA), charts tendencia mensual y cumplimiento SLA, tabla mensual con tiempo medio resolución.
- **Integrations sub-rutas** — `/integrations/status`, `/integrations/config`, `/integrations/sync-log` como rutas alias.
- **Audit sub-vistas** — `/admin/audit/changes` (log de cambios, pre-filtro PATCH) y `/admin/audit/access` (log de accesos, pre-filtro LOGIN). `AuditPage` acepta prop `mode`.
- **Sidebar** — 6 entradas nuevas: Aprobar Facturas, Historial Facturación, Reportes Programados, Historial / SLA, Log de Cambios, Log de Accesos.

### Added — Batch 3
- **Benchmarking entre edificios** — `BenchmarkPage` en `/analytics/benchmark`. Ranking horizontal (bar chart), radar multi-KPI (top 5), tabla con kWh/m², demanda peak, FP. Selector periodo y métrica.

### Added — Batch 4
- **Portal locatario** — `MyInvoicePage` en `/billing/my-invoice`. Chart consumo últimos 6 meses, tabla facturas con periodo/estado/total/PDF, selector mes. Backend: `GET /invoices/my` con permiso `billing:view_own`.

### Changed
- **InvoicesPage** — Prop `defaultStatus`, chart evolución mensual.
- **ExecutiveDashboardPage** — Links clickeables en ranking de edificios.
- **DevicesPage** — Link "Diagnostico" para concentradores.
- **AuditPage** — Prop `mode` para pre-filtrar por tipo de acción.

---

## [1.0.0-alpha.0] - 2026-04-16 — MONITOREO V2: SELF-SERVICE + IOT + SONARQUBE

### Added
- **Self-service admin** — 3 nuevas páginas: TenantSettingsPage (`/admin/settings`), ApiKeysPage (`/admin/api-keys`), RolesPage (`/admin/roles` con grid de permisos)
- **Roles CRUD backend** — `GET/POST/PATCH/DELETE /roles`, `GET/PUT /roles/:id/permissions`, `GET /roles/permissions` (catálogo)
- **IotReadingsModule** — 5 endpoints (`/iot-readings/latest`, `/timeseries`, `/`, `/alerts`, `/stats`). EAV→columnar pivot, TimescaleDB time_bucket, anomaly detection on-the-fly
- **CronBuilder** — Componente UI con 4 presets + cron custom + descripción en español
- **TablePrimitives** — Componentes compartidos (Th, Td, StatusBadge, ActionBtn) para deduplicación
- **IoT data migration** — Script `transform-iot.sql` (v1 columnar→v2 EAV: 281→3,917 filas)

### Changed
- **IntegrationsPage** — Tipo de integración via selector (GET /integrations/supported-types)
- **ReportsPage** — CronBuilder reemplaza input cron raw
- **Sidebar** — 3 entradas admin nuevas (Configuracion, API Keys, Roles)

### Fixed
- **SonarQube Quality Gate** — 0 bugs, 0 vulnerabilities, A/A/A. Readonly props (~75 componentes), Chart `this` extraction, regex grouping, accesibilidad, void operators removidos
- **Duplicaciones** — 25.4%→3.2% via TablePrimitives compartidos

### Tests
- Backend: 656 tests, 61 suites (antes 613/58)
- Frontend: 185 tests, 18 suites (antes 73/10)

---

## [0.99.1-alpha.0] - 2026-04-15 — MONITOREO V2: SECURITY HARDENING

### Fixed
- **SSRF protection** — URL validator blocks private IPs (10/172/192), localhost, AWS metadata (169.254.169.254), internal service ports (5432, 3306, 6379). Applied to REST API and Webhook connectors.
- **HTML injection in PDFs** — `escapeHtml()` on all interpolated invoice values (stored XSS prevention).
- **Timing attack on API keys** — `timingSafeEqual` with prefix-scoped candidate lookup replaces direct DB hash comparison.
- **JWT payload validation** — Strict type checking in `jwt.strategy.ts`; rejects malformed tokens with 401.
- **Account enumeration** — Generic "Authentication failed" message for all OAuth login failures.
- **Refresh token replay** — Reuse of revoked token triggers revocation of ALL user sessions (theft detection).
- **ReDoS in FTP glob** — Pattern bounded to 100 chars, max 5 wildcards, non-greedy character classes.
- **Cookie hardening** — `__Host-` prefix in production (prevents cookie tossing/domain override).
- **Body size limits** — Express JSON/URL-encoded capped at 1mb.
- **Rate limiter cleanup** — Stale API key windows evicted when map exceeds 1000 entries.

### Tests
- Backend: 613 tests, 58 suites (antes 569/55)
- Frontend: 73 tests, 10 suites (sin cambios)

---

## [0.99.0-alpha.0] - 2026-04-15 — MONITOREO V2: PLATFORM HARDENING

### Added
- **Conectores reales** — Strategy pattern con 4 tipos (`rest_api`, `webhook`, `mqtt`, `ftp`). `ConnectorRegistry`, config validation por tipo, retry con exponential backoff. `triggerSync` ejecuta sync real. Endpoint `GET /integrations/supported-types`.
- **API externa v1** — `ApiKey` entity (SHA-256, prefix, permissions, buildingIds, rate limit, expiration). `ApiKeyGuard` global (X-API-Key header). 9 endpoints read-only bajo `/api/v1/` (buildings, meters, readings, alerts). Swagger en `/api/v1/docs`.
- **Tenant onboarding** — `POST /tenants` crea tenant + clona 7 roles + permisos + primer admin (transaccional). CRUD admin: `GET/PATCH/DELETE /tenants/:id`.
- **TimescaleDB optimización** — Continuous aggregates `readings_hourly` + `readings_daily`. Compression policies (readings 7d, audit_logs 30d, integration_sync_logs 7d). Retention policies (readings 3y, audit_logs 5y, sync_logs 1y).
- **Config encryption** — AES-256-GCM para secrets en integration config (`CONFIG_ENCRYPTION_KEY`). Encrypt on save, decrypt on sync.
- **API key rate limiting** — Per-key in-memory rate counter, 429 cuando excede `rateLimitPerMinute`.
- **Tenant guard** — `PermissionsGuard` valida que tenantId en request coincida con JWT (previene cross-tenant access).
- **PII redaction** — `maskEmail()` y `maskProviderId()` en auth logs.
- **Env validation** — `validateEnv()` en bootstrap: 5 vars requeridas en producción, exit(1) si faltan.
- **Frontend tests** — @testing-library/react + jsdom. 7 nuevas suites: Button, Toggle, Card, useAuthStore, useAppStore, usePermissions, tenant-theme.

### Changed
- **Tenant entity** — Nuevos campos: `appTitle`, `sidebarColor`, `accentColor`, `settings` (jsonb). Migration `08-tenant-theme-extend.sql`.
- **`/auth/me`** — Retorna tema extendido (7 campos) via `getTheme()`.
- **Frontend theming** — `applyTenantTheme()` centralizado en `lib/tenant-theme.ts`: 4 CSS vars + `document.title` + favicon dinámico. Sidebar muestra `tenant.appTitle`.
- **ReadingsService** — `findAggregated` usa continuous aggregates (hourly→`readings_hourly`, daily→`readings_daily`, monthly→re-bucket daily). Weighted average para monthly.
- **Security headers** — Helmet explícito: HSTS 1yr, Referrer-Policy strict-origin-when-cross-origin.
- **Integration DTOs** — `integrationType` validado contra `SUPPORTED_INTEGRATION_TYPES`.

### Tests
- Backend: 569 tests, 55 suites (antes 370/41)
- Frontend: 73 tests, 10 suites (antes 20/3)

### Dependencies
- `mqtt@5.15.1`, `basic-ftp@5.3.0`, `@nestjs/swagger` (backend)
- `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom` (frontend dev)

---

## [0.98.0-alpha.0] - 2026-04-02 — MONITOREO V2: DRAWER + HEADER CLEANUP

### Added
- **`Drawer`** — Componente reutilizable en `components/ui/Drawer.tsx`. Basado en `<dialog>` nativo (accesibilidad, Escape, backdrop click). Props: `side` (left/right), `size` (sm/md/lg/xl), `footer` slot, `dialogClassName` override. Body scrollable con header y footer fijos.

### Changed
- **`UserForm`** — Migrado de `Modal` a `Drawer` (slide-in derecho). Botones Cancelar/Crear en footer fijo usando `Button`. Form vinculado vía `id`/`form` attribute.
- **`Header`** — Eliminado selector "Todos los edificios" del navbar superior. Queda hamburger + nombre/rol usuario.

---

## [0.97.0-alpha.0] - 2026-04-02 — MONITOREO V2: COMPONENTES UI + RESPONSIVIDAD + BUGFIXES

### Added
- **Componentes UI reutilizables** — `components/ui/`:
  - `DropdownSelect` — Selector custom con búsqueda, navegación por teclado, click outside
  - `DataTable` — Tabla genérica tipada con sorting, paginación y modo compacto
  - `Button` — 4 variantes (primary/secondary/danger/ghost), 3 tamaños, estado loading
  - `Toggle` — Switch accesible (role=switch, aria-checked) con label opcional
  - `Card` — 3 variantes (default/outlined/elevated), header con action slot
- **Seed buildings** — 5 edificios PASA (MG, MM, OT, SC52, SC53) + acceso super admin + jerarquía de ejemplo para MG
- **RBAC** — Acciones `admin_hierarchy:create` y `admin_hierarchy:delete` en permisos y seed site_admin

### Fixed
- **Sidebar hooks crash** — `useAlertsQuery` se llamaba después de un early return (`!sidebarOpen`), violando reglas de React hooks
- **HierarchyPage loading infinito** — `useQueryState` solo monitoreaba la query de jerarquía; si buildings estaba vacío, la query quedaba deshabilitada en `isPending` permanente. Ahora combina el estado de ambas queries
- **Permisos frontend** — Corregidos módulos en `has()`: `billing_invoices` → `billing`, `billing_tariffs` → `billing`, `admin_tenant_units` → `admin_tenants_units`

### Changed
- **Responsividad desktop** — 11 tablas: `overflow-hidden` → `overflow-x-auto` (scroll horizontal en pantallas <1280px)
- **Grids adaptativos** — EscalationPage y TariffsPage (form bloques) con breakpoints `lg:`
- **AppLayout** — Contenido limitado a `max-w-screen-2xl` para pantallas ultrawide

---

## [0.96.0-alpha.0] - 2026-04-02 — MONITOREO V2: UI INTEGRACIONES

### Added
- **`/integrations`** — `IntegrationsPage`: tabla, filtros tipo y estado, alta/edición con configuración JSON, eliminar, sincronizar (stub backend), historial de sync paginado
- **API layer** — `types/integration.ts`, `integrationsEndpoints`, `useIntegrationsQuery` (+ sync logs y mutaciones)
- **`Modal`** — prop opcional `dialogClassName` (formulario e historial más anchos)

### Changed
- **Sidebar** — entrada Integraciones (`integrations:read`)

---

## [0.95.0-alpha.0] - 2026-04-02 — MONITOREO V2: EMAIL VÍA SES (OPCIONAL)

### Added
- **`SesEmailService`** — `monitoreo-v2/backend/src/common/email/ses-email.service.ts`; dependencia `@aws-sdk/client-ses`
- **Variables** — `SES_FROM_EMAIL`, `ALERT_EMAIL_RECIPIENTS`, `SES_REGION` (ver `CLAUDE.md`, `monitoreo-v2/backend/.env.example`, [AWS Runbook — SES](docs/aws-runbook.md#amazon-ses-email-saliente))

### Changed
- **`NotificationService`** — Con env configurado: envío real a destinatarios de alertas/escalamiento e invitación al crear usuario; sin env: solo logs (`[EMAIL]`, `[USER_INVITE]`) como antes

### Tests
- Backend: 370 tests (41 suites)

---

## [0.94.0-alpha.0] - 2026-04-02 — MONITOREO V2 FASE 8: VISTAS MONITOREO (TIPO / GENERACIÓN / MODBUS)

### Added
- **`/monitoring/meters/type`** — Agrupación por tipo de medidor, KPIs con últimas lecturas, detalle por tipo con enlace a `/meters?buildingId=`
- **`/monitoring/generation`** y **`/monitoring/generation/:siteId`** — Selector de edificio; StockChart generación vs carga (`GET /readings/aggregated`), energía del periodo y autoconsumo estimado; generación detectada por `meterType` (p. ej. solar, generation) vía `features/monitoring/lib/meterClassification.ts`
- **`/monitoring/modbus-map`** y **`/monitoring/modbus-map/:siteId`** — Concentradores del sitio; medidores por `busId`, orden por dirección Modbus; estado, CRC último sondeo, ruta uplink
- **Sidebar** — Entradas Medidores por tipo, Generación, Mapa Modbus (permisos dashboard técnico/ejecutivo)

### Changed
- **`APP_ROUTES.monitoring`** — `metersByType`, `generationIndex` / `generationSite`, `modbusMapIndex` / `modbusMapSite`
- **`types/meter.ts`** — Campos opcionales `uplinkRoute`, `crcErrorsLastPoll` alineados a entidad API

---

## [0.93.0-alpha.0] - 2026-04-02 — MONITOREO V2 FASE 8 (PARCIAL): DASHBOARDS EJECUTIVO Y COMPARATIVO

### Added
- **`/dashboard/executive`** — KPIs multi-edificio, tendencias diarias (kWh, demanda agregada, costo estimado si hay tarifa), ranking por intensidad (kWh/m² o kWh/medidor), lista de alertas críticas activas
- **`/dashboard/compare`** — Comparación entre edificios (≥2) en un periodo: preset 7/30/90 días, curvas diarias superpuestas, tabla con Δ vs media del grupo. Opción **periodo anterior vs actual** (misma duración, inmediatamente anterior): barras agrupadas, tabla con energía actual/anterior y Δ entre periodos
- **`dashboardAggregations.ts`** — Utilidades puras: rangos desde preset, periodo previo, agregación portfolio y por edificio
- **Sidebar** — Entradas Ejecutivo y Comparativo; `NavLink` del dashboard en `/` con `end` para no marcar activo en rutas `/dashboard/*`

### Changed
- **`APP_ROUTES`** — `executive`, `compare`; lazy load en `router.tsx` / `lazyPages.ts`

---

## [0.92.0-alpha.0] - 2026-04-02 — MONITOREO V2 FASE 7: REPORTES E INTEGRACIONES

### Added
- **ReportsModule** — CRUD `Report`, `POST /reports/generate`, `GET /reports/:id/export` (PDF / Excel / CSV). Tipos de dataset: consumo, demanda, facturación, ejecutivo, calidad eléctrica, alertas; resto genérico. RBAC `reports:*`, scoping por `buildingIds`
- **Reportes programados** — `GET|POST|PATCH|DELETE /reports/scheduled`. Cron cada 5 min (`ReportsSchedulerService`) ejecuta vencidos y crea filas en `reports`. Expresiones vía `cron-parser` (v5)
- **IntegrationsModule** — CRUD `Integration`, `GET /integrations/:id/sync-logs` (paginado), `POST /integrations/:id/sync` (stub: log + `last_sync_at`). RBAC `integrations:*`
- **Frontend** — `ReportsPage` (`/reports`): filtros, generación en modal, descarga, tabla de programados (cron, destinatarios, toggle activo). API: `types/report.ts`, `reportsEndpoints`, `useReportsQuery`
- **Dependencias backend** — `pdfkit`, `exceljs`, `cron-parser`, `@types/pdfkit`
- **Patch DB** — `database/patches/2026-04-02-reports-add-quality-type.sql` (valor `quality` en `reports.report_type`). Init actualizado en `database/init/05-modules.sql`

### Changed
- **QueryStateView** — Alias opcionales `refetch` → reintento y `emptyMessage` → texto vacío (compatibilidad con vistas existentes)
- **Backend tests** — 365 passing (39 suites), +specs controladores reports/integrations

---

## [0.91.0-alpha.0] - 2026-04-02 — MONITOREO V2 FASE 6: ALERTAS AVANZADAS

### Added
- **Alert Engine** — Servicio cron (cada 5 min) que evalúa reglas activas contra lecturas recientes, crea alertas con deduplicación y auto-resuelve cuando la condición ya no aplica
- **6 evaluadores** (strategy pattern) para 22+ tipos de alerta:
  - Comunicación — `METER_OFFLINE`, `CONCENTRATOR_OFFLINE`, `COMM_DEGRADED`
  - Eléctrica — `VOLTAGE_OUT_OF_RANGE`, `LOW_POWER_FACTOR`, `HIGH_THD`, `PHASE_IMBALANCE`, `FREQUENCY_OUT_OF_RANGE`, `OVERCURRENT`, `BREAKER_TRIP`, `NEUTRAL_FAULT`
  - Consumo — `ABNORMAL_CONSUMPTION`, `PEAK_DEMAND_EXCEEDED`, `ENERGY_DEVIATION`
  - Operativa — `METER_TAMPER`, `CONFIG_CHANGE`, `FIRMWARE_MISMATCH`
  - Generación — `GENERATION_LOW`, `INVERTER_FAULT`, `GRID_EXPORT_LIMIT`
  - Bus — `BUS_ERROR`, `MODBUS_TIMEOUT`, `CRC_ERROR`
- **Escalation Service** — Cron cada 10 min. Escala severidad (low→medium→high→critical) según umbrales L1/L2/L3 configurados por regla
- **Notification Service** — Email (log, SES pendiente) + webhook con payload JSON. Notifica creación y escalamiento
- **`notification_logs`** — Nueva entidad para historial de notificaciones (canal, estado, destinatario, error)
- **`GET /notification-logs`** — Historial con filtros (alertId, channel, status) y paginación
- **`POST /alert-engine/evaluate`** — Trigger manual de evaluación por tenant
- **Seed SQL** — 22 reglas default con umbrales, severidad y escalamiento pre-configurados
- **AlertRulesPage** (`/alerts/rules`) — Tabla de reglas por familia con toggle activo/inactivo, filtro por familia y edificio, edición de severidad/escalamiento/config en modal, botón "Evaluar Ahora"
- **EscalationPage** (`/alerts/escalation`) — Alertas abiertas ordenadas por antigüedad, cards resumen por severidad, tiempo abierta con color coding
- **NotificationsPage** (`/alerts/notifications`) — Historial de notificaciones con filtros canal/estado, badges de color, paginación

### Changed
- **`@nestjs/schedule`** — Instalado y registrado `ScheduleModule.forRoot()` en app.module
- **AlertsModule** — Expandido con 6 evaluadores, engine, escalation, notification service, notification-logs controller
- **Router** — 3 nuevas rutas: `/alerts/rules`, `/alerts/escalation`, `/alerts/notifications`
- **API layer** — Nuevos endpoints `notificationLogsEndpoints` y `alertEngineEndpoints`, tipos `notification-log.ts` y `alert-engine.ts`
- **Backend tests** — 358 passing (37 suites), +27 tests nuevos

---

## [0.90.0-alpha.0] - 2026-04-02 — MONITOREO V2 FASE 4: FACTURACIÓN

### Added
- **`POST /invoices/generate`** — Genera factura desde readings + tariff blocks. Calcula consumo (kWh por bloque horario), demanda máxima (kW) y reactiva (kVArh) por medidor. Crea invoice + line items en transacción. Número auto-incremental `INV-XXXXXX`
- **`GET /invoices/:id/pdf`** — Renderiza factura HTML con tabla de line items (medidor, kWh, kW max, cargos) y resumen (neto, IVA, total)
- **`findOneWithLineItems`** — Helper que retorna invoice + line items en una sola llamada
- **Tipos frontend** — `types/tariff.ts` (Tariff, TariffBlock, payloads) y `types/invoice.ts` (Invoice, InvoiceLineItem, InvoiceStatus, GenerateInvoicePayload)
- **API layer** — `tariffsEndpoints` (list, get, create, update, remove, blocks, createBlock, removeBlock) y `invoicesEndpoints` (list, get, lineItems, create, update, remove, approve, void, generate, pdfUrl)
- **Query hooks** — `useTariffsQuery` (7 hooks incl. bloques) y `useInvoicesQuery` (8 hooks incl. generate)
- **TariffsPage** (`/billing/rates`) — Tabla de tarifas con filtro por edificio. CRUD tarifa en modal. Bloques horarios expandibles inline con formulario de creación y eliminación
- **InvoicesPage** (`/billing`) — Tabla de facturas con filtros por edificio y estado. Badges de color por estado. Detalle con line items en modal. Acciones: aprobar (pending), anular, eliminar (draft), descargar PDF. Modal wizard para generación (edificio → tarifa → periodo)

### Changed
- **Sidebar** — Entrada "Facturación" reemplazada por dos entradas: "Facturas" y "Tarifas"
- **APP_ROUTES** — `billing` cambia de string a objeto `{ invoices, rates }`
- **Router** — Placeholder de facturación reemplazado por `InvoicesPage` y `TariffsPage`
- **InvoicesModule** — Importa Meter, Tariff, TariffBlock, TenantUnitMeter, Reading para el cálculo de generación
- **Backend tests** — 299 passing (28 suites), +9 tests nuevos para generate, pdf y findOneWithLineItems

---

## [0.89.0-alpha.0] - 2026-04-01 — MONITOREO V2 FASE 3: VISTAS DE MONITOREO

### Added
- **API layer frontend** — Tipos, endpoints y query hooks para 3 nuevos dominios:
  - `hierarchy` — `useHierarchyByBuildingQuery`, `useHierarchyNodeQuery`, `useHierarchyNodeMetersQuery`
  - `concentrators` — `useConcentratorsQuery`, `useConcentratorQuery`, `useConcentratorMetersQuery`
  - `fault-events` — `useFaultEventsQuery`, `useFaultEventQuery`
- **RealtimePage** (`/monitoring/realtime`) — Tabla de lecturas en vivo con auto-refresh 30s. Cards resumen (en linea, sin datos, alarma, potencia total). Filtro por edificio. Indicadores de estado por medidor
- **DrilldownPage** (`/monitoring/drilldown/:siteId`) — Vista jerárquica del edificio: árbol de jerarquía eléctrica, concentradores con estado, tabla de medidores con lecturas. Breadcrumbs y links a Demanda/Calidad/Fallos
- **DemandPage** (`/monitoring/demand/:siteId`) — StockChart dual (potencia promedio + máxima). PlotLine rojo para demanda contratada. Tabla Top 10 peaks con porcentaje vs contratada
- **QualityPage** (`/monitoring/quality/:siteId`) — 4 gráficos: THD voltaje, THD corriente, factor de potencia, desequilibrio de fases. Umbrales normativos (NCh/IEEE 519) con indicadores verde/rojo. Alertas de calidad activas
- **DevicesPage** (`/monitoring/devices`) — Tabla unificada medidores + concentradores. Cards resumen por estado. Filtros por edificio, tipo de dispositivo y estado. Última comunicación y diagnóstico
- **FaultHistoryPage** (`/monitoring/fault-history/:meterId`) — Timeline visual de eventos de fallo. Filtros por tipo y rango de fecha. Cards resumen (total, abiertos, resueltos, críticos). Duración calculada

### Changed
- **Sidebar** — 2 nuevas entradas: "Tiempo Real" y "Dispositivos" en nav principal
- **Router** — 6 nuevas rutas bajo `/monitoring/*` con lazy loading
- **APP_ROUTES** — Nuevo bloque `monitoring` con 6 rutas parametrizadas

---

## [0.88.0-alpha.0] - 2026-04-01 — MONITOREO V2 FASE 2: BACKEND MODULES

### Added
- **HierarchyModule** — CRUD nodos jerarquía eléctrica (`BuildingHierarchy`) + asociación medidores (`MeterHierarchy`). 6 endpoints bajo `/hierarchy`. Permisos `admin_hierarchy`
- **ConcentratorsModule** — CRUD concentradores + gestión medidores asociados (`ConcentratorMeter`). 8 endpoints bajo `/concentrators`. Filtro por buildingId. Permisos `admin_concentrators`
- **TenantUnitsModule** — CRUD locatarios + gestión medidores asociados (`TenantUnitMeter`). 8 endpoints bajo `/tenant-units`. Filtro por buildingId. Permisos `admin_tenant_units`
- **TariffsModule** — CRUD tarifas + bloques horarios (`TariffBlock`). 8 endpoints bajo `/tariffs`. Filtro por buildingId. Permisos `billing_tariffs`
- **InvoicesModule** — CRUD facturas + line items + approve/void con guardas de estado. 8 endpoints bajo `/invoices`. Filtros buildingId/status/periodo. Permisos `billing_invoices`
- **FaultEventsModule** — Read-only eventos de fallo. 2 endpoints bajo `/fault-events`. Filtros por building/meter/severity/tipo/fecha. Permiso `monitoring_faults:read`
- **Total backend tests** — 290 passing (28 suites)

---

## [0.87.0-alpha.0] - 2026-04-01 — MONITOREO V2 FRONTEND CONECTADO A BACKEND

### Added
- **API layer frontend completo** — `routes.ts`, `endpoints.ts` con 5 dominios: buildings, meters, alerts, alertRules, readings. Cada uno con tipado estricto espejo del backend
- **Tipos TS** — `types/building.ts`, `types/meter.ts`, `types/alert.ts`, `types/reading.ts`. Readings en snake_case (raw SQL backend)
- **Query hooks** — 4 archivos con queries + mutations:
  - `useBuildingsQuery` — list, detail, create, update, delete
  - `useMetersQuery` — list (filtro buildingId), detail, create, update, delete
  - `useAlertsQuery` — list (filtros status/severity/building), acknowledge, resolve + CRUD alert rules
  - `useReadingsQuery` — time-series, latest, aggregated
- **BuildingsPage** — Tabla real (nombre, codigo, direccion, area, estado). Click navega a medidores del edificio. CRUD con `BuildingForm` modal (admin only)
- **MetersPage** — Nueva ruta `/meters`. Tabla con filtro por edificio. CRUD con `MeterForm` modal (admin only). Selector edificio pre-populated desde navigation
- **AlertsPage** — Reemplaza placeholder. Filtros por status, severidad, edificio. Acciones acknowledge y resolve inline
- **DashboardPage** — Cards KPI reales (edificios, medidores, potencia total, FP promedio). StockChart dual-axis (potencia + FP) con selector de medidor y resolucion adaptativa. Alertas activas + resumen por edificio
- **Badge alertas** — Circulo rojo con conteo de alertas activas en sidebar
- **Componentes UI** — `Modal` (dialog nativo), `ConfirmDialog` (reutiliza Modal), `BuildingForm`, `MeterForm`
- **PLAN_ACCION.md** — Plan priorizado con 8 fases y microtareas derivado de la spec funcional

### Changed
- **Sidebar** — Medidores movido de admin a nav principal. Permisos alineados con backend (`admin_alerts:read`, `monitoring_alerts:read`, etc.)
- **`useBuildingsQuery`** — Reescrito: usa `buildingsEndpoints` en vez de `api.get` directo. Agrega mutations CRUD con invalidacion de cache
- **`types/building.ts`** — `BuildingSummary` reemplazado por `Building` completo (address, areaSqm, isActive, timestamps)

---

## [0.86.0-alpha.0] - 2026-03-30 — MONITOREO V2 READINGS MODULE + DASHBOARD LAYOUT

### Added
- **ReadingsModule** — Lecturas de medidores (read-only, datos vienen de pipelines de ingesta):
  - `GET /readings?meterId=&from=&to=&resolution=&limit=` — time-series por medidor con downsampling (raw, 5min, 15min, 1h, 1d vía `time_bucket`)
  - `GET /readings/latest?buildingId=&meterId=` — última lectura por medidor (`DISTINCT ON`)
  - `GET /readings/aggregated?from=&to=&interval=&buildingId=&meterId=` — agregados hourly/daily/monthly (avg/max/min power, energy delta, PF)
- **Reading entity** — 17 columnas eléctricas: voltajes L1-L3, corrientes L1-L3, potencia activa/reactiva, PF, frecuencia, energía acumulada, THD voltaje/corriente, desequilibrio de fase, I/O digital, alarmas, CRC errors
- **Total backend tests** — 138 passing (16 suites)

### Changed
- **Dashboard semáforo** — Movido a la fila de controles (junto a Anual/Mensual y tipo gráfico), alineado a la derecha. Preview tooltip ahora se renderiza hacia abajo
- **Dashboard cards** — Aprovechan espacio vertical completo con `flex-1`
- **Tabla Facturas Vencidas** — Llena el espacio inferior sin restricciones de altura

---

## [0.85.0-alpha.0] - 2026-03-30 — MONITOREO V2 ALERTS MODULE + TECH DEBT CLEANUP

### Added
- **AlertsModule** — Alertas disparadas: `GET /alerts` (filtros: status, severity, buildingId, meterId), `GET /alerts/:id`, `PATCH /alerts/:id/acknowledge`, `PATCH /alerts/:id/resolve`. Tenant scoping + buildingIds RBAC
- **AlertRulesModule** — Configuración de reglas: `GET /alert-rules`, `GET /alert-rules/:id`, `POST`, `PATCH`, `DELETE`. Reglas globales (sin building) visibles para todos los buildings del usuario
- **`require-permission.decorator.ts`** — Decoradores `@RequirePermission` y `@RequireAnyPermission` extraídos a archivo propio
- **Regla NestJS** — `.claude/rules/nestjs-module-pattern.md` documenta el patrón exacto del backend v2
- **Total backend tests** — 112 passing (14 suites)

### Changed
- **DELETE endpoints** — Retornan 204 No Content (`@HttpCode`) en vez de 200 sin body
- **tsconfig** — `strict: true` reemplaza flags individuales
- **Jest** — `coverageThreshold` 80% global (branches, functions, lines, statements)
- **AuditLogInterceptor** — Errores se loggean con `Logger.warn()` en vez de silenciarse
- **RolesService** — `access_level` removido de la query (se consultaba pero nunca se usaba)
- **PlatformAlert FK** — `acknowledgedBy`/`resolvedBy` cambiados de `SET NULL` a `NO ACTION` (preserva audit trail)

### Removed
- **TenantMiddleware** — Era no-op (tenant viene exclusivamente del JWT)
- **RolesGuard** — Marcado como deprecated y nunca importado por ningún controller
- **6 directorios vacíos** — `common/filters/`, `auth/guards/`, `tenants/dto/`, `users/dto/`, `iot-readings/dto/`, `common/middleware/`

---

## [0.84.0-alpha.0] - 2026-03-30 — MONITOREO V2 BUILDINGS + METERS CRUD

### Added
- **BuildingsModule** — CRUD completo con tenant scoping y buildingIds RBAC. 46 tests
- **MetersModule** — CRUD completo: `GET /meters(?buildingId=)`, `GET /meters/:id`, `POST`, `PATCH`, `DELETE`. Tenant scoping + buildingIds RBAC + filtro por buildingId. Permisos: `admin_meters` (write), `admin_meters|dashboard_executive|dashboard_technical` (read). 24 tests
- **Total backend tests** — 70 passing (10 suites)

---

## [0.83.0-alpha.0] - 2026-03-25 — MONITOREO V2 CHARTS + STORYBOOK

### Added
- **Chart components** — 3 componentes Highcharts agnósticos y reutilizables en `monitoreo-v2/frontend`:
  - `Chart` — wrapper básico con hover sync (highlight index ↔ tabla)
  - `StockChart` — Highcharts Stock con navigator, range selector, loading overlay, dual-axis
  - `MonthlyChart` — chart mensual con toggle de tipo (column/line/area/pie), soporte moneda
- **chart-config.ts** — config central: colores desde CSS variables, `baseChartOptions()`, `stockChartExtras()`, `axisLabelFormatter()`
- **Storybook 9** — catálogo de componentes en puerto 6006 con stories para los 3 charts
- **Ruta `/components`** — vista de showcase en sidebar (demo con datos sintéticos)

### Changed
- **Sidebar** — iconos emoji removidos, solo texto. "Cerrar Sesión" movido al fondo del sidebar (antes "Salir" en header)

### Fixed
- **Microsoft login race condition** — `useSessionResolver` ahora espera `InteractionStatus.None` de MSAL antes de resolver sesión, evitando que `clearSession()` rebote al usuario a `/login` antes del redirect callback
- **HighchartsReact import** — cambiado de default import a named import `{ HighchartsReact }` (ESM/Vite devolvía objeto en vez de componente)

---

## [0.82.0-alpha.0] - 2026-03-25 — MONITOREO V2 FRONTEND + AUTH E2E

### Added
- **monitoreo-v2/frontend** — React 19 + Vite 7 + Tailwind v4 + TypeScript 5.9
- **Auth cookie-based** — OAuth (Microsoft + Google) → POST `/auth/login` → httpOnly cookies → GET `/auth/me`
- **Endpoint `GET /auth/me`** (backend) — perfil usuario + theming tenant desde JWT cookie
- **Google access_token** (backend) — fallback via Google userinfo API cuando el token no es JWT
- **Login multi-provider** — mismo email puede loguear con Microsoft o Google (linkeo automatico por email)
- **Session flag** — `localStorage.has_session` evita 401 innecesario en carga inicial (sin sesion no llama `/auth/me`)
- **MSAL redirect flow** — `loginRedirect` + `acquireTokenSilent` post-redirect (replica patron v1)
- **COOP header** — `same-origin-allow-popups` en Vite dev para popup Google
- **Stores Zustand** — `useAuthStore` (user + tenant) y `useAppStore` (sidebar)
- **Theming dinamico** — CSS variables `--color-primary/secondary` desde tenant
- **Layout** — Sidebar, Header con usuario/rol/logout, ProtectedRoute
- **LoginPage** — botones identicos Microsoft + Google, manejo de errores
- **Seed** — tenant Globe Power + user admin en TimescaleDB

### Fixed
- **Auth interceptor loop** — rutas auth excluidas del interceptor 401 para evitar ciclo infinito
- **Session resolver loop** — `useSessionResolver` con ref guard, separado de `useAuth`

---

## [0.81.0-alpha.0] - 2026-03-25 — MONITOREO V2 SCAFFOLD

### Added
- **monitoreo-v2/backend** — NestJS 11 scaffold multi-tenant con TimescaleDB
- **Docker Compose** — TimescaleDB (PG16) + backend como servicios separados (target: Fargate)
- **Schema multi-tenant** — `tenants` (theming), `users`, `buildings`, `meters`, `refresh_tokens`, `audit_logs` (hypertable), `iot_readings` (hypertable + compresión 7d + retención 2y)
- **Continuous aggregates** — `iot_readings_hourly` y `iot_readings_daily` pre-calculados
- **Auth OAuth** — Microsoft + Google via JWKS (`jose`), verificación de audience + issuer
- **JWT httpOnly cookies** — access token 15min + refresh token 7d con rotación atómica (FOR UPDATE)
- **Tenant via JWT** — tenant resuelto exclusivamente desde JWT payload (sin header spoofing)
- **ISO 27001 hardening** — helmet, rate limiting (3 tiers), CORS estricto, ValidationPipe global, audit log interceptor, `getOrThrow` para secrets, sin fallbacks en código

---

## [0.80.0-alpha.0] - 2026-03-25 — FIX SIEMENS VIEWS + IOT VARIABLE MAP

### Fixed
- **Operator filter bypass para Siemens** — Buildings, Alerts y Realtime mostraban vacío porque `useOperatorFilter` (PASA) ocultaba datos IoT. Ahora las 3 páginas saltan el filtro cuando `theme === 'siemens'`
- **POC3000 VARIABLE_MAP** — 10 variables tenían nombres incorrectos en `iot-ingest` Lambda: potencia reactiva (`Power/var/Q1/Inst/Value/Sum`), frecuencia (`Frequency/Inst/Value/Common`), energía (`Energy/Wh/Import/OnPeakTariff/Sum`), THD voltaje (`THD/V_LN/Inst/Value/L1N#`), THD corriente (`THD/I/Inst/Value/L2#`)
- **Backfill IoT readings** — 123 filas en prod actualizadas desde `raw_json` via dbVerify Lambda

### Added
- **Endpoint `GET /iot-readings/alerts`** — genera alertas on-the-fly desde anomalías en `iot_readings` (voltaje fuera de rango, PF bajo, potencia alta, THD elevado)
- **`useAlerts` theme-aware** — PASA → `/alerts`, Siemens → `/iot-readings/alerts`
- **`backfillIotReadings` en dbVerify** — migración para re-extraer columnas de `raw_json` con nombres correctos

---

## [0.78.0-alpha.0] - 2026-03-24 — IOT CORE SIEMENS + MULTI-TEMA

### Added
- **AWS IoT Core** — Thing `siemens-poc3000`, certificados TLS, policy `powercenter/*`
- **Regla IoT → S3** — `powercenter_to_s3` deposita mensajes en `s3://energy-monitor-ingest-058310292956/raw/iot/powercenter/data/`
- **Lambda `iot-ingest-dev-ingest`** — cada 15 min procesa S3 → tabla `iot_readings` en RDS (deduplicación por unique index)
- **Tabla `iot_readings`** — 28 columnas eléctricas (voltaje 3F, corriente 3F, potencia activa/reactiva/aparente, FP, frecuencia, energía, THD, demanda punta) + `raw_json` JSONB con las 451 variables del POC3000
- **Backend `IotReadingsModule`** — 8 endpoints read-only: `latest`, `timeseries` (resolución raw/hour/day), `readings` paginadas, `stats`, `buildings` (formato BuildingSummary), `meters-latest` (formato MeterLatestReading), `monthly` (formato MeterMonthly), `meter-readings` (formato MeterReading)
- **Multi-tema frontend** — toggle PASA/Siemens en sidebar, colores vía CSS variables `[data-theme="siemens"]`
- **Colores Siemens** — teal `#009999`, navy `#00646E`, amber `#E6830F`, fondo `#F3F3F0`
- **Logo y tab dinámicos** — favicon y título del navegador cambian según tema
- **StockChart `variant="light"`** — tema claro para gráficos (fondo blanco, bordes grises)
- **Gráficos theme-aware** — colores de series leen CSS variables dinámicamente via `getChartColors()`
- **Scripts verificación IoT** — `infra/iot-verify/verify.sh` (estado completo) y `query.sh` (consultar datos)
- **Lambda `external-ingest`** — API REST con API Key para ingesta genérica (backup, no usado por Siemens)

### Changed
- **Hooks theme-aware** — `useBuildings`, `useAllMetersLatest`, `useMeterMonthly`, `useMeterReadings`, `useMeterInfo` detectan tema y consultan `iot_readings` o tablas PASA según corresponda
- **BuildingsPage** — "Ver más" navega a `/meters/{deviceId}` en Siemens; oculta CRUD
- **DashboardPage** — redirige a `/buildings` cuando tema es Siemens (sin datos financieros)
- **TempLayout sidebar** — oculta Dashboard, Comparativas y Admin para Siemens; oculta selectores modo/operador/edificio
- **`index.html`** — título genérico "Energy Monitor" (tema lo ajusta al entrar)
- **`chartConfig.ts`** — colores via `getChartColors()` / `getSeriesColors()` con CSS variables dinámicas
- **`useAppStore`** — nuevo campo `theme` (`'pasa' | 'siemens'`) persistido en sessionStorage

### Infrastructure
- **IoT Core** — endpoint `a3ledoeiifsfil-ats.iot.us-east-1.amazonaws.com:8883`, cert activo, policy permite `meters/*` y `powercenter/*`
- **Siemens conectado** — POC3000 "Medidor Servidores" enviando 451 variables cada 15 min vía MQTT
- **S3** — datos en `raw/iot/powercenter/data/{fecha}/{hora}-{uuid}.json` (~79 KB/msg)
- **RDS** — tabla `iot_readings` con unique index `(device_id, timestamp)`, 62+ registros y creciendo

---

## [0.77.0-alpha.0] - 2026-03-22 — GLOBE LANDING + LIMPIEZA DOCS

### Changed
- **Globe Landing contacto** — email a comercial@globepower.cl, eliminado teléfono y nombre personal
- **Globe Landing deploy** — desplegado en globepower.cl (CloudFront `EHRW4X3FSU1YQ` → S3 raíz)

### Removed
- **docs/** — 20 archivos obsoletos eliminados (screenshots, PDFs, specs y planes ya procesados)

---

## [0.76.0-alpha.0] - 2026-03-19 — COMPARATIVAS + CIFRAS MEDIOAMBIENTALES + FIX BUILDING NAMES

### Changed
- **Comparativas rediseñada** — barras = tiendas, dual chart agrupado por edificio, filtros dinámicos scoped
- **Comparativas Multi Operador** — tienda fija, sin selector tiendas/tipos, solo edificios y mes
- **Comparativas límites** — máx 3 edificios, 20 tiendas, 10 tipos; chart top 20 por consumo
- **Cifras Medioambientales** — datos reales XLSX "SIM 2025" sección 5 Activos (filas 31-38)
- **Cifras Medioambientales columnas** — 12 meses + Total + Factor, con ABL e Intensidad consumo
- **Dashboard título** — "Consumo Anual" simplificado (sin "por Activo Inmobiliario")
- **Dashboard** — filtrado `building_summary` a meses >= 2025-01-01

### Fixed
- **Building names en alertas** — "Mallplaza Gestión/Marketing" → nombres PASA reales
- **dbVerify** — canonicalización automática de building names en 3 tablas

### Added
- **Endpoints comparativas** — `by-store`, `grouped-by-type`, `filters?buildingNames=`
- **Tipos TS** — `ComparisonStoreRow`, `ComparisonTypeRow`

---

## [0.75.0-alpha.0] - 2026-03-19 — AUTH REAL + OPTIMIZACIÓN QUERIES + SYNTHETIC 15 MIN

### Changed
- **Auth activada** — eliminado `@Public()` de 10 controllers; todos los endpoints requieren JWT (excepto `GET /invitations/:token`)
- **`findByBuilding`** — eliminada LATERAL sobre meter_readings (30.7M); usa columna pre-computada `is_three_phase` en store (1227ms → 3ms)
- **`findLatestByBuilding`** — usa tabla cache `meter_latest_reading` via función SQL `fn_latest_readings_by_building` (500ms → 1ms)
- **Synthetic generator** — frecuencia de 1 min a 15 min; ahora prune la lectura más antigua por meter y refresca cache `meter_latest_reading`
- **backfill-vcf Lambda** — tabla temporal cambiada de `UNLOGGED TABLE` a `TEMP TABLE` (session-scoped, evita race condition entre invocaciones concurrentes)

### Added
- **Tabla `meter_latest_reading`** — cache de última lectura por medidor, refrescada cada 15 min por synthetic generator
- **Columna `store.is_three_phase`** — booleano pre-computado, evita escanear meter_readings para detectar fase
- **Función SQL `fn_latest_readings_by_building`** — lectura optimizada desde cache
- **Migración 020** — `sql/020_meter_optimizations.sql`

---

## [0.74.0-alpha.0] - 2026-03-19 — PERMISOS POR MODO + AUTH REFRESH + BREADCRUMBS + DELETE USERS

### Changed
- **Modo Operador** — restricciones de vista: sin Comparativas, sin Admin Usuarios, sin Listado Remarcadores, sin drawer Detalle por Tienda
- **Modo Técnico** — sin acceso a Admin Usuarios en sidebar
- **Activos Inmobiliarios cards** — layout de grid a flex
- **Breadcrumbs encadenados** — navegación jerárquica en las 3 subvistas de Activos Inmobiliarios
- **Endpoint `/meters/:id/info`** — ahora incluye `buildingName` para breadcrumbs
- **Sidebar active state** — se mantiene activo en `/meters/*` (subvistas de Activos Inmobiliarios)
- **Auth 401 interceptor** — intenta refresh silencioso MSAL antes de redirigir a login
- **`resolveBackendUser`** — ya no borra token en errores de red/timeout (solo en 401/403)

### Added
- **Eliminar usuarios** — botón bulk delete con confirmación en Admin Usuarios (`DELETE /users`)
- **Código remarcador en header** — visible en modo Operador junto al nombre del edificio

---

## [0.73.0-alpha.0] - 2026-03-18 — DASHBOARD REFACTOR + CIFRAS MEDIOAMBIENTALES + BACKFILL

### Changed
- **Dashboard layout** — de grid a flex, dos filas: gráficos+cards arriba, tablas abajo
- **Dashboard refactor** — DashboardPage de 928 a ~400 líneas, componentes extraídos a `components/`
- **Consumo en mWh** — gráficos y tablas muestran mWh (÷1000) en vez de kWh
- **DataTable footer** — movido dentro de la misma tabla (alineación correcta con columnas)
- **DataTable bordes** — SectionBanner y footer con `rounded-xl`, sin línea gris en última fila
- **Soporte y Contacto** — actualizado a aportilla@globepower.cl, 227810274
- **Columna "Edificio"** — renombrada a "Activos Inmobiliarios"
- **Rendimiento columnas** — sin abreviar, headers en doble fila

### Added
- **Cifras Medioambientales** — toggle en tabla consumo, con selector año/mes vía PillDropdown
- **Comparativa drawer** — gráficos Consumo e Ingreso por edificio, multi-select con checkboxes y búsqueda
- **PillDropdownMulti** — componente multi-select con checkboxes y buscador
- **Rendimiento Consumo (mWh/m²)** — columna calculada con 3 decimales
- **Rendimiento Ingreso ($/m²)** — columna calculada
- **Botón Comparativa** — en controles del dashboard, abre drawer
- **"Última actualización"** — fecha dummy en las 3 cards
- **offlineAlerts Lambda** — handler creado (detecta medidores sin lecturas, inserta alertas METER_OFFLINE)
- **backfill-vcf** — Lambda para rellenar voltage/current desde CSVs de S3 (MM, OT, SC52, SC53 completados)
- **Usuario aportilla@globepower.cl** — SUPER_ADMIN en RDS

### Fixed
- **offlineAlerts crash** — Lambda crasheaba cada 5 min (módulo no existía)
- **503 billing** — era cold start puntual, no bug
- **RDS cleanup** — eliminada tabla huérfana `_vcf_tmp` (442 MB liberados)
- **Meters queries** — optimizadas con CTE + LATERAL
- **Comparisons validation** — agregado BadRequestException para params faltantes

---

## [0.72.0-alpha.0] - 2026-03-18 — DASHBOARD DUAL CHARTS + UI FIXES

### Changed
- **Dashboard gráficos** — separados en dos: Consumo (kWh) e Ingreso (CLP) lado a lado
- **Dashboard cards** — contenido responsivo con breakpoints `xl` / `2xl`, texto se adapta a 13"
- **Dashboard tablas** — footer fuera del scroll (siempre visible), padding reducido
- **Building Detail chart** — altura reducida a 300px, overflow contenido, toggle movido al SectionBanner
- **"Potencia" → "Potencia Activa"** — en todas las vistas (Monitoreo, Buildings, Meters)
- **Eje Y Ingreso** — tick cada $500M, sin decimales en labels de millones
- **Eje Y Consumo** — tick cada 2M kWh
- **DataTable** — scroll horizontal eliminado (`overflow-x-hidden`), footer con `mt-auto`
- **Operadores meter count** — fix `COUNT(DISTINCT)` en query
- **Tab Operadores** — eliminada de Building Detail (redundante con Listado Remarcadores)
- **Main padding** — reducido padding inferior para maximizar espacio

### Added
- **Columna Fase** — Monofásico/Trifásico en Listado Remarcadores (derivado de `voltage_l2`)
- **Subcolumnas Voltaje/Corriente** — L1, L2, L3 con header agrupado en Resumen diario
- **DataTable columnGroups** — soporte de headers agrupados con `colSpan`

---

## [0.71.0-alpha.0] - 2026-03-18 — ADMIN USERS + INVITATIONS + EMAIL

### Added
- **AdminUsersPage** — vista Administración Usuarios con tabla, checkboxes y acciones
- **Invitación por email** — formulario con nombre, email y modo; envío via AWS SES
- **Reenvío de invitación** — selección múltiple con checkboxes + botón reenviar
- **Usuario directo** — endpoint `POST /users/direct` para crear usuarios sin invitación
- **InvitationAcceptPage** — página `/invite/:token` con validación y login
- **userMode en DB** — columna `user_mode` en tabla `users`, asignado en invitación, aplicado al login
- **Google access_token** — backend verifica tokens opacos via Google userinfo API
- **AWS SES** — dominio verificado, DKIM configurado en Route 53
- **dbVerify migration** — tablas auth (roles, users, sessions, modules, permissions) creadas via Lambda

### Changed
- **CSP** — agregado `accounts.google.com` a `script-src` y `frame-src`
- **COOP** — CloudFront header cambiado a `same-origin-allow-popups`
- **Login buttons** — loading separado por provider, Google usa `useGoogleLogin` (popup)
- **Modo → Rol** — mapeo automático: Holding=CORP_ADMIN, Multi Operador=OPERATOR, Operador=TENANT_USER, Técnico=ANALYST

---

## [0.70.0-alpha.0] - 2026-03-18 — AUTH LOGIN + SESSION MANAGEMENT

### Added
- **LoginPage** — página de inicio de sesión con botones Microsoft (MSAL redirect) y Google (popup)
- **UnauthorizedPage** — página de acceso denegado
- **Axios interceptors** — Bearer token automático, redirect a `/login` en 401

### Changed
- **main.tsx** — reactivados `MsalProvider`, `GoogleOAuthProvider`, `captureGoogleHash` y `validateEnv()`
- **router.tsx** — rutas `/login` y `/unauthorized` públicas; demás protegidas con `ProtectedRoute`
- **TempLayout** — logout funcional

---

## [0.69.0-alpha.0] - 2026-03-18 — MONITOREO FILTERS + COMPARATIVAS RESPONSIVE

### Added
- **Filtros avanzados en Monitoreo** — ambas tablas (Monitoreo y Alertas) usan filtros cascading con `ColumnFilterDropdown`, `DateFilterDropdown` y `RangeFilterDropdown`
- **Sorting en Monitoreo** — todas las columnas de ambas tablas soportan ordenamiento asc/desc
- **Componentes filtro compartidos** — `ColumnFilterDropdown`, `DateFilterDropdown`, `RangeFilterDropdown` extraídos de Dashboard a `components/ui/`
- **Soporte y Contacto** — datos de contacto en sidebar ocultos tras botón colapsable con transición suave

### Changed
- **Gráfico Comparativas** — altura fija 230px (antes dinámica), labels eje X a 10px con rotación -10°
- **"Gasto" → "Ingreso" en Comparativas** — chart (series, ejes, tooltips) y tabla usan "Ingreso" en modo Holding
- **Tabla Comparativas** — proporción tabla aumentada (`flex-[2.4]`)
- **Building Detail** — header con flex-wrap, contenido scrollable en tablet
- **Realtime** — SectionBanner con flex-wrap

---

## [0.68.0-alpha.0] - 2026-03-18 — DASHBOARD RESPONSIVE 13"

### Changed
- **Dashboard grid breakpoint** — layout de 2 columnas sube de `md`/`lg` a `xl` (1280px); en 13" las secciones stackean verticalmente
- **Cards de pago** — más compactas: padding reducido, texto `text-base`, se muestran en fila de 3 cuando stackeadas
- **Gráfico Dashboard** — altura reducida de 384px a 240px para caber en pantallas 13"
- **Gap general** — de 24px a 16px entre secciones

---

## [0.67.0-alpha.0] - 2026-03-18 — RESPONSIVE + RENAME + CHART TOGGLE

### Added
- **Sidebar colapsable** — oculto en tablet (< 1024px), botón hamburguesa en topbar, overlay al abrir
- **Selector de moneda dummy** — PillDropdown CLP/USD/COP/SOL en tablas de Dashboard y Comparativas (visual, sin lógica)

### Changed
- **"Gasto" → "Ingreso"** — gráfico, toggle, serie y columna de tabla en Dashboard
- **TogglePills en BillingChart** — reemplaza botones custom por design system PA (Barra/Línea/Área/Torta)
- **Grids responsivos** — `md:grid-cols-[3fr_1fr]` en Dashboard para tablet (768px+)
- **Flex-wrap** — controles Dashboard y toolbar Comparativas envuelven en pantallas angostas

---

## [0.66.0-alpha.0] - 2026-03-17 — DASHBOARD FILTERS + DRAWER UX

### Added
- **Toggle Consumo/Gasto** — selector en gráfico principal para ver una métrica a la vez
- **Selector de año** — pills de año + meses en vista mensual (reemplaza dropdown)
- **Sorting en DataTable** — propiedad `sortKey` en columnas, flechas asc/desc en headers
- **Filtros cascada en Drawers** — Edificio, Operador, N° Doc se filtran cruzadamente
- **Búsqueda en filtros** — input de texto en `ColumnFilterDropdown` para buscar items
- **Filtro por fecha** — `DateFilterDropdown` con fecha exacta o rango (Desde/Hasta)
- **Filtro por rango numérico** — `RangeFilterDropdown` con slider dual en columnas Neto, IVA, Total
- **Previsualización PDF** — botón ojo en columna PDF abre modal con iframe
- **Períodos como pills** — drawer Facturas Vencidas muestra períodos como etiquetas en fila

### Changed
- **"Edificios" → "Activos Inmobiliarios"** — sidebar nav y textos del dashboard
- **Títulos de gráfico y tabla** — "por Edificio" → "por Activo Inmobiliario"
- **"Documentos Vencidos" → "Facturas Vencidas"** — título de tabla de vencidos
- **Nombres cortos edificios** — más compactos para caber en ejes de gráficos
- **Meses con nombre completo** — pills y títulos usan "Enero", "Febrero", etc.
- **DataTable empty state** — celdas individuales en vez de colSpan (preserva anchos)
- **DataTable align center** — nueva opción `'center'` para columnas como PDF
- **CSP** — `frame-src blob:` agregado para permitir previsualización PDF en iframe

### Fixed
- **Mes default** — selecciona el mes con más edificios (evita mes con 1 solo registro)
- **Deseleccionar último edificio** — filtro ahora permite deseleccionar todos
- **Badge cascada** — muestra conteo de items disponibles seleccionados, no total global

---

## [0.65.0-alpha.0] - 2026-03-17 — UI POLISH + SWAGGER PROD

### Added
- **WhatsApp y Email** — íconos de contacto en topbar (entre banderas y user menu)
- **Cerrar Sesión** — botón con ícono en sidebar footer, debajo de línea separadora
- **Swagger en prod** — `GET /api/spec` sirve JSON spec, `GET /api/docs` redirige a Swagger UI pública

### Changed
- **Sidebar footer** — "Contacto Globe" → "Contacto Globe Power", texto 13px, reordenado sobre la línea gris
- **Dashboard** — título "Consumo y Gasto por Edificio" alineado al borde superior de cards laterales
- **Comparativas** — toggles Por Tipo/Por Tienda y Barra/Línea/Área/Torta migrados a `TogglePills`
- **MultiSelect** — rediseñado con tokens PA (pill button, rounded-xl dropdown, tipografía consistente)

---

## [0.64.0-alpha.0] - 2026-03-17 — CARGA MASIVA CSV + EMPTY STATES

### Added
- **Bulk CSV upload** — carga masiva de medidores por edificio desde BuildingDetailPage (solo Holding)
- **BulkMeterUpload** — componente con 4 fases: idle (drop zone), preview (tabla validada), submitting, result (resumen + errores)
- **Validación client-side** — campos vacíos, meter_id > 10 chars, duplicados en CSV
- **Auto-creación de store_types** — tipos no existentes se crean automáticamente (MAX(id)+1)
- **Savepoints por fila** — errores individuales no abortan la transacción completa
- **Backend endpoint:** `POST /stores/bulk` — recibe `{ items: BulkStoreItemDto[] }`, retorna `{ successCount, errors[] }`
- **Frontend hook:** `useBulkCreateStores` — mutation con invalidación de stores, meters, operators y store-types
- **Dependencia:** `papaparse` para parsing CSV client-side

### Changed
- **BuildingDetailPage** — botón "Cargar CSV" junto a "+ Remarcador" en tab medidores (Holding), drawer con BulkMeterUpload
- **Empty states** — todas las subvistas de edificio (gráfico, billing, meters, operadores, drawer desglose) mantienen el espacio del componente aunque no haya datos, con mensaje "Sin datos" centrado
- **BuildingDetailPage** — tabs y card siempre visibles aunque el edificio esté vacío; tab default pasa a "meters" si no hay billing

---

## [0.63.0-alpha.0] - 2026-03-16 — CRUD EDIFICIOS, OPERADORES Y REMARCADORES

### Added
- **CRUD Edificios** — crear, editar área y eliminar desde BuildingsPage (solo Holding)
- **CRUD Operadores** — renombrar y eliminar por edificio desde nuevo tab "Operadores" en BuildingDetailPage
- **CRUD Remarcadores** — crear, editar y eliminar medidores desde tab "Remarcadores" en BuildingDetailPage
- **Tab "Operadores"** en BuildingDetailPage — lista operadores con meterCount, visible solo en modo Holding
- **ContextMenu** — componente reutilizable con botón 3 puntos y dropdown (Editar/Eliminar)
- **ConfirmDialog** — modal de confirmación para acciones destructivas
- **BuildingForm, OperatorForm, MeterForm** — formularios en Drawer para cada entidad
- **Backend endpoints:** `POST/PATCH/DELETE /buildings/:name`, `GET/PATCH/DELETE /stores/operators/:building/:op`, `POST/PATCH/DELETE /stores/:meterId`
- **Frontend hooks:** `useCreateBuilding`, `useUpdateBuilding`, `useDeleteBuilding`, `useOperatorsByBuilding`, `useRenameOperator`, `useDeleteOperator`, `useCreateStore`, `useUpdateStore`, `useDeleteStore`, `useStoreTypes`

### Changed
- **BuildingsPage** — botón "+ Nuevo Edificio" y ContextMenu por card (solo Holding)
- **BuildingDetailPage** — tabs dinámicos, botón "+ Remarcador", drawer CRUD medidores
- **MetersTable** — columna opcional con ContextMenu por fila (solo Holding)

---

## [0.62.0-alpha.0] - 2026-03-16 — REFACTOR: IF-CHAINS → MAPPINGS DECLARATIVOS

### Changed
- **Badge builder** — `badgeRules` array declarativo en AlertsPage y RealtimePage (reemplaza 5 `if` consecutivos)
- **`getStatus()`** — `STATUS_THRESHOLDS` array con `.find()` en RealtimePage (reemplaza 3 `if`-return)
- **`parseDateFilterFromParams()`** — función extraída en AlertsPage y RealtimePage (elimina duplicación URL→DateFilterState)
- **Filter predicates** — `FILTER_CHECKS` array con `.every()` en ambas vistas de alertas (reemplaza 5-7 `if` consecutivos)
- **`rangeToPeriodValue()`** — `PERIOD_PREFIXES.find()` en DashboardPage (reemplaza 4 `if`)
- **`matchesPeriod()`** — `PERIOD_RANGES` record con funciones predicado en DashboardPage (reemplaza 4 `if`)
- **MetersTable** — `UNOCCUPIED_NAMES` Set module-level (reemplaza 4 `||` encadenados)

---

## [0.61.0-alpha.0] - 2026-03-16 — PIE CHARTS + INFINITE SCROLL GLOBAL

### Added
- **Torta** como modo de gráfico en MonthlyColumnChart, Dashboard ComboChart y Comparativas
- **PillDropdown** para selector de mes en Comparativas (reemplaza `<select>`)

### Changed
- **DataTable** — simplificado a infinite scroll global cuando se pasa `pageSize` (eliminada paginación clásica y prop `infiniteScroll`)
- **MetersTable** — usa DataTable directo con `pageSize={20}` (antes usaba PaginatedTable)

### Removed
- **PaginatedTable** — componente eliminado, sin usos restantes

---

## [0.60.0-alpha.0] - 2026-03-16 — MODO TÉCNICO + SIDEBAR RESPONSIVE

### Added
- **Modo Técnico** — ve toda la data técnica (edificios, medidores, monitoreo, alertas, comparativas) pero oculta todo lo financiero
- **Flag `isTecnico`** en `useOperatorFilter` — disponible para todas las vistas
- **Prop `fullWidth`** en `PillDropdown` — botón ocupa 100% del contenedor, labels largos se truncan con tooltip

### Changed
- **Dashboard** — bloqueado en modo Técnico con mensaje específico
- **Nav sidebar** — oculta Dashboard en modo Técnico
- **BuildingDetail** — oculta gráfico facturación y tab billing en modo Técnico (mismo patrón que modos filtrados)
- **Comparativas** — oculta columna Gasto ($), eje CLP en gráficos, pie Gasto (CLP) y ajusta títulos de sección
- **Sidebar dropdowns** — todos usan `fullWidth` para respetar el ancho del sidebar sin desbordarse

---

## [0.59.0-alpha.0] - 2026-03-16 — FIX PDF EN PROD + TEST ENDPOINTS

### Fixed
- **PDF endpoint en prod** — `Utf8JsonInterceptor` sobreescribía `Content-Type: application/pdf` con `application/json`, corrompiendo la respuesta binaria
- **Binary settings** — `serverlessExpress()` ahora declara `binarySettings` con `application/pdf` para que API Gateway trate el PDF como binario
- **billing-pdf-generator Lambda** — `psycopg2._psycopg` no se encontraba porque Docker compilaba deps para ARM (aarch64) en vez de x86_64; agregado `--platform linux/amd64` al deploy script

### Verified
- 24 endpoints testeados en prod — todos OK (auth, dashboard, buildings, stores, meters, readings, billing, comparisons, alerts, PDF)

---

## [0.58.0-alpha.0] - 2026-03-16 — MODO OPERADOR

### Added
- **Modo Operador** — usuario selecciona edificio → tienda en sidebar, todas las vistas filtran a ese 1 medidor
- **Selectores edificio + tienda** en sidebar (`PillDropdown`) — visibles solo en modo Operador, tienda se habilita al elegir edificio
- **Campos `selectedBuilding` y `selectedStoreMeterId`** en `useAppStore` — persistidos en sessionStorage, se limpian al cambiar modo
- **Flags `isFilteredMode`, `needsSelection`, `hasStore`, `isOperadorMode`** en `useOperatorFilter` — unifican la lógica de filtrado para ambos modos (Multi Operador y Operador)
- **`selectedStoreName`** en `useOperatorFilter` — lookup del nombre de tienda desde meterId para compatibilidad con API de comparativas

### Changed
- **6 vistas** actualizadas: reemplazan checks `isMultiOp` por `isFilteredMode` — ambos modos (Multi Operador y Operador) comparten la misma lógica de filtrado
- **`useOperatorFilter`** — extendido para cubrir ambos modos; outputs unificados (`operatorMeterIds`, `operatorBuildings`) alimentados por cualquiera de los dos modos
- **`setUserMode`** — ahora resetea también `selectedBuilding` y `selectedStoreMeterId`

---

## [0.57.0-alpha.0] - 2026-03-16 — MULTI OPERADOR: VISIBILIDAD CONDICIONAL

### Added
- **Selector de operador** en sidebar — segundo PillDropdown visible solo en modo Multi Operador, con lista de nombres de tienda desde `/comparisons/filters`
- **Estado `selectedOperator`** en `useAppStore` — persistido en sessionStorage, se limpia al cambiar de modo
- **Hook `useOperatorFilter`** — provee `operatorMeterIds` y `operatorBuildings` para filtrado client-side en todas las vistas
- **Hook `useStores`** + endpoint `GET /stores` en frontend — obtiene todos los stores para mapear operador → meterIds
- **Prop `placeholder`** en `PillDropdown` — texto por defecto cuando no hay valor seleccionado

### Changed
- **Dashboard** — oculta completamente gráfico, cards de pagos, tablas y drawers en modo Multi Operador; muestra mensaje indicando navegar a otras vistas
- **Edificios** — filtra cards a solo edificios donde el operador tiene tiendas; muestra mensaje si no hay operador seleccionado
- **Detalle Edificio** — oculta gráfico y tab Facturación; inicia en tab Remarcadores; filtra medidores y drawer de tiendas al operador
- **Comparativas** — fuerza modo "Por Tienda", auto-selecciona el operador, oculta toggle de modo y selector de nombres
- **Monitoreo** — filtra tabla de lecturas a medidores del operador
- **Alertas** — filtra alertas a medidores del operador

### Types
- **`StoreItem`** — nueva interfaz frontend (meterId, storeName, storeTypeId, storeType)

---

## [0.56.0-alpha.0] - 2026-03-16 — DASHBOARD: CARDS PAGOS Y DRAWER POR PERÍODO

### Added
- **Click en fila** de tabla "Documentos Vencidos por Período" abre drawer Facturas Vencidas con el período ya seleccionado (1-30, 31-60, 61-90, 90+ días)

### Changed
- **Cards Pagos Recibidos / Facturas por Vencer / Facturas Vencidas**: borde `border-pa-navy/30`, sin padding interno, altura por contenido (sin estirar)
- **Card (componente)** — borde por defecto `border border-pa-navy/30` en todas las cards

---

## [0.55.0-alpha.0] - 2026-03-16 — DASHBOARD: VISTA ANUAL, PDF LOCAL Y MEJORAS

### Added
- **Toggle Anual/Mensual** en gráfico Dashboard — vista anual agrega totales por edificio, mensual mantiene comportamiento previo
- **Generación PDF local** — en dev, billing service ejecuta Python handler vía subprocess (sin Lambda)
- **Filtro por período** en drawer Facturas Vencidas — PillDropdown con 5 opciones: Todos, 1-30, 31-60, 61-90, 90+ días
- **Navegación a detalle edificio** desde tabla Dashboard — click en fila navega a `/buildings/:id`
- **Prop `align`** en PillDropdown — `left` o `right` para controlar dirección de apertura del listado

### Fixed
- **Import handler PDF** — corregido `lambda_handler` → `handler` en billing service
- **Labels gráfico PDF** — meses en eje horizontal ya no se superponen con barras (translate offset ajustado)
- **Filename PDF** — mes normalizado a `YYYY-MM` en nombre de descarga

### Changed
- Drawers renombrados: "Facturas por Vencer" / "Facturas Vencidas"

---

## [0.54.0-alpha.0] - 2026-03-16 — GRÁFICO TORTA EN COMPARATIVAS

### Added
- **Gráfico Torta** en Comparativas (modo "Por Tipo") — dos pies lado a lado: Consumo kWh y Gasto CLP
- **Botón "Torta"** condicional en selector de tipo de gráfico (solo visible en modo "Por Tipo")
- **`ChartType`** extendido con `'pie'`

### Changed
- Al cambiar de "Por Tipo" a "Por Tienda" con torta activa, resetea a barra automáticamente

---

## [0.53.0-alpha.0] - 2026-03-16 — SELECTOR MODO USUARIO EN SIDEBAR

### Added
- **Selector modo usuario** en sidebar — `PillDropdown` debajo del logo con 3 modos: Holding, Operador, Técnico
- **Estado `userMode`** en `useAppStore` (Zustand) — persistido en sessionStorage
- **Tipo `UserMode`** y constante `USER_MODE_LABELS` exportados desde `useAppStore`

---

## [0.52.0-alpha.0] - 2026-03-16 — DRAWER DESGLOSE TIENDAS + FILTRO EDIFICIO

### Added
- **Endpoint `GET /billing/:buildingName/stores?month=`** — desglose facturación por tienda para un mes, JOIN con `store` para nombre tienda
- **Drawer desglose por tienda** en BuildingDetailPage — click en fila de tabla facturación abre Drawer con DataTable (8 columnas + footer totales), lazy fetch via `useBillingStores`
- **Filtro por edificio** en drawers de documentos (Dashboard) — columna "Edificio" con `ColumnFilterDropdown` (checkbox multi-select, misma UX que filtro de meses)
- **Columna "Edificio"** en tablas de documentos por vencer y vencidos

### Changed
- **Drawers documentos (Dashboard)** — DataTable ahora usa `maxHeight="max-h-full"` para ocupar toda la altura del drawer con scroll interno
- **`BillingTable`** — nueva prop `onRowClick` pasada a DataTable

### Types
- **`BillingStoreBreakdown`** — nueva interfaz frontend (storeName + 11 campos numéricos)

---

## [0.51.0-alpha.0] - 2026-03-16 — DEPLOY COMPLETO PROD

### Infrastructure
- **Lambda `billing-pdf-generator`** deployada a AWS (Python 3.12, VPC, 512 MB)
- **Backend** redeployado — 3 Lambdas (api, offlineAlerts, dbVerify) a 28 MB
- **Frontend** subido a S3 + invalidación CloudFront
- **RDS** áreas building_summary verificadas (60/60 rows con area_sqm)

### Fixed
- **deploy.sh** — `--entrypoint ""` para imagen Docker Lambda Python (entrypoint bloqueaba `bash -c`)

---

## [0.50.0-alpha.0] - 2026-03-16 — LAMBDA PDF BILLING + DESCARGA FRONTEND

### Added
- **Python Lambda `billing-pdf-generator`** — genera PDFs de cobro formato Globe Power on-demand desde RDS
  - Handler recibe `{ storeName, buildingName, month }`, retorna `{ pdf: base64, filename }`
  - Deploy independiente via `backend/billing-pdf-lambda/deploy.sh` (Docker build + AWS CLI)
- **Endpoint `GET /billing/pdf`** — proxy NestJS que invoca Lambda Python, decodifica base64 y responde `application/pdf`
  - Query params: `storeName`, `buildingName`, `month`
- **Boton descarga PDF** — columna "PDF" en tablas de documentos por vencer y vencidos (DashboardPage drawers)
  - Icono descarga con spinner durante generacion, descarga directa al browser

### Infrastructure
- **IAM** — `lambda:InvokeFunction` sobre `billing-pdf-generator` agregado al rol de la Lambda API
- **Dependencia** — `@aws-sdk/client-lambda` agregado al backend

---

## [0.49.0-alpha.0] - 2026-03-16 — PROD BILLING + PDF FACTURAS + ÁREAS EDIFICIOS

### Infrastructure
- **RDS prod billing_document** — migración via Lambda `dbVerify`: DROP + CREATE con `operator_name`, INSERT 5,676 docs a nivel tienda
- **Lambda deploy** — backend deployado con endpoint `operatorName` en `/dashboard/documents/:status`
- **Lambda dbVerify** — nuevo handler `db-verify-lambda.ts` para migraciones SQL contra RDS

### Data
- **building_summary** — áreas actualizadas: MM 68,000 m², SC52 5,302 m², SC53 5,650 m², OT 50,000 m²

### Added
- **Script `generate-billing-pdf.py`** — genera PDFs de cobro formato Globe Power desde pg-arauco
  - Layout: header, detalle consumo, tabla ítems con precios unitarios de tarifa, totales, gráfico 13 meses, datos bancarios
  - Soporta generación individual (`--meter_id`) o masiva (`--building`)
  - Lecturas: inicial del mes anterior, final del mes actual (con offset +1 año para datos sintéticos)

---

## [0.48.0-alpha.0] - 2026-03-16 — UI CARDS EDIFICIOS + DOCUMENTOS POR OPERADOR

### Changed
- **Building cards** — borde redondeado (`rounded-2xl`) con borde tenue `border-pa-navy/30`
- **Building cards** — título en una línea (`truncate`) y botón "Ver más +" sin wrap (`whitespace-nowrap shrink-0`)
- **Facturación gráfico** — eliminado título "Facturación Mensual" (redundante con selector)
- **Documentos vencidos/por vencer** — columna "Edificio" → "Operador" mostrando nombre de tienda

### Data
- **billing_document** — regenerada a nivel tienda (5,664 docs desde 308 operadores × 12 meses), nueva columna `operator_name`
- **billing_document** — eliminado constraint unique `(building_name, month)` para soportar múltiples operadores por edificio-mes

---

## [0.47.0-alpha.0] - 2026-03-15 — SCROLLBAR REMARCADORES + RESTORE READINGS RDS

### Infrastructure
- **RDS restore readings** — script `scripts/restore-readings-rds.sh` para cargar meter_readings (30.7M) y raw_readings (30.7M) via ECS Fargate
- **Flujo**: pg_dump en Docker → S3 → escalar RDS a t3.medium → ECS Fargate pg_restore → bajar a t3.micro
- **IAM** — agregado prefix `readings-restore/*` a policy S3 del task role
- **CloudWatch** — log group `/ecs/energy-monitor-readings-restore` creado

### Fixed
- **MetersTable scrollbar** — tabla "Listado Remarcadores" no tenía scroll; `PaginatedTable` wrapper ahora participa en flex layout (`h-full min-h-0 flex-col`), `DataTable` scroll div con `min-h-0`

---

## [0.46.0-alpha.0] - 2026-03-15 — DEPLOY AWS: RDS, LAMBDA, FRONTEND

### Infrastructure
- **RDS PostgreSQL** — migración de datos desde Docker local a RDS vía ECS Fargate (S3 → pg_restore → RDS)
- **Tablas operativas** — 8 tablas restauradas: store (875), building_summary (60), meter_monthly (10,500), meter_monthly_billing (10,500), tariff (48), alerts (182), billing_document (60), store_type (42)
- **Tablas pendientes** — meter_readings y raw_readings (30M+ rows) pendientes de carga en background
- **Lambda** — actualizado `DB_PASSWORD` en 3 funciones (`api`, `offlineAlerts`, `dbVerify`)
- **Seguridad** — RDS no-publicly-accessible, SG sin CIDRs públicos, route table via NAT
- **GitHub secret** — `DB_PASSWORD` configurado

### Fixed
- **Frontend `api.ts`** — baseURL hardcodeado `localhost:4000` → usa `VITE_API_BASE_URL` o fallback `/api` (relativo para CloudFront)
- **`aggregations.ts`** — fix tipos genéricos `sumByKey`/`maxByKey` (cast `as unknown[]` para compatibilidad con interfaces)
- **`AlertsPage.tsx`** — `RefObject` → `React.RefObject` (import implícito)

### Changed
- **Frontend `.env`** — `VITE_API_BASE_URL=http://localhost:4000/api` (solo dev local)
- **Frontend deploy** — build + S3 sync + CloudFront invalidation

---

## [0.45.0-alpha.0] - 2026-03-15 — FIX COMPARATIVAS: LAYOUT, CHART Y TÍTULOS

### Fixed

- **ComparisonsPage** layout — eliminado scrollbar vertical (`overflow-auto` → `overflow-hidden`), cards distribuidas con `flex-[3]`/`flex-[2]` + `min-h-0`
- **ComparisonsPage** chart — serie Gasto ya no se fuerza a línea en modo Barra; ambas series usan el `chartType` seleccionado
- **ComparisonsPage** chart — alto dinámico (`height: 100%`) en vez de fijo 384px

### Changed

- **ComparisonsPage** títulos — reemplazados `<h2>` planos por `SectionBanner inline` (fondo `bg-pa-bg-alt`, texto navy uppercase, `w-fit`)

---

## [0.44.0-alpha.0] - 2026-03-15 — DESIGN SYSTEM PA EN ALERTAS Y COMPARATIVAS

### Changed

- **AlertsPage** — tokens PA en contenedor, dropdowns de filtro, inputs, loading state. Sin borde exterior (alineado con Card)
- **ComparisonsPage** chart — migrado de `Highcharts.chart()` manual a `HighchartsReact` con `CHART_COLORS`, `LIGHT_PLOT_OPTIONS`, `LIGHT_TOOLTIP_STYLE`
- **ComparisonsPage** controles — tokens PA en select, toggles (`bg-pa-navy`), textos (`text-pa-text-muted`, `text-[13px]`)

---

## [0.43.0-alpha.0] - 2026-03-15 — TOKENS PA EN MONITOREO Y PAGINACIÓN

### Changed

- **RealtimePage** skeleton — tokens PA: `border-pa-border`, `text-pa-navy`, `font-semibold`, `bg-white`, padding `px-3`
- **PaginatedTable** paginación — tokens PA: `border-pa-border`, `text-pa-text-muted`, `text-[13px]`, `hover:bg-gray-100`

---

## [0.42.0-alpha.0] - 2026-03-15 — EXTRACCIÓN DE COMPONENTES Y UTILIDADES COMPARTIDAS

### Added

- `lib/formatters.ts` — funciones `fmt`, `fmtNum`, `fmtClp`, `fmtAxis`, `monthLabel`, `monthName`, `fmtDate`
- `lib/constants.ts` — `MONTH_NAMES_SHORT`, `MONTH_NAMES_FULL`, `SHORT_BUILDING_NAMES`
- `lib/aggregations.ts` — `sumNonNull`, `maxNonNull`, `avgNonNull`, `sumByKey`, `maxByKey`
- `lib/chartConfig.ts` — `ChartType`, `CHART_COLORS`, `LIGHT_PLOT_OPTIONS`, `LIGHT_TOOLTIP_STYLE`
- `hooks/useClickOutside.ts` — acepta ref único o array, parámetro `active` (default `true`)
- `components/ui/PillButton.tsx` — botón pill PA reutilizable ("Ver más +", "Volver")
- `components/ui/SectionBanner.tsx` — banner título PA (`bg-pa-bg-alt`, uppercase navy)
- `components/ui/TogglePills.tsx` — toggle genérico `<T>` con estilo pill PA
- `components/ui/PillDropdown.tsx` — dropdown genérico `<T>` con estilo pill PA, `onHover`

### Changed

- **DashboardPage** — usa `SectionBanner`, `TogglePills`, `PillDropdown`, `PillButton`; importa formatters/constants/chartConfig desde `lib/`
- **ComparisonsPage** — importa formatters, constants, `ChartType` desde `lib/`
- **BuildingsPage** — usa `PillButton`; importa `fmt` desde `lib/`
- **BuildingDetailPage** — usa `PillButton`, `PillDropdown`, `SectionBanner`, `TogglePills`; elimina import de `BillingMetricSelector`
- **BillingTable** — usa `useClickOutside`, `sumByKey`/`maxByKey`, formatters desde `lib/`
- **MeterMonthlyTable** — usa `monthName`, `fmtNum`, `avgNonNull` desde `lib/`
- **MeterReadingsPage** — usa `useClickOutside`, `MONTH_NAMES_FULL`, aggregations desde `lib/`
- **MonthlyColumnChart** — usa `MONTH_NAMES_SHORT`, `CHART_COLORS`, `LIGHT_PLOT_OPTIONS`, `LIGHT_TOOLTIP_STYLE`
- **MultiSelect** — usa `useClickOutside` compartido
- **MeterMetricSelector** — usa `useClickOutside` compartido
- **AlertsPage** — importa `useClickOutside` compartido, elimina definición inline

### Removed

- `BillingMetricSelector.tsx` — reemplazado por `PillDropdown` genérico

---

## [0.41.0-alpha.0] - 2026-03-15 — DESIGN SYSTEM PA EN SUBVISTAS DE EDIFICIO

### Changed

- **BuildingsPage** — card ya no es clickeable completa; botón pill "Ver más +" navega al detalle
- **BuildingDetailPage** — header con botón pill "Volver" + nombre uppercase navy. Gráfico con banner PA (`bg-pa-bg-alt`) título + selector métrica. Tabs como pills en banner PA (activo `bg-pa-navy text-white`). Layout sin scroll: gráfico `shrink-0`, tabla `flex-1` con scroll interno
- **MonthlyColumnChart** — color `#3D3BF3` (pa-blue), bg transparente, ejes/tooltip estilo PA, toggle Barra/Línea pill con `bg-primary/20`
- **BillingMetricSelector** — custom dropdown PA: botón pill `rounded-full` border `pa-border`, dropdown `rounded-xl` con items `pa-bg-alt`/`pa-navy`
- **Dashboard MonthDropdown** — reemplaza `<select>` nativo por custom dropdown PA (mismo estilo pill)
- **Dashboard toggle Barra/Línea** — pill `rounded-full` con activo `bg-pa-navy text-white`
- **Selectores** — todos con `cursor-pointer`

---

## [0.40.0-alpha.0] - 2026-03-15 — APLICACIÓN DESIGN SYSTEM PA EN DASHBOARD

### Changed

- **Sidebar** — fondo `#F3F4F6`, logo PA (flor recortada) + texto "Parque Arauco / Energy Monitor", nav items con número en círculo outlined (01–05) y fondo pill blanco, activo en `#3D3BF3` con texto blanco
- **Gráfico dashboard** — colores PA: consumo `#3D3BF3` (pa-blue), gasto `#E84C6F` (pa-coral), gridlines sutiles, labels en `#6B7280`, tooltip fondo blanco
- **Cards de pago** — patrón `kpi_card` PA: sin borde, fondo blanco, número grande en color de acento (verde/ámbar/coral), botón pill "Ver más +" para abrir drawers
- **Tablas** — patrón `data_table` PA: header fondo blanco con texto navy semibold, filas separadas por línea fina `#E5E7EB`, footer fondo gris claro con texto bold navy
- **Títulos de tabla** — banner inline con fondo gris `#F3F4F6`, texto navy bold uppercase
- **Card genérico** — sin borde, fondo blanco, `rounded-xl`
- **Layout dashboard** — sin scroll, ambas filas `flex-1` ocupan alto disponible
- Labels: "Docs por Vencer" → "Facturas por Vencer", "Docs Vencidos" → "Facturas Vencidas"

### Added

- Tokens PA en `index.css`: `pa-navy`, `pa-blue`, `pa-blue-light`, `pa-coral`, `pa-green`, `pa-amber`, `pa-bg-alt`, `pa-border`, `pa-text`, `pa-text-muted`
- `pa-icon.png` en `frontend/src/assets/`

---

## [0.39.0-alpha.0] - 2026-03-15 — DESIGN SYSTEM PARQUE ARAUCO

### Added

- **Script `extract-pa-design.py`** — extrae patrones de diseño/UI de `Memoria PA.pdf` y genera `PA_DESIGN_SYSTEM.md`
- **`PA_DESIGN_SYSTEM.md`** — referencia de diseño con paleta de colores (brand, sección, país, charts, UI), tipografía, layout, 13 componentes, 5 patrones de composición, iconografía, efectos y mapping a Tailwind v4

---

## [0.38.0-alpha.0] - 2026-03-15 — DRAWER DE DOCUMENTOS EN DASHBOARD

### Added

- **Componente `Drawer`** (`components/ui/Drawer.tsx`) — componente reutilizable con portal, overlay, cierre por Escape/click, lock scroll, animación slide. Props: `side` (4 lados), `size` (sm/md/lg/xl/full), `title`, `overlayClose`. Tamaños lg/xl usan `w-fit max-w-[90vw]` para adaptarse al contenido sin scroll horizontal
- **Endpoint `GET /dashboard/documents/:status`** — retorna documentos de cobro filtrados por estado (pagado, por_vencer, vencido) con edificio, N° doc, vencimiento, neto, IVA y total
- **Drawer "Docs por Vencer"** — click en card ámbar abre drawer con tabla de documentos por vencer
- **Drawer "Docs Vencidos"** — click en card roja abre drawer con tabla de documentos vencidos
- Tipo `BillingDocumentDetail`, hook `useDashboardDocuments(status, enabled)` con fetch lazy

---

## [0.37.0-alpha.0] - 2026-03-15 — DATOS DE PAGOS Y DOCUMENTOS EN DASHBOARD

### Added

- **Tabla `billing_document`** — 60 registros sintéticos (1 por edificio × 12 meses) generados desde `meter_monthly_billing`. Estados: pagado (48), por_vencer (3), vencido (9). Vencidos distribuidos en rangos 1-30, 31-60, 61-90, 90+ días
- **Endpoint `GET /dashboard/payments`** — resumen de pagos recibidos, documentos por vencer, vencidos y desglose por período de vencimiento
- **Cards de pago con datos reales** — Pagos Recibidos (verde), Docs por Vencer (ámbar), Docs Vencidos (rojo) con montos y conteo de documentos
- **Tabla "Documentos Vencidos por Período"** — DataTable con columnas Período, Docs, Monto y footer con totales

### Changed

- Cards de pago pasan de placeholder "—" a datos reales con colores por estado
- Tabla vencidos pasa de placeholder "—" a DataTable con 4 rangos de días

---

## [0.36.0-alpha.0] - 2026-03-15 — INCIDENCIAS EN MEDIDOR CON NAVEGACIÓN A ALERTAS

### Added

- **Líneas de incidencia en gráfico 15 min** — Líneas rojas verticales en navigator y xAxis principal. Click en línea navega a vista Alertas filtrada por medidor y día
- **Columna "Incidencias" en detalle mensual** — Conteo de alertas por mes, clickeable → navega a Alertas filtrada por medidor y rango del mes
- **Columna "Incidencias" en resumen diario** — Conteo de alertas por día, clickeable → navega a Alertas filtrada por medidor y fecha exacta
- **Pre-filtrado en AlertsPage vía URL** — Acepta query params `meter_id`, `date`, `date_from`, `date_to` para abrir la vista con filtros aplicados

### Changed

- `MeterDetailPage` y `MeterReadingsPage` consumen `useAlerts({ meter_id })` para obtener alertas del medidor
- `groupByDay()` recibe alertas como segundo parámetro para calcular incidencias por día
- `AlertsPage` lee `useSearchParams` al montar para inicializar filtros de medidor y fecha

---

## [0.35.0-alpha.0] - 2026-03-15 — COMPARATIVAS CON DATOS REALES

### Added

- **Módulo backend `comparisons`** — service + controller + module (raw SQL, patrón DataSource)
- **Endpoint `GET /api/comparisons/filters`** — retorna tipos de tienda (42), nombres de tienda (309) y meses disponibles (12)
- **Endpoint `GET /api/comparisons/by-store-type`** — comparativa entre edificios para uno o más tipos de tienda en un mes dado
- **Endpoint `GET /api/comparisons/by-store-name`** — comparativa entre edificios para uno o más nombres de tienda en un mes dado
- **Componente `MultiSelect`** (`components/ui/MultiSelect.tsx`) — dropdown con input de búsqueda, checkboxes y botón limpiar
- **Hook `useComparisonFilters`** + `useComparisonByStoreType` + `useComparisonByStoreName` — TanStack Query

### Changed

- **ComparisonsPage** — reescrita con datos reales. Toggle "Por Tipo" / "Por Tienda", MultiSelect con búsqueda, selector mes dinámico, gráfico toggle Barra/Línea, tabla sin columna Superficie
- Eliminada `mockData.ts` de comparisons (marcas ficticias Adidas/Nike/etc.)
- Endpoints aceptan selección múltiple (comma-separated → SQL `ANY($1)`)

---

## [0.34.0-alpha.0] - 2026-03-15 — DASHBOARD: 5 EDIFICIOS + LIMPIEZA MOCK

### Fixed

- **building_summary** — Parque Arauco Kennedy alineado a 2025 (antes 2026 por ingesta CSV sintética). Los 5 edificios ahora comparten el mismo rango de meses

### Changed

- **Gráfico Dashboard** — altura +20% (320→384px), toggle Barra/Línea (ambas series usan el mismo tipo)
- **Cards resumen** (Pagos, Docs por Vencer, Docs Vencidos) — reemplazadas de mock a placeholder "—" (sin datos de pago en fuentes actuales)
- **Tabla Documentos Vencidos** — reemplazada de mock a placeholder "—"
- Eliminada dependencia de `mockData.ts` en DashboardPage

---

## [0.33.0-alpha.0] - 2026-03-15 — DASHBOARD CON DATOS REALES

### Added

- **Endpoint `GET /api/dashboard/summary`** — resumen mensual por edificio (consumo kWh, gasto CLP, medidores, superficie) en una sola llamada
- **Módulo backend `dashboard`** — service + controller + module (patrón raw SQL con DataSource)
- **Hook `useDashboardSummary`** — TanStack Query para el nuevo endpoint

### Changed

- **DashboardPage** — gráfico combo y tabla de edificios ahora consumen datos reales vía API (antes 100% mock)
- Selector de mes derivado dinámicamente de los meses disponibles en la API
- Cards de resumen y tabla de vencidos mantienen mock (sin backend aún)

---

## [0.32.1-alpha.0] - 2026-03-15 — FIX TABLA REMARCADORES

### Fixed

- **MetersTable:** medidores placeholder ("Sin informacion", "Local no sensado", "Local NNN") ahora se muestran en texto atenuado (`text-muted`) para distinguirlos de tiendas reales
- **BuildingDetailPage:** tab "Listado Remarcadores" ya no agranda la Card ni provoca scrollbar — ajustada altura interna de la tabla paginada

---

## [0.32.0-alpha.0] - 2026-03-15 — CARGA OT70 + SC52 + SC53 CSV

### Added

- **Script `ingest-ot70-outlet.py`** — ingesta completa de Arauco Premium Outlet Buenaventura (OT, 70 medidores) en 9 pasos
- **Script `ingest-sc52-sc53-strip-centers.py`** — ingesta combinada:
  - SC52 (Arauco Express Ciudad Empresarial, 52 medidores) — 9 pasos completos
  - SC53 (Arauco Express El Carmen de Huechuraba, 53 medidores) — CSV-only (steps 1-4) + recálculo KPIs con datos reales
- **Tarifas Quilicura** (12 filas) y **Huechuraba** (12 filas) en tabla `tariff`
- SC53 ahora tiene raw_readings, meter_monthly y meter_readings (antes solo billing)

### Data (pg-arauco)

- `raw_readings`: 24.5M → 30.6M (+6.1M: OT 2.45M + SC52 1.82M + SC53 1.86M)
- `store`: 700 → 875 (+175: OT 70 + SC52 52 + SC53 53 existentes)
- `meter_monthly`: 8,400 → 10,500 (+2,100: OT 840 + SC52 624 + SC53 636)
- `meter_readings`: 24.5M → 30.7M (+6.1M, 175 particiones nuevas → 875 total)
- `meter_monthly_billing`: 9,036 → 10,500 (+1,464: OT 840 + SC52 624)
- `building_summary`: 36 → 60 (+24: OT 12 + SC52 12)
- `tariff`: 24 → 48 (+24: Quilicura 12 + Huechuraba 12)
- **5 edificios activos**, todos con KPIs 12/12

---

## [0.31.1-alpha.0] - 2026-03-15 — FIX DATOS SC53 + DOCUMENTACIÓN INGESTA

### Fixed

- **Cards "Demanda Peak / Potencia prom. / Factor potencia"** mostraban "—" para MM y SC53 — columnas `peak_demand_kw`, `avg_power_kw`, `avg_power_factor` en `building_summary` estaban NULL
- **SC53 billing incompleto** — script leía XLSX de MG en vez de SC53 → 10 columnas CLP/demanda NULL. Re-ingestado desde `SC53_KPIs_mensuales_2025_M.xlsx` (636 filas completas)

### Added

- Checklist de ingesta (9 pasos) en `docs/context/ingest-pipeline.md`
- Query de verificación post-ingesta para detectar NULLs
- Documentación de errores conocidos y lecciones

### Changed

- `docs/context/db-schema.md` — conteos actualizados a estado real

---

## [0.31.0-alpha.0] - 2026-03-14 — CARGA MALL MEDIANO (MM254)

### Added

- **Script `ingest-mm254-full.py`** — ingesta completa de Mall Mediano (Arauco Estación) en 8 pasos:
  CSV → raw_readings → stores → meter_monthly → meter_readings → billing → KPIs → tariffs → building_summary
- **22 nuevos `store_type`** (Supermercado, Tecnología, Ropa deportiva, Gimnasio, etc.)
- **Tarifas Santiago** en tabla `tariff` (12 filas, locación separada de Las Condes)
- **Columna `location`** en tabla `tariff` — PK ahora es `(month, location)`

### Data (pg-arauco)

- `raw_readings`: 15.6M → 24.5M (+8.9M MM)
- `store`: 446 → 700 (+254 MM)
- `store_type`: 20 → 42 (+22 nuevos)
- `meter_monthly`: 5,352 → 8,400 (+3,048 MM)
- `meter_readings`: 15.6M → 24.5M (+8.9M, 254 particiones nuevas → 700 total)
- `meter_monthly_billing`: 5,988 → 9,036 (+3,048 MM)
- `building_summary`: 24 → 36 (+12 Arauco Estación)
- `tariff`: 12 → 24 (+12 Santiago)
- **3 edificios activos:** Parque Arauco Kennedy (7.3M kWh), Arauco Estación (3.2M kWh), Arauco Express (591K kWh)

---

## [0.30.0-alpha.0] - 2026-03-14 — CARGA DATOS COMPLETA + OPTIMIZACIÓN QUERIES

### Added

- **5 scripts de carga de datos** (`scripts/`):
  - `ingest-403-stores-monthly.py` — 403 stores "Local no sensado" + 4,836 filas meter_monthly
  - `ingest-403-meter-readings.py` — 403 particiones + 14.1M filas en meter_readings
  - `ingest-kpis-xlsx.py` — 4 columnas KPI en meter_monthly_billing (peak, demanda punta, % punta, promedio diario)
  - `ingest-tariffs.py` — tabla `tariff` con 12 filas de pliegos tarifarios
  - `ingest-sc53-arauco-express.py` — 636 filas billing + 12 filas building_summary para Arauco Express
- **Tabla `tariff`** en pg-arauco: pliegos tarifarios mensuales (Las Condes, 2025)
- **Índice `meter_readings_ts_desc`** en meter_readings `(meter_id, timestamp DESC)`

### Changed

- **`findLatestByBuilding`** reescrita con `LEFT JOIN LATERAL` — de 36s a 49ms
- **Null-safety en frontend**: `BuildingsPage`, `BillingTable` y tipos TS manejan campos numéricos nullable
  - `fmt()`, `fmtClp()`, `fmtNum()` aceptan `null` y muestran "—"
  - Helpers `sumN`/`maxN` null-safe para totales en footer
  - Tipos `BillingMonthlySummary` y `BuildingSummary` actualizados con `number | null`

### Data (pg-arauco)

- `store`: 43 → 446 filas
- `meter_monthly`: 516 → 5,352 filas
- `meter_readings`: 1.5M → 15.6M filas (446 particiones)
- `meter_monthly_billing`: 5,352 → 5,988 filas (+ SC53)
- `building_summary`: 12 → 24 filas (+ Arauco Express)
- `tariff`: 12 filas (nueva)

---

## [0.29.0-alpha.0] - 2026-03-14 — VISTA COMPARATIVA DE TIENDAS

### Added

- **ComparisonsPage:** vista `/comparisons` para comparar una marca a través de distintos edificios
  - Selectores inline de marca (10 marcas) y mes (Oct-25 a Mar-26)
  - Gráfico combo Highcharts (barras consumo kWh + línea gasto CLP) por edificio
  - DataTable con columnas Edificio, Consumo, Gasto, Superficie y totales en footer
- **Mock data multi-edificio:** 10 marcas distribuidas en 6 edificios con factores por edificio y estacionales
- **Permiso `COMPARISONS_OVERVIEW`:** accesible por todos los roles invitados
- **ComparisonsSkeleton:** skeleton propio (2 selects + gráfico + tabla)

### Changed

- **Dashboard y Comparativas:** removidos títulos `<h1>` (el sidebar ya indica la vista activa)

---

## [0.28.0-alpha.0] - 2026-03-14 — DASHBOARD: LAYOUT 2 COLUMNAS + GRÁFICO COMBO

### Added

- **Gráfico combo:** barras (consumo kWh, eje Y izq) + línea (gasto CLP, eje Y der) por edificio
- **Selector de mes:** dropdown en el gráfico (Oct-25 a Mar-26) que filtra gráfico y tabla simultáneamente
- **Data mensual:** `BUILDINGS_BY_MONTH` con variación estacional por mes para los 15 edificios
- **Fecha de actualización:** cada card muestra "Actualizado: dd/mm/yyyy hh:mm"

### Changed

- **Layout 2 columnas:** grid `5fr_1fr` — col izquierda (gráfico + tabla edificios), col derecha (3 cards + tabla períodos)
- **Cards compactas:** padding reducido, textos más pequeños, distribuidas en altura del gráfico
- **Tabla edificios:** scroll interno (`max-h-[340px]`) con header y footer sticky
- **Documentos Vencidos:** 7 intervalos (Dentro del plazo, 1-7, 8-15, 16-30, 31-60, 61-90, >90 días)
- **Responsive:** 1 columna en mobile, 2 columnas en desktop

---

## [0.27.0-alpha.0] - 2026-03-14 — DASHBOARD HOLDING

### Added

- **DashboardPage:** vista principal del holding en `/` con data mock hardcodeada
  - Tabla "Gasto y Consumo Mensual" con 15 edificios (consumo kWh, gasto $, superficie m², medidores) y totales en footer
  - 3 cards resumen: Pagos Recibidos, Docs por Vencer, Docs Vencidos
  - Tabla "Documentos Vencidos por Período" (5 rangos: 1-30, 31-60, 61-90, 91-120, >120 días) con totales
- **Permiso `DASHBOARD_OVERVIEW`:** accesible por todos los roles invitados
- **DashboardSkeleton:** skeleton propio (tabla + 3 cards + tabla)
- **Mock data separada:** `features/dashboard/mockData.ts` con tipos y constantes

### Changed

- **BuildingsPage:** ruta movida de `/` a `/buildings`
- **Sidebar:** Dashboard es primer item, Edificios segundo

---

## [0.26.0-alpha.0] - 2026-03-14 — ALERTAS: TABLA CON FILTROS AVANZADOS

### Added

- **Tabla `alerts` en pg-arauco:** 182 alertas detectadas desde anomalías en `meter_readings` (12 CURRENT_HIGH critical, 170 CURRENT_NEGATIVE warning)
- **Backend módulo `alerts`:** entity, service, controller, module. `GET /api/alerts` con query params `?severity=` y `?meter_id=`
- **Frontend API layer:** ruta `getAlerts`, endpoint `fetchAlerts`, hook `useAlerts`
- **Tipo `Alert`:** interface en `types/index.ts`
- **AlertsPage:** DataTable paginada (10/pág) con 8 columnas de ancho fijo (`table-fixed`)
- **Filtros por checkbox:** headers Medidor, Tipo, Severidad, Campo y Umbral son dropdowns con valores únicos seleccionables
- **Filtro de fecha avanzado:** dropdown en header Fecha con 3 secciones — Ordenar (asc/desc), Filtrar por fecha (exacta o rango), Filtrar por hora (exacta o rango). Todos deseleccionables via checkbox toggle
- **Dropdowns en portal:** ambos tipos de dropdown usan `createPortal` + `position: fixed` para escapar el `overflow-auto` de DataTable

### Changed

- **DataTable:** nueva prop `tableClassName` para pasar clases al `<table>` (e.g. `table-fixed`)

---

## [0.25.0-alpha.0] - 2026-03-14 — UNIFICACIÓN TABLAS CON DATATABLE

### Changed

- **DataTable:** `value()` y `total()` ahora retornan `ReactNode` (antes solo `string`). Nuevas props: `headerRender`, `cellClassName`, `className` por columna. `bg-white` → `bg-surface` en thead/tfoot
- **MetersTable:** migrado de tabla manual con paginación propia a `PaginatedTable` + `Column<T>`
- **BillingTable:** migrado de tabla manual a `DataTable`. Column highlighting y MonthFilterDropdown via `className` y `headerRender`
- **MeterMonthlyTable:** migrado de tabla manual a `DataTable`. Column highlighting via `className`
- **DailySummaryTable:** eliminado componente inline en MeterReadingsPage, reemplazado por `<DataTable>` directo
- **RealtimePage:** migrado de tabla manual a `DataTable`. Status badges como `ReactNode` en `value()`

### Fixed

- **Auth endpoints:** agregados `fetchMe` y `fetchPermissions` faltantes en `services/endpoints.ts` y rutas en `services/routes.ts`

---

## [0.24.0-alpha.0] - 2026-03-14 — MONITOREO EN TIEMPO REAL + COMPONENTES TABLA GENÉRICOS

### Added

- **RealtimePage:** tabla con última lectura por medidor (Potencia, Voltaje L1, Corriente L1, FP, Estado)
- **Estado por medidor:** badge Online/Delay/Offline según antigüedad del timestamp
- **Skeleton por fila:** 8 filas skeleton mientras carga, no un bloque completo
- **Endpoint `GET /meters/building/:name/latest`:** última lectura por medidor con `DISTINCT ON`
- **API layer:** ruta, endpoint y hook `useMetersLatest` con refetch cada 60s
- **Tipo `MeterLatestReading`:** interface compartida backend/frontend
- **DataTable genérico:** componente declarativo con Column<T>, footer opcional, sticky thead/tfoot
- **PaginatedTable:** wrapper de DataTable con paginación client-side
- **Skeletons por vista:** cada ruta tiene su propio skeleton (Realtime, IoTDevices, Alerts, AlertDetail)

### Changed

- **router.tsx:** fallback de Suspense usa skeleton específico por ruta en vez de BuildingsPageSkeleton genérico
- **RealtimePage:** eliminado título "Monitoreo" (redundante con sidebar)

---

## [0.23.0-alpha.0] - 2026-03-14 — LECTURAS 15 MIN POR MEDIDOR

### Fixed

- **MeterReadingsPage:** eje Y del gráfico Stock (15 min) ahora aparece a la izquierda, consistente con el modo Diario

### Added

- **MeterReadingsPage:** vista de lecturas de un medidor en un mes (`/meters/:meterId/readings/:month`)
- **Gráfico con dos modos:** Diario (1 punto por hora, eje X = días) y 15 min (Highcharts Stock light, navigator con rango default 2 días)
- **DailySummaryTable:** resumen por día con 9 columnas, sticky thead/tfoot, totales en footer
- **MeterReading type:** interface con 11 métricas + meterId + timestamp
- **API layer:** ruta, endpoint y hook `useMeterReadings(meterId, from, to)`
- **MeterMonthlyTable:** filas clickeables → navegan a vista de lecturas del mes
- **Dropdown métrica:** cierre al hacer click fuera (mousedown listener)

---

## [0.22.0-alpha.0] - 2026-03-14 — SELECTOR MÉTRICAS Y TOGGLE BARRA/LÍNEA EN REMARCADOR

### Added

- **MeterMetricSelector:** dropdown con 5 métricas del medidor, mismo patrón que BillingMetricSelector
- **meterMetrics.ts:** definición centralizada de métricas del medidor con label y unidad
- **MonthlyColumnChart:** toggle Barra/Línea (absoluto esquina superior derecha, sin agregar altura)
- **MeterMonthlyTable:** highlight de columna seleccionada (`bg-blue-50`) y hover preview (`bg-blue-50/60`)

### Changed

- **MeterDetailPage:** selector de métricas reemplaza título estático, gráfico dinámico según métrica
- **meter-monthly backend:** orden de meses cambiado a ASC (Ene → Dic)

---

## [0.21.0-alpha.0] - 2026-03-14 — TABLA MENSUAL EN DETALLE REMARCADOR

### Added

- **MeterMonthlyTable:** tabla con 6 columnas (Mes, Consumo, Potencia prom., Peak, Reactiva, Factor potencia), sticky thead/tfoot, totales en footer
- **MeterDetailPage:** tabla de detalle mensual debajo del gráfico

---

## [0.20.0-alpha.0] - 2026-03-14 — DETALLE DE REMARCADOR

### Added

- **MeterDetailPage:** vista de detalle con header (Volver + meterId) y gráfico de consumo mensual (kWh)
- **MonthlyColumnChart:** componente genérico de gráfico de columnas por mes (`components/charts/`)
- **MeterMonthly:** tipo, ruta, endpoint y hook `useMeterMonthly` — pipeline frontend completa
- **MetersTable:** navegación a `/meters/:meterId` pasa `buildingName` en state

### Changed

- **BillingChart:** refactorizado a wrapper de MonthlyColumnChart (misma interfaz, sin cambio para consumidores)

---

## [0.19.0-alpha.0] - 2026-03-14 — FILTRO DE MESES EN TABLA

### Added

- **MonthFilterDropdown:** header "Mes" es un dropdown con checkboxes para filtrar filas por mes
- Opción "Todo" para seleccionar/deseleccionar todos los meses
- Badge con conteo de meses activos cuando hay filtro aplicado
- Totales del tfoot se recalculan según meses visibles

---

## [0.18.0-alpha.0] - 2026-03-14 — HIGHLIGHT COLUMNA EN TABLA

### Added

- **BillingTable:** columna seleccionada en el selector se destaca con fondo azul (`bg-blue-50`)
- **BillingMetricSelector:** `onHover` callback — hover en opciones del dropdown destaca la columna correspondiente en tiempo real (`bg-blue-50/60`)
- Transición suave (`transition-colors`) en celdas de la tabla

---

## [0.17.0-alpha.0] - 2026-03-14 — SELECTOR DE MÉTRICAS EN GRÁFICO

### Added

- **BillingMetricSelector:** dropdown custom para seleccionar métrica del gráfico (11 opciones, click-outside para cerrar)
- **billingMetrics.ts:** definición centralizada de métricas con label y unidad

### Changed

- **BillingChart:** recibe métrica dinámica en vez de stacked fijo Neto+IVA, formato eje Y según unidad (CLP, kWh, kW)
- **BuildingDetailPage:** título estático "Facturación mensual 2025" reemplazado por selector de métricas

---

## [0.16.0-alpha.0] - 2026-03-14 — TABS DETALLE + LISTADO REMARCADORES

### Added

- **Backend:** módulo `meters` — `GET /api/meters/building/:buildingName` retorna 446 medidores con join store + store_type
- **Frontend:** tipo `MeterListItem`, hook `useMetersByBuilding`, ruta y endpoint
- **MetersTable:** tabla 3 columnas (Medidor, Tienda, Tipo), paginación de 10, click navega a `/meters/:meterId`
- Medidores sin tienda asignada muestran "Por censar" en texto muted

### Changed

- **BuildingDetailPage:** tabs en la card inferior — "Detalle Facturación" y "Listado Remarcadores"
- **BuildingDetailPage:** header simplificado — botón volver + nombre edificio en línea, sin breadcrumbs
- **BillingTable:** thead y tfoot sticky — columnas y total anual siempre visibles al scrollear
- **MetersTable:** thead sticky + paginador fuera del scroll — columnas y paginador siempre visibles
- **TempLayout:** `main` cambiado de `overflow-auto` a `overflow-hidden` — cada vista maneja su propio scroll

---

## [0.15.0-alpha.0] - 2026-03-14 — BILLING: INGESTA, BACKEND, FRONTEND

### Added

- **DB:** tabla `meter_monthly_billing` con `total_kwh` + 10 columnas de facturación (5,352 filas, 446 medidores x 12 meses)
- **Backend:** módulo `billing` — entity, service, controller `GET /api/billing/:buildingName`, `@Public()`
- **Frontend:** tipo `BillingMonthlySummary` (13 campos), hook `useBilling`, ruta y endpoint
- **BillingChart:** Highcharts columnas stacked (Neto + IVA) por mes
- **BillingTable:** 12 columnas (consumo kWh, energía $, dda. máx., dda. punta, kWh troncal, kWh serv. público, cargo fijo, neto, IVA, exento, total c/IVA), scroll horizontal, fila total anual
- **Scripts:** `ingest-billing-xlsx.py` para cargar XLSX a PostgreSQL

### Changed

- **BuildingDetailPage:** título grande eliminado, solo breadcrumbs + botón volver, spacing reducido
- **BuildingsPage:** footer muestra medidores en vez de tiendas, badge eliminado
- **PageHeader:** `mb-6` → `mb-2`, no renderiza `<h1>` si title vacío

---

## [0.14.0-alpha.0] - 2026-03-14 — BUILDINGS CARD + CSP FIX

### Changed

- **BuildingsPage:** refactorizada para usar componente `Card`, navegación a detalle, grid de stats (consumo, potencia, demanda peak, factor potencia), footer con tiendas y área
- **Card:** hover cambiado de azul (`border-accent`) a gris sutil (`border-muted/50`), agregado `outline-none`
- **CSP:** agregado `http://localhost:4000` a `connect-src` en `index.html` para permitir API local

---

## [0.13.0-alpha.0] - 2026-03-14 — PURGA FRONTEND + CONEXIÓN BUILDINGS

### Changed

- **API:** `api.ts` apunta a `http://localhost:4000/api`, sin interceptors de auth
- **Tipos:** `types/index.ts` solo exporta `BuildingSummary` (matchea backend)
- **Endpoints:** `routes.ts` y `endpoints.ts` solo buildings
- **Hooks:** solo `useBuildings` y `useAuthQuery` activos
- **BuildingsPage:** consume `GET /api/buildings` real, muestra cards con datos de pg-arauco
- **BuildingDetailPage:** consume `GET /api/buildings/:name`, info básica
- **Páginas shell:** MeterDetail, Realtime, Devices, Alerts, AlertDetail sin consumo API
- **Router:** limpio, sin withAuth ni comentarios muertos
- **Theme:** palette dark → light en `index.css`

### Removed

- Features completas: `admin/`, `billing/`, `drilldown/`, `auth/` (pages)
- Componentes: BuildingCard, MeterCard, AlertsOverviewPanel, BuildingAlertsPanel, BuildingConsumptionChart, UptimeBadges, AlarmEventsTable, AlarmSummaryBadges, DowntimeEventsTable
- Hooks: useAlerts, useMeters, useHierarchy, useAdminUsers, useBilling
- `Layout.tsx` (reemplazado por TempLayout)
- PageHeader eliminado de vistas principales (redundante con sidebar)

---

## [0.12.0-alpha.0] - 2026-03-14 — MÓDULOS STORES + METER-MONTHLY + METER-READINGS + RAW-READINGS

### Added

- **`stores` module** — Entities `store` y `store_type`, service, controller `@Public()`
  - `GET /api/stores` — 43 tiendas con tipo incluido (eager join)
  - `GET /api/stores/types` — 20 tipos de tienda
  - `GET /api/stores/types/:id` — Tiendas filtradas por tipo
  - `GET /api/stores/:meterId` — Tienda por meter_id
- **`meter-monthly` module** — Entity con `numericTransformer` en 5 columnas `numeric`
  - `GET /api/meter-monthly` — 516 filas, ordenadas meterId ASC / month DESC
  - `GET /api/meter-monthly/:meterId` — Historial mensual de un medidor
- **`meter-readings` module** — Entity con `numericTransformer` en 11 columnas `numeric`, tabla particionada
  - `GET /api/meter-readings/:meterId?from=&to=` — Lecturas en rango (max 31 días, max 5000 filas)
  - Validación vía `enforceRange` (400 si falta from/to o rango excede 31 días)
- **`raw-readings` module** — Entity con `numericTransformer` en 4 columnas `numeric`, 15.6M filas (446 medidores)
  - `GET /api/raw-readings/:meterId?from=&to=` — Lecturas crudas en rango (max 31 días, max 5000 filas)
  - Índice `(meter_id, timestamp)` creado para queries eficientes
  - `NOT NULL` aplicado en `meter_id` y `timestamp`

### Changed

- **Frontend: auth deshabilitado temporalmente**
  - `main.tsx` — MSAL provider y `validateEnv` comentados
  - `router.tsx` — refactorizado a mapeo de objeto (`routeConfig` + `withAuth()` comentable)
  - `TempLayout` — layout temporal sin auth, nav mapeado desde `appRoutes.showInNav`
- **Frontend: vistas reducidas a las activas**
  - Activas: edificios, detalle edificio, detalle medidor, monitoreo realtime, dispositivos, alertas
  - Comentadas (no eliminadas): drilldown, admin (sitios, usuarios, medidores, jerarquía), billing

---

## [0.11.0-alpha.0] - 2026-03-14 — PURGA BACKEND + MÓDULO BUILDINGS (LOCAL)

### Removed

- Módulos de negocio eliminados: `alerts`, `billing`, `buildings` (viejo), `db-verify`, `hierarchy`, `ingest-diagnostic`, `meters`
- Archivos eliminados: `db-verify-lambda.ts`, `offline-alerts.ts`, `readings-source.config.ts`

### Added

- **`buildings` module** — Entity, service, controller sobre tabla `building_summary` de pg-arauco
  - `GET /api/buildings` — Todos los edificios con resumen mensual
  - `GET /api/buildings/:name` — Resumen por nombre (404 si no existe)
  - `numericTransformer` en columnas `numeric` para retornar `number` en JSON
  - `@Public()` — Sin auth hasta nuevo aviso
- **`area_sqm`** — Columna nueva en `building_summary` (120.000 m² para Parque Arauco Kennedy)

### Changed

- Backend apunta a docker local `pg-arauco` (puerto 5434, db `arauco`)

---

## [0.10.0-alpha.0] - 2026-03-13 — PRE-AGREGADOS (NO DESPLEGADO)

### ⚠️ Requiere ejecución previa en RDS antes de deploy

**Secuencia obligatoria:**
1. Aplicar `sql/019_aggregates.sql` en RDS (crea `agg_meter_hourly`, `agg_node_daily`, indexes)
2. Correr `infra/aggregate-builder/build-aggregates.mjs` (FROM_DATE=2026-01-01 TO_DATE=2026-03-13)
3. Verificar conteos: `agg_meter_hourly` ~1.2M, `agg_node_daily` ~146K, `analisis` (daily+monthly)
4. Deploy backend
5. Configurar Lambda incremental (EventBridge hourly) con `incremental-hourly.mjs`

### Added

- **`sql/019_aggregates.sql`** — Migración: tablas `agg_meter_hourly` (PK meter_id+bucket), `agg_node_daily` (PK node_id+bucket DATE), indexes en `analisis`, partial index en `readings` para alarmas.
- **`infra/aggregate-builder/build-aggregates.mjs`** — Población completa de agregados. Fases: hourly (día por día) → daily (analisis) → monthly (analisis) → node (agg_node_daily). FROM_DATE/TO_DATE, DRY_RUN, PHASE.
- **`infra/aggregate-builder/incremental-hourly.mjs`** — Actualización incremental (últimas 2h con overlap). Exporta `handler()` para Lambda. LOOKBACK_HOURS configurable.
- **`backend/src/common/range-guard.ts`** — Util: `enforceRange()` y `enforceOptionalRange()` validan from/to obligatorios, max 31 días. Lanza BadRequestException 400.

### Changed

- **MetersService** — `findReadings(hourly)` lee de `agg_meter_hourly`; `findReadings(daily)` lee de `analisis` (period_type=day); `findBuildingConsumption` lee de `agg_meter_hourly` JOIN meters; `getOverview` usa `agg_meter_hourly` para alarm_count y uptime; `getUptimeSummary`/`getDowntimeEvents` detectan gaps entre buckets horarios. Eliminado todo código de staging fallback (`findReadingsFromStaging`, `findBuildingConsumptionFromStaging`, imports de `readings-source.config`).
- **HierarchyService** — `findChildrenWithConsumption` pasa de 3N+1 queries a 1 sola query batch sobre `agg_node_daily` WHERE node_id = ANY($children) + queries batch para meter counts y status. `findNodeConsumption(daily)` lee de `agg_node_daily`; `findNodeConsumption(hourly)` usa `agg_meter_hourly` JOIN subtree meters. Eliminado `getSubtreeConsumption`, `getSubtreeConsumptionFromStagingFallback`, `getSubtreeReadingsCount` y todo código de staging.
- **MetersController** — `downtime-events`, `alarm-events`, `alarm-summary` y `readings` (excepto raw) usan `enforceRange`/`enforceOptionalRange` para validar rango ≤31 días.
- **HierarchyController** — `children` y `consumption` usan `enforceOptionalRange`.
- **CLAUDE.md** — Documentada arquitectura de tablas agregadas, qué lee de dónde, range guard, script de población e incremental.

### Removed

- Staging fallback en MetersService y HierarchyService (ya no leen de `readings_import_staging`).
- Dependencia de `readings-source.config.ts` en MetersService.

### Performance esperada

| Query | Antes (filas escaneadas) | Después |
|-------|--------------------------|---------|
| getOverview (700 meters) | ~2.8M | ~17K |
| findBuildingConsumption | ~260K+ | ~720 |
| findReadings hourly | ~130K | ~720 |
| getSubtreeConsumption | ~130K+ | ~30 |
| findChildrenWithConsumption | N × 130K | ~300 |
| getUptimeSummary | ~43K | ~720 |

## [0.9.0-alpha.37] - 2026-03-13

### Fixed

- **Drill-down 0 kWh con datos en readings** — El JOIN entre `hierarchy_nodes` y `readings` usaba igualdad exacta de `meter_id`; en PostgreSQL el texto es sensible a mayúsculas y espacios, por lo que variaciones (ej. MG-001 vs mg-001) no hacían match y la API devolvía 0. HierarchyService ahora usa `TRIM(LOWER(meter_id))` en todos los JOINs jerarquía–readings/staging. Si `readings` sigue devolviendo 0 para el subárbol, se aplica fallback a `readings_import_staging` (misma fórmula de energía) para centros Drive antes de promoción.
- **db-verify hierarchyVsReadings** — La comparación de meter_ids jerarquía vs readings usa la misma normalización (TRIM/LOWER) para que el diagnóstico sea coherente con el drill-down.

### Changed

- **CLAUDE.md** — Hierarchy: JOIN normalizado meter_id y fallback staging; Key Files hierarchy.service.

## [0.9.0-alpha.36] - 2026-03-13

### Fixed

- **Gráficos Potencia y Voltaje del medidor vacíos** — Mismo origen que el drill-down: pg devuelve columnas en minúsculas. MetersService ahora usa helper `rawVal(row, key)` en findReadings (getRawMany), findReadingsFromStaging, getOverview, getUptimeSummary, getDowntimeEvents, getAlarmEvents y findBuildingConsumption para que los gráficos del detalle de medidor muestren datos.
- **Drill-down 1 Día / 1 Semana sin datos** — Al ajustar `from` tras limitar `to` al último timestamp, la duración se fija de forma explícita: rango original ≤2 días → 1 día, ≤10 días → 7 días; así "1 Día" y "1 Semana" muestran siempre el último día/semana con datos.

### Changed

- **CLAUDE.md** — Backend: raw query pg y MetersService rawVal; DrilldownBars duración explícita 1d/7d/30d; Key Files meters.service y hierarchy.service.

## [0.9.0-alpha.35] - 2026-03-13

### Fixed

- **Drill-down 1 Día / 1 Semana seguían en 0** — Tras limitar `to` al último timestamp en BD, si los datos acababan hace días quedaba `from > to` (rango invertido) y la query devolvía 0 filas. Ahora, cuando `from > to` tras el clamp, se recalcula `from = to - duración_original` para mostrar el último día o semana con datos sin invertir el rango.

### Changed

- **CLAUDE.md** — DrilldownBars/hierarchy.service: ajuste de `from` cuando from>to tras clamp para mantener duración.

## [0.9.0-alpha.34] - 2026-03-13

### Fixed

- **Drill-down "1 Día" y "1 Semana" sin lectura** — Si los datos en `readings` terminan antes que "ahora", el rango pedido quedaba en el futuro y devolvía 0. El backend ahora limita `to` al último timestamp existente en el subárbol, de modo que 1 día y 1 semana muestren el último día/semana con datos.
- **Build frontend (CI)** — StockChart: eliminado `height` del rangeSelector (no existe en tipo `RangeSelectorOptions` de Highcharts); el build TypeScript pasaba en local pero fallaba en GitHub Actions.

### Changed

- **CLAUDE.md** — DrilldownBars: clamp de `to` al último timestamp; hierarchy.service y StockChart en Key Files.

## [0.9.0-alpha.33] - 2026-03-13

### Fixed

- **Drill-down "kWh por nodo" seguía en 0** — El driver pg devuelve nombres de columna en minúsculas; el backend leía `row.totalKwh` (undefined) y devolvía 0/NaN. HierarchyService ahora lee totalKwh, avgPowerKw y peakPowerKw (y series temporales) con fallback a la clave en minúsculas para que los valores sean correctos.

### Added

- **GET /db-verify: hierarchyVsReadings** — Por cada building_id en hierarchy_nodes: hierarchy_meter_count, in_readings_count, meter_ids_in_readings, meter_ids_missing_in_readings (diagnóstico de cruce jerarquía vs readings).
- **Children del drill-down: readingsInRange** — Cada hijo incluye el número de filas en readings en el rango from/to para ese subárbol (diagnóstico cuando totalKwh es 0).
- **DrilldownPage: mensaje cuando no hay lecturas** — Si todos los hijos tienen totalKwh 0 y readingsInRange 0, se muestra aviso en amarillo sugiriendo comprobar datos en `readings` para los meter_id de la jerarquía.
- **query-readings-direct.mjs secciones 7–9** — building_id en hierarchy_nodes vs buildings/staging; por building_id: meter_ids en jerarquía vs en readings (con/sin datos); listado de todos los meter_id en readings.

### Changed

- **CLAUDE.md** — Hierarchy: children con readingsInRange; db-verify con hierarchyVsReadings; DrilldownBars mensaje sin lecturas; Backend: raw query pg y fallback minúsculas; Key Files query-readings-direct (secc. 7–9), hierarchy.service.

## [0.9.0-alpha.32] - 2026-03-13

### Fixed

- **Drill-down gráfico "kWh por nodo" en 0** — El backend calcula totalKwh desde energía real: por cada medidor del subárbol, (MAX(energy_kwh_total) − MIN(energy_kwh_total)) en el rango from/to; suma = kWh consumidos. Antes usaba SUM(power_kw), incorrecto para kWh. Sin from/to se sigue devolviendo 0.

### Added

- **Drill-down: from/to y selector de rango** — El frontend envía from y to a GET /hierarchy/node/:nodeId/children (default últimos 30 días). Selector "1 Día", "1 Semana", "1 Mes" para ver totales diario/semanal/mensual.
- **Scripts de verificación** — `scripts/verify-chart-endpoints.mjs` prueba endpoints que alimentan gráficos (BEARER_TOKEN, from/to). `infra/db-verify/query-readings-direct.mjs` consulta directa a BD (readings vs staging, potencia/energía/voltaje); soporta DB_USE_SECRET=1 + túnel y carga backend/.env.

### Changed

- **CLAUDE.md** — Hierarchy: children con from/to y cálculo totalKwh desde energy_kwh_total. DrilldownPage: selector 1 Día/Semana/Mes. Key Files: verify-chart-endpoints.mjs, query-readings-direct.mjs.

## [0.9.0-alpha.31] - 2026-03-12

### Added

- **Pipeline ECS: jerarquía automática** — El drive-pipeline ejecuta `hierarchy-from-staging.mjs` tras `promote.mjs`; tras cada corrida los nodos quedan en `hierarchy_nodes` y el drill-down funciona para centros Drive sin paso manual.
- **Política IAM S3 para task role** — `infra/drive-pipeline/task-role-s3-policy.json` con permisos ListBucket, GetObject/PutObject/DeleteObject en `manifests/*` y `raw/*`; aplicar con `aws iam put-role-policy` al rol `energy-monitor-drive-ingest-task-role`.

### Fixed

- **Total con IVA en tabla Facturación** — BillingDetailTable usa fallback `totalNetClp + ivaClp` cuando `totalWithIvaClp` es null; import XLSX reconoce más variantes de columna ("Total Con IVA", "Monto Total con IVA", etc.).
- **StockChart: zoom trabado y etiqueta "Zoom"** — rangeSelector con config estable por ref para evitar reset de estado; `lang.rangeSelectorZoom: ''` para ocultar etiqueta; altura y espaciado ajustados.

### Changed

- **hierarchy-from-staging** — Carga de config: prioridad `.env` local (dotenv desde cwd, repo root o backend); fallback Secrets Manager en ECS. Script duplicado en `infra/drive-pipeline/` para imagen Docker; dependencia `dotenv` en ambos package.json.
- **HierarchyService** — Eliminado nodo raíz sintético; si no hay nodos en BD se devuelve 404 (jerarquía solo desde datos reales en `hierarchy_nodes`).
- **CLAUDE.md** — Pipeline CMD (index → promote → hierarchy-from-staging), IAM task role S3, Key Files task-role-s3-policy.json, jerarquía automática y uso del script (local/ECS).

## [0.9.0-alpha.30] - 2026-03-13

### Fixed

- **404 en drill-down para centros Drive** — El frontend envía nodo raíz `B-{SITE_ID}` en mayúsculas (ej. B-PARQUE-ARAUCO-KENNEDY); en BD el id puede estar en minúsculas y truncado a 20 chars (ej. B-parque-arauco-ken). HierarchyService.findNode ahora resuelve por `building_id` cuando no hay fila con ese id; children y consumption usan el id resuelto.
- **Acentos � en la app** — Task definition ECS del drive-pipeline incluye `CSV_ENCODING=latin1` por defecto. Backend: interceptor global Utf8JsonInterceptor fuerza `Content-Type: application/json; charset=utf-8` en respuestas API para que el navegador decodifique correctamente. Datos ya corruptos en BD requieren re-importar con encoding correcto.

### Changed

- **CLAUDE.md** — Hierarchy: resolución B- nodeId por building_id. Codificación CSV: task def con latin1, Utf8JsonInterceptor. Key Files: utf8-json.interceptor.ts.

## [0.9.0-alpha.29] - 2026-03-13

### Fixed

- **Login Microsoft y datos vacíos** — Si el token de Microsoft no incluye el claim `email`, el backend usa `preferred_username` o `upn` como fallback para identificar al usuario por email y aplicar el mismo alcance (siteIds) que con Google. Doc `docs/auth-microsoft-data-scope.md` con causas y comprobaciones cuando con Microsoft se ven listas vacías.

### Changed

- **Resolución gráfico diario** — pickResolution: rango ≤2 días usa 15 min (antes ≤36 h) para que "1 Día" muestre datos cada 15 min cuando existan en BD.
- **Estilo range selector (StockChart)** — Altura 44px, buttonSpacing 8, botones con r: 6, texto 12px y mejor contraste; estado seleccionado con borde coherente.
- **CLAUDE.md** — Auth: fallback email Microsoft (preferred_username/upn) y ref a auth-microsoft-data-scope. Resolución dinámica ≤2 días→15min. References: auth-microsoft-data-scope.md.

## [0.9.0-alpha.28] - 2026-03-13

### Changed

- **Rango por defecto consumo edificio** — Frontend pide por defecto últimos 30 días (antes 7). Backend: si el rango solicitado devuelve vacío, fallback que devuelve los últimos 30 días de datos existentes para ese edificio (readings y staging).
- **Range selector StockChart** — Botones en español: "1 Día", "1 Semana", "1 Mes". Eliminado el botón "Todo". Aplica a gráfico de edificio y detalle de medidor.
- **CLAUDE.md** — StockChart (range selector), BuildingConsumptionChart (30 días + fallback), flujo series temporales.

## [0.9.0-alpha.27] - 2026-03-13

### Fixed

- **Gráfico Potencia Total del Edificio vacío** — En detalle de edificio el gráfico de consumo siempre se muestra: se usa `consumption ?? []` y, cuando no hay datos, BuildingConsumptionChart muestra subtítulo "Sin datos de consumo en el período seleccionado" y un punto placeholder para que el gráfico no quede en blanco.

### Changed

- **CLAUDE.md** — BuildingConsumptionChart: descripción de from/to y estado vacío (siempre visible, mensaje + placeholder).

## [0.9.0-alpha.26] - 2026-03-13

### Fixed

- **Acentos en nombres de centros** — Si los CSV están en Latin-1 (exportación Excel en español), los nombres (ej. "Arauco Estación") se mostraban corruptos. Variable de entorno `CSV_ENCODING=latin1` en drive-pipeline y drive-import-staging para interpretar correctamente; por defecto sigue `utf8`. Re-importar y volver a ejecutar promote/catalog para corregir datos ya cargados.
- **Content-Type JSON** — Backend (main.ts y serverless.ts) envía `application/json; charset=utf-8` en respuestas JSON para que el navegador interprete correctamente caracteres acentuados.

### Changed

- **docs/drive-csv-import-spec.md** — Nota sobre uso de `CSV_ENCODING=latin1` cuando los acentos aparecen corruptos.
- **CLAUDE.md** — Bullet "Codificación CSV" en Bulk CSV Ingest; fecha de validación operativa 2026-03-13.

## [0.9.0-alpha.25] - 2026-03-13

### Added

- **Ingesta por ventana (script)** — `index.mjs` acepta `FROM_DATE` y `TO_DATE` (ISO); solo se insertan filas con `timestamp` en ese rango. Script `ingest-two-months.sh`: ejecuta index + promote para uno o todos los CSV en `raw/`; default Ene 2026 (1 mes). `npm run ingest-two-months` y `npm run s3-csv-date-range` en `infra/drive-import-staging`.
- **Rango temporal de CSV en S3** — Script `s3-csv-date-range.mjs`: devuelve primera y última fecha de un CSV en S3 sin descargar (Range request). Documentado en `docs/drive-csv-import-spec.md`; data en raw/ es año 2026 completo.
- **Lambda CSV ingest (opcional)** — `infra/csv-ingest-lambda/`: Lambda manual para S3 CSV → staging → catalog → readings; timeout 15 min; preferir script para cargas grandes.

### Changed

- **CLAUDE.md** — Ingesta por ventana (script, FROM_DATE/TO_DATE), rango 2026 en S3, s3-csv-date-range; Key Files ingest-two-months.sh y s3-csv-date-range.mjs; estrategia de datos actualizada.

## [0.9.0-alpha.24] - 2026-03-12

### Changed

- **Detalle por local y medidor** — BillingDetailTable deja de repetir la columna Centro en cada fila: agrupa por centerName, ordena por centro/año/mes y muestra Centro una sola vez por bloque (rowSpan). Tabla custom en lugar de DataTable para soportar rowSpan.
- **CLAUDE.md** — Billing: BillingDetailTable agrupación por centro y rowSpan; Key Files BillingDetailTable.

## [0.9.0-alpha.23] - 2026-03-12

### Added

- **Apply 017 y backfill facturación** — Script `apply-017-billing.mjs` aplica migración 017 (módulo BILLING_OVERVIEW y permisos). Script `backfill-summary-from-detail.mjs` rellena `billing_center_summary` desde `billing_monthly_detail` (agregados por centro/año/mes).

### Changed

- **Resumen facturación en pivote** — BillingSummaryTable: una fila por centro y año, columnas por mes (Enero–Diciembre) más Total (kWh); sin repetir nombre de centro.
- **Valores numéricos desde API** — BillingSummaryTable y BillingDetailTable usan toNum() para normalizar valores que llegan como string (pg NUMERIC); formateo correcto de consumo, peak, % punta y CLP.
- **Import XLSX facturación** — Resumen Ejecutivo: detección de fila de encabezados con findHeaderRowWithAll; más variantes de nombres de columna (Consumo Total Centro (kWh), etc.) para coincidir con XLSX.
- **CLAUDE.md** — Facturación: resumen pivote, toNum en tablas; scripts apply-017 y backfill-summary-from-detail; Key Files BillingPage descripción actualizada.

## [0.9.0-alpha.22] - 2026-03-12

### Added

- **Vista Facturación** — Ruta `/billing` con resumen por centro y mes (tabla BillingSummaryTable) y detalle por local y medidor (BillingDetailTable) con paginación (50 por página). Tipos BillingCenterSummary, BillingMonthlyDetail, BillingTariff; rutas y endpoints en `routes.ts` y `endpoints.ts`; hooks useBillingCenters, useBillingSummary, useBillingDetail, useBillingTariffs en `useBilling.ts`. Formato numérico es-CL y CLP en tablas.
- **Paginación detalle facturación** — Backend GET `/billing/detail` acepta `limit` y `offset` (máx 500 por página); frontend usa placeholderData keepPreviousData al cambiar de página.

### Changed

- **CLAUDE.md** — Billing: APIs /billing/centers, /summary, /detail, /tariffs; tipos y hooks; vista Facturación en catálogo; RBAC BILLING_OVERVIEW; Key Files billing service/controller y BillingPage/useBilling; tablas billing_* y migraciones 017–018; sidebar 10 ítems con Facturación.

## [0.9.0-alpha.21] - 2026-03-13

### Added

- **Tablas tiendas y analisis** — Migraciones `sql/015_tiendas.sql` (locales por edificio: building_id, store_type, store_name) y `sql/016_analisis.sql` (agregados por edificio/tienda/medidor y período: consumption_kwh, avg_power_kw, peak_demand_kw). Sin datos; estructura para ingest controlado.
- **Distribución staging → tablas** — Script `distribute-staging-to-tables.mjs`: llena tiendas (GROUP BY desde staging, ensureBuildingsFromStaging) y analisis (por día y batches, ensureMetersFromStaging). FROM_DATE/TO_DATE para ventana de fechas; BATCH_READ, PHASE=tiendas|analisis|all. `docs/distribuir-staging-a-tablas.md` con estrategia por trozos.
- **Staging como buffer** — Doc `docs/staging-buffer-no-almacen.md`: staging no es almacén; tras distribuir se purga. Scripts `purge-staging.mjs` (PURGE_STAGING=1), `rds-free-space.mjs` (tamaños + VACUUM), `truncate-data-keep-tables.mjs` (CONFIRM=1 vacía readings, analisis, tiendas, meters, buildings, staging_centers, alerts, hierarchy_nodes, sessions; conserva users/roles/permisos).
- **Backfill con migración 014** — `backfill-staging-centers.mjs` aplica CREATE TABLE staging_centers si no existe antes de rellenar.
- **Prueba de APIs** — `scripts/test-all-apis.mjs`: llama todas las APIs con Bearer token; BEARER_TOKEN y API_BASE_URL opcionales.
- **Apply 015-016** — `infra/drive-import-staging/apply-015-016.mjs` aplica migraciones tiendas y analisis contra RDS.
- **Lambda CSV ingest (2 meses)** — `infra/csv-ingest-lambda/`: Lambda que consume CSV desde S3 (`raw/`), filtra por ventana fromDate/toDate (2 meses), inserta en `readings_import_staging`, ejecuta catalog (buildings, meters, staging_centers) y promote a `readings`. Invocación manual o EventBridge; payload `key`, `fromDate`, `toDate`. README con deploy e invocación.

### Changed

- **CLAUDE.md** — Tablas tiendas y analisis; relaciones; estrategia de datos (staging buffer, truncate, Lambda 2 meses desde S3); scripts distribute, purge, rds-free-space, truncate-data-keep-tables; referencias a docs staging-buffer y distribuir-staging.

## [0.9.0-alpha.20] - 2026-03-12

### Changed

- **GET /buildings prioriza staging_centers** — BuildingsService.findAll y findOne consultan primero staging_centers; si tiene filas devuelven esos centros (datos del import); si está vacía o no existe, fallback a tabla buildings. Ya no dependen de READINGS_SOURCE para el listado. Scoping por siteIds aplicado en ambos orígenes.
- **Backfill staging_centers** — Script `infra/drive-import-staging/backfill-staging-centers.mjs` (`npm run backfill-staging-centers`): rellena staging_centers desde readings_import_staging (GROUP BY center_name, center_type). Útil cuando la migración 014 se aplicó después del import. DRY_RUN=true para solo inspeccionar.
- **CLAUDE.md** — Listado edificios y staging_centers; backfill documentado; Promotion pipeline menciona staging_centers y backfill.

## [0.9.0-alpha.19] - 2026-03-12

### Changed

- **GET /buildings y GET /buildings/:id devuelven centerType desde BD** — BuildingsService.findAll y findOne intentan primero una query que incluye center_type; si la columna no existe (migración 013 no aplicada) hacen fallback a la query sin ella y devuelven null. Cuando 013 está aplicada, centerType refleja el valor de la base.
- **CLAUDE.md** — BuildingsService: patrón try/fallback para center_type documentado.

## [0.9.0-alpha.18] - 2026-03-12

### Fixed

- **Todos los endpoints de meters en 200 sin migración 013** — MetersService deja de cargar la entidad Meter en findOne y findByBuilding: getMeterRow(id) y getMeterRowsByBuilding(buildingId) con raw query (sin store_type/store_name); findAccessibleMeterEntity devuelve MeterRow. GET /buildings/:id/meters, GET /meters/:id, GET /meters/:id/readings, uptime, downtime-events, alarm-events, alarm-summary responden 200 aunque la migración 013 no esté aplicada.

### Changed

- **CLAUDE.md** — Compatibilidad sin 013: todos los endpoints buildings y meters documentados; patrón MeterRow y getMeterRow/getMeterRowsByBuilding.

## [0.9.0-alpha.17] - 2026-03-12

### Fixed

- **GET /meters/overview 500 sin migración 013** — MetersService.getOverview deja de seleccionar store_type y store_name en la query; usa dataSource.query y devuelve storeType/storeName null. La API responde 200 aunque la migración 013 no esté aplicada.

### Changed

- **CLAUDE.md** — Compatibilidad sin 013: GET /meters/overview incluido; patrón MetersService.getOverview con raw query.

## [0.9.0-alpha.16] - 2026-03-12

### Fixed

- **GET /buildings y GET /buildings/:id 500 sin migración 013** — BuildingsService.findAll y findOne pasan a usar raw query (solo id, name, address, total_area y subquery de conteo de medidores) para no depender de las columnas de la migración 013 (center_type, store_type, store_name). La API responde 200 aunque la migración no esté aplicada en producción; centerType se devuelve null en ese caso.

### Changed

- **CLAUDE.md** — Nota de compatibilidad: GET /buildings funciona sin 013; patrón Backend BuildingsService con raw query.

## [0.9.0-alpha.15] - 2026-03-12

### Added

- **Campos centro y tienda (docx)** — Migración `sql/013_center_and_store_fields.sql`: `buildings.center_type` (categoría del centro: Mall Grande, Outlet, etc.) y `meters.store_type`, `meters.store_name` (rubro y nombre del local). APIs `GET /buildings`, `GET /buildings/:id` devuelven `centerType`; `GET /meters/overview`, `GET /meters/:id` devuelven `storeType`, `storeName`. Null en datos legacy. Promote rellena desde staging en fase catalog.
- **DbVerify stagingCentersCount** — `GET /api/db-verify` incluye `stagingCentersCount` (COUNT(DISTINCT center_name) en readings_import_staging).
- **Script lectura docx** — `scripts/read-docx.mjs` (mammoth) extrae texto de POWER_Digital_Documentacion_BD.docx; uso: `node scripts/read-docx.mjs [--out=archivo.txt]`.
- **Revisión APIs vs docx** — `docs/revision-apis-vs-docx-bd.md`: mapeo modelo docx → backend y brechas resueltas (centerType, storeType, storeName).

### Changed

- **Promote (catalog)** — Inserción de buildings con `center_type`; inserción de meters con `store_type`, `store_name` desde staging. ON CONFLICT actualiza esos campos.
- **CLAUDE.md** — Schema buildings/meters con nuevos campos; migración 013 en lista; tipo Building con centerType.

## [0.9.0-alpha.14] - 2026-03-12

### Added

- **Fuente de lecturas configurable (READINGS_SOURCE)** — Con `READINGS_SOURCE=staging`, las APIs de lecturas y consumo leen desde `readings_import_staging` en lugar de `readings`. Límites por consulta: 5000 filas por defecto, hasta 50000 con query `limit`; rango `from`/`to` obligatorio y máximo 90 días. Endpoints: `GET /meters/:id/readings`, `GET /buildings/:id/consumption`, consumo por nodo en hierarchy (drill-down). Config en `backend/src/readings-source.config.ts`; MetersService y HierarchyService consultan staging con subconsultas limitadas (thd/alarm null en staging).

### Changed

- **MetersController** — Parámetro opcional `limit` en `GET /meters/:id/readings`; documentación Swagger para uso con READINGS_SOURCE=staging.
- **BuildingsController** — ApiOperation de consumption actualizado: from/to obligatorios cuando READINGS_SOURCE=staging.

## [0.9.0-alpha.13] - 2026-03-12

### Added

- **Diagnóstico Drive → RDS (API)** — `GET /api/ingest/diagnostic`: compara `readings_import_staging` con `readings` y devuelve conclusion (full_match | partial_match | mismatch | no_staging_data), perFileMatch, stagingFiles, message. Requiere ADMIN_USERS.view. `GET /api/ingest/diagnostic/local` sin auth en desarrollo.
- **DbVerifyService defensivo** — Cada bloque de consultas en try/catch; si una query falla se devuelven valores por defecto y opcionalmente `errors[]` en la respuesta (nunca 500 en este endpoint).

### Changed

- **Lambda API timeout** — Aumentado a 30s en serverless.yml para evitar 500 por timeout en cold start (bootstrap Nest + TypeORM ~8s).
- **Invitaciones sin NULL en external_id** — Si en producción `external_id`/`provider` son NOT NULL, al crear invitación se usan centinelas `provider='invitation'` y `external_id='inv:<hex>'`; el primer login OAuth reemplaza por el valor real. La API sigue exponiendo `provider: null` para invitados pendientes.

## [0.9.0-alpha.12] - 2026-03-12

### Added

- **CLAUDE.md** — Sección "Frontend: vistas, gráficos, datos y flujo": catálogo de vistas (rutas, permisos, datos por vista), gráficos y visualizaciones (StockChart en edificio/medidor, DrilldownBars, tablas), datos por dominio y hooks, patrones de consumo (cache/refetch por query), flujo resumido. Patrones de frontend actualizados con referencia a la nueva sección y detalle de cache strategy.
- **Jerarquía desde staging (Opción A)** — Script `infra/drive-import-staging/hierarchy-from-staging.mjs`: lee `readings_import_staging` (center_type, store_type, store_name, meter_id) y escribe `hierarchy_nodes` en 4 niveles (Building → Panel → Subpanel → Circuit) para edificios Drive sin jerarquía. Uso: `npm run hierarchy-from-staging`; mismo env que promote. Documentación en `docs/hierarchy-from-staging.md`.
- **Plan de negocio consumo RDS** — `docs/plan-negocio-consumo-datos-rds.md`: contexto, brechas, fases (validación from/to, jerarquía Drive, escala/reporting), riesgos. Referencia a hierarchy-from-staging como Opción A implementada.

### Changed

- **Frontend consumo y lecturas** — Las llamadas a consumo (edificio) y lecturas (medidor) envían siempre `from` y `to` al backend. Rango por defecto: últimos 7 días; al cambiar el rango en el gráfico (StockChart) se actualiza el estado y se refetcha con el nuevo intervalo. Hooks useBuildingConsumption y useMeterReadings requieren from/to (enabled solo con rango); evita peticiones sin acotar con muchos datos en RDS.
- **CLAUDE.md Bulk CSV Ingest** — Alcance explícito: la carga desde Google Drive es un mecanismo de ingesta de datos (puntual u ocasional), no un puente operativo permanente; el producto opera sobre datos ya cargados en RDS.

## [0.9.0-alpha.11] - 2026-03-11

### Fixed

- **dbVerify Lambda y script verify-rds.mjs** — La tabla `meters` tiene columna PK `id`, no `meter_id`. Corregida la consulta de muestra de medidores: `SELECT id AS meter_id FROM meters` en ambos (Lambda y script local).

## [0.9.0-alpha.10] - 2026-03-11

### Added

- **Promoción automática en pipeline Fargate** — tras importar a staging, el contenedor ejecuta `promote.mjs` (validate → catalog → promote → verify). La data de Drive queda en `readings` lista para NestJS. Si staging está vacío, promote sale en 0 sin error.
- **Lambda dbVerify** — función invocable con AWS CLI para verificación RDS sin túnel ni token. `aws lambda invoke --function-name power-digital-api-dev-dbVerify --region us-east-1 out.json`. Devuelve JSON con conteos, medidores por edificio, muestra de meter_id, rangos temporales, jerarquía y listado de edificios. Misma VPC y env que la API.
- **Script infra/db-verify** — verificación RDS con dos modos: (1) modo prueba con `.env` (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME); carga automática con dotenv; (2) sin credenciales locales usa AWS Secrets Manager. Mensajes de error claros en español (ECONNREFUSED, ETIMEDOUT, fallo de autenticación). README y `.env.example` en `infra/db-verify/`.
- **Documento docs/data-drive-aws-review.md** — revisión de qué hay en RDS tras la carga Drive, cómo exponer por backend, consumo en frontend y vistas; verificación vía AWS CLI (Lambda) o script local.

### Changed

- **drive-pipeline Dockerfile** — CMD ejecuta `node index.mjs && node promote.mjs` en secuencia.
- **drive-pipeline/promote.mjs** — cuando staging está vacío retorna null y sale en 0 en vez de lanzar error.

## [0.9.0-alpha.9] - 2026-03-11

### Added

- **Ingesta incremental automatizada Drive → Fargate → RDS** — reemplaza el proceso manual de tunneling SSH (~2.5 horas) por un flujo autónomo, rápido y sin intervención
  - `infra/drive-ingest/index.mjs`: detección de cambios por `driveModifiedTime` — compara el manifest S3 más reciente con el valor actual en Drive antes de descargar; archivos sin cambios se saltan con `[skip]`. Variable `FORCE_DOWNLOAD=true` disponible para forzar descarga completa
  - `infra/drive-pipeline/` (nueva carpeta): orquestador unificado que encadena detección → descarga Drive→S3 → importación S3→`readings_import_staging` en un único proceso Fargate-ready
    - `index.mjs`: lógica completa del pipeline con validación de registros, batching y `INSERT ON CONFLICT DO NOTHING` idempotente
    - `Dockerfile`: imagen `node:20-alpine` lista para ECS Fargate
    - `package.json`: dependencias unificadas (googleapis, csv-parse, pg, @aws-sdk/*)
    - `task-definition.json`: Task Definition para `energy-monitor-drive-pipeline:1` (1 vCPU, 2 GB, subnets privadas, SG RDS)
  - EventBridge Scheduler `energy-monitor-drive-pipeline-daily`: cron `0 6 * * ? *` UTC = **03:00 Chile** diariamente
  - CloudWatch log group `/ecs/energy-monitor-drive-pipeline` para auditoría de corridas
  - `.github/workflows/drive-pipeline.yml`: CI/CD que hace build + push de la imagen Docker a ECR en cada push a `main` con cambios en `infra/drive-pipeline/**`

### Infrastructure

| Recurso | Valor |
|---|---|
| Task Definition | `energy-monitor-drive-pipeline:1` |
| ECR Repository | `energy-monitor-drive-pipeline` |
| EventBridge Schedule | `energy-monitor-drive-pipeline-daily` (`cron(0 6 * * ? *)`) |
| CloudWatch Log Group | `/ecs/energy-monitor-drive-pipeline` |
| IAM Role (EventBridge) | `energy-monitor-eventbridge-drive-pipeline` |

## [0.9.0-alpha.8] - 2026-03-10

### Changed

- **Contexto activo ahora sí estrecha el backend** — cuando el usuario selecciona un sitio en frontend, el cliente envía `X-Site-Context` y `RolesGuard` reduce el scope efectivo de ese request
  - Usuarios multisite ya no reciben sólo filtro visual local; el narrowing también ocurre server-side
  - Un sitio activo fuera del alcance asignado ahora devuelve `403`
  - Los roles globales conservan vista portafolio cuando el contexto es `*`, y pueden estrecharse a un sitio concreto cuando lo eligen

## [0.9.0-alpha.7] - 2026-03-10

### Added

- **Invitación con link firmado operativa** — el primer acceso SSO ya puede exigir un token de invitación con expiración cuando la cuenta fue provisionada por `/admin/users`
  - Backend: `users` ahora persiste `invitation_token_hash`, `invitation_expires_at` e `invitation_sent_at`
  - Backend: nuevo endpoint público `GET /invitations/:token` para validar la invitación antes del login
  - Backend: `GET /auth/me` acepta `X-Invitation-Token` para enlazar identidades en el primer acceso y limpiar el token al activarse
  - Frontend: nueva vista pública `/invite/:token` para validar la invitación y continuar con Microsoft/Google
  - Frontend: `/admin/users` ahora devuelve y muestra un link de invitación copiable con fecha de expiración
  - SQL: nueva migración `sql/009_invitation_links.sql`

### Changed

- **Onboarding invite-first endurecido** — una invitación emitida con link firmado ya no depende sólo del match por email; el primer enlace SSO puede requerir el token válido y vigente
- **Backlog de invitaciones reducido** — el pendiente ya no es el token firmado, sino el envío transaccional por email y el lifecycle administrativo de reemisión o revocación

## [0.9.0-alpha.6] - 2026-03-10

### Added

- **Scoping backend por sitio operativo** — los endpoints de datos ya no exponen información global a usuarios limitados a uno o más sitios
  - `authContext` ahora resuelve `siteIds` y alcance global reutilizable para guards y controllers
  - Buildings, meters, hierarchy y alerts filtran datos por sitios asignados; los roles globales conservan acceso transversal
  - `POST /alerts/sync-offline` ahora evalúa sólo el subconjunto de medidores visible para el usuario que ejecuta la acción
  - Nuevas tests backend para helpers de scoping y wiring de controllers

### Changed

- **Recursos fuera de alcance devuelven 404** — detalle de building, meter, hierarchy y alert ya no filtra sólo por permiso; también oculta recursos fuera del scope asignado
- **Known gap reducido** — el pendiente de acceso ya no es el scoping por sitio, sino usar el sitio seleccionado en frontend como filtro server-side adicional para usuarios multisite

## [0.9.0-alpha.5] - 2026-03-10

### Added

- **Baseline invite-first operativo** — el backend ya no autocrea accesos abiertos; el primer login SSO sólo enlaza identidades contra usuarios preprovisionados por email
  - SQL: nueva migración `sql/007_invite_first_users.sql` para permitir `provider` y `external_id` nulos hasta el primer login
  - Backend: `GET /users`, `POST /users` y `GET /roles` para provisionar invitaciones con rol y sitios preasignados
  - Frontend: nueva vista `/admin/users` para crear invitaciones y revisar estado (`invited`, `active`, `disabled`)
  - Tests backend agregados para el binding invite-first y el flujo RBAC actualizado
- **Catálogo persistido de vistas reales** — la tabla `modules` ahora representa vistas navegables del producto y no módulos abstractos
  - SQL: nueva migración `sql/008_views_catalog.sql` para migrar `modules` al catálogo real y reseedear `role_permissions`
  - Backend: nuevo endpoint `GET /views` para inspeccionar el catálogo persistido de vistas
  - RBAC backend y frontend alineados a códigos de vista reales como `BUILDINGS_OVERVIEW`, `ALERTS_OVERVIEW`, `METER_DETAIL` y `ADMIN_USERS`

### Changed

- **Matriz de acceso normalizada a `rol -> vistas -> acciones`** — rutas protegidas, guards backend, navegación y CTAs quedaron alineados al catálogo real de vistas para reducir `403` evitables
- **Mensajes de acceso no invitado** — el frontend ahora informa explícitamente cuando una cuenta no tiene invitación activa en vez de tratarlo como activación pendiente genérica

## [0.9.0-alpha.4] - 2026-03-06

### Fixed

- **Gráfico "Calidad Eléctrica" vacío en medidores 3P** — Los campos THD voltaje, THD corriente y desbalance de fases se insertaban como NULL porque `profiles.json` no tenía perfiles estadísticos para esos campos
  - Agregados perfiles `thdV`, `thdI`, `phImb` para los 6 medidores 3P (M001, M002, M003, M011, M012, M013) con variación día/noche
  - Backfill de 35,738 readings históricos con datos realistas (THD-V ~2-4%, THD-I ~5-12%, desbalance ~0.8-2.5%)
  - Lambda del generador sintético re-desplegada con nuevos perfiles

### Changed

- **Drill-down: removido treemap** — Se eliminó el gráfico treemap "Distribución de consumo" del drill-down jerárquico, dejando solo el gráfico de barras horizontales + tabla

---

## [0.9.0-alpha.3] - 2026-03-06

### Changed

- **Loading state en charts al cambiar zoom** — Al cambiar resolución (ej. Todo→1D), el gráfico anterior permanece visible con un spinner overlay semitransparente en vez de desaparecer y mostrar un skeleton vacío
  - `keepPreviousData` en `useBuildingConsumption` y `useMeterReadings` (TanStack Query)
  - Prop `loading` en `StockChart` con overlay spinner animado
- **Separación visual de badges** — `UptimeBadges` y `AlarmSummaryBadges` ahora tienen margen inferior (`mb-3`) para no pegarse al primer gráfico

---

## [0.9.0-alpha.2] - 2026-03-06

### Added

- **Página Estado de Dispositivos IoT** (`/iot-devices`) — vista global de todos los medidores con status, uptime y alarmas
  - Backend: `GET /meters/overview` — query eficiente con LATERAL JOIN para uptime 24h y subquery para alarmas 30d (sin N+1)
  - Frontend: `IoTDevicesPage` con DataTable (TanStack Table), 8 columnas: Medidor, Edificio, Modelo, Fase, Estado (badge), Última Lectura (relativo), Uptime 24h (coloreado), Alarmas 30d (badge)
  - Resumen: badges Total/Online/Offline en header
  - Click en fila navega a `/meters/:id`
  - Sorting por cualquier columna
  - Nuevo item "Dispositivos" en sidebar (visible para todos los roles)

### Fixed

- **Zoom "Todo" → "1D" bloqueado** — Highcharts auto-calculaba `minRange` basado en densidad de datos diarios, impidiendo zoom a rangos <1 día. Fix: `minRange: 3600000` (1 hora) explícito en xAxis
- **`rangeSelector.selected` reseteaba zoom en re-render** — Removido `selected` del theme global. Ahora se gestiona via `initialSelected` ref que aplica `selected: 2` (1M) solo en el primer render y se limpia después

---

## [0.9.0-alpha.1] - 2026-03-06

### Added

- **Visualización de alarmas en MeterDetailPage** — 8 tipos de alarma (HIGH_DEMAND, LOW_POWER_FACTOR, BREAKER_OPEN, UNDERVOLTAGE, OVERVOLTAGE, HIGH_THD, PHASE_IMBALANCE, MODBUS_CRC_ERROR)
  - Backend: `GET /meters/:id/alarm-events?from=&to=` y `GET /meters/:id/alarm-summary?from=&to=`
  - Frontend: `AlarmSummaryBadges` — badges coloreados por tipo (últimos 30 días)
  - Frontend: `AlarmEventsTable` — tabla de eventos con fecha, tipo, voltaje, FP, THD
  - Highcharts `flags` series en 4 charts: Potencia (CRC/DEM/BRK), Voltaje (UV/OV), PF (PF), Calidad (THD/IMB)
- **Resolución 15 min en gráfico de edificio** — `BuildingDetailPage` ahora cambia resolución dinámicamente al hacer zoom: ≤36h→15min, ≤7d→hourly, >7d→daily
  - Backend: `findBuildingConsumption` soporta `resolution=15min` con truncación manual `date_trunc('hour') + interval '15 min' * floor(...)`
  - Frontend: `pickResolution` + `handleRangeChange` via `afterSetExtremes`

### Changed

- **Range selector buttons** — Cambiados a `1D` (día), `1S` (semana), `1M` (mes), `Todo`. Default: 1M
- **Labels de charts** — "Voltaje (V)" → "Voltaje Fase (V)", "THD Voltaje (%)" → "THD Voltaje Fase (%)"

### Fixed

- **Jerarquía inventada eliminada** — Removidos subtableros y circuitos ficticios (Iluminación, Climatización, Fuerza, etc.). Jerarquía aplanada a Gateway → Medidor (17 nodos reales)
- **CSV reimportado (v2)** — Corregidos valores de `energy_kWh_total` (antes ~5-8 kWh, ahora 0→3,031 kWh acumulativo). Perfiles estadísticos y datos sintéticos regenerados
- **Highcharts `hoverPoint` crash** — Parchado `Pointer.onContainerClick` con try-catch para evitar `TypeError: Cannot read properties of undefined (reading 'hoverPoint')` al hacer click en áreas vacías del chart o navigator

---

## [0.8.0-alpha.5] - 2026-03-06

### Added

- **7 columnas faltantes en readings** — Agregadas `breaker_status`, `digital_input_1/2`, `digital_output_1/2`, `alarm`, `modbus_crc_errors` a la tabla `readings` (21/21 columnas del CSV)
  - SQL migration, backend entity, frontend types, import script actualizados
  - Re-importación completa: 86,104 filas con las 21 columnas

### Changed

- **Generador sintético basado en perfiles reales** — Reemplazado `Math.random()` con rangos inventados por distribución normal (Box-Muller) usando media + desviación estándar por medidor, por hora, extraídos del CSV histórico (13 campos × 15 medidores × 24 horas)
  - Perfiles embebidos como `profiles.json` (58KB) en la Lambda
  - Datos sintéticos regenerados: 4,065 readings "alucinadas" eliminadas, 1,650 nuevas con patrones estadísticos reales

---

## [0.8.0-alpha.4] - 2026-03-06

### Added

- **Uptime tracking por medidor** — Historial de disponibilidad IoT derivado de gaps en readings via `LAG()` window function (sin nuevas tablas)
  - Backend: `GET /meters/:id/uptime` (resumen 24h/7d/30d) y `GET /meters/:id/downtime-events` (eventos con duración)
  - Frontend: `UptimeBadges` — 3 badges coloreados (verde ≥99.5%, amarillo ≥95%, rojo <95%) con conteo de eventos
  - Frontend: `DowntimeEventsTable` — tabla de downtime últimos 30 días con inicio, fin y duración
  - Threshold: 90 min (compatible con datos históricos 15min, backfill horario y sintéticos 1min)

---

## [0.8.0-alpha.3] - 2026-03-06

### Changed

- **Range selector buttons** — Cambiados de `1d, 1s, 1m` a `1D` (1 día), `1H` (1 hora), `1M` (1 minuto), `Todo`. Default: 1D

---

## [0.8.0-alpha.2] - 2026-03-06

### Added

- **Resolución 15 minutos** — Zoom 1D ahora muestra puntos cada 15 min. Resolución dinámica: ≤36h→15min, ≤7d→hourly, >7d→daily via `afterSetExtremes` de Highcharts Stock
- **6 gráficos por medidor** — MeterDetailPage ahora muestra: Potencia (kW + kVAR dual-axis), Voltaje (L1/L2/L3), Corriente (L1/L2/L3), Factor de Potencia & Frecuencia (dual-axis), Energía Acumulada (area), Calidad Eléctrica (THD + Desbalance, solo 3P). Series toggleables via legend

### Fixed

- **Spike consumo edificio (~550 kW → ~13 kW)** — Query `findBuildingConsumption` usaba `SUM(power_kw)` directo, inflado 60× por múltiples readings/hora. Fix: agregación en dos pasos (AVG por medidor por bucket, luego SUM entre medidores)
- **Highcharts error #18 (dual-axis)** — StockChart mergeaba `yAxis` como objeto cuando charts pasan array. Fix: detecta `Array.isArray` y aplica theme styles a cada eje

---

## [0.8.0-alpha.1] - 2026-03-06

### Added

- **Drill-down jerárquico 5 niveles** — Edificio → Tablero General → Subtablero → Circuito → Medidor
  - SQL migration: tabla `hierarchy_nodes` con `parent_id` auto-referencial + seed 24 nodos (2 edificios)
  - Backend `HierarchyModule`: queries CTE recursivos para árbol, path ancestros, hijos con consumo agregado, time-series por nodo
  - `DrilldownPage`: estado `currentNodeId` con drill-down in-page
  - `DrilldownTreemap`: Highcharts treemap con `colorAxis` (verde→rojo por consumo), click = drill
  - `DrilldownBars`: barras horizontales kWh por hijo, ordenadas descendente
  - `DrilldownChildrenTable`: tabla con nombre, tipo, kWh, %, medidores, estado; click = drill o navegar a medidor
  - `DrilldownBreadcrumb`: breadcrumb clickeable con badges de nivel
  - Ruta `/monitoring/drilldown/:buildingId` con lazy loading + Suspense + ErrorBoundary + DrilldownSkeleton
  - Botón "Drill-down Jerárquico" en `BuildingDetailPage`

### Fixed

- **Gap de datos Mar 2-5**: backfill de 1,440 readings sintéticas (15 medidores × 24 hrs × 4 días) para cerrar el hueco entre datos históricos (→Mar 1) y generador sintético (Mar 6→)
- **Synthetic generator inflado**: `power_kw` se compounding exponencialmente (1.4→1550 kW) porque usaba `last_power` como base. Fix: rango nominal fijo por tipo de medidor (3P ~2.5 kW, 1P ~0.85 kW). Purgados 1,200 readings corruptos de Mar 6 y regenerados con magnitudes correctas
- **Highcharts treemap ESM/CJS**: fix inicialización del módulo treemap compatible con ambos formatos de export

---

## [0.7.0-alpha.6] - 2026-03-06

### Added

- **ErrorBoundary** (`ErrorBoundary.tsx`): class component con `getDerivedStateFromError` + `componentDidCatch` que captura errores de rendering
  - UI de error con mensaje, botón "Reintentar" (resetea estado) y "Ir al inicio"
  - Logs de error en consola con component stack
- **Per-route error boundaries**: cada página (Buildings, BuildingDetail, MeterDetail, Login, Unauthorized) envuelta en `<ErrorBoundary>` individual — un error en una página no tumba la app completa
- **`errorElement`** en layout route como fallback de último recurso para errores de routing

---

## [0.7.0-alpha.5] - 2026-03-06

### Added

- **React Suspense + Lazy Loading** (`router.tsx`): todas las páginas se cargan con `React.lazy()` + `Suspense` con skeleton como fallback
  - Code splitting: cada página es un chunk separado (BuildingsPage 1.1KB, BuildingDetailPage 2.6KB, MeterDetailPage 2KB, LoginPage 3.3KB)
  - StockChart (Highcharts 388KB) solo se descarga cuando se navega a una vista con gráficos
- **Skeletons inline**: `ChartSkeleton` y `MetersGridSkeleton` para secciones que cargan después del componente principal (consumption, meters, readings)
  - `BuildingDetailPage`: skeleton para chart mientras `consumption` carga + skeleton grid mientras `meters` carga
  - `MeterDetailPage`: skeleton para charts mientras `readings` carga

### Fixed

- **`border-radius: 0 !important` global eliminado** (`index.css`): reset CSS que anulaba `rounded-lg` en Cards y `borderRadius: 8` en charts
- **Navigator rango por defecto**: cambiado de "Todo" a "1 semana" (`selected: 1`) para vista inicial razonable

---

## [0.7.0-alpha.4] - 2026-03-06

### Added

- **Skeleton loading states** (`Skeleton.tsx`): componentes `animate-pulse` que replican el layout de cada página durante la carga
  - `BuildingsPageSkeleton`: título + grid de 4 cards fantasma
  - `BuildingDetailSkeleton`: header + chart 380px + 6 meter cards
  - `MeterDetailSkeleton`: header + metadata + 2 charts
  - `ProtectedRoute`: sidebar fantasma + layout con chart y cards (reemplaza "Cargando..." a pantalla completa)

---

## [0.7.0-alpha.3] - 2026-03-06

### Changed

- **Sidebar**: removido bloque de usuario (avatar, nombre, rol) del fondo — solo queda botón "Cerrar sesión"
- **Botón "Volver"**: sin bordes, texto plano con hover sutil
- **BuildingDetailPage**: gráfico de consumo siempre visible (fijo); solo la sección de medidores hace scroll
- **Bordes redondeados** (`rounded-lg` / `borderRadius: 8`): aplicado a `Card`, `StockChart` y `Chart`

---

## [0.7.0-alpha.2] - 2026-03-06

### Added

- **Highcharts Stock Navigator**: nuevo componente `StockChart.tsx` usando `highcharts/highstock` — gráfico detallado arriba + mini-chart con handles arrastrables abajo para seleccionar rango temporal
  - Range Selector con botones rápidos: 1d, 1s, 1m, Todo
  - Dark theme con navigator estilizado (mask fill azul, handles azules, scrollbar deshabilitado)
- **Filtrado temporal from/to**: endpoints `GET /meters/:id/readings` y `GET /buildings/:id/consumption` ahora aceptan parámetros opcionales `from` y `to` (ISO 8601) para limitar el rango de datos retornado

### Changed

- `BuildingConsumptionChart.tsx`: migrado de `Chart` a `StockChart` con navigator
- `MeterDetailPage.tsx`: gráficos de potencia y voltaje migrados a `StockChart`
- `meters.service.ts`: `findReadings()` y `findBuildingConsumption()` filtran por `from`/`to` via QueryBuilder
- `buildings.service.ts`: `findConsumption()` pasa `from`/`to` al service
- `endpoints.ts`: `fetchBuildingConsumption` y `fetchMeterReadings` aceptan `from`/`to`

---

## [0.7.0-alpha.1] - 2026-03-06

### Added

- **Synthetic data generator** (`infra/synthetic-generator/`): Lambda standalone que inserta 15 readings (1 por medidor) cada 1 minuto con `timestamp = NOW()` y valores realistas (variación ±10%, factor hora del día, energía acumulativa)
  - `index.mjs`: handler Lambda con LATERAL JOIN para leer última lectura + batch INSERT
  - `package.json`: dependencia `pg`
  - `teardown.sh`: script para eliminar Lambda + EventBridge rule
  - `.gitignore`: excluye `node_modules/`
- **EventBridge rule** `synthetic-readings-every-1min`: dispara la Lambda cada 1 minuto
- **Swagger / OpenAPI** (`@nestjs/swagger`): documentación interactiva del API
  - `swagger.ts`: setup centralizado (título, versión, Bearer auth)
  - Swagger UI disponible en `/api/docs`
  - `@ApiTags`, `@ApiOperation`, `@ApiParam`, `@ApiQuery`, `@ApiOkResponse` en los 3 controllers
  - `@ApiProperty` con ejemplos en entities: Building, Meter, Reading
  - DTOs de respuesta: `MeResponseDto`, `PermissionsResponseDto`, `BuildingSummaryDto`, `ConsumptionPointDto`

### Changed

- **Dynamic meter status**: `meters.service.ts` calcula `online`/`offline` según `lastReadingAt` (< 5 min = online) en vez de usar el valor estático de la DB
- **Raw readings query**: cambiado de `ORDER BY timestamp ASC LIMIT 2000` (más viejas) a `DESC LIMIT 2000 + reverse` (más recientes)
- **serverless.ts**: incluye `setupSwagger(app)` para que Swagger funcione en Lambda

### Removed

- **Frontend mocks eliminados**: `src/mocks/` (5 archivos), `useDemoAuth.ts`, `DemoRoleSelector.tsx`
- **Demo mode**: removido `'demo'` de `AuthProvider`, `VITE_AUTH_MODE`, `validateEnv`, `LoginPage`, `useAuth`
- Mock interceptor ya no intercepta rutas de datos — frontend consume API real directamente

### Infrastructure

| Recurso | Valor |
|---|---|
| Lambda (synthetic) | `synthetic-readings-generator` (Node 20, 128MB, 15s timeout) |
| EventBridge | `synthetic-readings-every-1min` (rate: 1 minute) |
| Costo estimado | ~$0.01/mes (free tier) |

---

## [0.6.0-alpha.1] - 2026-03-05

### Breaking — Schema migration: locals → meters/readings

Reemplazado el schema dummy (5 buildings, 10 locals, monthly_consumption) por data real de telemetría: 15 medidores Siemens (PAC1670/PAC1651) con 86,104 lecturas cada 15 min (Ene-Feb 2026).

### Added

- **SQL migration** (`sql/004_meters_readings.sql`): DROP locals/monthly_consumption, CREATE meters (15 rows) + readings (86K rows), index `(meter_id, timestamp)`
- **Backend MetersModule** (`backend/src/meters/`): entity Meter + Reading, service con `date_trunc` aggregation (hourly/daily), controller `GET /meters/:id`, `GET /meters/:id/readings?resolution=hourly`
- **Building consumption endpoint** mejorado: `GET /buildings/:id/consumption?resolution=hourly` — area chart con potencia total por hora (suma de todos los medidores), pico instantáneo
- **Frontend MeterDetailPage** (`/meters/:meterId`): gráficos de potencia (kW) y voltaje trifásico (V) con data real horaria
- **MeterCard component**: status badge (online/offline), modelo, fase, bus, última lectura
- **Frontend hooks**: `useMetersByBuilding`, `useMeter`, `useMeterReadings`
- **Mock data actualizada**: 2 buildings reales, 15 meters, readings generadas para demo mode
- **User upsert fallback**: búsqueda por email cuando `external_id` no matchea (permite pre-registrar usuarios sin conocer su Google/Microsoft ID)
- **Usuario darwin@hoktus.com** registrado como SUPER_ADMIN (Google login)

### Removed

- `backend/src/locals/` (5 archivos): entity Local, MonthlyConsumption, controller, service, module
- `frontend/src/features/locals/` (3 archivos): LocalDetailPage, LocalCard, LocalConsumptionTable
- `frontend/src/hooks/queries/useLocals.ts`
- `frontend/src/mocks/locals.ts`, `consumption.ts`
- Tipos `Local`, `MonthlyConsumption`, `HierarchyNode` del frontend

### Changed

- **Buildings**: `localsCount` → `metersCount`, `/locals` → `/meters` endpoint
- **BuildingDetailPage**: muestra MeterCards en vez de LocalCards
- **BuildingConsumptionChart**: area chart con potencia total + pico (era line chart de kWh mensuales)
- **Router**: `meterDetail` (`/meters/:meterId`) reemplaza `localDetail`
- **Types**: `Building.metersCount`, nuevo `Meter`, `Reading`, `ConsumptionPoint`
- **Mock interceptor**: rutas meters/readings en vez de locals/consumption

### Database (RDS)

| Tabla | Filas |
|---|---|
| buildings | 2 (PAC4220 Gateway, S7-1200 PLC) |
| meters | 15 (M001-M015) |
| readings | 86,104 (15-min intervals, Jan-Feb 2026) |
| locals | DROPPED |
| monthly_consumption | DROPPED |

---

## [0.5.0-alpha.8] - 2026-03-05

### Fixed

- **Microsoft login**: cambiado de `loginPopup()` a `loginRedirect()` — el popup flow de MSAL v5 no cerraba el popup (la SPA completa se cargaba dentro del popup y React Router tomaba control antes de que MSAL procesara el hash)
- **Backend routes 404**: `dist/` estaba desactualizado — `BuildingsModule` y `LocalsModule` no estaban compilados. Rebuild + redeploy corrige todas las rutas
- **React setState-during-render**: movido el side effect de `resolveBackendUser` a un `useEffect` con ref guard en vez de ejecutarlo durante el render del hook `useAuth`

### Added

- **Vite dev proxy**: proxy `/api` → API Gateway para desarrollo local (no requiere CORS en dev)
- **Frontend `.env`** (gitignored): credenciales OAuth + API base URL para dev local

### Changed

- `frontend/src/hooks/auth/useMicrosoftAuth.ts`: `loginRedirect()` + `logoutRedirect()` en vez de popup
- `frontend/src/hooks/auth/useAuth.ts`: `useEffect` para detectar MSAL redirect flow post-autenticación, error messages detallados con status code
- `frontend/vite.config.ts`: proxy `/api` → API Gateway (sin `/dev/` stage prefix)
- Backend redeployado con `BuildingsModule` + `LocalsModule` compilados — endpoints `/api/buildings`, `/api/locals` funcionan
- Usuario Microsoft (`carriagadafalcone@gmail.com`) activado como SUPER_ADMIN en RDS

---

## [0.5.0-alpha.6] - 2026-03-05

### Added

- **Frontend → Backend auth integrado**: login con Microsoft/Google ahora envía el ID token (JWT) a `GET /api/auth/me`, recibe user + permissions reales desde RDS
- **Google credential flow**: cambiado de `useGoogleLogin({ flow: 'implicit' })` (access_token opaco) a `<GoogleLogin>` component (ID token JWT verificable por JWKS)
- **Microsoft ID token**: `loginPopup()` ahora guarda `idToken` en `sessionStorage` para envío automático como Bearer
- **`resolveBackendUser()`**: helper en `useAuth` que llama `/api/auth/me` post-login y maneja 401/403 con mensajes claros
- **Mock interceptor inteligente**: en modo no-demo, rutas `/auth/*` pasan al backend real; rutas de datos siguen mock. Rutas sin handler pasan al backend (no 404 falso)
- **Backend `.env`**: archivo local con credenciales RDS + OAuth client IDs para `sls offline`

### Changed

- `frontend/src/hooks/auth/useMicrosoftAuth.ts`: guarda `idToken` en sessionStorage post-login
- `frontend/src/hooks/auth/useGoogleAuth.ts`: exporta `onGoogleSuccess(credential)` en vez de implicit flow
- `frontend/src/features/auth/components/GoogleLoginButton.tsx`: usa `<GoogleLogin>` de `@react-oauth/google`
- `frontend/src/hooks/auth/useAuth.ts`: `loginMicrosoft()` y `loginGoogle()` llaman `resolveBackendUser()` post-token
- `frontend/src/mocks/mockInterceptor.ts`: handlers separados en `dataHandlers` + `authHandlers`, con passthrough para rutas sin mock
- Frontend desplegado a producción con `VITE_AUTH_MODE=microsoft`

---

## [0.5.0-alpha.5] - 2026-03-05

### Added

- **CI/CD backend deploy**: nuevo job `deploy-backend` en GitHub Actions — build + `sls deploy` con secrets
- **GitHub Secrets**: `DB_PASSWORD`, `DB_HOST`, `DB_USERNAME`, `VPC_SECURITY_GROUP_ID`, `VPC_SUBNET_ID_1/2/3` (reutiliza `VITE_*` para OAuth client IDs)

### Security

- **CORS restringido**: `localhost:5173` solo se incluye cuando `NODE_ENV !== 'production'` (en `main.ts` y `serverless.ts`)
- **Credenciales y IDs de infra externalizados**: `DB_HOST`, `DB_USERNAME`, SG y subnet IDs movidos de valores hardcoded a `${env:...}` en `serverless.yml`

### Fixed

- **Mock interceptor**: rutas desconocidas ahora retornan 404 en vez de `{ data: null, status: 200 }`

### Changed

- `backend/serverless.yml`: todos los valores sensibles vía env vars con defaults seguros para dev local
- `.github/workflows/deploy.yml`: jobs `build-backend` + `deploy-backend` agregados
- `backend/src/main.ts`, `backend/src/serverless.ts`: CORS condicional por entorno
- `frontend/src/mocks/mockInterceptor.ts`: reject con 404 para rutas sin handler

---

## [0.5.0-alpha.4] - 2026-03-05

### Security (Critical Fixes)

- **JWT audience validation**: `jwtVerify` ahora valida `audience` para ambos providers (Google y Microsoft). Si falta el client ID en env, el token es rechazado
- **OAuth env vars**: `GOOGLE_CLIENT_ID` y `MICROSOFT_CLIENT_ID` agregados a `serverless.yml` (vía `${env:...}`, no hardcoded)
- **Endpoint `/api/roles` eliminado**: `RolesController` borrado — el endpoint público ya no existe, permisos solo accesibles vía `/api/auth/*` autenticado
- **Auto-provisioning desactivado**: nuevos usuarios se crean con `isActive: false` — requieren activación manual por admin

### Changed

- `backend/src/auth/auth.service.ts`: audience validation per-provider, fail-closed si falta client ID
- `backend/src/roles/roles.module.ts`: removido `RolesController` del módulo
- `backend/src/roles/roles.controller.ts`: archivo eliminado
- `backend/src/users/users.service.ts`: `isActive: false` en `upsert()` para usuarios nuevos

---

## [0.5.0-alpha.3] - 2026-03-05

### Added

- **CloudFront `/api/*` behavior**: requests a `energymonitor.click/api/*` se rutean a API Gateway (origin `626lq125eh.execute-api.us-east-1.amazonaws.com`)
  - Cache policy: `CachingDisabled` (no cache para API)
  - Origin request policy: `AllViewerExceptHostHeader` (forward headers, query strings, cookies)
  - Viewer protocol: HTTPS-only
  - Allowed methods: GET, HEAD, OPTIONS, PUT, PATCH, POST, DELETE

### Verified

| Test | URL | Resultado |
|---|---|---|
| Roles desde RDS | `https://energymonitor.click/api/roles` | 7 roles OK |
| Auth sin token | `https://energymonitor.click/api/auth/me` | 401 Unauthorized |
| Frontend SPA | `https://energymonitor.click` | Sin cambios, sigue sirviendo desde S3 |

---

## [0.5.0-alpha.2] - 2026-03-05

### Added

- **RDS PostgreSQL 16** provisionado en AWS (`db.t3.micro`, 20GB gp3, encrypted, single-AZ, subnets privadas)
  - Instancia: `energy-monitor-db`
  - Security Group: `energy-monitor-rds-sg` (TCP 5432 desde VPC)
  - DB subnet group con 3 subnets privadas (us-east-1a/c/d)
- **SQL migrations ejecutadas** via Lambda temporal en VPC: 6 tablas creadas, 7 roles + 10 módulos + 3 acciones + 67 permisos insertados
- **Backend desplegado** con Serverless Framework V3 a AWS Lambda + HTTP API Gateway
  - Endpoint: `https://626lq125eh.execute-api.us-east-1.amazonaws.com`
  - `GET /api/auth/me` → 401 sin token (correcto)
  - `GET /api/roles` → 7 roles desde RDS (verificado)

### Changed

- `backend/serverless.yml`: credenciales RDS, VPC config (SG + 3 subnets privadas), `NODE_ENV: production`
- `backend/src/app.module.ts`: SSL `rejectUnauthorized: false` para compatibilidad con RDS CA
- Downgrade a `serverless@3` (V4 requiere licencia)

### Infrastructure

| Recurso | Valor |
|---|---|
| RDS Instance | `energy-monitor-db` (PostgreSQL 16, db.t3.micro) |
| RDS Endpoint | `energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com` |
| Security Group | `sg-0adda6a999e8d5d9a` |
| API Gateway | `626lq125eh.execute-api.us-east-1.amazonaws.com` |
| Lambda | `power-digital-api-dev-api` (256MB, Node 20, VPC) |

---

## [0.5.0-alpha.1] - 2026-03-05

### Added

- **Monorepo structure**: proyecto separado en `frontend/` y `backend/`
- **NestJS backend** (`backend/`): API REST con NestJS + TypeORM + PostgreSQL
  - `AuthModule`: endpoints `GET /api/auth/me` y `GET /api/auth/permissions` (decode JWT, upsert user, return permissions)
  - `RolesModule`: entities `Role`, `Module_`, `Action`, `RolePermission` con service para consultar permisos por role_id
  - `UsersModule`: entities `User`, `UserSite` con upsert y lookup por OAuth provider
  - `serverless.ts`: handler Lambda via `@vendia/serverless-express`
  - `serverless.yml`: deploy a AWS Lambda + HTTP API Gateway con `serverless-offline` para dev local
- **SQL migrations** (`sql/`): `001_schema.sql` (6 tablas) y `002_seed.sql` (7 roles con IDs numéricos, 10 módulos, 3 acciones, matriz completa de permisos)
- **Frontend auth hooks**: `useMe()`, `usePermissions()` (TanStack Query) en `frontend/src/hooks/queries/useAuthQuery.ts`
- **Frontend auth routes**: `routes.getMe()`, `routes.getPermissions()` + endpoints `fetchMe()`, `fetchPermissions()`
- **Mock auth responses**: `/auth/me` y `/auth/permissions` en mock interceptor

### Changed

- `frontend/` ahora contiene todo el código React (movido desde raíz)
- `.github/workflows/deploy.yml`: actualizado con `working-directory: frontend` y `cache-dependency-path`
- CDK stack eliminado (`infra/`): reemplazado por NestJS + Serverless Framework

### Database Schema

| Tabla | Descripción |
|---|---|
| `roles` | 7 roles con IDs numéricos (1=SUPER_ADMIN ... 7=AUDITOR) |
| `modules` | 10 módulos del sistema (Dashboard, Buildings, Alerts, etc.) |
| `actions` | 3 acciones (view, manage, export) |
| `role_permissions` | Matriz many-to-many role↔module↔action |
| `users` | Usuarios OAuth con `external_id`, `provider`, `role_id` |
| `user_sites` | Acceso por sitio/edificio por usuario |

---

## [0.4.0-alpha.1] - 2026-03-05

### Added

- **GitHub Actions CI/CD** (`.github/workflows/deploy.yml`): build + typecheck en PRs, deploy a S3 + CloudFront invalidation en push a main
- **CDK stack** (`infra/`): S3 bucket (privado, OAC), CloudFront distribution con security headers policy (CSP, HSTS, X-Frame-Options), SPA routing (404→index.html), HTTP/2+3, TLS 1.2
- **Cache strategy**: assets hasheados con `max-age=31536000,immutable`; `index.html` con `no-cache`
- **GitHub Secrets/Variables**: OAuth credentials, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `AWS_REGION`

### Fixed

- Errores TypeScript en CI: `appRoutes.ts` (cast a `AppRoute[]`), `msalConfig.ts` (`storeAuthStateInCookie` removido), `useGoogleAuth.ts` (import no usado)

### Pipeline

- Build: `npm ci` → `tsc --noEmit` → `vite build` → artifact upload
- Deploy: S3 sync (assets immutable + index.html no-cache) → CloudFront invalidation
- Primer deploy exitoso a `energymonitor.click` vía CI/CD

---

## [0.3.0-alpha.4] - 2026-03-05

### Added

- **CSP + security headers** (`index.html`): `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- **Auth token interceptor** (`src/services/api.ts`): inyecta `Bearer` token en cada request, redirect a `/login` en 401
- **Validación de env vars** (`src/validateEnv.ts`): valida `VITE_AUTH_MODE` y credenciales requeridas según el modo al iniciar la app

### Changed

- `src/main.tsx`: mock interceptor protegido con `import.meta.env.DEV`; `validateEnv()` ejecutado al startup
- `src/features/auth/LoginPage.tsx`: demo login restringido a `VITE_AUTH_MODE === 'demo'` (ya no visible en cualquier build dev)
- `src/components/ui/Layout.tsx`: avatar URL validada con protocolo `https:` antes de renderizar
- `index.html`: título actualizado a "POWER Digital® — Energy Monitor"

### Security

- Mock interceptor ya no se activa en builds de producción
- Demo role selector inaccesible fuera de modo demo
- Avatar URLs con protocolo inseguro (`http:`, `javascript:`, etc.) son rechazadas
- Requests API llevan token de autenticación automáticamente

---

## [0.3.0-alpha.3] - 2026-03-05

### Added

- **Mapa de rutas API** (`src/services/routes.ts`): objeto `routes` con helpers parametrizados (`routes.getBuilding(id)`, etc.)
- **Mock interceptor** (`src/mocks/mockInterceptor.ts`): interceptor axios que sirve datos mock; se desactiva eliminando una línea en `main.tsx`
- **Mapa de rutas de navegación** (`src/app/appRoutes.ts`): objeto `appRoutes` con path, label, `allowedRoles` y `showInNav`; helpers `buildPath()` y `getNavItems(role)`
- **Barrel de hooks** (`src/hooks/index.ts`): re-exporta todos los hooks desde un solo import path

### Changed

- `src/services/endpoints.ts`: refactorizado a `api.get(routes.xxx())` — listo para API real
- `src/app/router.tsx`: paths y `allowedRoles` consumidos desde `appRoutes`
- `src/components/ui/Layout.tsx`: sidebar generado dinámicamente con `getNavItems(user.role)`
- `src/features/buildings/components/BuildingConsumptionChart.tsx`: gráfico cambiado de `column` a `line`

---

## [0.3.0-alpha.2] - 2026-03-05

### Changed

- **Tipografía Inter**: instalado `@fontsource-variable/inter` (self-hosted), aplicado en `index.css` y en Highcharts theme
- **Header desktop eliminado**: removida la barra superior en desktop; nombre del usuario ahora aparece bajo "Energy Monitor" en el sidebar
- **Header mobile**: se mantiene solo el hamburger menu en móvil

---

## [0.3.0-alpha.1] - 2026-03-04

### Added

- **Dark theme** con 8 tokens semánticos CSS (`@theme {}` en Tailwind v4): `base`, `surface`, `raised`, `border`, `text`, `muted`, `subtle`, `accent`
- **Scrollbar oscuro** global: thin, colores `--color-border` / `--color-subtle`
- **Series de gráficos coloreadas**: azul (`#388bfd`), naranja (`#f78166`), teal (`#3dc9b0`), amarillo (`#d29922`), rojo (`#f85149`) — reemplaza la paleta monocromática

### Changed

- **18 archivos** migrados de colores hardcoded light-theme a tokens dark-theme
- `src/index.css`: body bg/color usa CSS variables, scrollbar styles
- `src/components/ui/Chart.tsx`: `monochromeTheme` → `darkTheme` con fondos oscuros y series coloreadas
- `src/components/ui/DataTable.tsx`: headers sticky (`top-0`), acepta `className` prop
- `src/components/ui/Card.tsx`, `PageHeader.tsx`, `Layout.tsx`: tokens dark
- `src/features/buildings/BuildingDetailPage.tsx`: layout vertical (gráfico arriba, locales abajo)
- `src/features/locals/LocalDetailPage.tsx`: tabla con scroll interno y headers fijos, fill gradient azul
- `src/features/buildings/components/BuildingConsumptionChart.tsx`: removido `color: '#333'` inline (hereda azul del theme)
- Auth pages (LoginPage, UnauthorizedPage, botones OAuth, DemoRoleSelector): tokens dark
- Feature pages (BuildingsPage, BuildingCard, LocalCard): tokens dark
- `src/components/auth/ProtectedRoute.tsx`: texto loading con token `text-subtle`

---

## [0.2.0-alpha.2] - 2026-03-04

### Added

- **Permisos** (`src/auth/permissions.ts`): matriz `PERMISSIONS` por módulo/acción con helper `hasPermission(role, module, action)`
- **ProtectedRoute** (`src/components/auth/ProtectedRoute.tsx`): wrapper que redirige a `/login` si no autenticado, a `/unauthorized` si rol no permitido
- **UnauthorizedPage** (`src/features/auth/UnauthorizedPage.tsx`): página "Acceso denegado" con botón volver al inicio
- **Ruta `/unauthorized`**: registrada como ruta pública en el router

### Changed

- `src/app/router.tsx`: rutas protegidas envueltas en `<ProtectedRoute><Layout /></ProtectedRoute>`
- `src/components/ui/Layout.tsx`: sidebar muestra avatar + nombre + rol del usuario + botón "Cerrar sesión"; header muestra nombre en desktop

---

## [0.2.0-alpha.1] - 2026-03-04

### Added

- **Dependencias MSAL**: `@azure/msal-browser`, `@azure/msal-react` para autenticación Microsoft
- **Tipos de autenticación** (`src/types/auth.ts`): `AuthProvider`, `Role` (7 roles), `AuthUser`, `AuthState`
- **Tipos de dominio** (`src/types/index.ts`): `Meter`, `HierarchyNode`, `Reading`, `Alert`, `Invoice`, `AuditLog`, `Tenant`, `Integration`
- **Variables de entorno**: `.env` y `.env.example` con config para Microsoft Entra y modo auth
- **Tipado de env vars** (`src/env.d.ts`): `ImportMetaEnv` con las 4 variables VITE\_
- **Configuración MSAL** (`src/auth/`): `msalConfig.ts`, `msalInstance.ts`, `microsoftAuth.ts` — config, singleton y helpers de login/logout Microsoft
- **Hook `useMicrosoftAuth`** (`src/hooks/auth/useMicrosoftAuth.ts`): login/logout popup Microsoft, estado de autenticación
- **Auth Store** (`src/store/useAuthStore.ts`): Zustand con persist en sessionStorage para mantener sesión al refrescar
- **Usuarios demo** (`src/mocks/users.ts`): 7 usuarios mock, uno por rol (SUPER_ADMIN → AUDITOR)
- **Hook `useDemoAuth`** (`src/hooks/auth/useDemoAuth.ts`): login instantáneo por rol para desarrollo
- **Hook `useAuth`** (`src/hooks/auth/useAuth.ts`): fachada unificada que abstrae Microsoft, Google y Demo
- **LoginPage** (`src/features/auth/LoginPage.tsx`): página de login con botones Microsoft/Google + selector de roles demo
- **MicrosoftLoginButton**: botón con logo Microsoft SVG, abre popup OAuth
- **GoogleLoginButton**: botón con logo Google SVG, abre popup OAuth
- **DemoRoleSelector**: grid de 7 roles para login rápido en desarrollo
- **Ruta `/login`**: registrada fuera del Layout (standalone, sin sidebar)
- **Dependencia `@react-oauth/google`**: provider y hooks para Google OAuth
- **Google Auth** (`src/auth/googleAuth.ts`, `src/auth/googleConfig.ts`): config y helper para parsear credenciales Google
- **Hook `useGoogleAuth`** (`src/hooks/auth/useGoogleAuth.ts`): login popup Google con implicit flow

### Changed

- `src/main.tsx`: `MsalProvider` + `GoogleOAuthProvider` envuelven `<App />`
- `src/app/router.tsx`: ruta `/login` agregada fuera del layout principal
- `src/types/auth.ts`: `AuthProvider` incluye `'google'`
- `.gitignore` actualizado para excluir `.env` y `.env.local`

### Configuración Azure

- App Registration "POWER Digital" en Microsoft Entra (multi-tenant + personal accounts)
- Redirect URIs: `http://localhost:5173` (dev), `https://energymonitor.click` (prod)
- API Permission: `User.Read` (Delegated) con admin consent

### Configuración Google

- OAuth Client ID reutilizado de banados-fullstack
- Authorized JavaScript origins: `http://localhost:5173`, `https://energymonitor.click`

---

## [0.1.0] - 2026-02-17

### Added

- **Scaffold del proyecto** con React 19 + Vite + TypeScript
- **Dependencias**: React Router v7, TanStack Query v5, TanStack Table v8, Highcharts, Axios, Zustand, Tailwind CSS v4
- **Tipos**: interfaces `Building`, `Local`, `MonthlyConsumption`
- **Datos mock**: 5 edificios, 10 locales, 12 meses de consumo por local
- **Capa de servicios**: mock API con delays simulados (`endpoints.ts`)
- **Query hooks**: `useBuildings`, `useBuilding`, `useBuildingConsumption`, `useLocalsByBuilding`, `useLocal`, `useLocalConsumption`
- **Store Zustand**: estado de sidebar (abierto/cerrado)
- **Componentes UI reutilizables**:
  - `Layout` — shell responsive con sidebar colapsable y header
  - `Card` — card genérica con slot de children
  - `PageHeader` — título, breadcrumbs y botón volver
  - `Chart` — wrapper de Highcharts con tema monocromático
  - `DataTable` — wrapper genérico de TanStack Table con sorting
- **Páginas**:
  - `BuildingsPage` (`/`) — grid responsive de edificios
  - `BuildingDetailPage` (`/buildings/:id`) — gráfico de columnas con consumo total + grid de locales
  - `LocalDetailPage` (`/buildings/:buildingId/locals/:localId`) — gráfico de área + tabla de consumo
- **Componentes de dominio**: `BuildingCard`, `BuildingConsumptionChart`, `LocalCard`, `LocalConsumptionTable`
- **Router**: 3 rutas con layout envolvente
- **Diseño low-fidelity**: paleta monocromática, sin border-radius, bordes sólidos 1px, tipografía system
- **Responsividad**: mobile (1 col, sidebar oculta), tablet (2 cols), desktop (3-4 cols, sidebar visible)
- **Sin scrollbar vertical** en ninguna vista; solo scroll horizontal en tablas
- **Interacción bidireccional gráfico-tabla**: hover en un punto del gráfico destaca la fila en la tabla y viceversa (con tooltip sincronizado)

## Estructura del Proyecto

```
energy-monitor/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── eslint.config.js
├── public/
│   └── vite.svg
└── src/
    ├── main.tsx                          # Entry point
    ├── index.css                         # Tailwind + estilos globales
    ├── app/
    │   ├── App.tsx                       # QueryClientProvider + RouterProvider
    │   └── router.tsx                    # Definición de rutas (3 rutas)
    ├── components/
    │   └── ui/
    │       ├── Card.tsx                  # Card genérica reutilizable
    │       ├── Chart.tsx                 # Wrapper Highcharts (tema mono, hover sync)
    │       ├── DataTable.tsx             # Wrapper TanStack Table (sorting, row highlight)
    │       ├── Layout.tsx                # Shell: sidebar + header + main
    │       └── PageHeader.tsx            # Título + breadcrumbs + botón volver
    ├── features/
    │   ├── buildings/
    │   │   ├── BuildingsPage.tsx         # Grid de edificios (/)
    │   │   ├── BuildingDetailPage.tsx    # Detalle edificio (/buildings/:id)
    │   │   └── components/
    │   │       ├── BuildingCard.tsx      # Card de edificio
    │   │       └── BuildingConsumptionChart.tsx  # Gráfico columnas consumo
    │   └── locals/
    │       ├── LocalDetailPage.tsx       # Detalle local (/buildings/:id/locals/:id)
    │       └── components/
    │           ├── LocalCard.tsx         # Card de local
    │           └── LocalConsumptionTable.tsx     # Tabla consumo mensual
    ├── hooks/
    │   └── queries/
    │       ├── useBuildings.ts           # Queries: buildings, building, consumption
    │       └── useLocals.ts             # Queries: locals, local, consumption
    ├── mocks/
    │   ├── buildings.ts                  # 5 edificios
    │   ├── locals.ts                    # 10 locales
    │   └── consumption.ts              # Consumo mensual por local (12 meses)
    ├── services/
    │   ├── api.ts                       # Instancia Axios
    │   └── endpoints.ts                 # Funciones mock API con delay
    ├── store/
    │   └── useAppStore.ts               # Zustand: sidebar state
    └── types/
        └── index.ts                     # Building, Local, MonthlyConsumption
```
