import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { RolePermission } from './role-permission.entity';
import { Module_ } from './module.entity';
import { Action } from './action.entity';
import { RolesService } from './roles.service';
@Module({
  imports: [TypeOrmModule.forFeature([Role, RolePermission, Module_, Action])],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
