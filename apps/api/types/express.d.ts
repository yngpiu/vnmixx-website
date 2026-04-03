import type { AuthenticatedUser } from '../src/auth/interfaces';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
