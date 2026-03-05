import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { RolePermission } from './role-permission.entity';
import { Module_ } from './module.entity';
import { Action } from './action.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly permRepo: Repository<RolePermission>,
    @InjectRepository(Module_)
    private readonly moduleRepo: Repository<Module_>,
    @InjectRepository(Action)
    private readonly actionRepo: Repository<Action>,
  ) {}

  findAll() {
    return this.roleRepo.find({ where: { isActive: true } });
  }

  findById(id: number) {
    return this.roleRepo.findOneBy({ id });
  }

  async getPermissionsByRoleId(roleId: number): Promise<Record<string, string[]>> {
    const rows = await this.permRepo
      .createQueryBuilder('rp')
      .innerJoin(Module_, 'm', 'm.id = rp.moduleId')
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
