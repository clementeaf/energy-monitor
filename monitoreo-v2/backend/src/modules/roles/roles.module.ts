import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserBuildingAccess } from './entities/user-building-access.entity';
import { RolesService } from './roles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Permission, RolePermission, UserBuildingAccess]),
  ],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
