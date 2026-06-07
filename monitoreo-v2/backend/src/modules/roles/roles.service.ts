import { Injectable, Logger, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

const DEFAULT_SESSION_MINUTES = 1440; // 24 hours

export interface UserPermission {
  module: string;
  action: string;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

@Injectable()
export class RolesService implements OnModuleInit {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    const hasColumn = await this.dataSource.query<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'roles'
           AND column_name = 'max_session_minutes'
       ) AS exists`,
    );
    if (!hasColumn[0]?.exists) {
      this.logger.warn(
        'roles.max_session_minutes missing — skip session bump. Reset local DB (docker compose down -v) or apply monitoreo-v2 migrations.',
      );
      return;
    }

    await this.dataSource.query(
      `UPDATE roles SET max_session_minutes = $1 WHERE max_session_minutes < $1`,
      [DEFAULT_SESSION_MINUTES],
    );
    const check = await this.dataSource.query(
      `SELECT id, slug, max_session_minutes FROM roles WHERE max_session_minutes < $1`,
      [DEFAULT_SESSION_MINUTES],
    );
    if (check.length > 0) {
      this.logger.warn(`Roles still below ${DEFAULT_SESSION_MINUTES}min: ${JSON.stringify(check)}`);
    } else {
      this.logger.log(`All roles have max_session_minutes >= ${DEFAULT_SESSION_MINUTES}`);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Auth helpers (existing)                                            */
  /* ------------------------------------------------------------------ */

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
    return { id: r.id, slug: r.slug, name: r.name, maxSessionMinutes: r.max_session_minutes };
  }

  async getUserBuildingIds(userId: string): Promise<string[]> {
    const rows = await this.dataSource.query(
      `SELECT building_id FROM user_building_access WHERE user_id = $1`,
      [userId],
    );
    return rows.map((r: { building_id: string }) => r.building_id);
  }

  /* ------------------------------------------------------------------ */
  /*  CRUD — Roles                                                       */
  /* ------------------------------------------------------------------ */

  async findAll(): Promise<Role[]> {
    const roles = await this.roleRepo.find({
      order: { hierarchyLevel: 'ASC', name: 'ASC' },
      relations: ['permissions'],
    });
    const seen = new Set<string>();
    return roles.filter((r) => {
      if (seen.has(r.slug)) return false;
      seen.add(r.slug);
      return true;
    });
  }

  async findAllForTenant(tenantId: string): Promise<Role[]> {
    return this.roleRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
      relations: ['permissions'],
    });
  }

  async findOne(id: string, tenantId: string): Promise<RoleWithPermissions | null> {
    return this.roleRepo.findOne({
      where: { id, tenantId },
      relations: ['permissions'],
    }) as Promise<RoleWithPermissions | null>;
  }

  async create(tenantId: string, dto: CreateRoleDto): Promise<Role> {
    const existing = await this.roleRepo.findOneBy({ tenantId, slug: dto.slug });
    if (existing) throw new ConflictException(`Role slug '${dto.slug}' already exists for this tenant`);

    const role = this.roleRepo.create({
      tenantId,
      name: dto.name,
      slug: dto.slug,
      description: dto.description ?? null,
      maxSessionMinutes: dto.maxSessionMinutes ?? DEFAULT_SESSION_MINUTES,
      isDefault: dto.isDefault ?? false,
      isActive: true,
    });
    return this.roleRepo.save(role);
  }

  async update(id: string, tenantId: string, dto: UpdateRoleDto): Promise<Role | null> {
    const role = await this.roleRepo.findOneBy({ id, tenantId });
    if (!role) return null;

    if (dto.name !== undefined) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.maxSessionMinutes !== undefined) role.maxSessionMinutes = dto.maxSessionMinutes;
    if (dto.isDefault !== undefined) role.isDefault = dto.isDefault;
    if (dto.isActive !== undefined) role.isActive = dto.isActive;

    return this.roleRepo.save(role);
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const usersCount = await this.dataSource.query(
      `SELECT COUNT(*) AS count FROM users WHERE role_id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    if (parseInt(usersCount[0].count, 10) > 0) {
      throw new ConflictException('Cannot delete role with assigned users');
    }

    const result = await this.roleRepo.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }

  /* ------------------------------------------------------------------ */
  /*  Permission assignment                                              */
  /* ------------------------------------------------------------------ */

  async getRolePermissions(id: string, tenantId: string): Promise<Permission[]> {
    const role = await this.roleRepo.findOne({
      where: { id, tenantId },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException('Role not found');
    return role.permissions;
  }

  async assignPermissions(id: string, tenantId: string, permissionIds: string[]): Promise<Permission[]> {
    const role = await this.roleRepo.findOneBy({ id, tenantId });
    if (!role) throw new NotFoundException('Role not found');

    await this.dataSource.query(`DELETE FROM role_permissions WHERE role_id = $1`, [id]);

    if (permissionIds.length > 0) {
      const values = permissionIds.map((_, i) => `($1, $${i + 2})`).join(', ');
      await this.dataSource.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values} ON CONFLICT DO NOTHING`,
        [id, ...permissionIds],
      );
    }

    const updated = await this.roleRepo.findOne({
      where: { id, tenantId },
      relations: ['permissions'],
    });
    return updated?.permissions ?? [];
  }

  /* ------------------------------------------------------------------ */
  /*  Permissions catalog                                                */
  /* ------------------------------------------------------------------ */

  async getAllPermissions(): Promise<Permission[]> {
    return this.permissionRepo.find({ order: { module: 'ASC', action: 'ASC' } });
  }
}
