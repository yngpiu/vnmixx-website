type EntityRouteInput = {
  slug: string;
};

export function buildProductHref(input: EntityRouteInput): string {
  return `/san-pham/${input.slug}`;
}

export function buildCategoryHref(input: EntityRouteInput): string {
  return `/danh-muc/${input.slug}`;
}

function parseRouteSlug(routeKey: string): string | null {
  const slug = routeKey.trim();
  if (!slug) {
    return null;
  }
  return slug;
}

export function parseProductRouteKey(routeKey: string): string | null {
  return parseRouteSlug(routeKey);
}

export function parseCategoryRouteKey(routeKey: string): string | null {
  return parseRouteSlug(routeKey);
}
