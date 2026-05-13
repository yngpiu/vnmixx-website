import { z } from 'zod';

export const SearchProductsArgsSchema = z.object({
  query: z.string(),
  color: z.string().optional(),
  size: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
});

export const GetPolicyContextArgsSchema = z.object({
  key: z.enum(['WARRANTY_POLICY', 'RETURN_POLICY', 'TERMS', 'FAQ', 'STORE_INFO']),
});

export const RequestHumanHandoffArgsSchema = z.object({
  reason: z.string(),
});

export type SearchProductsArgs = z.infer<typeof SearchProductsArgsSchema>;
export type GetPolicyContextArgs = z.infer<typeof GetPolicyContextArgsSchema>;
export type RequestHumanHandoffArgs = z.infer<typeof RequestHumanHandoffArgsSchema>;
