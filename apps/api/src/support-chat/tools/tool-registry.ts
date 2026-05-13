import type { Cohere } from 'cohere-ai';
import { getPolicyContextTool } from './get-policy.tool';
import { requestHumanHandoffTool } from './handoff.tool';
import { searchProductsTool } from './search-products.tool';

export const ALL_TOOLS: Cohere.ToolV2[] = [
  searchProductsTool,
  getPolicyContextTool,
  requestHumanHandoffTool,
];

export const TOOL_NAMES = {
  SEARCH_PRODUCTS: 'search_products',
  GET_POLICY_CONTEXT: 'get_policy_context',
  REQUEST_HUMAN_HANDOFF: 'request_human_handoff',
} as const;
