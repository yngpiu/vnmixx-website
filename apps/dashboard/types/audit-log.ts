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
