import type { AuthUser } from '../types/auth';

interface GoogleJwtPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export function parseGoogleCredential(credential: string): AuthUser {
  const payload = JSON.parse(atob(credential.split('.')[1])) as GoogleJwtPayload;

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: 'OPERATOR', // Default role — will be resolved from backend later
    provider: 'google',
    avatar: payload.picture,
    siteIds: ['*'],
  };
}
