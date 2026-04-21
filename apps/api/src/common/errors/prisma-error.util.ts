import { Prisma } from 'generated/prisma/client';

export function isPrismaKnownRequestError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export function isPrismaErrorCode(
  error: unknown,
  code: string,
): error is Prisma.PrismaClientKnownRequestError {
  return isPrismaKnownRequestError(error) && error.code === code;
}

export function getPrismaErrorTargets(error: Prisma.PrismaClientKnownRequestError): string[] {
  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.map((item) => String(item));
  }
  if (typeof target === 'string') {
    return [target];
  }
  return [];
}
