export const LOCATION_CACHE_KEYS = {
  CITIES: 'loc:cities',
  DISTRICTS: (cityId: number) => `loc:districts:${cityId}`,
  WARDS: (districtId: number) => `loc:wards:${districtId}`,
} as const;

export const LOCATION_CACHE_TTL = {
  LOCATION: 86_400,
} as const;
