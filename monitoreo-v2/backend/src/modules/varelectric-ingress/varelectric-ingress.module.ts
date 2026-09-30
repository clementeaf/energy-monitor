import { Module } from '@nestjs/common';
import { VarelectricIngressController } from './varelectric-ingress.controller';
import { VarelectricIngressService } from './varelectric-ingress.service';

@Module({
  controllers: [VarelectricIngressController],
  providers: [VarelectricIngressService],
})
export class VarelectricIngressModule {}
