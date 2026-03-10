import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { RolePermission } from './role-permission.entity';
import { ViewModule } from './module.entity';
import { Action } from './action.entity';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { ViewsController } from './views.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Role, RolePermission, ViewModule, Action])],
  controllers: [RolesController, ViewsController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
