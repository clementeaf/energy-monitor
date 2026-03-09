# Issues & Fixes

Registro de problemas encontrados y sus soluciones.

---

### 2026-03-06 — Gráfico "Calidad Eléctrica" vacío en medidores 3P
- **Síntoma:** Chart de THD y desbalance no mostraba datos para medidores trifásicos
- **Causa raíz:** `profiles.json` no tenía perfiles estadísticos para `thdV`, `thdI`, `phImb` → campos insertados como NULL
- **Solución:** Agregados perfiles para los 6 medidores 3P (M001-M003, M011-M013) con variación día/noche. Backfill de 35,738 readings
- **Prevención:** Validar que todo campo del schema tiene perfil estadístico antes de deploy del generador

---

### 2026-03-06 — Spike consumo edificio (~550 kW → ~13 kW)
- **Síntoma:** Gráfico de consumo por edificio mostraba picos irreales de 550 kW
- **Causa raíz:** `findBuildingConsumption` usaba `SUM(power_kw)` directo, inflado 60× por múltiples readings/hora por medidor
- **Solución:** Agregación en dos pasos: AVG por medidor por bucket temporal, luego SUM entre medidores
- **Prevención:** Siempre promediar dentro del bucket antes de sumar entre entidades

---

### 2026-03-06 — Synthetic generator: power_kw exponencial (1.4→1550 kW)
- **Síntoma:** `power_kw` crecía exponencialmente en datos sintéticos
- **Causa raíz:** Generador usaba `last_power` como base para variación, causando compounding
- **Solución:** Reemplazado por distribución Box-Muller con media+std fija por medidor/hora desde `profiles.json`. Purgados 1,200 readings corruptos
- **Prevención:** Generador sintético siempre usa perfiles estadísticos fijos, nunca el último valor como base

---

### 2026-03-06 — Highcharts `hoverPoint` crash en navigator
- **Síntoma:** `TypeError: Cannot read properties of undefined (reading 'hoverPoint')` al hacer click en áreas vacías del chart o navigator
- **Causa raíz:** Highcharts `Pointer.onContainerClick` asume que siempre hay un `hoverPoint`
- **Solución:** Parchado con try-catch en el handler de click
- **Prevención:** Envolver interacciones Highcharts en error boundaries

---

### 2026-03-06 — Zoom "Todo" → "1D" bloqueado
- **Síntoma:** Botón "1D" del range selector no hacía nada después de estar en "Todo"
- **Causa raíz:** Highcharts auto-calculaba `minRange` basado en densidad de datos diarios, impidiendo zoom a rangos < 1 día
- **Solución:** `minRange: 3600000` (1 hora) explícito en xAxis
- **Prevención:** Siempre setear `minRange` explícito en StockChart

---

### 2026-03-06 — `rangeSelector.selected` reseteaba zoom en re-render
- **Síntoma:** Al cambiar de pestaña y volver, el chart reseteaba al rango default
- **Causa raíz:** `selected` en theme global se re-aplicaba en cada render de React
- **Solución:** `initialSelected` ref que aplica `selected: 2` solo en primer render y se limpia
- **Prevención:** No poner `selected` en themes globales; controlarlo via ref por instancia

---

### 2026-03-06 — CSV reimportado con energy_kWh_total incorrecto
- **Síntoma:** Energía acumulada mostraba ~5-8 kWh en vez de escala creciente
- **Causa raíz:** Valores de CSV no eran acumulativos correctamente
- **Solución:** Reimportación completa con energía 0→3,031 kWh acumulativo. Perfiles y sintéticos regenerados
- **Prevención:** Validar monotonía de campos acumulativos post-import

---

### 2026-03-05 — Microsoft login popup no cierra
- **Síntoma:** Popup de login Microsoft se queda abierto con la SPA cargada dentro
- **Causa raíz:** `loginPopup()` de MSAL v5 — la SPA se cargaba dentro del popup y React Router tomaba control antes de que MSAL procesara el hash
- **Solución:** Cambiado a `loginRedirect()` + detección de redirect flow post-auth
- **Prevención:** Usar redirect flow, no popup, con SPAs que tienen routing

---

### 2026-03-05 — Backend routes 404 post-deploy
- **Síntoma:** `GET /api/buildings` y `/api/locals` retornaban 404
- **Causa raíz:** `dist/` estaba desactualizado — nuevos módulos no estaban compilados
- **Solución:** `npm run build` + redeploy
- **Prevención:** CI siempre hace build fresh antes de deploy

---

### 2026-03-05 — React setState during render
- **Síntoma:** Warning de React sobre state update during render
- **Causa raíz:** `resolveBackendUser` se ejecutaba durante el render del hook `useAuth`
- **Solución:** Movido a `useEffect` con ref guard
- **Prevención:** Side effects siempre en `useEffect`, nunca en cuerpo del hook
