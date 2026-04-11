import { Transform } from 'class-transformer';

type TransformContext = { value: unknown; key?: string; obj?: object };

/**
 * Reads the raw query value before class-transformer's implicit Boolean coercion.
 * With `enableImplicitConversion: true`, the string `"false"` is turned into `true`
 * via `Boolean("false")` before `@Transform` runs; the plain `obj[key]` is still correct.
 */
function rawQueryValue({ key, obj, value }: TransformContext): unknown {
  if (key !== undefined && obj !== null && typeof obj === 'object') {
    return (obj as Record<string, unknown>)[key];
  }
  return value;
}

export function parseOptionalQueryBoolean(ctx: TransformContext): boolean | undefined {
  let raw = rawQueryValue(ctx);
  if (Array.isArray(raw)) {
    raw = raw[0];
  }
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }
  if (raw === true || raw === 'true' || raw === 1 || raw === '1') {
    return true;
  }
  if (raw === false || raw === 'false' || raw === 0 || raw === '0') {
    return false;
  }
  return undefined;
}

function transformParams(params: unknown): TransformContext {
  if (typeof params !== 'object' || params === null) {
    return { value: undefined };
  }
  const rec = params as { key?: unknown; obj?: unknown; value?: unknown };
  const key = typeof rec.key === 'string' ? rec.key : undefined;
  const obj =
    rec.obj !== null && rec.obj !== undefined && typeof rec.obj === 'object' ? rec.obj : undefined;
  return { key, obj, value: rec.value };
}

/** Use on optional boolean query params (`?flag=true|false`). */
export function TransformQueryOptionalBoolean(): PropertyDecorator {
  return Transform((params: unknown) => parseOptionalQueryBoolean(transformParams(params)));
}
