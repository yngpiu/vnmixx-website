import type { ServerOptions } from 'socket.io';

const DEFAULT_DEV_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

function parseCorsOrigins(input: string): string[] {
  return input
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isLocalDevOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin.trim());
}

function resolveSocketCorsOrigins(): string[] {
  const corsOriginEnv = process.env.CORS_ORIGIN ?? process.env.CORS_ORIGINS ?? '';
  const configuredOrigins = corsOriginEnv ? parseCorsOrigins(corsOriginEnv) : [];
  const isDevelopment = (process.env.NODE_ENV ?? 'development') !== 'production';

  if (!isDevelopment) {
    return configuredOrigins;
  }

  return [...new Set([...configuredOrigins, ...DEFAULT_DEV_CORS_ORIGINS])];
}

export function buildSocketIoCorsOptions(): ServerOptions['cors'] {
  const allowedOrigins = resolveSocketCorsOrigins();
  const isDevelopment = (process.env.NODE_ENV ?? 'development') !== 'production';

  return {
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(requestOrigin)) {
        callback(null, true);
        return;
      }
      if (isDevelopment && isLocalDevOrigin(requestOrigin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Socket.IO origin ${requestOrigin} is not allowed by CORS`), false);
    },
    credentials: true,
  };
}
