# Data Flow — Energy Monitor

> Anexo secundario. El contexto operativo base vive en `CLAUDE.md`.

## Cuándo leer esto
- Tocar lecturas sintéticas, alerts offline o series temporales.
- Agregar campos eléctricos, agregaciones o reglas operativas.

## Flujos vivos

### Ingesta sintética
```text
EventBridge 1/min
→ infra/synthetic-generator
→ INSERT readings
→ UPDATE meters.last_reading_at
```

### Offline alerts
```text
EventBridge 5/min
→ offline-alerts lambda
→ detecta meters sin lectura > 5 min
→ crea o resuelve alertas
```

### Consumo y charts
```text
Frontend cambia rango
→ decide resolución
→ backend agrega por bucket
→ frontend re-renderiza con keepPreviousData
```

## Recetas rápidas

### Agregar un nuevo campo de lectura
1. Cambiar schema si aplica.
2. Ajustar entity backend.
3. Ajustar generación sintética si el campo nace en `infra/`.
4. Ajustar query aggregation en readings.
5. Ajustar tipo frontend.
6. Ajustar chart o tabla que lo consume.

### Agregar nueva agregación temporal
1. Definir resolución permitida.
2. Implementar bucket en service.
3. Exponer resolución en controller.
4. Reflejar unión literal en frontend.

### Agregar nueva regla operativa
1. Definir trigger: lectura, ventana temporal o scheduler.
2. Decidir si vive en NestJS o en lambda standalone.
3. Persistir resultado o emitir alerta.
4. Añadir vista o summary si impacta UI.

## Puntos sensibles
- `energy_kwh_total` es acumulativo.
- `readings` crece rápido y hoy no tiene retention.
- Offline alerts depende de `last_reading_at`.
- Rango temporal y resolución impactan costo de query y UX.
