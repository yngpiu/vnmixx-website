import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import type { CookieOptions } from 'express';

const GUEST_SECRET_BYTE_LENGTH = 32;
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Name of the HttpOnly cookie that stores the guest chat secret. */
export const GUEST_CHAT_COOKIE_NAME = 'guest_chat_secret';

/** Cookie options for the guest chat secret cookie. */
export const GUEST_CHAT_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: COOKIE_MAX_AGE_MS,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
};

interface GeneratedSecret {
  readonly secret: string;
  readonly secretHash: string;
}

@Injectable()
/**
 * Stateless helper for generating and hashing guest chat session secrets.
 */
export class GuestSessionService {
  /** Generate a random secret and its SHA-256 hash. */
  generateSecret(): GeneratedSecret {
    const secret = randomBytes(GUEST_SECRET_BYTE_LENGTH).toString('hex');
    return { secret, secretHash: this.hashSecret(secret) };
  }

  /** Compute SHA-256 hex digest of a raw secret string. */
  hashSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }
}
