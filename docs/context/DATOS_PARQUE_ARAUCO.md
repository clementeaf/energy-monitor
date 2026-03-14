# Datos Parque Arauco Kennedy — Mall Grande

## Fuente

- CSV: `MALL_GRANDE_446_completo.csv` (S3: `raw/`, también local en raíz del repo)
- Separador: `;` | Encoding: `latin1`
- 446 medidores | Lecturas cada 15 min | Rango: ene–dic 2026

## Columnas del CSV

| Columna | Descripción |
|---------|-------------|
| `timestamp` | Fecha/hora ISO 8601, cada 15 min |
| `meter_id` | ID del medidor (MG-001 a MG-446) |
| `center_name` | Siempre "Parque Arauco Kennedy" |
| `center_type` | Siempre "Mall Grande" |
| `store_type` | Clasificación de la tienda |
| `store_name` | Nombre del local |
| `model` | Modelo del medidor (ej. PAC1670) |
| `phase_type` | Fase eléctrica (1P o 3P) |
| `uplink_route` | Ruta comunicación (MQTT/Modbus) |
| `modbus_address` | Dirección Modbus |
| `voltage_L1/L2/L3` | Voltaje por fase (V) |
| `current_L1/L2/L3` | Corriente por fase (A) |
| `power_kW` | Potencia activa (kW) |
| `reactive_power_kvar` | Potencia reactiva (kVAR) |
| `power_factor` | Factor de potencia (0–1) |
| `frequency_Hz` | Frecuencia de red (Hz) |
| `energy_kWh_total` | Energía acumulada (kWh) |

## Medidores

- **43 reales** (MG-001 a MG-043): 1 por tienda
- **403 placeholder** (MG-044 a MG-446): "Local no sensado"

## Tiendas (43)

| meter_id | store_type | store_name |
|---|---|---|
| MG-001 | SSCC | Servicios comunes |
| MG-002 | Retail | Jumbo |
| MG-003 | Retail | Falabella |
| MG-004 | Retail | Ripley |
| MG-005 | Retail | Paris |
| MG-006 | Retail | La Polar |
| MG-007 | Retail | Tricot |
| MG-008 | Retail | Easy |
| MG-009 | Ropa | H&M |
| MG-010 | Ropa | Adidas |
| MG-011 | Ropa | Nike |
| MG-012 | Ropa | Puma |
| MG-013 | Ropa | Everlast |
| MG-014 | Ropa | Arrow |
| MG-015 | Calzado | Merrell |
| MG-016 | Calzado | Skechers |
| MG-017 | Ropa interior | Kayser |
| MG-018 | Cosmética | Lush |
| MG-019 | Joyería | Jewelry A |
| MG-020 | Accesorios | Umbale |
| MG-021 | Ropa | Wrangler |
| MG-022 | Ropa | Tip Top |
| MG-023 | Ropa | Lacoste |
| MG-024 | Hogar / decoración | Casa Ideas |
| MG-025 | Café | Starbucks |
| MG-026 | Café | Juan Valdez |
| MG-027 | Comida rápida | Pizza Hut |
| MG-028 | Comida rápida | Pollo Stop |
| MG-029 | Comida rápida | Chicken Love You |
| MG-030 | Comida rápida | Doggis |
| MG-031 | Comida rápida | Burger King |
| MG-032 | Comida rápida | McDonalds |
| MG-033 | Comida | Juan Maestro |
| MG-034 | Heladería | Emporio La Rosa |
| MG-035 | Comida | Savory |
| MG-036 | Cine / entretenimiento | Cine Hoyts |
| MG-037 | Entretenimiento | Happyland |
| MG-038 | Farmacia | Salcobrand |
| MG-039 | Farmacia | Farmacias Ahumada |
| MG-040 | Óptica | Óptica Schilling |
| MG-041 | Librería | Antártica Libros |
| MG-042 | Banco | Banco Bci |
| MG-043 | Banco | Banco BBVA |

## PostgreSQL Local

**Container:** `pg-arauco` | **Puerto:** 5434 | **DB:** arauco | **User:** postgres | **Pass:** arauco

```bash
docker start pg-arauco
PGPASSWORD=arauco psql -h 127.0.0.1 -p 5434 -U postgres -d arauco
```

### Tablas

| Tabla | Filas | Descripción |
|---|---:|---|
| `store_type` | 20 | Catálogo: id numérico → nombre tipo |
| `store` | 43 | meter_id (PK) → store_name + store_type_id (FK) |
| `building_summary` | 12 | Resumen mensual edificio (kWh, pico kW, FP) |
| `meter_monthly` | 516 | Resumen mensual por medidor (43 × 12) |
| `meter_readings` | 1,506,720 | Lecturas 15 min, particionada por meter_id |

### Consumo anual del edificio

| Mes | MWh | Pico kW | FP |
|-----|---:|---:|---:|
| Ene | 661 | 1,614 | 0.92 |
| Feb | 532 | 1,443 | 0.92 |
| Mar | 605 | 1,487 | 0.92 |
| Abr | 518 | 1,312 | 0.92 |
| May | 600 | 1,470 | 0.92 |
| Jun | 551 | 1,391 | 0.92 |
| Jul | 585 | 1,435 | 0.92 |
| Ago | 586 | 1,439 | 0.92 |
| Sep | 545 | 1,377 | 0.92 |
| Oct | 659 | 1,612 | 0.92 |
| Nov | 656 | 1,655 | 0.92 |
| Dic | 802 | 1,959 | 0.92 |
| **Total** | **~7,300** | **1,959** | **0.92** |

### Scripts

| Script | Qué hace |
|---|---|
| `infra/aggregate-builder/load-and-summarize.mjs` | Carga CSV → raw_readings → building_summary + meter_monthly |
| `infra/aggregate-builder/load-meter-readings.mjs` | Carga CSV → meter_readings (solo 43 reales, particionada) |
| `infra/aggregate-builder/list-stores-local.sh` | Lista store_type + store_name desde CSV local |

## Pendiente

- Exportar tablas locales a RDS (AWS)
- Repetir proceso para Mall Mediano (Arauco Estación, 254 medidores)
- Verificar que fallbacks del backend dejen de activarse tras poblar agregados en RDS
