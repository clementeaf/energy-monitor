import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    private readonly dataSource: DataSource,
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

  async create(tenantId: string, dto: CreateUserDto): Promise<User> {
    const user = this.repo.create({
      tenantId,
      email: dto.email,
      displayName: dto.displayName ?? null,
      authProvider: dto.authProvider,
      authProviderId: dto.authProviderId,
      roleId: dto.roleId,
    });
    const saved = await this.repo.save(user);

    if (dto.buildingIds && dto.buildingIds.length > 0) {
      await this.assignBuildings(saved.id, tenantId, dto.buildingIds);
    }

    return this.findOne(saved.id, tenantId) as Promise<User>;
  }

  async update(id: string, tenantId: string, dto: UpdateUserDto): Promise<User | null> {
    const user = await this.repo.findOneBy({ id, tenantId });
    if (!user) return null;

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
}
