export type AuditJsonDiffEntry = {
  path: string;
  kind: 'added' | 'removed' | 'changed';
  before?: unknown;
  after?: unknown;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }
  if (typeof a !== typeof b) {
    return false;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      if (!deepEqual(a[key], b[key])) {
        return false;
      }
    }
    return true;
  }
  return false;
}

function pathSegment(parent: string, segment: string): string {
  return parent === '' ? segment : `${parent}.${segment}`;
}

function pathIndex(parent: string, index: number): string {
  const bracket = `[${index}]`;
  return parent === '' ? bracket : `${parent}${bracket}`;
}

function rootPath(basePath: string): string {
  return basePath === '' ? '(gốc)' : basePath;
}

/** Build added leaf paths when there is no before snapshot (e.g. CREATE). */
function flattenAsAdded(value: unknown, basePath: string): AuditJsonDiffEntry[] {
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return [{ path: rootPath(basePath), kind: 'added', after: {} }];
    }
    const out: AuditJsonDiffEntry[] = [];
    for (const key of keys) {
      out.push(...flattenAsAdded(value[key], pathSegment(basePath, key)));
    }
    return out;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [{ path: rootPath(basePath), kind: 'added', after: [] }];
    }
    const out: AuditJsonDiffEntry[] = [];
    for (let i = 0; i < value.length; i += 1) {
      out.push(...flattenAsAdded(value[i], pathIndex(basePath, i)));
    }
    return out;
  }
  return [{ path: rootPath(basePath), kind: 'added', after: value }];
}

function flattenAsRemoved(value: unknown, basePath: string): AuditJsonDiffEntry[] {
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return [{ path: rootPath(basePath), kind: 'removed', before: {} }];
    }
    const out: AuditJsonDiffEntry[] = [];
    for (const key of keys) {
      out.push(...flattenAsRemoved(value[key], pathSegment(basePath, key)));
    }
    return out;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [{ path: rootPath(basePath), kind: 'removed', before: [] }];
    }
    const out: AuditJsonDiffEntry[] = [];
    for (let i = 0; i < value.length; i += 1) {
      out.push(...flattenAsRemoved(value[i], pathIndex(basePath, i)));
    }
    return out;
  }
  return [{ path: rootPath(basePath), kind: 'removed', before: value }];
}

/** Compare two JSON values; returns path-level diff (objects merge keys, arrays by index). */
export function collectAuditJsonDiff(
  before: unknown,
  after: unknown,
  basePath = '',
): AuditJsonDiffEntry[] {
  if (deepEqual(before, after)) {
    return [];
  }

  const beforeMissing = before === null || before === undefined;
  const afterMissing = after === null || after === undefined;

  if (beforeMissing && !afterMissing) {
    return flattenAsAdded(after, basePath);
  }
  if (!beforeMissing && afterMissing) {
    return flattenAsRemoved(before, basePath);
  }

  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const out: AuditJsonDiffEntry[] = [];
    for (const key of keys) {
      const nextPath = pathSegment(basePath, key);
      const hasBefore = Object.hasOwn(before, key);
      const hasAfter = Object.hasOwn(after, key);
      if (!hasAfter) {
        out.push({ path: nextPath, kind: 'removed', before: before[key] });
      } else if (!hasBefore) {
        out.push({ path: nextPath, kind: 'added', after: after[key] });
      } else {
        out.push(...collectAuditJsonDiff(before[key], after[key], nextPath));
      }
    }
    return out;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const max = Math.max(before.length, after.length);
    const out: AuditJsonDiffEntry[] = [];
    for (let i = 0; i < max; i += 1) {
      const nextPath = pathIndex(basePath, i);
      if (i >= before.length) {
        out.push({ path: nextPath, kind: 'added', after: after[i] });
      } else if (i >= after.length) {
        out.push({ path: nextPath, kind: 'removed', before: before[i] });
      } else {
        out.push(...collectAuditJsonDiff(before[i], after[i], nextPath));
      }
    }
    return out;
  }

  return [{ path: rootPath(basePath), kind: 'changed', before, after }];
}
