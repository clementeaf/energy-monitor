# Playbook: New Scheduled Lambda

## Úsalo para
- Agregar una lambda programada por EventBridge.
- Mover lógica periódica fuera de la API principal.

## Decide primero
- NestJS context: útil si necesita servicios del backend ya existentes.
- Script standalone en `infra/`: útil si la tarea es puntual, aislada o usa `pg` directo.

## Pasos
1. Definir trigger y frecuencia.
2. Elegir ubicación: `backend/src/` o `infra/<script>/`.
3. Crear handler con dependencias mínimas.
4. Declarar env vars necesarias.
5. Registrar schedule en `serverless.yml` o proceso deploy correspondiente.
6. Revisar timeout, memoria, VPC y acceso DB.
7. Validar efecto esperado: inserts, updates, alerts o sync.

## Regla práctica
- Si no necesita todo NestJS, preferir standalone para reducir acoplamiento.
- Si reutiliza servicios de dominio existentes, NestJS puede simplificar la lógica.

## Checklist
1. Trigger claro.
2. Env vars completas.
3. Conexión DB segura dentro del patrón actual del repo.
4. Logging suficiente para CloudWatch.
5. `CLAUDE.md` actualizado si cambia el flujo runtime.