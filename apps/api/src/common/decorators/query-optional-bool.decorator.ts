import { Transform } from 'class-transformer';
import { parseOptionalBool } from '../utils/query-bool.util';

export function TransformQueryOptionalBoolean(): PropertyDecorator {
  return Transform((params: unknown) => {
    if (typeof params !== 'object' || params === null) {
      return parseOptionalBool({ value: undefined });
    }
    const rec = params as { key?: unknown; obj?: unknown; value?: unknown };
    return parseOptionalBool({
      key: typeof rec.key === 'string' ? rec.key : undefined,
      obj:
        rec.obj !== null && rec.obj !== undefined && typeof rec.obj === 'object'
          ? rec.obj
          : undefined,
      value: rec.value,
    });
  });
}
