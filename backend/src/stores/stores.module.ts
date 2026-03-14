import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from './store.entity';
import { StoreType } from './store-type.entity';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Store, StoreType])],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
