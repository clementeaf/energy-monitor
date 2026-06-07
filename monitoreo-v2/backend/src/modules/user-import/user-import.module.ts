import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { UserImportJob } from './entities/user-import-job.entity';
import { UserImportStagingRow } from './entities/user-import-staging-row.entity';
import { UserImportController } from './user-import.controller';
import { UserImportParseService } from './user-import-parse.service';
import { UserImportService } from './user-import.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserImportJob, UserImportStagingRow]),
    UsersModule,
  ],
  controllers: [UserImportController],
  providers: [UserImportParseService, UserImportService],
  exports: [UserImportService, UserImportParseService],
})
export class UserImportModule {}
