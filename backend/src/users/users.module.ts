import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserSite } from './user-site.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RolesModule } from '../roles/roles.module';
import { InvitationsController } from './invitations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserSite]), RolesModule],
  controllers: [UsersController, InvitationsController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
