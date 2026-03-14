# Frontend: Vistas, Gráficos, Datos y Flujo

> **Estado actual (2026-03-14):** Auth deshabilitado. Router refactorizado a mapeo de objeto (`routeConfig` + `withAuth()`). Layout temporal `TempLayout`, nav desde `appRoutes.showInNav`. Theme light (tokens CSS en `index.css`). Restaurar login: descomentar `TODO: restore` en `main.tsx` y `router.tsx`.

## Vistas activas
| Ruta | Vista | En nav |
|------|--------|--------|
| `/` | Edificios | si |
| `/buildings/:id` | Detalle edificio | — |
| `/meters/:meterId` | Detalle medidor | — |
| `/monitoring/realtime` | Monitoreo tiempo real | si |
| `/monitoring/devices` | Dispositivos | si |
| `/alerts` | Alertas | si |
| `/alerts/:id` | Detalle alerta | — |

## Vistas comentadas (no eliminadas)
| Ruta | Vista |
|------|--------|
| `/monitoring/drilldown/:siteId` | Drill-down |
| `/admin/sites` | Admin sitios |
| `/admin/users` | Admin usuarios |
| `/admin/meters` | Admin medidores |
| `/admin/hierarchy/:siteId` | Admin jerarquía |
| `/billing` | Facturación |

## Gráficos y visualizaciones
| Ubicación | Componente | Tipo | Resolución dinámica |
|-----------|------------|------|---------------------|
| BuildingDetailPage | BuildingConsumptionChart (StockChart) | área + línea | pickResolution(rangeMs) → 15min/hourly/daily |
| MeterDetailPage | 6× StockChart | series temporales + flags alarmas | misma lógica |
| DrilldownPage | DrilldownBars (Highcharts bar) | barras horizontales por nodo | from/to 1/7/30 días |

- **StockChart**: navigator, range selector (1 Día/1 Semana/1 Mes), tema oscuro, `onRangeChange` → refetch con nueva resolución, `keepPreviousData`.
- **BuildingConsumptionChart**: si el rango devuelve vacío, backend hace fallback últimos 30 días.
- **MeterDetailPage**: Potencia, Voltaje, Corriente, PF+Frecuencia, Energía acumulada, Calidad THD (solo 3P).
- **DrilldownBars**: click en barra → navega a nodo hijo. Backend ajusta `from`/`to` al último timestamp del subárbol.

## Datos por dominio y hooks
- **Buildings**: useBuildings, useBuilding(id), useBuildingConsumption(id, resolution, from, to). Default 7 días.
- **Meters**: useMetersOverview (staleTime 30s), useMeter, useMeterReadings (keepPreviousData), useMeterUptime (60s), useAlarmEvents/Summary. Default 7 días.
- **Hierarchy**: useHierarchy, useHierarchyNode, useHierarchyChildren(nodeId, from, to), useHierarchyConsumption. Default 30 días.
- **Alerts**: useAlerts (refetchInterval 30–60s, staleTime 10–15s). useAcknowledgeAlert, useSyncOfflineAlerts.
- **Billing**: useBillingCenters, useBillingSummary, useBillingDetail (keepPreviousData paginación), useBillingTariffs. Tabla pivote + detalle paginado 50/página. toNum() para normalizar NUMERIC→number.
- **Auth**: useAuth (Zustand + useAuthQuery).

## Patrones de consumo (cache y refetch)
| Query | staleTime | refetchInterval | placeholderData |
|-------|-----------|-----------------|-----------------|
| buildingConsumption, meterReadings | 0 | — | keepPreviousData |
| metersOverview | 30s | — | — |
| alerts (Layout, lists) | 10–15s | 30–60s | — |
| meterUptime, alarmSummary | 60s | — | — |
| billing | 30–60s | — | keepPreviousData (detail) |
| admin users/roles | Infinity | — | — |

## Flujo resumido
1. Login → sessionStorage token → GET /auth/me → useAuthStore + useAppStore (selectedSiteId).
2. appRoutes + ProtectedRoute por rol; Layout sidebar con :siteId reemplazado.
3. Series temporales: StockChart onRangeChange → actualiza range/resolution → refetch; keepPreviousData.
4. Alertas: filtro por selectedSiteId; refetch periódico; mutaciones invalidan cache.
5. Drill-down: nodo raíz B-{siteId} → children → click navega a hijo; circuito → /meters/:meterId.

## TypeScript Types (frontend/src/types/)

### types/index.ts
```
Building { id, name, address, centerType?, totalArea, metersCount }
Meter { id, buildingId, model, phaseType, busId, modbusAddress, uplinkRoute, status, lastReadingAt }
Reading { timestamp, voltageL1-3, currentL1-3, powerKw, reactivePowerKvar, powerFactor, frequencyHz, energyKwhTotal, thdVoltagePct, thdCurrentPct, phaseImbalancePct, breakerStatus, digitalInput1-2, digitalOutput1-2, alarm, modbusCrcErrors }
ConsumptionPoint { timestamp, totalPowerKw, avgPowerKw, peakPowerKw }
HierarchyNode { id, parentId, buildingId, name, level, nodeType, meterId, sortOrder }
HierarchyChildSummary extends HierarchyNode { totalKwh, avgPowerKw, peakPowerKw, meterCount, status, readingsInRange? }
UptimeSummary { period, totalSeconds, uptimeSeconds, downtimeSeconds, uptimePercent, downtimeEvents }
MeterOverview { id, buildingId, model, phaseType, busId, status, lastReadingAt, uptime24h, alarmCount30d }
Alert { id, type, severity, status, meterId, buildingId, title, message, triggeredAt, acknowledgedAt, resolvedAt, metadata }
BillingCenterSummary { id, centerName, year, month, totalConsumptionKwh, peakMaxKw, ... }
BillingMonthlyDetail { id, centerName, year, month, meterId, storeType, storeName, consumptionKwh, peakKw, ..., totalWithIvaClp }
BillingTariff { id, tariffName, year, month, ... }
AdminUserAccount { id, email, name, roleId, role, roleLabel, provider, isActive, siteIds, invitationStatus, ... }
```

### types/auth.ts
```
AuthProvider = 'microsoft' | 'google'
Role = 'SUPER_ADMIN' | 'CORP_ADMIN' | 'SITE_ADMIN' | 'OPERATOR' | 'ANALYST' | 'TENANT_USER' | 'AUDITOR'
AuthUser { id, email, name, role, provider, avatar?, siteIds }
```
