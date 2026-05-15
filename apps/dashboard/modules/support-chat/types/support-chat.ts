export type ChatSenderType = 'CUSTOMER' | 'EMPLOYEE' | 'GUEST' | 'AI';
export type SupportChatAiMode = 'AUTO' | 'PAUSED' | 'OFF';
export type SupportChatStatus = 'OPEN' | 'WAITING_HUMAN' | 'RESOLVED' | 'CLOSED';
export type SupportChatCustomerTypeFilter = 'all' | 'customer' | 'guest';

export type ChatSummary = {
  id: number;
  customerId: number | null;
  customerName: string;
  customerAvatarUrl: string | null;
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
  customerId: number | null;
  customerName: string;
  assignments: ChatAssignment[];
  aiMode: SupportChatAiMode;
  status: SupportChatStatus;
  createdAt: string;
};

export type ChatMessage = {
  id: number;
  chatId: number;
  senderType: ChatSenderType;
  senderCustomerId: number | null;
  senderEmployeeId: number | null;
  senderName: string | null;
  senderAvatarUrl: string | null;
  content: string;
  createdAt: string;
};

export type ChatTypingEvent = {
  chatId: number;
  isTyping: boolean;
  senderType: ChatSenderType;
  senderCustomerId: number | null;
  senderEmployeeId: number | null;
};

export type AdminChatsQuery = {
  page?: number;
  pageSize?: number;
  assignedToMe?: boolean;
  search?: string;
  customerType?: SupportChatCustomerTypeFilter;
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
