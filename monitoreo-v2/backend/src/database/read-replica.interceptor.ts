import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { USE_READ_REPLICA_KEY } from './read-replica.constants';

/**
 * Ensures @UseReadReplica() routes are read-only GET handlers.
 */
@Injectable()
export class ReadReplicaInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Validates HTTP method for read-replica marked handlers.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const useReplica = this.reflector.getAllAndOverride<boolean>(USE_READ_REPLICA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (useReplica) {
      const request = context.switchToHttp().getRequest<{ method?: string }>();
      if (String(request.method ?? 'GET').toUpperCase() !== 'GET') {
        throw new BadRequestException('@UseReadReplica() is only allowed on GET routes');
      }
    }

    return next.handle();
  }
}
