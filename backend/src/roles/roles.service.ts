import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { RolePermission } from './role-permission.entity';
import { ViewModule } from './module.entity';
import { Action } from './action.entity';

const GLOBAL_SITE_ACCESS_ROLES = new Set(['SUPER_ADMIN', 'CORP_ADMIN', 'AUDITOR']);

export function isGlobalSiteAccessRole(roleName: string): boolean {
  return GLOBAL_SITE_ACCESS_ROLES.has(roleName);
}

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly permRepo: Repository<RolePermission>,
    @InjectRepository(ViewModule)
    private readonly moduleRepo: Repository<ViewModule>,
    @InjectRepository(Action)
    private readonly actionRepo: Repository<Action>,
  ) {}

  findAll() {
    return this.roleRepo.find({ where: { isActive: true } });
  }

  findAllViews() {
    return this.moduleRepo.find({
      where: { isActive: true },
      order: {
        navigationGroup: 'ASC',
        sortOrder: 'ASC',
      },
    });
  }

  findById(id: number) {
    return this.roleRepo.findOneBy({ id });
  }

  async getPermissionsByRoleId(roleId: number): Promise<Record<string, string[]>> {
    const rows = await this.permRepo
      .createQueryBuilder('rp')
      .innerJoin(ViewModule, 'm', 'm.id = rp.moduleId')
      .innerJoin(Action, 'a', 'a.id = rp.actionId')
      .select(['m.code AS module', 'a.code AS action'])
      .where('rp.roleId = :roleId', { roleId })
      .getRawMany();

    const perms: Record<string, string[]> = {};
    for (const row of rows) {
      if (!perms[row.module]) perms[row.module] = [];
      perms[row.module].push(row.action);
    }
    return perms;
  }
}
