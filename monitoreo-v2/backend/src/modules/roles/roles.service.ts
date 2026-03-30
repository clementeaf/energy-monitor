import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface UserPermission {
  module: string;
  action: string;
}

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly dataSource: DataSource) {}

  async getPermissionsByRoleId(roleId: string): Promise<UserPermission[]> {
    const rows = await this.dataSource.query(
      `SELECT p.module, p.action
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = $1`,
      [roleId],
    );

    return rows.map((r: { module: string; action: string }) => ({
      module: r.module,
      action: r.action,
    }));
  }

  async getRoleByUserId(userId: string): Promise<{ id: string; slug: string; name: string; maxSessionMinutes: number } | null> {
    const rows = await this.dataSource.query(
      `SELECT r.id, r.slug, r.name, r.max_session_minutes
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [userId],
    );

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      maxSessionMinutes: r.max_session_minutes,
    };
  }

  async getUserBuildingIds(userId: string): Promise<string[]> {
    const rows = await this.dataSource.query(
      `SELECT building_id FROM user_building_access WHERE user_id = $1`,
      [userId],
    );
    return rows.map((r: { building_id: string }) => r.building_id);
  }
}
