import type { EntityManager } from 'typeorm';

/**
 * Clones all global register_mapping templates into a tenant scope.
 * @param manager - TypeORM entity manager (transaction-safe)
 * @param tenantId - New tenant UUID
 * @returns Number of mapping rows inserted
 */
export async function cloneGlobalRegisterMappings(
  manager: EntityManager,
  tenantId: string,
): Promise<number> {
  const rows: Array<{ id: string }> = await manager.query(
    `INSERT INTO register_mappings (
       tenant_id, protocol, device_profile, register_key, target_field, scale_factor, unit
     )
     SELECT $1::uuid, protocol, device_profile, register_key, target_field, scale_factor, unit
     FROM register_mappings
     WHERE tenant_id IS NULL
     RETURNING id::text AS id`,
    [tenantId],
  );

  return rows.length;
}
