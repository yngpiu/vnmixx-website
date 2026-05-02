type EntityRouteInput = {
  id: number;
  slug: string;
};

type ParsedEntityRouteKey = {
  id: number;
  slug: string;
};

function parsePositiveInteger(rawValue: string): number | null {
  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return null;
  }
  return parsedValue;
}

export function buildProductHref(input: EntityRouteInput): string {
  return `/san-pham/${input.slug}-p${input.id}`;
}

export function buildCategoryHref(input: EntityRouteInput): string {
  return `/danh-muc/${input.slug}-c${input.id}`;
}

export function parseProductRouteKey(routeKey: string): ParsedEntityRouteKey | null {
  const matchedValue = routeKey.match(/^(?<slug>.+)-p(?<id>\d+)$/);
  if (!matchedValue?.groups) {
    return null;
  }
  const slug = matchedValue.groups.slug;
  const rawId = matchedValue.groups.id;
  if (!slug || !rawId) {
    return null;
  }
  const id = parsePositiveInteger(rawId);
  if (id === null) {
    return null;
  }
  return { id, slug };
}

export function parseCategoryRouteKey(routeKey: string): ParsedEntityRouteKey | null {
  const matchedValue = routeKey.match(/^(?<slug>.+)-c(?<id>\d+)$/);
  if (!matchedValue?.groups) {
    return null;
  }
  const slug = matchedValue.groups.slug;
  const rawId = matchedValue.groups.id;
  if (!slug || !rawId) {
    return null;
  }
  const id = parsePositiveInteger(rawId);
  if (id === null) {
    return null;
  }
  return { id, slug };
}
