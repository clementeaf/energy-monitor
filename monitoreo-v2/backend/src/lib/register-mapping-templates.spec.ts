import type { EntityManager } from 'typeorm';
import { cloneGlobalRegisterMappings } from './register-mapping-templates';

describe('cloneGlobalRegisterMappings', () => {
  it('inserts global templates for the tenant and returns count', async () => {
    const query = jest.fn().mockResolvedValue([{ id: 'm-1' }, { id: 'm-2' }]);
    const manager = { query } as unknown as EntityManager;

    const count = await cloneGlobalRegisterMappings(manager, 'tenant-new');

    expect(count).toBe(2);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE tenant_id IS NULL'),
      ['tenant-new'],
    );
  });

  it('returns zero when no global templates exist', async () => {
    const manager = {
      query: jest.fn().mockResolvedValue([]),
    } as unknown as EntityManager;

    const count = await cloneGlobalRegisterMappings(manager, 'tenant-new');
    expect(count).toBe(0);
  });
});
