import { Test, TestingModule } from '@nestjs/testing';
import { SupportChatGateway } from '../gateway/support-chat.gateway';
import { SupportChatService } from '../services/support-chat.service';
import { ChatAdminController } from './chat-admin.controller';

describe('ChatAdminController', () => {
  let controller: ChatAdminController;
  let service: any;
  let gateway: any;

  beforeEach(async () => {
    service = {
      getAdminChats: jest.fn(),
      getChatDetail: jest.fn(),
      assignEmployee: jest.fn(),
      getEmployeeChats: jest.fn(),
      getMessages: jest.fn(),
    };

    gateway = {
      emitChatAssigned: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatAdminController],
      providers: [
        {
          provide: SupportChatService,
          useValue: service,
        },
        {
          provide: SupportChatGateway,
          useValue: gateway,
        },
      ],
    }).compile();

    controller = module.get<ChatAdminController>(ChatAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getChats', () => {
    it('should return paginated chats', async () => {
      const mockResult = { items: [], total: 0, page: 1, pageSize: 10 };
      const user = { id: 10 } as any;
      service.getAdminChats.mockResolvedValue(mockResult);

      const result = await controller.getChats({}, user);
      expect(result.data).toBe(mockResult);
      expect(service.getAdminChats).toHaveBeenCalledWith({}, 10);
    });
  });

  describe('getChatDetail', () => {
    it('should return chat detail', async () => {
      const mockDetail = { id: 1 };
      service.getChatDetail.mockResolvedValue(mockDetail);

      const result = await controller.getChatDetail(1);
      expect(result.data).toBe(mockDetail);
      expect(service.getChatDetail).toHaveBeenCalledWith(1);
    });
  });

  describe('assignSelf', () => {
    it('should assign employee successfully and emit event', async () => {
      const user = { id: 10 } as any;
      const mockDetail = { id: 1 };
      service.assignEmployee.mockResolvedValue(mockDetail);

      const result = await controller.assignSelf(1, user);
      expect(result.data).toBe(mockDetail);
      expect(service.assignEmployee).toHaveBeenCalledWith(1, 10);
      expect(gateway.emitChatAssigned).toHaveBeenCalledWith(1, mockDetail);
    });
  });

  describe('getMessages', () => {
    it('should return messages', async () => {
      const mockMessages = { items: [], hasMore: false };
      service.getMessages.mockResolvedValue(mockMessages);

      const result = await controller.getMessages(1, {});
      expect(result.data).toBe(mockMessages);
      expect(service.getMessages).toHaveBeenCalledWith(1, {});
    });
  });
});
