export type TransformContext = { value: unknown; key?: string; obj?: object };

export function parseOptionalBool(ctx: TransformContext): boolean | undefined {
  let raw: unknown = ctx.value;

  if (ctx.key !== undefined && ctx.obj !== null && typeof ctx.obj === 'object') {
    raw = (ctx.obj as Record<string, unknown>)[ctx.key];
  }
  if (Array.isArray(raw)) raw = raw[0];

  if (raw === undefined || raw === null || raw === '') return undefined;
  if (raw === true || raw === 'true' || raw === 1 || raw === '1') return true;
  if (raw === false || raw === 'false' || raw === 0 || raw === '0') return false;
  return undefined;
}
