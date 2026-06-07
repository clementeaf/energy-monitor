import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegisterMapping } from '../platform/entities/register-mapping.entity';
import { ProtocolType } from '../platform/entities/protocol-type.entity';
import { RegisterMappingsController } from './register-mappings.controller';
import { RegisterMappingsService } from './register-mappings.service';
import { NormalizationService } from '../../lib/normalization.service';

@Module({
  imports: [TypeOrmModule.forFeature([RegisterMapping, ProtocolType])],
  controllers: [RegisterMappingsController],
  providers: [RegisterMappingsService, NormalizationService],
  exports: [RegisterMappingsService, NormalizationService],
})
export class RegisterMappingsModule {}
