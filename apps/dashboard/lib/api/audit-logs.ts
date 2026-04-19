import { apiClient } from '@/lib/axios';
import type { AuditLogListResponse, AuditLogStatus } from '@/types/audit-log';

export type ListAuditLogsParams = {
  page?: number;
  limit?: number;
  /** Lọc theo nhiều nhân viên (query lặp `actorEmployeeIds`). */
  actorEmployeeIds?: number[];
  /** Substring match on action code when `actions` and `search` are not set. */
  action?: string;
  /** Tìm theo tên nhân viên, email hoặc tên hành động (tiếng Việt). */
  search?: string;
  /** Exact match on one or more action codes (repeated `actions` query keys). */
  actions?: string[];
  /** Lọc theo nhiều loại tài nguyên (query lặp `resourceTypes`). */
  resourceTypes?: string[];
  status?: AuditLogStatus;
};

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
