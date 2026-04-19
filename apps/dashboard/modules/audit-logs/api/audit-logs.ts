import { apiClient } from '@/lib/axios';
import type {
  AuditLogListResponse,
  ListAuditLogsParams,
} from '@/modules/audit-logs/types/audit-log';

/**
 * Gọi GET /admin/audit-logs; mảng được serialize dạng lặp key (Nest parse được).
 */
export async function listAuditLogs(
  params: ListAuditLogsParams = {},
): Promise<AuditLogListResponse> {
  const sp = new URLSearchParams();
  if (params.page != null) {
    sp.set('page', String(params.page));
  }
  if (params.limit != null) {
    sp.set('limit', String(params.limit));
  }
  if (params.action) {
    sp.set('action', params.action);
  }
  if (params.search) {
    sp.set('search', params.search);
  }
  for (const code of params.actions ?? []) {
    sp.append('actions', code);
  }
  if (params.status) {
    sp.set('status', params.status);
  }
  for (const id of params.actorEmployeeIds ?? []) {
    sp.append('actorEmployeeIds', String(id));
  }
  for (const rt of params.resourceTypes ?? []) {
    sp.append('resourceTypes', rt);
  }
  const qs = sp.toString();
  const url = qs.length > 0 ? `/admin/audit-logs?${qs}` : '/admin/audit-logs';
  const { data } = await apiClient.get<AuditLogListResponse>(url);
  return data;
}
