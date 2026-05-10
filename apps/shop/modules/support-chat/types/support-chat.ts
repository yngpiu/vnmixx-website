export type ChatSenderType = 'CUSTOMER' | 'EMPLOYEE' | 'GUEST';

export type ChatAssignment = {
  employeeId: number;
  employeeName: string;
  assignedAt: string;
};

export type ChatDetail = {
  id: number;
  customerId: number | null;
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

export type MessagesQuery = {
  cursor?: number;
  limit?: number;
};

export type MessagesResponse = {
  items: ChatMessage[];
  nextCursor: number | null;
  hasMore: boolean;
};
