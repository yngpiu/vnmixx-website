export type ChatSenderType = 'CUSTOMER' | 'EMPLOYEE';

export type ChatSummary = {
  id: number;
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerPhoneNumber: string;
  lastMessageContent: string | null;
  lastMessageAt: string | null;
  assignedEmployeeNames: string[];
  createdAt: string;
};

export type ChatAssignment = {
  employeeId: number;
  employeeName: string;
  assignedAt: string;
};

export type ChatDetail = {
  id: number;
  customerId: number;
  customerName: string;
  assignments: ChatAssignment[];
  createdAt: string;
};

export type ChatMessage = {
  id: number;
  chatId: number;
  senderType: ChatSenderType;
  senderCustomerId: number | null;
  senderEmployeeId: number | null;
  senderName: string | null;
  content: string;
  createdAt: string;
};

export type AdminChatsQuery = {
  page?: number;
  pageSize?: number;
  assignedToMe?: boolean;
  search?: string;
};

export type AdminChatsResponse = {
  items: ChatSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type MessagesQuery = {
  cursor?: number;
  limit?: number;
};

export type MessagesResponse = {
  items: ChatMessage[];
  nextCursor: number | null;
  hasMore: boolean;
};
