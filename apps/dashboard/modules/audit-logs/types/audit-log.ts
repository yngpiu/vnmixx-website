export type AuditLogStatus = 'SUCCESS' | 'FAILED';

export type AuditLogActor = {
  id: number;
  fullName: string;
  email: string;
} | null;

export type AuditLogItem = {
  id: number;
  actorEmployee: AuditLogActor;
  action: string;
  resourceType: string;
  resourceId: string | null;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  beforeData: unknown;
  afterData: unknown;
  status: AuditLogStatus;
  errorMessage: string | null;
  createdAt: string;
};

export type AuditLogListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AuditLogListResponse = {
  data: AuditLogItem[];
  meta: AuditLogListMeta;
};

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

export type AuditLogsColumnsOptions = {
  onOpenActorEmployeeDetail?: (employeeId: number) => void;
};
