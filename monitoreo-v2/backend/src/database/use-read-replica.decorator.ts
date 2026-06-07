import { SetMetadata } from '@nestjs/common';
import { USE_READ_REPLICA_KEY } from './read-replica.constants';

/**
 * Marks a handler as read-only ETL/export; queries should use the read replica when configured.
 */
export const UseReadReplica = (): MethodDecorator & ClassDecorator =>
  SetMetadata(USE_READ_REPLICA_KEY, true);
