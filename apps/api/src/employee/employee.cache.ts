export const EMPLOYEE_CACHE_KEYS = {
  DETAIL: (id: number) => `employee:detail:${id}`,
};

export const EMPLOYEE_CACHE_TTL = {
  DETAIL: 3600, // 1 hour
};
