import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VarelectricIngressController } from './varelectric-ingress.controller';
import { VarelectricIngressService } from './varelectric-ingress.service';
import { VarelectricSyncService } from './varelectric-sync.service';
import { VarElectric } from './entities/var-electric.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VarElectric], 'v3')],
  controllers: [VarelectricIngressController],
  providers: [VarelectricIngressService, VarelectricSyncService],
})
export class VarelectricIngressModule {}
