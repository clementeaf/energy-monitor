import type { Request } from 'express';
import type { AuthorizationContext, TokenPayload } from './auth.service';

export interface AuthenticatedRequest extends Request {
  authUser?: TokenPayload;
  authContext?: AuthorizationContext;
}