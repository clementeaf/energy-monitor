import { Global, Module } from '@nestjs/common';
import { ReadReplicaService } from './read-replica.service';

@Global()
@Module({
  providers: [ReadReplicaService],
  exports: [ReadReplicaService],
})
export class DatabaseModule {}
