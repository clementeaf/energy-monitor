import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotificationService } from '../alerts/notification.service';
import { Role } from '../roles/entities/role.entity';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationService,
  ) {}

  async findAll(tenantId: string): Promise<User[]> {
    return this.repo.find({
      where: { tenantId },
      relations: ['role'],
      order: { email: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<User | null> {
    return this.repo.findOne({
      where: { id, tenantId },
      relations: ['role'],
    });
  }

  async create(tenantId: string, dto: CreateUserDto, creatorRoleId: string, creatorRoleSlug: string): Promise<User> {
    await this.enforceHierarchy(creatorRoleId, creatorRoleSlug, dto.roleId, tenantId);

    const user = this.repo.create({
      tenantId,
      email: dto.email,
      displayName: dto.displayName ?? null,
      authProvider: dto.authProvider,
      authProviderId: dto.authProviderId,
      roleId: dto.roleId,
    });
    const saved = await this.repo.save(user);

    await this.notifications.notifyUserCreated({
      tenantId,
      email: saved.email,
      displayName: saved.displayName ?? null,
      authProvider: saved.authProvider,
    });

    if (dto.buildingIds && dto.buildingIds.length > 0) {
      await this.assignBuildings(saved.id, tenantId, dto.buildingIds);
    }

    return this.findOne(saved.id, tenantId) as Promise<User>;
  }

  async update(id: string, tenantId: string, dto: UpdateUserDto, creatorRoleId?: string, creatorRoleSlug?: string): Promise<User | null> {
    const user = await this.repo.findOneBy({ id, tenantId });
    if (!user) return null;

    if (dto.roleId !== undefined && creatorRoleId && creatorRoleSlug) {
      await this.enforceHierarchy(creatorRoleId, creatorRoleSlug, dto.roleId, tenantId);
    }

    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.roleId !== undefined) user.roleId = dto.roleId;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    await this.repo.save(user);
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }

  async getBuildingIds(userId: string): Promise<string[]> {
    const rows = await this.dataSource.query(
      `SELECT building_id FROM user_building_access WHERE user_id = $1`,
      [userId],
    );
    return rows.map((r: { building_id: string }) => r.building_id);
  }

  async assignBuildings(userId: string, tenantId: string, buildingIds: string[]): Promise<void> {
    const user = await this.repo.findOneBy({ id: userId, tenantId });
    if (!user) return;

    // Verify all buildings belong to the same tenant
    if (buildingIds.length > 0) {
      const placeholders = buildingIds.map((_, i) => `$${i + 2}`).join(', ');
      const [{ count }] = await this.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM buildings WHERE id IN (${placeholders}) AND tenant_id = $1`,
        [tenantId, ...buildingIds],
      );
      if (count !== buildingIds.length) {
        throw new BadRequestException('One or more buildings do not belong to this tenant');
      }
    }

    await this.dataSource.query(`DELETE FROM user_building_access WHERE user_id = $1`, [userId]);

    if (buildingIds.length > 0) {
      const values = buildingIds.map((_, i) => `($1, $${i + 2})`).join(', ');
      await this.dataSource.query(
        `INSERT INTO user_building_access (user_id, building_id) VALUES ${values}
         ON CONFLICT DO NOTHING`,
        [userId, ...buildingIds],
      );
    }
  }

  private async enforceHierarchy(
    creatorRoleId: string,
    creatorRoleSlug: string,
    targetRoleId: string,
    tenantId: string,
  ): Promise<void> {
    // super_admin (Globe Power) can assign any role in any tenant
    if (creatorRoleSlug === 'super_admin') return;

    const [creatorRole, targetRole] = await Promise.all([
      this.roleRepo.findOneBy({ id: creatorRoleId }),
      this.roleRepo.findOneBy({ id: targetRoleId, tenantId }),
    ]);

    if (!targetRole) {
      throw new ForbiddenException('Target role not found in this tenant');
    }

    if (!creatorRole) {
      throw new ForbiddenException('Creator role not found');
    }

    if (targetRole.hierarchyLevel <= creatorRole.hierarchyLevel) {
      throw new ForbiddenException(
        `Cannot assign role "${targetRole.name}" (level ${targetRole.hierarchyLevel}). ` +
        `Your role "${creatorRole.name}" (level ${creatorRole.hierarchyLevel}) ` +
        `can only assign roles with level > ${creatorRole.hierarchyLevel}.`,
      );
    }
  }

  async enforceDeleteHierarchy(
    creatorRoleId: string,
    creatorRoleSlug: string,
    targetUserId: string,
    tenantId: string,
  ): Promise<void> {
    if (creatorRoleSlug === 'super_admin') return;

    const targetUser = await this.repo.findOne({
      where: { id: targetUserId, tenantId },
      relations: ['role'],
    });
    if (!targetUser) return;

    const creatorRole = await this.roleRepo.findOneBy({ id: creatorRoleId });
    if (!creatorRole) {
      throw new ForbiddenException('Creator role not found');
    }

    if (targetUser.role.hierarchyLevel <= creatorRole.hierarchyLevel) {
      throw new ForbiddenException(
        `Cannot delete user with role "${targetUser.role.name}". ` +
        `Your role "${creatorRole.name}" does not have sufficient privileges.`,
      );
    }
  }
}
